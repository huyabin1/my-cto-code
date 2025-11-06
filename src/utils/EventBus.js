import Vue from 'vue';

const bus = new Vue();

export default {
  emit(event, payload) {
    bus.$emit(event, payload);
  },
  on(event, handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }
    bus.$on(event, handler);
    return () => {
      bus.$off(event, handler);
    };
  },
  once(event, handler) {
    bus.$once(event, handler);
    return () => {
      bus.$off(event, handler);
    };
  },
  off(event, handler) {
    bus.$off(event, handler);
  },
};
