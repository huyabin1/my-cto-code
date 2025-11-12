<template>
  <div ref="viewportContainer" class="floorplan-viewport"></div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import ToolController from '@/three/tool/ToolController';
import SelectionManager from '@/three/helper/SelectionManager';
import TransformGizmo from '@/three/helper/TransformGizmo';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

export default {
  name: 'FloorplanViewport',
  inject: ['store'],
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      toolController: null,
      sceneGraph: null,
      selectionManager: null,
      transformGizmo: null,
      unwatchSelection: null,
      unwatchSnapping: null,
      unwatchViewport: null,
      frustumSize: 60,
    };
  },
  mounted() {
    this.initThreeScene();
    this.setupSceneGraph();
    this.initToolController();
    this.initSelectionManager();
    this.initTransformGizmo();
    this.watchSelection();
    this.watchSnapping();
    this.watchViewport();
    this.animate();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initThreeScene() {
      const container = this.$refs.viewportContainer;
      const width = container.clientWidth || container.offsetWidth || 800;
      const height = container.clientHeight || container.offsetHeight || 600;
      const aspect = width / Math.max(height, 1);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#f5f5f5');

      const halfFrustum = this.frustumSize / 2;
      this.camera = new THREE.OrthographicCamera(
        -halfFrustum * aspect,
        halfFrustum * aspect,
        halfFrustum,
        -halfFrustum,
        0.1,
        1000
      );
      this.camera.position.set(0, 80, 0);
      this.camera.up.set(0, 0, -1);
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(width, height);
      container.appendChild(this.renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight.position.set(10, 20, 10);
      this.scene.add(directionalLight);

      const grid = new THREE.GridHelper(200, 100, 0xd1d5db, 0xe5e7eb);
      grid.rotation.x = Math.PI / 2;
      grid.visible = this.store.state.viewport.gridVisible;
      grid.name = 'grid';
      this.scene.add(grid);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableRotate = false;
      this.controls.enablePan = true;
      this.controls.enableZoom = true;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.12;
      this.controls.minZoom = 0.2;
      this.controls.maxZoom = 5;
      this.controls.addEventListener('change', () => {
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      });
    },

    setupSceneGraph() {
      this.sceneGraph = getSharedSceneGraph();
      const rootGroup = this.sceneGraph.getRootGroup();
      if (!this.scene.children.includes(rootGroup)) {
        this.scene.add(rootGroup);
      }
    },

    initToolController() {
      this.toolController = new ToolController(this.scene, this.camera, this.renderer, this.store);
    },

    initSelectionManager() {
      this.selectionManager = new SelectionManager({
        camera: this.camera,
        domElement: this.renderer.domElement,
        scene: this.scene,
        store: this.store,
        sceneGraph: this.sceneGraph,
        onSelectionChange: (selection) => this.syncTransformTarget(selection),
      });
    },

    initTransformGizmo() {
      this.transformGizmo = new TransformGizmo({
        camera: this.camera,
        domElement: this.renderer.domElement,
        scene: this.scene,
        store: this.store,
        commandStack: this.toolController.commandStack,
        sceneGraph: this.sceneGraph,
        onDragStateChange: (isDragging) => {
          if (this.controls) {
            this.controls.enabled = !isDragging;
          }
        },
      });
      this.transformGizmo.updateSnapping(this.store.state.editor.snapping);
      this.syncTransformTarget(this.store.state.editor.selection);
    },

    watchSelection() {
      this.unwatchSelection = this.store.watch(
        (state) => state.editor.selection,
        (selection) => this.syncTransformTarget(selection),
        { deep: true }
      );
    },

    watchSnapping() {
      this.unwatchSnapping = this.store.watch(
        (state) => state.editor.snapping,
        (snapping) => {
          if (this.transformGizmo) {
            this.transformGizmo.updateSnapping(snapping);
          }
        },
        { deep: true }
      );
    },

    watchViewport() {
      this.unwatchViewport = this.store.watch(
        (state) => state.viewport,
        (viewport) => {
          // Update grid visibility
          if (this.scene) {
            const grid = this.scene.getObjectByName('grid');
            if (grid) {
              grid.visible = viewport.gridVisible;
            }
          }

          // Update controls configuration
          if (this.controls) {
            Object.assign(this.controls, viewport.controls);
          }
        },
        { deep: true }
      );
    },

    syncTransformTarget(selection) {
      if (!this.transformGizmo) {
        return;
      }
      const ids = (selection && selection.ids) || [];
      if (ids.length === 1) {
        const entityData = this.sceneGraph.getEntity(ids[0]);
        if (entityData && entityData.threeObject) {
          this.transformGizmo.attach(entityData.threeObject, ids[0]);
          return;
        }
      }
      this.transformGizmo.detach();
    },

    animate() {
      this.animationId = requestAnimationFrame(() => this.animate());
      if (this.controls) {
        this.controls.update();
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },

    handleResize() {
      if (!this.renderer || !this.camera) {
        return;
      }
      const container = this.$refs.viewportContainer;
      const width = container.clientWidth || container.offsetWidth || 800;
      const height = container.clientHeight || container.offsetHeight || 600;
      const aspect = width / Math.max(height, 1);

      if (this.camera.isOrthographicCamera) {
        const half = this.frustumSize / 2;
        this.camera.left = -half * aspect;
        this.camera.right = half * aspect;
        this.camera.top = half;
        this.camera.bottom = -half;
        this.camera.updateProjectionMatrix();
      } else if (this.camera.isPerspectiveCamera) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
      }

      this.renderer.setSize(width, height);
    },

    cleanup() {
      window.removeEventListener('resize', this.handleResize);

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      if (this.unwatchSelection) {
        this.unwatchSelection();
        this.unwatchSelection = null;
      }

      if (this.unwatchSnapping) {
        this.unwatchSnapping();
        this.unwatchSnapping = null;
      }

      if (this.unwatchViewport) {
        this.unwatchViewport();
        this.unwatchViewport = null;
      }

      if (this.selectionManager) {
        this.selectionManager.destroy();
        this.selectionManager = null;
      }

      if (this.transformGizmo) {
        this.transformGizmo.destroy();
        this.transformGizmo = null;
      }

      if (this.toolController) {
        this.toolController.destroy();
        this.toolController = null;
      }

      if (this.controls) {
        this.controls.dispose();
        this.controls = null;
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
      this.sceneGraph = null;
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

    getToolController() {
      return this.toolController;
    },
  },
};
</script>

<style scoped>
.floorplan-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;
}
</style>
