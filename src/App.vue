<template>
  <div id="app">
    <section class="editor-surface">
      <div id="three-scene-mount" class="three-scene" aria-label="Three.js scene mount">
        Three.js Scene Placeholder
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'App',
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
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
