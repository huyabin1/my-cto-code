<template>
  <div ref="threeContainer" class="three-scene-container"></div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { mapActions, mapState } from 'vuex';
import EventBus from '@/utils/EventBus';
import SceneManager from '@/three/core/SceneManager';
import WallFactory from '@/three/factory/WallFactory';

const EVENTS = {
  DXF_LOADED: 'cad:dxf-loaded',
  WALL_CREATE: 'walls:create',
  WALL_REMOVE: 'walls:remove',
  WALL_SELECT: 'walls:select',
  WALL_UPDATE: 'walls:updated',
  WALL_UNDO: 'walls:undo',
};

export default {
  name: 'ThreeScene',
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      sceneManager: null,
      raycaster: null,
      pointer: null,
      wallFactory: null,
      wallMeshes: new Map(),
      highlightedWallId: null,
      eventUnsubscribers: [],
      cadOverlayGroup: null,
      wallsGroup: null,
      helpersGroup: null,
      snappingGroup: null,
      gridHelper: null,
      unitScale: 1,
      snappingScale: 1,
    };
  },
  computed: {
    ...mapState({
      walls: (state) => state.walls.items,
      selectedWallId: (state) => state.selection.activeWallId,
      cadUnits: (state) => state.cad.units,
      cadLayers: (state) => state.cad.layers,
      drawTool: (state) => state.tools.activeTool,
      snappingPreferences: (state) => state.preferences.snapping,
    }),
  },
  watch: {
    walls: {
      handler: 'syncWallsFromStore',
      deep: true,
    },
    selectedWallId(newSelection) {
      this.applySelection(newSelection);
    },
    cadUnits(units) {
      this.handleUnitChange(units);
    },
    cadLayers: {
      handler: 'handleLayerVisibility',
      deep: true,
    },
    drawTool(tool) {
      this.handleToolActivation(tool);
    },
    snappingPreferences: {
      handler: 'handleSnappingPreferences',
      deep: true,
    },
  },
  mounted() {
    this.initThreeScene();
    this.sceneManager = new SceneManager(this.scene);
    this.wallFactory = new WallFactory();
    this.setupSceneGroups();
    this.setupEventBus();
    this.setupInteractionHandlers();
    this.applyInitialState();
    this.animate();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    ...mapActions({
      addWallToStore: 'walls/addWall',
      removeWallFromStore: 'walls/removeWall',
      updateWallInStore: 'walls/updateWall',
      undoWallMutation: 'walls/undo',
      selectWallInStore: 'selection/selectWall',
      clearSelectionInStore: 'selection/clearSelection',
    }),
    applyInitialState() {
      this.syncWallsFromStore(this.walls);
      this.applySelection(this.selectedWallId);
      this.handleUnitChange(this.cadUnits);
      this.handleLayerVisibility(this.cadLayers);
      this.handleSnappingPreferences(this.snappingPreferences);
      this.handleToolActivation(this.drawTool);
    },
    initThreeScene() {
      const container = this.$refs.threeContainer;
      const width = container ? container.clientWidth || container.offsetWidth : window.innerWidth;
      const height = container ? container.clientHeight || container.offsetHeight : window.innerHeight;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      this.camera.position.set(20, 20, 20);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setClearColor('#f5f5f5', 1);
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      if (container) {
        container.appendChild(this.renderer.domElement);
      }

      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 20, 10);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
      directionalLight.shadow.camera.left = -20;
      directionalLight.shadow.camera.right = 20;
      directionalLight.shadow.camera.top = 20;
      directionalLight.shadow.camera.bottom = -20;
      this.scene.add(directionalLight);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      this.controls.enableRotate = true;

      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
    },
    setupSceneGroups() {
      this.cadOverlayGroup = this.sceneManager.addGroup('CADOverlay');
      this.wallsGroup = this.sceneManager.addGroup('WallsGroup');
      this.helpersGroup = this.sceneManager.addGroup('HelperOverlays');

      this.gridHelper = new THREE.GridHelper(50, 50);
      this.gridHelper.userData = { type: 'grid-helper' };
      this.helpersGroup.add(this.gridHelper);

      this.snappingGroup = new THREE.Group();
      this.snappingGroup.name = 'SnappingVisuals';
      this.helpersGroup.add(this.snappingGroup);
    },
    setupEventBus() {
      const unsubscribers = [
        EventBus.on(EVENTS.DXF_LOADED, (payload) => this.handleDXFLoad(payload)),
        EventBus.on(EVENTS.WALL_CREATE, (wall) => this.handleWallCreate(wall)),
        EventBus.on(EVENTS.WALL_REMOVE, (wallId) => this.handleWallRemove(wallId)),
        EventBus.on(EVENTS.WALL_SELECT, (wallId) => this.handleExternalSelection(wallId)),
        EventBus.on(EVENTS.WALL_UPDATE, (wall) => this.handleWallUpdate(wall)),
        EventBus.on(EVENTS.WALL_UNDO, () => this.handleWallUndo()),
      ];
      this.eventUnsubscribers.push(...unsubscribers);
    },
    setupInteractionHandlers() {
      if (this.renderer && this.renderer.domElement) {
        this.renderer.domElement.addEventListener('click', this.handleSceneClick);
      }
    },
    animate() {
      if (!this.scene || !this.camera || !this.renderer) {
        return;
      }

      this.animationId = requestAnimationFrame(() => this.animate());

      if (this.controls && typeof this.controls.update === 'function') {
        this.controls.update();
      }

      this.renderer.render(this.scene, this.camera);
    },
    handleResize() {
      const container = this.$refs.threeContainer;
      const width = container ? container.clientWidth || container.offsetWidth : window.innerWidth;
      const height = container ? container.clientHeight || container.offsetHeight : window.innerHeight;

      if (this.camera) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }

      if (this.renderer) {
        this.renderer.setSize(width, height);
      }
    },
    handleDXFLoad(payload) {
      if (!this.cadOverlayGroup) {
        return;
      }

      while (this.cadOverlayGroup.children.length) {
        const child = this.cadOverlayGroup.children[0];
        this.cadOverlayGroup.remove(child);
      }

      if (payload && Array.isArray(payload.meshes)) {
        payload.meshes.forEach((mesh) => {
          this.cadOverlayGroup.add(mesh);
        });
      }
    },
    handleWallCreate(wall) {
      const descriptor = wall ? { ...wall } : {};
      if (!descriptor.id) {
        descriptor.id = `wall-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      }
      this.addWallToStore(descriptor);
    },
    handleWallRemove(wallId) {
      if (!wallId) {
        return;
      }
      this.removeWallFromStore(wallId);
    },
    handleExternalSelection(wallId) {
      if (wallId) {
        this.selectWallInStore(wallId);
      } else {
        this.clearSelectionInStore();
      }
    },
    handleWallUpdate(wall) {
      if (!wall || !wall.id) {
        return;
      }
      this.updateWallInStore(wall);
    },
    handleWallUndo() {
      this.undoWallMutation();
    },
    syncWallsFromStore(walls) {
      if (!this.wallsGroup || !Array.isArray(walls) || !this.wallFactory) {
        return;
      }

      const seen = new Set();

      walls.forEach((wall) => {
        if (!wall || !wall.id) {
          return;
        }

        seen.add(wall.id);

        if (!this.wallMeshes.has(wall.id)) {
          const mesh = this.wallFactory.create(wall);
          this.wallMeshes.set(wall.id, mesh);
          this.wallsGroup.add(mesh);
        } else {
          const mesh = this.wallMeshes.get(wall.id);
          this.wallFactory.update(mesh, wall);
        }
      });

      Array.from(this.wallMeshes.keys()).forEach((wallId) => {
        if (!seen.has(wallId)) {
          const mesh = this.wallMeshes.get(wallId);
          if (mesh && this.wallsGroup) {
            this.wallsGroup.remove(mesh);
          }
          if (mesh && this.wallFactory) {
            this.wallFactory.dispose(mesh);
          }
          this.wallMeshes.delete(wallId);
        }
      });

      if (this.highlightedWallId && !seen.has(this.highlightedWallId)) {
        this.highlightedWallId = null;
      }
    },
    applySelection(wallId) {
      if (this.highlightedWallId && this.wallMeshes.has(this.highlightedWallId)) {
        const previousMesh = this.wallMeshes.get(this.highlightedWallId);
        this.wallFactory.clearHighlight(previousMesh);
      }

      if (wallId && this.wallMeshes.has(wallId)) {
        const nextMesh = this.wallMeshes.get(wallId);
        this.wallFactory.highlight(nextMesh);
        this.highlightedWallId = wallId;
      } else {
        this.highlightedWallId = null;
      }
    },
    handleSceneClick(event) {
      if (!this.renderer || !this.camera || !this.raycaster || !this.pointer) {
        return;
      }

      const rect =
        typeof this.renderer.domElement.getBoundingClientRect === 'function'
          ? this.renderer.domElement.getBoundingClientRect()
          : { left: 0, top: 0, width: 1, height: 1 };

      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);

      const meshes = Array.from(this.wallMeshes.values());
      const intersections = this.raycaster.intersectObjects(meshes, true);

      if (intersections.length) {
        const wallId = this.resolveWallIdFromObject(intersections[0].object);
        if (wallId) {
          this.selectWallInStore(wallId);
          return;
        }
      }

      this.clearSelectionInStore();
    },
    resolveWallIdFromObject(object) {
      let target = object;
      while (target) {
        if (target.userData && target.userData.wallId) {
          return target.userData.wallId;
        }
        target = target.parent;
      }
      return null;
    },
    handleUnitChange(units) {
      this.unitScale = units === 'imperial' ? 3.28084 : 1;
      this.updateGridScale();
    },
    handleLayerVisibility(layers) {
      if (!layers) {
        return;
      }

      if (this.cadOverlayGroup) {
        this.cadOverlayGroup.visible = layers.cad !== false;
      }

      if (this.wallsGroup) {
        this.wallsGroup.visible = layers.walls !== false;
      }

      if (this.helpersGroup) {
        this.helpersGroup.visible = layers.helpers !== false;
      }
    },
    handleToolActivation(tool) {
      if (!this.controls) {
        return;
      }

      const isDrawingWalls = tool === 'draw-wall';
      this.controls.enabled = !isDrawingWalls;
    },
    handleSnappingPreferences(preferences) {
      if (!preferences) {
        return;
      }

      if (this.snappingGroup) {
        this.snappingGroup.visible = Boolean(preferences.enabled);
      }

      if (preferences.gridSize !== undefined) {
        const numericSize = Number(preferences.gridSize);
        this.snappingScale = Number.isFinite(numericSize) && numericSize > 0 ? numericSize : 1;
      }

      this.updateGridScale();
    },
    updateGridScale() {
      if (!this.gridHelper || !this.gridHelper.scale || typeof this.gridHelper.scale.set !== 'function') {
        return;
      }

      const scale = this.unitScale * this.snappingScale;
      this.gridHelper.scale.set(scale, 1, scale);
    },
    cleanup() {
      window.removeEventListener('resize', this.handleResize);

      if (this.renderer && this.renderer.domElement) {
        this.renderer.domElement.removeEventListener('click', this.handleSceneClick);
      }

      if (this.eventUnsubscribers.length) {
        this.eventUnsubscribers.forEach((unsubscribe) => {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        });
        this.eventUnsubscribers = [];
      }

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      if (this.controls && typeof this.controls.dispose === 'function') {
        this.controls.dispose();
      }
      this.controls = null;

      if (this.wallMeshes) {
        this.wallMeshes.forEach((mesh) => {
          if (this.wallsGroup && mesh) {
            this.wallsGroup.remove(mesh);
          }
          if (mesh && this.wallFactory) {
            this.wallFactory.dispose(mesh);
          }
        });
        this.wallMeshes.clear();
      }

      if (this.sceneManager) {
        this.sceneManager.dispose();
        this.sceneManager = null;
      }

      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer = null;
      }

      this.scene = null;
      this.camera = null;
      this.raycaster = null;
      this.pointer = null;
      this.gridHelper = null;
      this.snappingGroup = null;
      this.cadOverlayGroup = null;
      this.wallsGroup = null;
      this.helpersGroup = null;
      this.wallFactory = null;
    },
    getScene() {
      return this.scene;
    },
    getCamera() {
      return this.camera;
    },
    getRenderer() {
      return this.renderer;
    },
  },
};
</script>

<style scoped>
.three-scene-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}
</style>
