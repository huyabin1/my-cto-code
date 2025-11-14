<template>
  <div ref="threeContainer" class="three-scene-container"></div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
// eslint-disable-next-line import/extensions
import WallFactory from '@/three/factory';
import ToolController from '@/three/tool/ToolController';
import {
  getSharedRendererManager,
  getSharedCameraManager,
  getSharedRenderLoop,
  getSharedSceneGraph,
} from '@/three/core';
import { setupLighting } from '@/three/helper/lightingHelper';

export default {
  name: 'ThreeScene',
  inject: ['store'],
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      toolController: null,
      sceneGraph: null,
      renderLoop: null,
      rendererManager: null,
      cameraManager: null,
      renderCallback: null,
      unsubscribe: null,
    };
  },
  mounted() {
    this.initCoreManagers();
    this.initThreeScene();
    this.setupSceneGraph();
    this.startRenderLoop();

    // Initialize tool controller
    this.initToolController();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initCoreManagers() {
      this.rendererManager = getSharedRendererManager();
      this.cameraManager = getSharedCameraManager();
      this.renderLoop = getSharedRenderLoop();
    },

    initThreeScene() {
      // Create scene
      this.scene = new THREE.Scene();

      // Get container dimensions
      const container = this.$refs.threeContainer;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Create renderer using RendererManager
      this.renderer = this.rendererManager.createRenderer('main', {
        antialias: true,
        alpha: true,
        clearColor: '#f5f5f5',
        clearAlpha: 1,
        shadowMap: true,
        shadowMapType: THREE.PCFSoftShadowMap,
        pixelRatio: window.devicePixelRatio,
      });

      this.renderer.setSize(width, height);
      container.appendChild(this.renderer.domElement);

      // Create camera using CameraManager
      this.camera = this.cameraManager.createPerspectiveCamera('main', width, height, {
        fov: 75,
        near: 0.1,
        far: 1000,
        position: { x: 20, y: 20, z: 20 },
        lookAt: { x: 0, y: 0, z: 0 },
      });

      // Setup lighting
      setupLighting(this.scene);

      // Add orbit controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      this.controls.enableRotate = true;

      // Add example walls using WallFactory
      this.addExampleWalls();
    },

    setupSceneGraph() {
      this.sceneGraph = getSharedSceneGraph();
      
      // Add scene graph root to the scene
      const rootGroup = this.sceneGraph.getRootGroup();
      this.scene.add(rootGroup);

      // Subscribe to scene graph changes
      this.unsubscribe = this.sceneGraph.subscribe(this.handleSceneGraphChange);
    },

    handleSceneGraphChange() {
      // React to scene graph changes if needed
      // The root group is already in the scene, so changes are automatic
    },

    startRenderLoop() {
      // Create and store render callback to render loop
      this.renderCallback = () => {
        if (this.controls) {
          this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };

      this.renderLoop.addCallback(this.renderCallback);

      // Start the render loop if not already running
      if (!this.renderLoop.getIsRunning()) {
        this.renderLoop.start();
      }
    },

    initToolController() {
      this.toolController = new ToolController(this.scene, this.camera, this.renderer, this.store);
    },

    addExampleWalls() {
      // Create a simple room layout with different wall types
      const walls = [
        // Concrete walls (main structure)
        {
          start: new THREE.Vector2(-5, -5),
          end: new THREE.Vector2(5, -5),
          height: 2.8,
          thickness: 0.2,
          material: 'concrete',
        },
        {
          start: new THREE.Vector2(5, -5),
          end: new THREE.Vector2(5, 5),
          height: 2.8,
          thickness: 0.2,
          material: 'concrete',
        },
        {
          start: new THREE.Vector2(5, 5),
          end: new THREE.Vector2(-5, 5),
          height: 2.8,
          thickness: 0.2,
          material: 'concrete',
        },
        {
          start: new THREE.Vector2(-5, 5),
          end: new THREE.Vector2(-5, -5),
          height: 2.8,
          thickness: 0.2,
          material: 'concrete',
        },
        // Wood wall (interior partition)
        {
          start: new THREE.Vector2(0, -5),
          end: new THREE.Vector2(0, 0),
          height: 2.8,
          thickness: 0.15,
          material: 'wood',
        },
        // Glass wall (modern partition)
        {
          start: new THREE.Vector2(0, 0),
          end: new THREE.Vector2(0, 5),
          height: 2.8,
          thickness: 0.1,
          material: 'glass',
        },
        // Custom colored wall
        {
          start: new THREE.Vector2(-5, 0),
          end: new THREE.Vector2(0, 0),
          height: 2.8,
          thickness: 0.2,
          material: 'concrete',
          color: 0xff6b6b, // Red accent wall
        },
      ];

      walls.forEach((wallConfig) => {
        try {
          const wall = WallFactory.create(wallConfig);
          this.scene.add(wall);
        } catch (error) {
          // Silently handle wall creation errors in production
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('Error creating wall:', error);
          }
        }
      });

      // Add a grid helper for better visualization
      const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
      this.scene.add(gridHelper);

      // Add a ground plane
      const groundGeometry = new THREE.PlaneGeometry(20, 20);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        roughness: 0.8,
        metalness: 0.2,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      ground.receiveShadow = true;
      this.scene.add(ground);
    },

    handleResize() {
      const container = this.$refs.threeContainer;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Update camera aspect ratio using CameraManager
      this.cameraManager.updateAspectRatio('main', width, height);

      // Update renderer size
      if (this.renderer) {
        this.renderer.setSize(width, height);
      }
    },

    cleanup() {
      // Remove event listeners
      window.removeEventListener('resize', this.handleResize);

      // Remove render callback
      if (this.renderLoop && this.renderCallback) {
        this.renderLoop.removeCallback(this.renderCallback);
      }

      // Unsubscribe from scene graph
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      // Dispose tool controller
      if (this.toolController) {
        this.toolController.destroy();
      }

      // Dispose controls
      if (this.controls) {
        this.controls.dispose();
      }

      // Dispose renderer using RendererManager
      if (this.rendererManager && this.renderer) {
        this.rendererManager.removeRenderer('main');
      }

      // Clear references
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.toolController = null;
      this.sceneGraph = null;
      this.renderLoop = null;
      this.rendererManager = null;
      this.cameraManager = null;
      this.renderCallback = null;
    },

    // Exposed methods for parent components
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
.three-scene-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}
</style>
