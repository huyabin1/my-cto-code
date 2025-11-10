<template>
  <div class="preview-viewport">
    <div ref="viewportContainer" class="viewport-container"></div>
    <div class="viewport-controls">
      <el-button-group>
        <el-button 
          size="mini" 
          icon="el-icon-refresh-left" 
          @click="resetView"
          title="重置视角"
        />
        <el-button 
          size="mini" 
          icon="el-icon-zoom-in" 
          @click="zoomIn"
          title="放大"
        />
        <el-button 
          size="mini" 
          icon="el-icon-zoom-out" 
          @click="zoomOut"
          title="缩小"
        />
      </el-button-group>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

export default {
  name: 'PreviewViewport',
  props: {
    backgroundColor: {
      type: String,
      default: '#2c3e50',
    },
  },
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      sceneGraph: null,
      defaultCameraPosition: new THREE.Vector3(15, 15, 15),
      defaultCameraTarget: new THREE.Vector3(0, 0, 0),
    };
  },
  mounted() {
    this.initViewport();
    this.setupSceneGraph();
    this.animate();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initViewport() {
      const container = this.$refs.viewportContainer;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.backgroundColor);

      // Create perspective camera
      this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      this.camera.position.copy(this.defaultCameraPosition);
      this.camera.lookAt(this.defaultCameraTarget);

      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false,
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.appendChild(this.renderer.domElement);

      // Add lights
      this.setupLights();

      // Add orbit controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      this.controls.enableRotate = true;
      this.controls.target.copy(this.defaultCameraTarget);
      this.controls.update();

      // Add grid and axes helper
      this.addHelpers();
    },

    setupLights() {
      // Ambient light for overall illumination
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      this.scene.add(ambientLight);

      // Main directional light (sun)
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

      // Fill light from opposite side
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-10, 10, -10);
      this.scene.add(fillLight);

      // Hemisphere light for ambient lighting
      const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.3);
      this.scene.add(hemisphereLight);
    },

    addHelpers() {
      // Grid helper
      const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
      this.scene.add(gridHelper);

      // Axes helper
      const axesHelper = new THREE.AxesHelper(5);
      this.scene.add(axesHelper);

      // Ground plane for shadows
      const groundGeometry = new THREE.PlaneGeometry(30, 30);
      const groundMaterial = new THREE.ShadowMaterial({
        opacity: 0.3,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      ground.receiveShadow = true;
      this.scene.add(ground);
    },

    setupSceneGraph() {
      this.sceneGraph = getSharedSceneGraph();
      
      // Add scene graph root to the scene
      const rootGroup = this.sceneGraph.getRootGroup();
      this.scene.add(rootGroup);

      // Subscribe to scene graph changes
      this.unsubscribe = this.sceneGraph.subscribe(this.handleSceneGraphChange);
    },

    handleSceneGraphChange(event) {
      // React to scene graph changes
      // The root group is already in the scene, so changes are automatic
      // We can add custom logic here if needed
      this.$emit('scene-graph-change', event);
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
      const container = this.$refs.viewportContainer;
      if (!container) return;

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

    resetView() {
      if (!this.camera || !this.controls) return;

      this.camera.position.copy(this.defaultCameraPosition);
      this.controls.target.copy(this.defaultCameraTarget);
      this.controls.update();
      
      this.$emit('view-reset');
    },

    zoomIn() {
      if (!this.camera) return;

      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      this.camera.position.addScaledVector(direction, 2);
      
      this.$emit('zoom-change', 'in');
    },

    zoomOut() {
      if (!this.camera) return;

      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      this.camera.position.addScaledVector(direction, -2);
      
      this.$emit('zoom-change', 'out');
    },

    cleanup() {
      window.removeEventListener('resize', this.handleResize);

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      if (this.unsubscribe) {
        this.unsubscribe();
      }

      if (this.controls) {
        this.controls.dispose();
      }

      if (this.renderer) {
        this.renderer.dispose();
        
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.animationId = null;
      this.sceneGraph = null;
    },

    getCamera() {
      return this.camera;
    },

    getScene() {
      return this.scene;
    },

    getRenderer() {
      return this.renderer;
    },
  },
};
</script>

<style scoped>
.preview-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.viewport-container {
  width: 100%;
  height: 100%;
}

.viewport-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.viewport-controls .el-button-group {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
