import Vue from 'vue';
import CompositionApi from '@vue/composition-api';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App.vue';
import store from './store';
import { initializeWalls } from './utils/wallManager';

Vue.use(CompositionApi);
Vue.use(ElementUI);

Vue.config.productionTip = false;

// Initialize walls system
initializeWalls(store);

new Vue({
  store,
  render: (h) => h(App),
}).$mount('#app');
