import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import ThreeScene from '@/components/editor/ThreeScene.vue';
import cad from '@/store/modules/cad';
import walls from '@/store/modules/walls';
import selection from '@/store/modules/selection';
import tools from '@/store/modules/tools';
import preferences from '@/store/modules/preferences';
import EventBus from '@/utils/EventBus';

jest.mock('three', () => {
  class Scene {
    constructor() {
      this.children = [];
    }

    add(child) {
      this.children.push(child);
      if (child) {
        child.parent = this;
      }
    }

    remove(child) {
      this.children = this.children.filter((candidate) => candidate !== child);
      if (child) {
        child.parent = null;
      }
    }
  }

  class Group {
    constructor() {
      this.children = [];
      this.visible = true;
      this.parent = null;
      this.userData = {};
      this.name = '';
    }

    add(child) {
      this.children.push(child);
      if (child) {
        child.parent = this;
      }
    }

    remove(child) {
      this.children = this.children.filter((candidate) => candidate !== child);
      if (child) {
        child.parent = null;
      }
    }

    clear() {
      const snapshot = [...this.children];
      snapshot.forEach((child) => this.remove(child));
    }
  }

  class Color {
    constructor(value = 0xffffff) {
      this.value = value;
      this.set = jest.fn((next) => {
        this.value = next;
      });
    }

    getHex() {
      return this.value;
    }
  }

  class MeshStandardMaterial {
    constructor(options = {}) {
      this.color = new Color(options.color || 0xffffff);
      this.dispose = jest.fn();
    }
  }

  class BoxGeometry {
    constructor() {
      this.dispose = jest.fn();
    }
  }

  class Mesh extends Group {
    constructor(geometry = new BoxGeometry(), material = new MeshStandardMaterial()) {
      super();
      this.geometry = geometry;
      this.material = material;
      this.castShadow = false;
      this.receiveShadow = false;
      this.position = {
        set: jest.fn(),
      };
      this.rotation = {
        x: 0,
        y: 0,
        z: 0,
      };
    }
  }

  class GridHelper extends Group {
    constructor(size, divisions) {
      super();
      this.size = size;
      this.divisions = divisions;
      this.scale = {
        set: jest.fn(),
      };
    }
  }

  class Raycaster {
    constructor() {
      this.setFromCamera = jest.fn();
      this.intersectObjects = jest.fn().mockReturnValue([]);
    }
  }

  class Vector2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
  }

  class PerspectiveCamera {
    constructor(fov, aspect, near, far) {
      this.fov = fov;
      this.aspect = aspect;
      this.near = near;
      this.far = far;
      this.position = {
        set: jest.fn(),
      };
      this.lookAt = jest.fn();
      this.updateProjectionMatrix = jest.fn();
    }
  }

  class WebGLRenderer {
    constructor() {
      this.setPixelRatio = jest.fn();
      this.setClearColor = jest.fn();
      this.setSize = jest.fn();
      this.render = jest.fn();
      this.dispose = jest.fn();
      this.shadowMap = {
        enabled: false,
        type: null,
      };
      this.domElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        getBoundingClientRect: jest.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        })),
        parentNode: {
          removeChild: jest.fn(),
        },
      };
    }
  }

  class AmbientLight {
    constructor() {
      this.type = 'AmbientLight';
    }
  }

  class DirectionalLight {
    constructor() {
      this.position = {
        set: jest.fn(),
      };
      this.castShadow = false;
      this.shadow = {
        mapSize: {
          width: 0,
          height: 0,
        },
        camera: {
          near: 0,
          far: 0,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      };
    }
  }

  return {
    Scene,
    Group,
    Mesh,
    MeshStandardMaterial,
    GridHelper,
    BoxGeometry,
    Raycaster,
    Vector2,
    PerspectiveCamera,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    Color,
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
    enabled: true,
    update: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock('@/utils/EventBus', () => ({
  on: jest.fn(),
  emit: jest.fn(),
}));

const localVue = createLocalVue();
localVue.use(Vuex);

describe('ThreeScene.vue', () => {
  let store;
  let wrapper;
  let mockContainer;
  let unsubscribers;

  beforeAll(() => {
    global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
    global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));
  });

  beforeEach(() => {
    unsubscribers = [];

    EventBus.on.mockImplementation(() => {
      const unsubscribe = jest.fn();
      unsubscribers.push(unsubscribe);
      return unsubscribe;
    });

    store = new Vuex.Store({
      modules: {
        cad,
        walls,
        selection,
        tools,
        preferences,
      },
    });

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
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
      wrapper = null;
    }
    jest.clearAllMocks();
  });

  it('creates scene groups and registers event listeners on mount', () => {
    const expectedEvents = [
      'cad:dxf-loaded',
      'walls:create',
      'walls:remove',
      'walls:select',
      'walls:updated',
      'walls:undo',
    ];

    expectedEvents.forEach((event) => {
      expect(EventBus.on).toHaveBeenCalledWith(event, expect.any(Function));
    });

    const cadGroup = wrapper.vm.sceneManager.getGroup('CADOverlay');
    const wallsGroup = wrapper.vm.sceneManager.getGroup('WallsGroup');
    const helperGroup = wrapper.vm.sceneManager.getGroup('HelperOverlays');

    expect(cadGroup).toBeDefined();
    expect(wallsGroup).toBe(wrapper.vm.wallsGroup);
    expect(helperGroup).toBe(wrapper.vm.helpersGroup);
    expect(helperGroup.children).toContain(wrapper.vm.gridHelper);
    expect(helperGroup.children).toContain(wrapper.vm.snappingGroup);
  });

  it('cleans up listeners and disposes resources on destroy', () => {
    const { OrbitControls } = require('three-stdlib');
    const controlsInstance = OrbitControls.mock.results[0].value;
    const rendererInstance = wrapper.vm.renderer;

    wrapper.destroy();
    wrapper = null;

    unsubscribers.forEach((unsubscribe) => {
      expect(unsubscribe).toHaveBeenCalled();
    });

    expect(global.cancelAnimationFrame).toHaveBeenCalled();
    expect(controlsInstance.dispose).toHaveBeenCalled();
    expect(rendererInstance.dispose).toHaveBeenCalled();
  });

  it('instantiates wall meshes when wall data is added to the store', async () => {
    const wall = {
      id: 'wall-1',
      start: { x: 0, y: 0 },
      end: { x: 4, y: 0 },
      height: 3,
      thickness: 0.2,
    };

    await store.dispatch('walls/addWall', wall);
    await localVue.nextTick();

    const mesh = wrapper.vm.wallMeshes.get('wall-1');
    expect(mesh).toBeDefined();
    expect(wrapper.vm.wallsGroup.children).toContain(mesh);
    expect(mesh.userData.wallId).toBe('wall-1');
  });

  it('performs raycast selection and highlights the picked wall', async () => {
    const wall = {
      id: 'wall-raycast',
      start: { x: 0, y: 0 },
      end: { x: 4, y: 0 },
    };

    await store.dispatch('walls/addWall', wall);
    await localVue.nextTick();

    const mesh = wrapper.vm.wallMeshes.get('wall-raycast');
    const { raycaster } = wrapper.vm;
    raycaster.intersectObjects.mockReturnValue([{ object: mesh }]);

    await wrapper.vm.handleSceneClick({ clientX: 10, clientY: 10 });
    await localVue.nextTick();

    expect(store.state.selection.activeWallId).toBe('wall-raycast');
    expect(mesh.material.color.set).toHaveBeenCalledWith(0x409eff);

    raycaster.intersectObjects.mockReturnValue([]);
    await wrapper.vm.handleSceneClick({ clientX: 20, clientY: 20 });
    await localVue.nextTick();

    expect(store.state.selection.activeWallId).toBeNull();
    const colorCalls = mesh.material.color.set.mock.calls.map(([value]) => value);
    expect(colorCalls).toContain(0xb0b0b0);
  });

  it('responds to unit and snapping preference changes', async () => {
    const gridScaleSpy = wrapper.vm.gridHelper.scale.set;
    gridScaleSpy.mockClear();

    store.commit('cad/SET_UNITS', 'imperial');
    await localVue.nextTick();

    const unitCall = gridScaleSpy.mock.calls.pop();
    expect(unitCall).toEqual([3.28084, 1, 3.28084]);

    gridScaleSpy.mockClear();
    await store.dispatch('preferences/updateSnapping', { enabled: false, gridSize: 0.5 });
    await localVue.nextTick();

    expect(wrapper.vm.snappingGroup.visible).toBe(false);
    const snappingCall = gridScaleSpy.mock.calls.pop();
    expect(snappingCall[0]).toBeCloseTo(1.64042, 5);
    expect(snappingCall[1]).toBe(1);
    expect(snappingCall[2]).toBeCloseTo(1.64042, 5);
  });

  it('toggles helper visibility according to CAD layer state', async () => {
    expect(wrapper.vm.helpersGroup.visible).toBe(true);

    store.commit('cad/SET_LAYER_VISIBILITY', { layer: 'helpers', visible: false });
    await localVue.nextTick();

    expect(wrapper.vm.helpersGroup.visible).toBe(false);
  });
});
