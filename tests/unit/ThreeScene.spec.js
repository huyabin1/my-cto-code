import { shallowMount, createLocalVue } from '@vue/test-utils';
import VueCompositionApi from '@vue/composition-api';
import Vuex from 'vuex';
import ThreeScene from '@/components/editor/ThreeScene.vue';
import cadModule from '@/store/modules/cad';
import editorModule from '@/store/modules/editor';

jest.mock('three', () => {
  const sceneAdd = jest.fn();
  const sceneRemove = jest.fn();

  const createGroup = () => {
    const group = {
      name: '',
      children: [],
      add: jest.fn((child) => {
        group.children.push(child);
      }),
      remove: jest.fn(),
      traverse: jest.fn((cb) => {
        group.children.forEach((child) => cb(child));
      }),
      position: { set: jest.fn() },
      scale: { set: jest.fn() },
    };
    return group;
  };

  const gridHelper = () => ({
    name: 'EditorGrid',
    geometry: { dispose: jest.fn() },
    material: { transparent: false, opacity: 1, depthWrite: true, dispose: jest.fn() },
    position: { set: jest.fn() },
    scale: { set: jest.fn() },
    visible: true,
  });

  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: sceneAdd,
      remove: sceneRemove,
    })),
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
      domElement: { parentNode: { removeChild: jest.fn() } },
      render: jest.fn(),
      dispose: jest.fn(),
      shadowMap: { enabled: false, type: null },
    })),
    AmbientLight: jest.fn().mockImplementation(() => ({ name: 'AmbientLight' })),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      name: 'DirectionalLight',
      position: { set: jest.fn() },
      castShadow: false,
      shadow: {
        mapSize: { width: 0, height: 0 },
        camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 },
      },
    })),
    GridHelper: jest.fn().mockImplementation(gridHelper),
    Group: jest.fn().mockImplementation(createGroup),
    LineSegments: jest.fn().mockImplementation((geometry, material) => ({
      geometry,
      material,
      isLineSegments: true,
      name: 'LineSegmentsHelper',
    })),
    LineBasicMaterial: jest.fn().mockImplementation((params = {}) => ({
      ...params,
      color: {
        set: jest.fn(),
      },
      dispose: jest.fn(),
      needsUpdate: false,
    })),
    BufferGeometry: jest.fn().mockImplementation(() => ({
      setAttribute: jest.fn(),
      dispose: jest.fn(),
    })),
    Float32BufferAttribute: jest.fn().mockImplementation((array) => array),
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

const buildMock = jest.fn();
const updateOpacityMock = jest.fn();
const applyLayerVisibilityMock = jest.fn();
const updateLayerStylesMock = jest.fn();

const createOverlayGroupStub = () => ({
  name: 'CADOverlay',
  position: { set: jest.fn() },
  scale: { set: jest.fn() },
  traverse: jest.fn((cb) => {
    const child = {
      isLineSegments: true,
      geometry: { dispose: jest.fn() },
      material: { dispose: jest.fn() },
    };
    cb(child);
  }),
  userData: {
    layerMaterials: new Map([
      ['layer-structure', { dispose: jest.fn() }],
    ]),
    layerGroups: new Map([
      ['layer-structure', { visible: true }],
    ]),
  },
});

jest.mock('@/three/helper/CADOverlayBuilder', () =>
  jest.fn().mockImplementation(() => ({
    build: buildMock,
    updateOpacity: updateOpacityMock,
    applyLayerVisibility: applyLayerVisibilityMock,
    updateLayerStyles: updateLayerStylesMock,
  }))
);

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock window.addEventListener and removeEventListener
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;
window.addEventListener = jest.fn();
window.removeEventListener = jest.fn();

describe('ThreeScene.vue', () => {
  let wrapper;
  let localVue;
  let store;
  let mockContainer;

  const mountComponent = () => {
    mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: jest.fn(),
    };

    wrapper = shallowMount(ThreeScene, {
      localVue,
      store,
      mocks: {
        $refs: {
          threeContainer: mockContainer,
        },
      },
    });
  };

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueCompositionApi);
    localVue.use(Vuex);

    store = new Vuex.Store({
      modules: {
        cad: {
          ...cadModule,
          state: () => ({
            ...cadModule.state(),
            overlayPolylines: [],
          }),
        },
        editor: {
          ...editorModule,
          state: () => ({
            ...editorModule.state(),
          }),
        },
      },
    });

    window.addEventListener.mockClear();
    window.removeEventListener.mockClear();
    global.cancelAnimationFrame.mockClear();
    buildMock.mockReset();
    updateOpacityMock.mockReset();
    applyLayerVisibilityMock.mockReset();
    updateLayerStylesMock.mockReset();
    buildMock.mockImplementation(() => createOverlayGroupStub());

    mountComponent();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
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
    expect(wrapper.vm.gridHelper).toBeDefined();
    expect(wrapper.vm.snappingGroup).toBeDefined();
  });

  it('exposes getScene, getCamera, and getRenderer methods', () => {
    expect(wrapper.vm.getScene()).toBe(wrapper.vm.scene);
    expect(wrapper.vm.getCamera()).toBe(wrapper.vm.camera);
    expect(wrapper.vm.getRenderer()).toBe(wrapper.vm.renderer);
  });

  it('sets up window resize listener on mount', () => {
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('cleans up and disposes resources before destroy', () => {
    const renderer = wrapper.vm.renderer;
    const controls = wrapper.vm.controls;
    const gridHelper = wrapper.vm.gridHelper;
    const snappingGroup = wrapper.vm.snappingGroup;

    wrapper.destroy();

    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
    expect(controls.dispose).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(gridHelper.geometry.dispose).toHaveBeenCalled();
    expect(gridHelper.material.dispose).toHaveBeenCalled();
    snappingGroup.children.forEach((child) => {
      expect(child.geometry.dispose).toHaveBeenCalled();
      expect(child.material.dispose).toHaveBeenCalled();
    });
  });

  it('configures the renderer with correct settings', () => {
    const { WebGLRenderer } = require('three');
    expect(WebGLRenderer).toHaveBeenCalledWith({ antialias: true, alpha: true });
    expect(wrapper.vm.renderer.setPixelRatio).toHaveBeenCalledWith(window.devicePixelRatio || 1);
    expect(wrapper.vm.renderer.setClearColor).toHaveBeenCalledWith('#f5f5f5', 1);
    expect(wrapper.vm.renderer.shadowMap.enabled).toBe(true);
    expect(wrapper.vm.renderer.shadowMap.type).toBe(require('three').PCFSoftShadowMap);
  });

  it('configures the camera with correct position and aspect ratio', () => {
    const { PerspectiveCamera } = require('three');
    expect(PerspectiveCamera).toHaveBeenCalledWith(75, 800 / 600, 0.1, 1000);
    expect(wrapper.vm.camera.position.set).toHaveBeenCalledWith(20, 20, 20);
    expect(wrapper.vm.camera.lookAt).toHaveBeenCalledWith(0, 0, 0);
  });

  it('initializes orbit controls with damping enabled', () => {
    const { OrbitControls } = require('three-stdlib');
    expect(OrbitControls).toHaveBeenCalled();
    expect(wrapper.vm.controls.enableDamping).toBe(true);
    expect(wrapper.vm.controls.dampingFactor).toBe(0.05);
  });

  it('adds lights, grid helper, and snapping helpers to the scene', () => {
    const { AmbientLight, DirectionalLight } = require('three');
    expect(AmbientLight).toHaveBeenCalled();
    expect(DirectionalLight).toHaveBeenCalled();

    const sceneAddCalls = wrapper.vm.scene.add.mock.calls.map(([arg]) => arg.name);
    expect(sceneAddCalls).toEqual(
      expect.arrayContaining(['AmbientLight', 'DirectionalLight', 'EditorGrid', 'SnappingHelpers'])
    );
  });

  it('builds CAD overlay group when polylines are provided', async () => {
    const overlayStub = createOverlayGroupStub();
    buildMock.mockImplementationOnce(() => overlayStub);

    const samplePolylines = [
      {
        layerId: 'layer-structure',
        points: [
          [0, 0],
          [1, 0],
        ],
      },
    ];

    await store.dispatch('cad/setOverlayPolylines', samplePolylines);
    await localVue.nextTick();

    expect(buildMock).toHaveBeenCalledWith(samplePolylines, expect.objectContaining({
      opacity: store.state.cad.overlayOpacity,
      layerStyles: expect.any(Object),
      visibilityByLayer: expect.any(Object),
    }));
    expect(wrapper.vm.scene.add).toHaveBeenCalledWith(overlayStub);
    expect(overlayStub.scale.set).toHaveBeenCalled();
  });

  it('updates snapping helper visibility when snapping settings change', async () => {
    expect(wrapper.vm.gridHelper.visible).toBe(false);

    store.commit('editor/SET_SNAPPING', { key: 'grid', value: true });
    store.commit('editor/SET_SNAPPING', { key: 'diagonal45', value: true });
    await localVue.nextTick();

    expect(wrapper.vm.gridHelper.visible).toBe(true);
    expect(wrapper.vm.diagonalHelper.visible).toBe(true);
  });
});
