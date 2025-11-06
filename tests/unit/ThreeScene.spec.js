import { shallowMount, createLocalVue } from '@vue/test-utils';
import VueCompositionApi from '@vue/composition-api';
import Vuex from 'vuex';
import ThreeScene from '@/components/editor/ThreeScene.vue';
import cadModule from '@/store/modules/cad';

// Mock Three.js to avoid WebGL context issues in tests
jest.mock('three', () => {
  const createGroup = () => {
    const group = {
      children: [],
      userData: {},
      visible: true,
      position: { set: jest.fn() },
    };

    group.add = jest.fn((child) => {
      group.children.push(child);
    });
    group.remove = jest.fn((child) => {
      group.children = group.children.filter((item) => item !== child);
    });

    return group;
  };

  const createBufferGeometry = () => {
    const geometry = {
      attributes: {},
      setAttribute: jest.fn(function setAttribute(name, value) {
        this.attributes[name] = value;
      }),
      dispose: jest.fn(),
    };
    return geometry;
  };

  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
    })),
    Group: jest.fn().mockImplementation(() => createGroup()),
    PerspectiveCamera: jest.fn().mockImplementation((fov, aspect, near, far) => ({
      fov,
      aspect,
      near,
      far,
      position: { set: jest.fn() },
      lookAt: jest.fn(),
      updateProjectionMatrix: jest.fn(),
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setPixelRatio: jest.fn(),
      setClearColor: jest.fn(),
      setSize: jest.fn(),
      domElement: {},
      render: jest.fn(),
      dispose: jest.fn(),
      shadowMap: { enabled: false, type: null },
    })),
    BufferGeometry: jest.fn().mockImplementation(() => createBufferGeometry()),
    Float32BufferAttribute: jest.fn().mockImplementation((array, itemSize) => ({
      array,
      itemSize,
    })),
    LineBasicMaterial: jest.fn().mockImplementation((params = {}) => ({
      ...params,
      dispose: jest.fn(),
      needsUpdate: false,
    })),
    LineSegments: jest.fn().mockImplementation((geometry, material) => ({
      geometry,
      material,
      children: [],
      visible: true,
      frustumCulled: true,
    })),
    AmbientLight: jest.fn(),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      castShadow: false,
      shadow: {
        mapSize: { width: 0, height: 0 },
        camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 },
      },
    })),
    PCFSoftShadowMap: 'PCFSoftShadowMap',
  };
});

jest.mock('three-stdlib', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    enableDamping: true,
    dampingFactor: 0.05,
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
    update: jest.fn(),
    dispose: jest.fn(),
  })),
}));

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock window.addEventListener and removeEventListener
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

window.addEventListener = jest.fn();
window.removeEventListener = jest.fn();

const normalizePositions = (array) => array.map((value) => (Object.is(value, -0) ? 0 : value));

describe('ThreeScene.vue', () => {
  let wrapper;
  let localVue;
  let store;
  let mockContainer;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueCompositionApi);
    localVue.use(Vuex);

    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2,
    });

    mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: jest.fn(),
    };

    store = new Vuex.Store({
      modules: {
        cad: {
          namespaced: true,
          state: cadModule.state,
          getters: cadModule.getters,
          mutations: cadModule.mutations,
          actions: cadModule.actions,
        },
      },
    });

    wrapper = shallowMount(ThreeScene, {
      localVue,
      store,
      mocks: {
        $refs: {
          threeContainer: mockContainer,
        },
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
      wrapper = null;
    }
    jest.clearAllMocks();
  });

  afterAll(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  it('renders a div container', () => {
    expect(wrapper.find('.three-scene-container').exists()).toBe(true);
  });

  it('initializes Three.js scene objects on mount', () => {
    expect(wrapper.vm.scene).toBeDefined();
    expect(wrapper.vm.camera).toBeDefined();
    expect(wrapper.vm.renderer).toBeDefined();
    expect(wrapper.vm.controls).toBeDefined();
  });

  it('exposes getScene, getCamera, and getRenderer methods', () => {
    expect(typeof wrapper.vm.getScene).toBe('function');
    expect(typeof wrapper.vm.getCamera).toBe('function');
    expect(typeof wrapper.vm.getRenderer).toBe('function');

    expect(wrapper.vm.getScene()).toBeDefined();
    expect(wrapper.vm.getCamera()).toBeDefined();
    expect(wrapper.vm.getRenderer()).toBeDefined();
  });

  it('sets up window resize listener on mount', () => {
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('cleans up properly before destroy', () => {
    const controlsDispose = wrapper.vm.controls.dispose;
    const rendererDispose = wrapper.vm.renderer.dispose;

    wrapper.destroy();
    wrapper = null;

    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
    expect(controlsDispose).toHaveBeenCalled();
    expect(rendererDispose).toHaveBeenCalled();
  });

  it('configures renderer with correct settings', () => {
    const { WebGLRenderer } = require('three');
    expect(WebGLRenderer).toHaveBeenCalledWith({
      antialias: true,
      alpha: true,
    });
    expect(wrapper.vm.renderer.setPixelRatio).toHaveBeenCalledWith(2);
    expect(wrapper.vm.renderer.setClearColor).toHaveBeenCalledWith('#f5f5f5', 1);
    expect(wrapper.vm.renderer.shadowMap.enabled).toBe(true);
  });

  it('configures camera with correct position and aspect ratio', () => {
    const { PerspectiveCamera } = require('three');
    expect(PerspectiveCamera).toHaveBeenCalledWith(75, 800 / 600, 0.1, 1000);
    expect(wrapper.vm.camera.position.set).toHaveBeenCalledWith(20, 20, 20);
    expect(wrapper.vm.camera.lookAt).toHaveBeenCalledWith(0, 0, 0);
  });

  it('configures OrbitControls with damping enabled', () => {
    const { OrbitControls } = require('three-stdlib');
    expect(OrbitControls).toHaveBeenCalled();
    expect(wrapper.vm.controls.enableDamping).toBe(true);
    expect(wrapper.vm.controls.dampingFactor).toBe(0.05);
  });

  it('adds lights and CAD overlay group to the scene', () => {
    const { Scene } = require('three');
    const sceneInstance = Scene.mock.results[0].value;
    expect(sceneInstance.add).toHaveBeenCalledTimes(3); // ambient, directional, CAD overlay group
    expect(wrapper.vm.cadGroup).toBeDefined();
    expect(wrapper.vm.cadGroup.name).toBe('CADOverlay');
  });

  it('builds CAD overlay geometry using unit scale', async () => {
    store.commit('cad/SET_LAYER_GEOMETRIES', {
      LayerA: {
        name: 'LayerA',
        color: '#ff0000',
        polylines: [
          {
            color: '#ff0000',
            points: [
              { x: 0, y: 0 },
              { x: 1000, y: 0 },
            ],
            isClosed: false,
          },
        ],
      },
    });
    store.commit('cad/SET_LAYERS', [
      { id: 'LayerA', name: 'LayerA', visible: true, color: '#ff0000', entityCount: 1 },
    ]);

    await localVue.nextTick();
    await localVue.nextTick();

    const layerGroup = wrapper.vm.cadGroup.children[0];
    expect(layerGroup).toBeDefined();
    const line = layerGroup.children[0];
    expect(normalizePositions(line.geometry.attributes.position.array)).toEqual([0, 0, 0, 1, 0, 0]);

    store.commit('cad/SET_SELECTED_UNIT', 'm');
    await localVue.nextTick();
    await localVue.nextTick();

    const updatedLayerGroup = wrapper.vm.cadGroup.children[0];
    const updatedLine = updatedLayerGroup.children[0];
    expect(normalizePositions(updatedLine.geometry.attributes.position.array)).toEqual([0, 0, 0, 1000, 0, 0]);
  });

  it('updates layer visibility when state changes', async () => {
    store.commit('cad/SET_LAYER_GEOMETRIES', {
      LayerVisible: {
        name: 'LayerVisible',
        color: '#ff0000',
        polylines: [
          {
            color: '#ff0000',
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
            ],
            isClosed: false,
          },
        ],
      },
      LayerHidden: {
        name: 'LayerHidden',
        color: '#0000ff',
        polylines: [
          {
            color: '#0000ff',
            points: [
              { x: 0, y: 0 },
              { x: 0, y: 100 },
            ],
            isClosed: false,
          },
        ],
      },
    });

    store.commit('cad/SET_LAYERS', [
      { id: 'LayerVisible', name: 'LayerVisible', visible: true, color: '#ff0000', entityCount: 1 },
      { id: 'LayerHidden', name: 'LayerHidden', visible: false, color: '#0000ff', entityCount: 1 },
    ]);

    await localVue.nextTick();
    await localVue.nextTick();

    expect(wrapper.vm.cadGroup.children.length).toBe(2);
    const visibleCount = wrapper.vm.cadGroup.children.filter((group) => group.visible).length;
    expect(visibleCount).toBe(1);

    store.commit('cad/SET_LAYER_VISIBILITY', { id: 'LayerHidden', value: true });
    await localVue.nextTick();
    await localVue.nextTick();

    let updatedVisibleCount = wrapper.vm.cadGroup.children.filter((group) => group.visible).length;
    expect(updatedVisibleCount).toBe(2);

    store.commit('cad/SET_LAYER_VISIBILITY', { id: 'LayerVisible', value: false });
    await localVue.nextTick();
    await localVue.nextTick();

    updatedVisibleCount = wrapper.vm.cadGroup.children.filter((group) => group.visible).length;
    expect(updatedVisibleCount).toBe(1);
  });
});
