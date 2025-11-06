<template>
  <div ref="threeContainer" class="three-scene-container"></div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'ThreeScene',
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      cadGroup: null,
    };
  },
  computed: {
    ...mapState('cad', {
      cadOpacity: (state) => state.opacity,
      cadLayerGeometries: (state) => state.layerGeometries,
    }),
    ...mapGetters('cad', ['visibleLayerIds', 'unitScale']),
  },
  watch: {
    cadLayerGeometries: {
      handler: 'rebuildCadOverlay',
      deep: true,
    },
    unitScale() {
      this.rebuildCadOverlay();
    },
    cadOpacity() {
      this.updateCadOpacity();
    },
    visibleLayerIds() {
      this.updateLayerVisibility();
    },
  },
  mounted() {
    this.initThreeScene();
    this.createCadOverlayGroup();
    this.rebuildCadOverlay();
    this.updateCadOpacity();
    this.updateLayerVisibility();
    this.animate();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initThreeScene() {
      this.scene = new THREE.Scene();

      const container = this.$refs.threeContainer;
      const width = container.clientWidth;
      const height = container.clientHeight;

      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      this.camera.position.set(20, 20, 20);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
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
      window.removeEventListener('resize', this.handleResize);

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
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

      this.disposeCadGroup();

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.animationId = null;
    },
    createCadOverlayGroup() {
      if (!this.scene) {
        return;
      }

      if (this.cadGroup) {
        this.disposeCadGroup();
      }

      this.cadGroup = new THREE.Group();
      this.cadGroup.name = 'CADOverlay';
      this.scene.add(this.cadGroup);
    },
    clearCadGroupChildren() {
      if (!this.cadGroup || !Array.isArray(this.cadGroup.children)) {
        return;
      }

      const layerGroups = this.cadGroup.children.slice();
      layerGroups.forEach((layerGroup) => {
        if (!layerGroup || !Array.isArray(layerGroup.children)) {
          return;
        }

        const polylineChildren = layerGroup.children.slice();
        polylineChildren.forEach((child) => {
          if (child.geometry && typeof child.geometry.dispose === 'function') {
            child.geometry.dispose();
          }
          if (child.material && typeof child.material.dispose === 'function') {
            child.material.dispose();
          }
          if (typeof layerGroup.remove === 'function') {
            layerGroup.remove(child);
          }
        });

        if (typeof this.cadGroup.remove === 'function') {
          this.cadGroup.remove(layerGroup);
        }
      });
    },
    disposeCadGroup() {
      if (!this.cadGroup) {
        return;
      }

      this.clearCadGroupChildren();

      if (this.scene) {
        this.scene.remove(this.cadGroup);
      }

      this.cadGroup = null;
    },
    rebuildCadOverlay() {
      if (!this.scene) {
        return;
      }

      if (!this.cadGroup) {
        this.createCadOverlayGroup();
      }

      this.clearCadGroupChildren();

      const geometries = this.cadLayerGeometries || {};
      const layerIds = Object.keys(geometries);
      const unitScale = this.unitScale;

      if (!layerIds.length) {
        this.updateCadOpacity();
        this.updateLayerVisibility();
        return;
      }

      layerIds.forEach((layerId) => {
        const layerData = geometries[layerId];
        if (!layerData || !Array.isArray(layerData.polylines) || !layerData.polylines.length) {
          return;
        }

        const layerGroup = new THREE.Group();
        layerGroup.name = `CADLayer:${layerData.name || layerId}`;
        layerGroup.userData = { layerId };

        layerData.polylines.forEach((polyline, index) => {
          const lineObject = this.createLineFromPolyline(polyline, unitScale);
          if (lineObject) {
            lineObject.name = `CADPolyline:${layerId}:${index}`;
            layerGroup.add(lineObject);
          }
        });

        if (layerGroup.children.length) {
          layerGroup.visible = this.visibleLayerIds.includes(layerId);
          this.cadGroup.add(layerGroup);
        }
      });

      this.updateCadOpacity();
      this.updateLayerVisibility();
    },
    createLineFromPolyline(polyline, unitScale) {
      if (!polyline || !Array.isArray(polyline.points) || polyline.points.length < 2) {
        return null;
      }

      const positions = [];
      const points = polyline.points;

      for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        positions.push(start.x * unitScale, 0, -start.y * unitScale);
        positions.push(end.x * unitScale, 0, -end.y * unitScale);
      }

      if (polyline.isClosed && points.length > 2) {
        const first = points[0];
        const last = points[points.length - 1];
        positions.push(last.x * unitScale, 0, -last.y * unitScale);
        positions.push(first.x * unitScale, 0, -first.y * unitScale);
      }

      if (!positions.length) {
        return null;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: polyline.color || '#9ca3af',
        transparent: true,
        opacity: this.cadOpacity,
        depthTest: false,
        depthWrite: false,
      });

      const line = new THREE.LineSegments(geometry, material);
      line.frustumCulled = false;
      return line;
    },
    updateCadOpacity() {
      if (!this.cadGroup) {
        return;
      }

      const opacity = this.cadOpacity;

      this.cadGroup.children.forEach((layerGroup) => {
        if (!Array.isArray(layerGroup.children)) {
          return;
        }

        layerGroup.children.forEach((child) => {
          if (child.material) {
            child.material.opacity = opacity;
            child.material.transparent = opacity < 1;
            if ('needsUpdate' in child.material) {
              child.material.needsUpdate = true;
            }
          }
        });
      });
    },
    updateLayerVisibility() {
      if (!this.cadGroup) {
        return;
      }

      const visibleSet = new Set(this.visibleLayerIds);

      this.cadGroup.children.forEach((layerGroup) => {
        const { layerId } = layerGroup.userData || {};
        if (!layerId) {
          return;
        }
        layerGroup.visible = visibleSet.has(layerId);
      });
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
