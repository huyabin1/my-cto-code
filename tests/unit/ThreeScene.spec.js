import { shallowMount, createLocalVue } from '@vue/test-utils';
import VueCompositionApi from '@vue/composition-api';
// eslint-disable-next-line import/order, import/extensions, import/no-unresolved
import ThreeScene from '@/components/editor/ThreeScene';

// Mock Three.js to avoid WebGL context issues in tests
jest.mock('three', () => ({
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
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
    domElement: { appendChild: jest.fn() },
    render: jest.fn(),
    dispose: jest.fn(),
    shadowMap: { enabled: false, type: null },
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
}));

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

// Import mocked modules after jest.mock declarations
// eslint-disable-next-line import/first
import * as THREE from 'three';
// eslint-disable-next-line import/first
import { OrbitControls } from 'three-stdlib';

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock window.addEventListener and removeEventListener
window.addEventListener = jest.fn();
window.removeEventListener = jest.fn();

describe('ThreeScene.vue', () => {
  let wrapper;
  let localVue;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueCompositionApi);

    // Setup DOM environment
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2,
    });

    // Mock container dimensions
    const mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: jest.fn(),
    };

    wrapper = shallowMount(ThreeScene, {
      localVue,
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
    }
    jest.clearAllMocks();
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

    const scene = wrapper.vm.getScene();
    const camera = wrapper.vm.getCamera();
    const renderer = wrapper.vm.getRenderer();

    expect(scene).toBeDefined();
    expect(camera).toBeDefined();
    expect(renderer).toBeDefined();
  });

  it('sets up window resize listener on mount', () => {
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('cleans up properly before destroy', () => {
    wrapper.destroy();

    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
    expect(wrapper.vm.controls.dispose).toHaveBeenCalled();
    expect(wrapper.vm.renderer.dispose).toHaveBeenCalled();
  });

  it('configures renderer with correct settings', () => {
    expect(THREE.WebGLRenderer).toHaveBeenCalledWith({
      antialias: true,
      alpha: true,
    });
    expect(wrapper.vm.renderer.setPixelRatio).toHaveBeenCalledWith(2);
    expect(wrapper.vm.renderer.setClearColor).toHaveBeenCalledWith('#f5f5f5', 1);
    expect(wrapper.vm.renderer.shadowMap.enabled).toBe(true);
  });

  it('configures camera with correct position and aspect ratio', () => {
    expect(THREE.PerspectiveCamera).toHaveBeenCalledWith(75, 800 / 600, 0.1, 1000);
    expect(wrapper.vm.camera.position.set).toHaveBeenCalledWith(20, 20, 20);
    expect(wrapper.vm.camera.lookAt).toHaveBeenCalledWith(0, 0, 0);
  });

  it('configures OrbitControls with damping enabled', () => {
    expect(OrbitControls).toHaveBeenCalled();
    expect(wrapper.vm.controls.enableDamping).toBe(true);
    expect(wrapper.vm.controls.dampingFactor).toBe(0.05);
  });

  it('adds lights to the scene', () => {
    expect(THREE.AmbientLight).toHaveBeenCalled();
    expect(THREE.DirectionalLight).toHaveBeenCalled();
    expect(wrapper.vm.scene.add).toHaveBeenCalledTimes(3); // ambient + directional + shadow light
  });
});
