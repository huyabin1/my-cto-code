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
import { getSharedRendererManager } from '@/three/core/RendererManager';
import GridHelperManager from '@/three/helper/GridHelper';
import AxisHelperManager from '@/three/helper/AxisHelper';

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
      frustumSize: 200,
      cameraHeight: 200,
      cameraNear: 0.1,
      cameraFar: 2000,
      rendererManager: null,
      rendererId: null,
      gridHelper: null,
      axisHelper: null,
      overlayElement: null,
    };
  },
  mounted() {
    this.rendererManager = getSharedRendererManager();
    this.rendererId = `floorplan-${this._uid}`;

    this.initThreeScene();
    this.setupSceneGraph();
    this.initToolController();
    this.initSelectionManager();
    this.initTransformGizmo();
    this.watchSelection();
    this.watchSnapping();
    this.animate();

    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initThreeScene() {
      const container = this.$refs.viewportContainer;
      const width = container.clientWidth || container.offsetWidth || 1024;
      const height = container.clientHeight || container.offsetHeight || 768;
      const aspect = width / Math.max(height, 1);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#f9fafb');

      const half = this.frustumSize / 2;
      this.camera = new THREE.OrthographicCamera(
        -half * aspect,
        half * aspect,
        half,
        -half,
        this.cameraNear,
        this.cameraFar
      );
      this.camera.position.set(0, this.cameraHeight, 0);
      this.camera.up.set(0, 0, -1);
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));

      this.renderer = this.rendererManager
        ? this.rendererManager.createRenderer(this.rendererId, {
            antialias: true,
            alpha: true,
            clearColor: '#f9fafb',
            clearAlpha: 1,
            shadowMap: false,
          })
        : new THREE.WebGLRenderer({ antialias: true, alpha: true });

      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
      this.renderer.setSize(width, height);
      this.renderer.domElement.classList.add('floorplan-canvas');
      this.renderer.domElement.setAttribute('data-testid', 'floorplan-canvas');
      container.appendChild(this.renderer.domElement);

      this.createSnappingOverlay(container, width, height);
      this.addLighting();
      this.initControls();
      this.initReferenceHelpers();

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },

    addLighting() {
      if (!this.scene) {
        return;
      }

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.35);
      directionalLight.position.set(80, 120, 40);
      this.scene.add(directionalLight);

      const hemisphereLight = new THREE.HemisphereLight(0xe0f2fe, 0xf3f4f6, 0.4);
      this.scene.add(hemisphereLight);
    },

    initControls() {
      if (!this.camera || !this.renderer) {
        return;
      }

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableRotate = false;
      this.controls.enablePan = true;
      this.controls.enableZoom = true;
      this.controls.screenSpacePanning = true;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.12;
      this.controls.zoomSpeed = 1.0;
      this.controls.panSpeed = 0.8;
      this.controls.minZoom = 0.1;
      this.controls.maxZoom = 20;
      this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
      this.controls.addEventListener('change', this.handleControlsChange);
    },

    initReferenceHelpers() {
      if (this.gridHelper) {
        this.gridHelper.dispose();
        this.gridHelper = null;
      }

      if (this.axisHelper) {
        this.axisHelper.dispose();
        this.axisHelper = null;
      }

      this.gridHelper = new GridHelperManager({
        store: this.store,
        scene: this.scene,
      });

      this.axisHelper = new AxisHelperManager({
        store: this.store,
        scene: this.scene,
      });
    },

    createSnappingOverlay(container, width, height) {
      if (this.overlayElement) {
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'snapping-overlay';
      overlay.setAttribute('data-testid', 'floorplan-snapping-overlay');
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;
      container.appendChild(overlay);
      this.overlayElement = overlay;
    },

    updateOverlaySize(width, height) {
      if (!this.overlayElement) {
        return;
      }

      if (width > 0) {
        this.overlayElement.style.width = `${width}px`;
      }

      if (height > 0) {
        this.overlayElement.style.height = `${height}px`;
      }
    },

    requestRender() {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },

    handleControlsChange() {
      this.requestRender();
    },

    setupSceneGraph() {
      this.sceneGraph = getSharedSceneGraph();
      const rootGroup = this.sceneGraph.getRootGroup();
      if (this.scene && !this.scene.children.includes(rootGroup)) {
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
        commandStack: this.toolController?.commandStack,
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
      this.requestRender();
    },

    handleResize() {
      if (!this.renderer || !this.camera) {
        return;
      }
      const container = this.$refs.viewportContainer;
      const width = container.clientWidth || container.offsetWidth || 1024;
      const height = container.clientHeight || container.offsetHeight || 768;
      const aspect = width / Math.max(height, 1);

      if (this.camera.isOrthographicCamera) {
        const half = this.frustumSize / 2;
        this.camera.left = -half * aspect;
        this.camera.right = half * aspect;
        this.camera.top = half;
        this.camera.bottom = -half;
        this.camera.updateProjectionMatrix();
      }

      this.renderer.setSize(width, height);
      this.updateOverlaySize(width, height);
      this.requestRender();
    },

    cleanup() {
      window.removeEventListener('resize', this.handleResize);

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      if (this.controls) {
        this.controls.removeEventListener('change', this.handleControlsChange);
        this.controls.dispose();
        this.controls = null;
      }

      if (this.unwatchSelection) {
        this.unwatchSelection();
        this.unwatchSelection = null;
      }

      if (this.unwatchSnapping) {
        this.unwatchSnapping();
        this.unwatchSnapping = null;
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

      if (this.gridHelper) {
        this.gridHelper.dispose();
        this.gridHelper = null;
      }

      if (this.axisHelper) {
        this.axisHelper.dispose();
        this.axisHelper = null;
      }

      if (this.overlayElement && this.overlayElement.parentNode) {
        this.overlayElement.parentNode.removeChild(this.overlayElement);
      }
      this.overlayElement = null;

      if (this.rendererManager && this.rendererId) {
        this.rendererManager.removeRenderer(this.rendererId);
      } else if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.rendererManager = null;
      this.rendererId = null;
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
  background-color: #f9fafb;
}

.floorplan-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.snapping-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
  z-index: 2;
}
</style>
