import * as THREE from 'three';

// Mock THREE.WebGLRenderer to avoid WebGL context errors in tests
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  return {
    ...actualThree,
    WebGLRenderer: jest.fn().mockImplementation((options) => {
      const mockCanvas = {
        parentNode: null,
        removeChild: jest.fn(),
      };
      return {
        setPixelRatio: jest.fn(),
        setClearColor: jest.fn(),
        setSize: jest.fn(),
        render: jest.fn(),
        dispose: jest.fn(),
        domElement: mockCanvas,
        shadowMap: { enabled: false, type: actualThree.PCFSoftShadowMap },
        ...options,
      };
    }),
  };
});

import {
  RendererManager,
  CameraManager,
  RenderLoop,
  InteractionBus,
  getSharedRendererManager,
  getSharedCameraManager,
  getSharedRenderLoop,
  resetSharedRenderLoop,
  getSharedInteractionBus,
  resetSharedInteractionBus,
} from '@/three/core';

describe('Scene Core Modules', () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetSharedRenderLoop();
    resetSharedInteractionBus();
  });

  describe('RendererManager', () => {
    let rendererManager;

    beforeEach(() => {
      rendererManager = new RendererManager();
    });

    afterEach(() => {
      if (rendererManager) {
        rendererManager.disposeAll();
      }
    });

    it('should create a renderer with default settings', () => {
      const renderer = rendererManager.createRenderer('main', {});

      expect(renderer).toBeDefined();
      expect(typeof renderer).toBe('object');
      expect(renderer.domElement).toBeDefined();
      expect(typeof renderer.render).toBe('function');
    });

    it('should create a renderer with custom options', () => {
      const renderer = rendererManager.createRenderer('main', {
        antialias: false,
        alpha: false,
        clearColor: '#000000',
        clearAlpha: 0.5,
        pixelRatio: 1,
      });

      expect(renderer).toBeDefined();
      expect(typeof renderer).toBe('object');
    });

    it('should get a renderer by ID', () => {
      const renderer = rendererManager.createRenderer('main');
      const retrieved = rendererManager.getRenderer('main');

      expect(retrieved).toBe(renderer);
    });

    it('should remove a renderer', () => {
      rendererManager.createRenderer('main');
      const removed = rendererManager.removeRenderer('main');

      expect(removed).toBe(true);
      expect(rendererManager.getRenderer('main')).toBeUndefined();
    });

    it('should dispose all renderers', () => {
      const renderer1 = rendererManager.createRenderer('main');
      const renderer2 = rendererManager.createRenderer('preview');

      jest.spyOn(renderer1, 'dispose');
      jest.spyOn(renderer2, 'dispose');

      rendererManager.disposeAll();

      expect(renderer1.dispose).toHaveBeenCalled();
      expect(renderer2.dispose).toHaveBeenCalled();
    });

    it('should enable shadow map when specified', () => {
      const renderer = rendererManager.createRenderer('main', {
        shadowMap: true,
        shadowMapType: THREE.PCFSoftShadowMap,
      });

      expect(renderer.shadowMap.enabled).toBe(true);
      expect(renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
    });
  });

  describe('CameraManager', () => {
    let cameraManager;

    beforeEach(() => {
      cameraManager = new CameraManager();
    });

    afterEach(() => {
      if (cameraManager) {
        cameraManager.disposeAll();
      }
    });

    it('should create a perspective camera', () => {
      const camera = cameraManager.createPerspectiveCamera('main', 800, 600);

      expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(camera.aspect).toBe(800 / 600);
    });

    it('should create a perspective camera with custom options', () => {
      const camera = cameraManager.createPerspectiveCamera('main', 800, 600, {
        fov: 60,
        near: 1,
        far: 500,
        position: { x: 10, y: 10, z: 10 },
        lookAt: { x: 5, y: 5, z: 5 },
      });

      expect(camera.fov).toBe(60);
      expect(camera.near).toBe(1);
      expect(camera.far).toBe(500);
      expect(camera.position.x).toBeCloseTo(10);
    });

    it('should create an orthographic camera', () => {
      const camera = cameraManager.createOrthographicCamera('ortho', 800, 600);

      expect(camera).toBeInstanceOf(THREE.OrthographicCamera);
    });

    it('should get a camera by ID', () => {
      const camera = cameraManager.createPerspectiveCamera('main', 800, 600);
      const retrieved = cameraManager.getCamera('main');

      expect(retrieved).toBe(camera);
    });

    it('should update camera aspect ratio on resize', () => {
      const camera = cameraManager.createPerspectiveCamera('main', 800, 600);
      const originalAspect = camera.aspect;

      cameraManager.updateAspectRatio('main', 1280, 720);

      expect(camera.aspect).not.toBe(originalAspect);
      expect(camera.aspect).toBeCloseTo(1280 / 720, 5);
    });

    it('should update orthographic camera on resize', () => {
      const camera = cameraManager.createOrthographicCamera('ortho', 800, 600);

      const updated = cameraManager.updateAspectRatio('ortho', 1024, 768);

      expect(updated).toBe(true);
    });

    it('should remove a camera', () => {
      cameraManager.createPerspectiveCamera('main', 800, 600);
      const removed = cameraManager.removeCamera('main');

      expect(removed).toBe(true);
      expect(cameraManager.getCamera('main')).toBeUndefined();
    });

    it('should get all cameras', () => {
      cameraManager.createPerspectiveCamera('main', 800, 600);
      cameraManager.createOrthographicCamera('ortho', 800, 600);

      const cameras = cameraManager.getAllCameras();

      expect(cameras).toHaveLength(2);
    });
  });

  describe('RenderLoop', () => {
    let renderLoop;

    beforeEach(() => {
      renderLoop = new RenderLoop();
    });

    afterEach(() => {
      if (renderLoop) {
        renderLoop.dispose();
      }
    });

    it('should start and stop the render loop', () => {
      expect(renderLoop.getIsRunning()).toBe(false);

      renderLoop.start();
      expect(renderLoop.getIsRunning()).toBe(true);

      renderLoop.stop();
      expect(renderLoop.getIsRunning()).toBe(false);
    });

    it('should call registered callbacks on render', (done) => {
      const callback = jest.fn();
      renderLoop.addCallback(callback);

      renderLoop.start();

      // Give the callback a chance to be called
      setTimeout(() => {
        expect(callback.mock.calls.length).toBeGreaterThan(0);
        renderLoop.stop();
        done();
      }, 50);
    });

    it('should call multiple callbacks', (done) => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      renderLoop.addCallback(callback1);
      renderLoop.addCallback(callback2);

      renderLoop.start();

      setTimeout(() => {
        expect(callback1.mock.calls.length).toBeGreaterThan(0);
        expect(callback2.mock.calls.length).toBeGreaterThan(0);
        renderLoop.stop();
        done();
      }, 50);
    });

    it('should remove a callback', (done) => {
      const callback = jest.fn();
      renderLoop.addCallback(callback);
      renderLoop.removeCallback(callback);

      renderLoop.start();

      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
        renderLoop.stop();
        done();
      }, 50);
    });

    it('should handle errors in callbacks gracefully', (done) => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();

      renderLoop.addCallback(errorCallback);
      renderLoop.addCallback(normalCallback);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderLoop.start();

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(normalCallback.mock.calls.length).toBeGreaterThan(0);
        renderLoop.stop();
        consoleSpy.mockRestore();
        done();
      }, 50);
    });

    it('should throw error when adding invalid callback', () => {
      expect(() => {
        renderLoop.addCallback('not a function');
      }).toThrow();
    });

    it('should dispose properly', (done) => {
      const callback = jest.fn();
      renderLoop.addCallback(callback);

      renderLoop.start();
      renderLoop.dispose();

      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
        expect(renderLoop.getIsRunning()).toBe(false);
        done();
      }, 50);
    });
  });

  describe('InteractionBus', () => {
    let bus;

    beforeEach(() => {
      bus = new InteractionBus();
    });

    afterEach(() => {
      if (bus) {
        bus.dispose();
      }
    });

    it('should emit and receive events', () => {
      const handler = jest.fn();
      bus.on('test-event', handler);

      bus.emit('test-event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle multiple subscribers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      bus.on('test-event', handler1);
      bus.on('test-event', handler2);

      bus.emit('test-event', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should unsubscribe from an event', () => {
      const handler = jest.fn();
      bus.on('test-event', handler);
      bus.off('test-event', handler);

      bus.emit('test-event', 'data');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = bus.on('test-event', handler);

      unsubscribe();
      bus.emit('test-event', 'data');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle one-time events', () => {
      const handler = jest.fn();
      bus.once('test-event', handler);

      bus.emit('test-event', 'data1');
      bus.emit('test-event', 'data2');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('data1');
    });

    it('should get subscribers for an event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      bus.on('test-event', handler1);
      bus.on('test-event', handler2);

      const subscribers = bus.getSubscribers('test-event');

      expect(subscribers).toHaveLength(2);
    });

    it('should get all event types', () => {
      bus.on('event-1', jest.fn());
      bus.on('event-2', jest.fn());
      bus.on('event-3', jest.fn());

      const eventTypes = bus.getAllEventTypes();

      expect(eventTypes).toContain('event-1');
      expect(eventTypes).toContain('event-2');
      expect(eventTypes).toContain('event-3');
    });

    it('should handle errors in handlers gracefully', () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const normalHandler = jest.fn();

      bus.on('test-event', errorHandler);
      bus.on('test-event', normalHandler);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      bus.emit('test-event', 'data');

      expect(consoleSpy).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should clear all subscribers', () => {
      bus.on('event-1', jest.fn());
      bus.on('event-2', jest.fn());

      bus.clear();

      expect(bus.getAllEventTypes()).toHaveLength(0);
    });

    it('should throw error for invalid parameters', () => {
      expect(() => {
        bus.on(null, jest.fn());
      }).toThrow();

      expect(() => {
        bus.on('test', 'not a function');
      }).toThrow();
    });
  });

  describe('Shared Singletons', () => {
    it('should return same RendererManager instance', () => {
      const rm1 = getSharedRendererManager();
      const rm2 = getSharedRendererManager();

      expect(rm1).toBe(rm2);
    });

    it('should return same CameraManager instance', () => {
      const cm1 = getSharedCameraManager();
      const cm2 = getSharedCameraManager();

      expect(cm1).toBe(cm2);
    });

    it('should return same RenderLoop instance', () => {
      const rl1 = getSharedRenderLoop();
      const rl2 = getSharedRenderLoop();

      expect(rl1).toBe(rl2);
    });

    it('should return same InteractionBus instance', () => {
      const ib1 = getSharedInteractionBus();
      const ib2 = getSharedInteractionBus();

      expect(ib1).toBe(ib2);
    });

    it('should reset RenderLoop singleton', () => {
      const rl1 = getSharedRenderLoop();
      resetSharedRenderLoop();
      const rl2 = getSharedRenderLoop();

      expect(rl1).not.toBe(rl2);
    });

    it('should reset InteractionBus singleton', () => {
      const ib1 = getSharedInteractionBus();
      resetSharedInteractionBus();
      const ib2 = getSharedInteractionBus();

      expect(ib1).not.toBe(ib2);
    });
  });

  describe('Integration Tests', () => {
    it('should work together in a render pipeline', (done) => {
      const rendererManager = new RendererManager();
      const cameraManager = new CameraManager();
      const renderer = rendererManager.createRenderer('main', {});
      const camera = cameraManager.createPerspectiveCamera('main', 800, 600);
      const renderLoop = new RenderLoop();

      const renderCallback = jest.fn(() => {
        if (renderer && camera) {
          // Simulate render call
        }
      });

      renderLoop.addCallback(renderCallback);
      renderLoop.start();

      setTimeout(() => {
        expect(renderCallback.mock.calls.length).toBeGreaterThan(0);
        renderLoop.dispose();
        rendererManager.disposeAll();
        cameraManager.disposeAll();
        done();
      }, 50);
    });

    it('should distribute events through interaction bus during rendering', (done) => {
      const bus = new InteractionBus();
      const renderLoop = new RenderLoop();
      const eventHandler = jest.fn();

      bus.on('camera-updated', eventHandler);

      renderLoop.addCallback(() => {
        bus.emit('camera-updated', { position: [10, 10, 10] });
      });

      renderLoop.start();

      setTimeout(() => {
        expect(eventHandler.mock.calls.length).toBeGreaterThan(0);
        renderLoop.dispose();
        bus.dispose();
        done();
      }, 50);
    });

    it('should handle camera resize with interaction events', () => {
      const cameraManager = new CameraManager();
      const camera = cameraManager.createPerspectiveCamera('main', 800, 600);
      const bus = new InteractionBus();

      const resizeHandler = jest.fn();
      bus.on('window-resize', resizeHandler);

      const oldAspect = camera.aspect;
      cameraManager.updateAspectRatio('main', 1280, 720);
      bus.emit('window-resize', { width: 1280, height: 720 });

      expect(camera.aspect).not.toBe(oldAspect);
      expect(resizeHandler).toHaveBeenCalled();

      cameraManager.disposeAll();
      bus.dispose();
    });
  });
});
