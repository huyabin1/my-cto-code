import Vue from 'vue';
import Vuex from 'vuex';
import cad from './modules/cad';
import editor from './modules/editor';
import walls from './modules/walls';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    cad,
    editor,
    walls,
  },
});
