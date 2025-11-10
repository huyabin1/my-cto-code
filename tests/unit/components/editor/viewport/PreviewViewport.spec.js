import { shallowMount } from '@vue/test-utils';
import PreviewViewport from '@/components/editor/viewport/PreviewViewport.vue';
import { resetSharedSceneGraph } from '@/three/core/SceneGraph';
import * as THREE from 'three';

// Mock initViewport to avoid WebGL issues
const mockInitViewport = jest.fn();
const mockSetupSceneGraph = jest.fn();
const mockAnimate = jest.fn();

describe('PreviewViewport.vue', () => {
  let originalMethods;

  beforeAll(() => {
    // Save original methods
    originalMethods = {
      initViewport: PreviewViewport.methods.initViewport,
      setupSceneGraph: PreviewViewport.methods.setupSceneGraph,
      animate: PreviewViewport.methods.animate,
    };

    // Replace with mocks for testing
    PreviewViewport.methods.initViewport = mockInitViewport;
    PreviewViewport.methods.setupSceneGraph = mockSetupSceneGraph;
    PreviewViewport.methods.animate = mockAnimate;
  });

  afterAll(() => {
    // Restore original methods
    PreviewViewport.methods.initViewport = originalMethods.initViewport;
    PreviewViewport.methods.setupSceneGraph = originalMethods.setupSceneGraph;
    PreviewViewport.methods.animate = originalMethods.animate;
  });

  beforeEach(() => {
    mockInitViewport.mockClear();
    mockSetupSceneGraph.mockClear();
    mockAnimate.mockClear();
  });

  afterEach(() => {
    resetSharedSceneGraph();
  });

  it('should have correct component structure', () => {
    const wrapper = shallowMount(PreviewViewport);

    expect(wrapper.vm).toBeDefined();
    expect(wrapper.vm.scene).toBeNull();
    expect(wrapper.vm.camera).toBeNull();
    expect(wrapper.vm.renderer).toBeNull();
    
    wrapper.destroy();
  });

  it('should have default props', () => {
    const wrapper = shallowMount(PreviewViewport);
    
    expect(wrapper.vm.backgroundColor).toBe('#2c3e50');
    
    wrapper.destroy();
  });

  it('should accept custom background color', () => {
    const wrapper = shallowMount(PreviewViewport, {
      propsData: {
        backgroundColor: '#ff0000',
      },
    });

    expect(wrapper.vm.backgroundColor).toBe('#ff0000');
    
    wrapper.destroy();
  });

  it('should have required methods', () => {
    const wrapper = shallowMount(PreviewViewport);
    
    expect(typeof wrapper.vm.resetView).toBe('function');
    expect(typeof wrapper.vm.zoomIn).toBe('function');
    expect(typeof wrapper.vm.zoomOut).toBe('function');
    expect(typeof wrapper.vm.handleResize).toBe('function');
    expect(typeof wrapper.vm.cleanup).toBe('function');
    expect(typeof wrapper.vm.getCamera).toBe('function');
    expect(typeof wrapper.vm.getScene).toBe('function');
    expect(typeof wrapper.vm.getRenderer).toBe('function');
    
    wrapper.destroy();
  });

  it('should have default camera position', () => {
    const wrapper = shallowMount(PreviewViewport);
    
    expect(wrapper.vm.defaultCameraPosition).toBeInstanceOf(THREE.Vector3);
    expect(wrapper.vm.defaultCameraPosition.x).toBe(15);
    expect(wrapper.vm.defaultCameraPosition.y).toBe(15);
    expect(wrapper.vm.defaultCameraPosition.z).toBe(15);
    
    wrapper.destroy();
  });

  it('should have default camera target', () => {
    const wrapper = shallowMount(PreviewViewport);
    
    expect(wrapper.vm.defaultCameraTarget).toBeInstanceOf(THREE.Vector3);
    expect(wrapper.vm.defaultCameraTarget.x).toBe(0);
    expect(wrapper.vm.defaultCameraTarget.y).toBe(0);
    expect(wrapper.vm.defaultCameraTarget.z).toBe(0);
    
    wrapper.destroy();
  });

  it('should call initViewport on mount', () => {
    const wrapper = shallowMount(PreviewViewport);
    
    expect(mockInitViewport).toHaveBeenCalled();
    
    wrapper.destroy();
  });

  it('should call setupSceneGraph on mount', () => {
    const wrapper = shallowMount(PreviewViewport);
    
    expect(mockSetupSceneGraph).toHaveBeenCalled();
    
    wrapper.destroy();
  });

  it('should call animate on mount', () => {
    const wrapper = shallowMount(PreviewViewport);
    
    expect(mockAnimate).toHaveBeenCalled();
    
    wrapper.destroy();
  });

  describe('Scene Graph Integration', () => {
    it('should handle scene graph changes', () => {
      const wrapper = shallowMount(PreviewViewport);
      
      const event = { type: 'entity-added', id: 'test-1' };
      wrapper.vm.handleSceneGraphChange(event);
      
      expect(wrapper.emitted('scene-graph-change')).toBeTruthy();
      expect(wrapper.emitted('scene-graph-change')[0]).toEqual([event]);
      
      wrapper.destroy();
    });
  });

  describe('View Controls', () => {
    it('should emit view-reset event', () => {
      const wrapper = shallowMount(PreviewViewport);
      
      // Mock camera, controls, and renderer
      wrapper.vm.camera = new THREE.PerspectiveCamera();
      wrapper.vm.controls = { target: new THREE.Vector3(), update: jest.fn(), dispose: jest.fn() };
      wrapper.vm.renderer = { dispose: jest.fn() };
      
      wrapper.vm.resetView();
      
      expect(wrapper.emitted('view-reset')).toBeTruthy();
      
      wrapper.destroy();
    });

    it('should emit zoom-change event on zoom in', () => {
      const wrapper = shallowMount(PreviewViewport);
      
      wrapper.vm.camera = new THREE.PerspectiveCamera();
      wrapper.vm.zoomIn();
      
      expect(wrapper.emitted('zoom-change')).toBeTruthy();
      expect(wrapper.emitted('zoom-change')[0]).toEqual(['in']);
      
      wrapper.destroy();
    });

    it('should emit zoom-change event on zoom out', () => {
      const wrapper = shallowMount(PreviewViewport);
      
      wrapper.vm.camera = new THREE.PerspectiveCamera();
      wrapper.vm.zoomOut();
      
      expect(wrapper.emitted('zoom-change')).toBeTruthy();
      expect(wrapper.emitted('zoom-change')[0]).toEqual(['out']);
      
      wrapper.destroy();
    });
  });

  describe('Exposed Methods', () => {
    it('should expose getCamera method', () => {
      const wrapper = shallowMount(PreviewViewport);
      const mockCamera = new THREE.PerspectiveCamera();
      wrapper.vm.camera = mockCamera;
      
      const camera = wrapper.vm.getCamera();
      expect(camera).toBe(mockCamera);
      
      wrapper.destroy();
    });

    it('should expose getScene method', () => {
      const wrapper = shallowMount(PreviewViewport);
      const mockScene = new THREE.Scene();
      wrapper.vm.scene = mockScene;
      
      const scene = wrapper.vm.getScene();
      expect(scene).toBe(mockScene);
      
      wrapper.destroy();
    });

    it('should expose getRenderer method', () => {
      const wrapper = shallowMount(PreviewViewport);
      const mockRenderer = { render: jest.fn(), dispose: jest.fn() };
      wrapper.vm.renderer = mockRenderer;
      
      const renderer = wrapper.vm.getRenderer();
      expect(renderer).toBe(mockRenderer);
      
      wrapper.destroy();
    });
  });

  describe('Resize Handling', () => {
    it('should update camera aspect ratio on resize', () => {
      const wrapper = shallowMount(PreviewViewport);
      
      // Mock camera and renderer
      wrapper.vm.camera = new THREE.PerspectiveCamera();
      wrapper.vm.renderer = { setSize: jest.fn(), dispose: jest.fn() };
      wrapper.vm.$refs.viewportContainer = {
        clientWidth: 800,
        clientHeight: 600,
      };

      wrapper.vm.handleResize();

      expect(wrapper.vm.camera.aspect).toBe(800 / 600);
      expect(wrapper.vm.renderer.setSize).toHaveBeenCalledWith(800, 600);
      
      wrapper.destroy();
    });
  });
});
