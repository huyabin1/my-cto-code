<template>
  <div id="app">
    <section class="editor-surface">
      <ThreeScene ref="threeScene" class="three-scene" />
    </section>
  </div>
</template>

<script>
import * as THREE from 'three';
import ThreeScene from './components/editor/ThreeScene.vue';

export default {
  name: 'App',
  components: {
    ThreeScene,
  },
  mounted() {
    // Example of accessing Three.js objects after component is mounted
    this.$nextTick(() => {
      this.logThreeObjects();
    });
  },
  methods: {
    logThreeObjects() {
      if (this.$refs.threeScene) {
        const scene = this.$refs.threeScene.getScene();
        const camera = this.$refs.threeScene.getCamera();
        const renderer = this.$refs.threeScene.getRenderer();

        if (scene) {
          console.log('Scene accessible:', scene);
          // Add a sample cube to demonstrate scene usage
          this.addSampleCube(scene);
        }

        if (camera) {
          console.log('Camera accessible:', camera);
        }

        if (renderer) {
          console.log('Renderer accessible:', renderer);
        }
      }
    },

    addSampleCube(scene) {
      // Add a sample cube to demonstrate the scene is working
      const geometry = new THREE.BoxGeometry(5, 5, 5);
      const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        shininess: 100,
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(0, 2.5, 0);
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);

      // Add a ground plane
      const planeGeometry = new THREE.PlaneGeometry(50, 50);
      const planeMaterial = new THREE.MeshPhongMaterial({
        color: 0x808080,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.rotation.x = -Math.PI / 2;
      plane.receiveShadow = true;
      scene.add(plane);
    },
  },
};
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}
</style>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-surface {
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #111827;
  padding: 1rem;
  box-sizing: border-box;
}

.three-scene {
  width: 100%;
  height: 100%;
}
</style>
