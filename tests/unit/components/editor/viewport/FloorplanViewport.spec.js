import { shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import * as THREE from 'three';
import FloorplanViewport from '@/components/editor/viewport/FloorplanViewport.vue';
import { resetSharedSceneGraph } from '@/three/core/SceneGraph';

const createRendererMock = jest.fn();
const removeRendererMock = jest.fn();

jest.mock('@/three/core/RendererManager', () => ({
  getSharedRendererManager: jest.fn(() => ({
    createRenderer: createRendererMock,
    removeRenderer: removeRendererMock,
  })),
}));

describe('FloorplanViewport.vue', () => {
  let store;
  let wrapper;
  let originalMethods;

  beforeAll(() => {
    originalMethods = {
      setupSceneGraph: FloorplanViewport.methods.setupSceneGraph,
      initToolController: FloorplanViewport.methods.initToolController,
      initSelectionManager: FloorplanViewport.methods.initSelectionManager,
      initTransformGizmo: FloorplanViewport.methods.initTransformGizmo,
      watchSelection: FloorplanViewport.methods.watchSelection,
      watchSnapping: FloorplanViewport.methods.watchSnapping,
      animate: FloorplanViewport.methods.animate,
    };

    FloorplanViewport.methods.setupSceneGraph = jest.fn();
    FloorplanViewport.methods.initToolController = jest.fn();
    FloorplanViewport.methods.initSelectionManager = jest.fn();
    FloorplanViewport.methods.initTransformGizmo = jest.fn();
    FloorplanViewport.methods.watchSelection = jest.fn();
    FloorplanViewport.methods.watchSnapping = jest.fn();
    FloorplanViewport.methods.animate = jest.fn();
  });

  afterAll(() => {
    FloorplanViewport.methods.setupSceneGraph = originalMethods.setupSceneGraph;
    FloorplanViewport.methods.initToolController = originalMethods.initToolController;
    FloorplanViewport.methods.initSelectionManager = originalMethods.initSelectionManager;
    FloorplanViewport.methods.initTransformGizmo = originalMethods.initTransformGizmo;
    FloorplanViewport.methods.watchSelection = originalMethods.watchSelection;
    FloorplanViewport.methods.watchSnapping = originalMethods.watchSnapping;
    FloorplanViewport.methods.animate = originalMethods.animate;
  });

  beforeEach(() => {
    const rendererInstance = () => {
      const canvas = document.createElement('canvas');
      canvas.getContext = jest.fn();
      return {
        setPixelRatio: jest.fn(),
        setSize: jest.fn(),
        render: jest.fn(),
        dispose: jest.fn(),
        domElement: canvas,
      };
    };

    createRendererMock.mockImplementation(rendererInstance);
    removeRendererMock.mockClear();

    store = new Vuex.Store({
      modules: {
        editor: {
          namespaced: true,
          state: {
            snapping: {},
            selection: {},
            viewport: {
              viewMode: '2d',
              layoutMode: 'single',
              grid: {
                visible: true,
                size: 5000,
                density: 1,
                divisions: 50,
              },
              axis: {
                visible: true,
                size: 1000,
              },
            },
          },
        },
        cad: {
          namespaced: true,
          state: {
            selectedUnit: 'm',
          },
        },
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
      wrapper = null;
    }
    resetSharedSceneGraph();
    createRendererMock.mockReset();
    removeRendererMock.mockReset();
  });

  it('should initialize grid and axis helpers', () => {
    wrapper = shallowMount(FloorplanViewport, {
      provide: { store },
    });

    expect(wrapper.vm.gridHelper).toBeDefined();
    expect(wrapper.vm.gridHelper.getObject()).toBeInstanceOf(THREE.GridHelper);
    expect(wrapper.vm.axisHelper).toBeDefined();
    expect(wrapper.vm.axisHelper.getObject()).toBeInstanceOf(THREE.AxesHelper);
  });

  it('should update renderer size and overlay on resize', () => {
    wrapper = shallowMount(FloorplanViewport, {
      provide: { store },
    });

    const renderer = wrapper.vm.renderer;
    renderer.setSize.mockClear();

    const container = wrapper.vm.$refs.viewportContainer;
    Object.defineProperty(container, 'clientWidth', {
      value: 900,
      configurable: true,
    });
    Object.defineProperty(container, 'clientHeight', {
      value: 600,
      configurable: true,
    });

    wrapper.vm.handleResize();

    expect(renderer.setSize).toHaveBeenCalledWith(900, 600);
    expect(wrapper.vm.overlayElement.style.width).toBe('900px');
    expect(wrapper.vm.overlayElement.style.height).toBe('600px');
  });

  it('should mount snapping overlay layer', () => {
    wrapper = shallowMount(FloorplanViewport, {
      provide: { store },
    });

    const container = wrapper.vm.$refs.viewportContainer;
    const overlay = container.querySelector('[data-testid="floorplan-snapping-overlay"]');

    expect(overlay).not.toBeNull();
    expect(overlay.classList.contains('snapping-overlay')).toBe(true);
  });
});
