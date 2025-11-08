<template>
  <div id="app">
    <EditorLayout />
  </div>
</template>

<script>
import EditorLayout from './components/editor/EditorLayout';

export default {
  name: 'App',
  components: {
    EditorLayout,
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

body {
  font-family: 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
    sans-serif;
  background-color: #f3f4f6;
}
</style>

<style scoped>
#app {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
