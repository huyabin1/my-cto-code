import Vue from 'vue';
import Vuex from 'vuex';
import cad from './modules/cad';
import walls from './modules/walls';
import selection from './modules/selection';
import tools from './modules/tools';
import preferences from './modules/preferences';

Vue.use(Vuex);

export default new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  modules: {
    cad,
    walls,
    selection,
    tools,
    preferences,
  },
});
