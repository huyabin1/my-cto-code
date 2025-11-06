<template>
  <div ref="threeContainer" class="three-scene-container"></div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { mapState, mapGetters } from 'vuex';
import CADOverlayBuilder from '@/three/helper/CADOverlayBuilder';

const UNIT_TO_METERS = {
  auto: 1,
  mm: 0.001,
  cm: 0.01,
  m: 1,
  ft: 0.3048,
};

export default {
  name: 'ThreeScene',
  computed: {
    ...mapState('cad', {
      cadLayers: (state) => state.layers,
      overlayOpacity: (state) => state.overlayOpacity,
      overlayPolylines: (state) => state.overlayPolylines,
      selectedUnit: (state) => state.selectedUnit,
    }),
    ...mapState('editor', {
      snapping: (state) => state.snapping,
    }),
    ...mapGetters('cad', ['layerVisibilityMap', 'layerStyleMap']),
  },
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      overlayBuilder: null,
      overlayGroup: null,
      gridHelper: null,
      snappingGroup: null,
      orthogonalHelper: null,
      diagonalHelper: null,
    };
  },
  watch: {
    overlayOpacity(newOpacity) {
      this.updateOverlayOpacity(newOpacity);
    },
    cadLayers: {
      deep: true,
      handler() {
        this.updateLayerState();
      },
    },
    overlayPolylines: {
      deep: true,
      handler() {
        this.rebuildOverlay();
      },
    },
    selectedUnit() {
      this.updateUnitScaling();
    },
    snapping: {
      deep: true,
      handler() {
        this.updateSnappingVisibility();
      },
    },
  },
  mounted() {
    this.overlayBuilder = new CADOverlayBuilder();
    this.initThreeScene();
    this.initGridHelper();
    this.initSnappingHelpers();
    this.rebuildOverlay();
    this.updateUnitScaling();
    this.updateOverlayOpacity(this.overlayOpacity);
    this.updateLayerState();
    this.updateSnappingVisibility();
    this.animate();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initThreeScene() {
      const container = this.$refs.threeContainer;
      if (!container) {
        return;
      }

      this.scene = new THREE.Scene();

      const width = container.clientWidth;
      const height = container.clientHeight;

      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      this.camera.position.set(20, 20, 20);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
      this.renderer.setClearColor('#f5f5f5', 1);
      this.renderer.setSize(width, height);

      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.appendChild(this.renderer.domElement);

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
    },

    initGridHelper() {
      if (!this.scene) {
        return;
      }
      this.gridHelper = new THREE.GridHelper(10, 10, 0x4b5563, 0x9ca3af);
      this.gridHelper.name = 'EditorGrid';
      this.gridHelper.position.set(0, 0.001, 0);
      const materials = Array.isArray(this.gridHelper.material)
        ? this.gridHelper.material
        : [this.gridHelper.material];
      materials.forEach((material) => {
        if (material) {
          material.transparent = true;
          material.opacity = 0.25;
          material.depthWrite = false;
        }
      });
      this.scene.add(this.gridHelper);
    },

    initSnappingHelpers() {
      if (!this.scene) {
        return;
      }
      this.snappingGroup = new THREE.Group();
      this.snappingGroup.name = 'SnappingHelpers';
      this.snappingGroup.position.set(0, 0.002, 0);

      this.orthogonalHelper = this.createHelperLine(
        [
          [
            [0, 0],
            [1, 0],
          ],
          [
            [0, 0],
            [-1, 0],
          ],
          [
            [0, 0],
            [0, 1],
          ],
          [
            [0, 0],
            [0, -1],
          ],
        ],
        0x22c55e
      );
      this.orthogonalHelper.name = 'SnapOrthogonal';

      this.diagonalHelper = this.createHelperLine(
        [
          [
            [0, 0],
            [1, 1],
          ],
          [
            [0, 0],
            [-1, 1],
          ],
          [
            [0, 0],
            [1, -1],
          ],
          [
            [0, 0],
            [-1, -1],
          ],
        ],
        0xfbbf24
      );
      this.diagonalHelper.name = 'SnapDiagonal';

      this.snappingGroup.add(this.orthogonalHelper);
      this.snappingGroup.add(this.diagonalHelper);

      this.scene.add(this.snappingGroup);
    },

    createHelperLine(pairs, color) {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      pairs.forEach((pair) => {
        const [start, end] = pair;
        vertices.push(start[0], 0, start[1], end[0], 0, end[1]);
      });
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const line = new THREE.LineSegments(geometry, material);
      line.userData = { helper: true };
      return line;
    },

    rebuildOverlay() {
      if (!this.overlayBuilder) {
        return;
      }
      this.disposeOverlay();

      if (!Array.isArray(this.overlayPolylines) || this.overlayPolylines.length === 0) {
        return;
      }

      this.overlayGroup = this.overlayBuilder.build(this.overlayPolylines, {
        opacity: this.overlayOpacity,
        visibilityByLayer: this.layerVisibilityMap,
        layerStyles: this.layerStyleMap,
      });
      this.overlayGroup.position.set(0, 0, 0);
      if (this.scene) {
        this.scene.add(this.overlayGroup);
      }
      this.updateUnitScaling();
    },

    updateOverlayOpacity(opacity) {
      if (!this.overlayBuilder || !this.overlayGroup) {
        return;
      }
      this.overlayBuilder.updateOpacity(this.overlayGroup, opacity);
    },

    updateLayerState() {
      if (!this.overlayBuilder || !this.overlayGroup) {
        return;
      }
      this.overlayBuilder.applyLayerVisibility(this.overlayGroup, this.layerVisibilityMap);
      this.overlayBuilder.updateLayerStyles(this.overlayGroup, this.layerStyleMap);
    },

    updateUnitScaling() {
      const scale = UNIT_TO_METERS[this.selectedUnit] || 1;
      if (this.overlayGroup) {
        this.overlayGroup.scale.set(scale, scale, scale);
      }
      if (this.gridHelper) {
        this.gridHelper.scale.set(scale, scale, scale);
      }
      if (this.snappingGroup) {
        this.snappingGroup.scale.set(scale, scale, scale);
      }
    },

    updateSnappingVisibility() {
      if (this.gridHelper) {
        this.gridHelper.visible = !!(this.snapping && this.snapping.grid);
      }
      if (this.orthogonalHelper) {
        this.orthogonalHelper.visible = !!(this.snapping && this.snapping.orthogonal);
      }
      if (this.diagonalHelper) {
        this.diagonalHelper.visible = !!(this.snapping && this.snapping.diagonal45);
      }
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
      if (!container) {
        return;
      }
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

    disposeOverlay() {
      if (!this.overlayGroup) {
        return;
      }
      if (this.scene) {
        this.scene.remove(this.overlayGroup);
      }
      const materials = this.overlayGroup.userData?.layerMaterials;
      if (materials && typeof materials.forEach === 'function') {
        materials.forEach((material) => {
          if (material && typeof material.dispose === 'function') {
            material.dispose();
          }
        });
        if (typeof materials.clear === 'function') {
          materials.clear();
        }
      }
      this.overlayGroup.traverse((child) => {
        if (child.isLineSegments) {
          if (child.geometry && typeof child.geometry.dispose === 'function') {
            child.geometry.dispose();
          }
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              if (material && typeof material.dispose === 'function') {
                material.dispose();
              }
            });
          } else if (child.material && typeof child.material.dispose === 'function') {
            child.material.dispose();
          }
        }
      });
      const groups = this.overlayGroup.userData?.layerGroups;
      if (groups && typeof groups.clear === 'function') {
        groups.clear();
      }
      this.overlayGroup = null;
    },

    disposeGridHelper() {
      if (!this.gridHelper) {
        return;
      }
      if (this.scene) {
        this.scene.remove(this.gridHelper);
      }
      if (this.gridHelper.geometry && typeof this.gridHelper.geometry.dispose === 'function') {
        this.gridHelper.geometry.dispose();
      }
      const materials = Array.isArray(this.gridHelper.material)
        ? this.gridHelper.material
        : [this.gridHelper.material];
      materials.forEach((material) => {
        if (material && typeof material.dispose === 'function') {
          material.dispose();
        }
      });
      this.gridHelper = null;
    },

    disposeSnappingHelpers() {
      if (!this.snappingGroup) {
        return;
      }
      if (this.scene) {
        this.scene.remove(this.snappingGroup);
      }
      this.snappingGroup.traverse((child) => {
        if (child.isLineSegments) {
          if (child.geometry && typeof child.geometry.dispose === 'function') {
            child.geometry.dispose();
          }
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              if (material && typeof material.dispose === 'function') {
                material.dispose();
              }
            });
          } else if (child.material && typeof child.material.dispose === 'function') {
            child.material.dispose();
          }
        }
      });
      this.snappingGroup = null;
      this.orthogonalHelper = null;
      this.diagonalHelper = null;
    },

    cleanup() {
      window.removeEventListener('resize', this.handleResize);

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      if (this.controls) {
        this.controls.dispose();
      }

      this.disposeOverlay();
      this.disposeGridHelper();
      this.disposeSnappingHelpers();

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
      this.overlayBuilder = null;
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
