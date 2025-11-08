<template>
  <div ref="threeContainer" class="three-scene-container"></div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
// eslint-disable-next-line import/extensions
import WallFactory from '@/three/factory';
import ToolController from '@/three/tool/ToolController';

export default {
  name: 'ThreeScene',
  inject: ['store'],
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      toolController: null,
    };
  },
  mounted() {
    this.initThreeScene();
    this.animate();

    // Initialize tool controller
    this.initToolController();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initThreeScene() {
      // Create scene
      this.scene = new THREE.Scene();

      // Create camera
      const container = this.$refs.threeContainer;
      const width = container.clientWidth;
      const height = container.clientHeight;

      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      this.camera.position.set(20, 20, 20);
      this.camera.lookAt(0, 0, 0);

      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setClearColor('#f5f5f5', 1);
      this.renderer.setSize(width, height);

      // Enable shadows
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.appendChild(this.renderer.domElement);

      // Add lights
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

    animate() {
      this.animationId = requestAnimationFrame(this.animate);

      if (this.controls) {
        this.controls.update();
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },

    handleResize() {
      const container = this.$refs.threeContainer;
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (this.camera) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }

      if (this.renderer) {
        this.renderer.setSize(width, height);
      }
    },

    cleanup() {
      // Remove event listeners
      window.removeEventListener('resize', this.handleResize);

      // Cancel animation frame
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      // Dispose tool controller
      if (this.toolController) {
        this.toolController.destroy();
      }

      // Dispose controls
      if (this.controls) {
        this.controls.dispose();
      }

      // Dispose renderer
      if (this.renderer) {
        this.renderer.dispose();

        // Remove canvas from DOM
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      // Clear references
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.animationId = null;
      this.toolController = null;
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
