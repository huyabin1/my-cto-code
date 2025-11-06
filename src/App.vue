<template>
  <div id="app">
    <section id="three-scene-mount" class="editor-surface">
      <ThreeScene ref="threeScene" class="three-scene" />
    </section>
  </div>
</template>

<script>
import ThreeScene from './components/editor/ThreeScene.vue';

export default {
  name: 'App',
  components: {
    ThreeScene,
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
