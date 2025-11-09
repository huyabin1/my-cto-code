// Comprehensive Three.js mock for testing
import * as THREE from 'three';

// Mock THREE.MathUtils.generateUUID for consistent testing
const mockUUIDs = [];
const originalGenerateUUID = THREE.MathUtils.generateUUID;
THREE.MathUtils.generateUUID = jest.fn(() => {
  const uuid = `mock-uuid-${mockUUIDs.length}`;
  mockUUIDs.push(uuid);
  return uuid;
});

// Mock texture loader
THREE.TextureLoader = jest.fn().mockImplementation(() => ({
  load: jest.fn((url, onLoad, onProgress, onError) => {
    // Mock texture
    const texture = {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      dispose: jest.fn(),
    };
    if (onLoad) onLoad(texture);
    return texture;
  }),
}));

// Mock extrude geometry
const mockExtrudeGeometry = jest.fn().mockImplementation((shape, settings) => {
  const geometry = {
    type: 'ExtrudeGeometry',
    attributes: {
      position: {
        array: new Float32Array(36 * 3), // Mock position data
        count: 36,
      },
      uv: {
        array: new Float32Array(36 * 2), // Mock UV data
        count: 36,
        needsUpdate: false,
      },
      normal: {
        array: new Float32Array(36 * 3), // Mock normal data
        count: 36,
      },
    },
    rotateX: jest.fn(),
    rotateY: jest.fn(),
    rotateZ: jest.fn(),
    computeVertexNormals: jest.fn(),
    dispose: jest.fn(),
    userData: {},
  };
  return geometry;
});
THREE.ExtrudeGeometry = mockExtrudeGeometry;

// Mock shape
const mockShape = jest.fn().mockImplementation(() => ({
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  arc: jest.fn(),
  absarc: jest.fn(),
  ellipse: jest.fn(),
  absellipse: jest.fn(),
  closePath: jest.fn(),
  getPoints: jest.fn(() => []),
  makeGeometry: jest.fn(() => ({})),
}));
THREE.Shape = mockShape;

// Mock box geometry
const mockBoxGeometry = jest.fn().mockImplementation((width, height, depth) => {
  const geometry = {
    type: 'BoxGeometry',
    width,
    height,
    depth,
    attributes: {
      position: {
        array: new Float32Array(24 * 3),
        count: 24,
      },
      uv: {
        array: new Float32Array(24 * 2),
        count: 24,
        needsUpdate: false,
      },
      normal: {
        array: new Float32Array(24 * 3),
        count: 24,
      },
    },
    dispose: jest.fn(),
    userData: {},
  };
  return geometry;
});
THREE.BoxGeometry = mockBoxGeometry;

// Mock mesh standard material
const mockMeshStandardMaterial = jest.fn().mockImplementation((options = {}) => ({
  type: 'MeshStandardMaterial',
  color: {
    getHex: jest.fn(() => options.color || 0xffffff),
    set: jest.fn(),
    clone: jest.fn(),
  },
  roughness: options.roughness || 0.5,
  metalness: options.metalness || 0.0,
  transparent: options.transparent || false,
  opacity: options.opacity || 1.0,
  transmission: options.transmission || 0.0,
  map: options.map || null,
  normalMap: options.normalMap || null,
  roughnessMap: options.roughnessMap || null,
  metalnessMap: options.metalnessMap || null,
  aoMap: options.aoMap || null,
  normalScale: options.normalScale || new THREE.Vector2(1, 1),
  dispose: jest.fn(),
  userData: {},
}));
THREE.MeshStandardMaterial = mockMeshStandardMaterial;

// Mock mesh
const mockMesh = jest.fn().mockImplementation((geometry, material) => {
  const mesh = {
    type: 'Mesh',
    geometry,
    material,
    position: {
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn((x, y, z) => {
        if (typeof x === 'object') {
          Object.assign(mesh.position, x);
        } else {
          mesh.position.x = x;
          mesh.position.y = y;
          mesh.position.z = z;
        }
      }),
      fromArray: jest.fn((arr) => {
        mesh.position.x = arr[0];
        mesh.position.y = arr[1];
        mesh.position.z = arr[2];
      }),
      toArray: jest.fn(() => [mesh.position.x, mesh.position.y, mesh.position.z]),
      clone: jest.fn(),
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn((x, y, z) => {
        mesh.rotation.x = x;
        mesh.rotation.y = y;
        mesh.rotation.z = z;
      }),
      fromArray: jest.fn((arr) => {
        mesh.rotation.x = arr[0];
        mesh.rotation.y = arr[1];
        mesh.rotation.z = arr[2];
      }),
      toArray: jest.fn(() => [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]),
      clone: jest.fn(),
    },
    scale: {
      x: 1,
      y: 1,
      z: 1,
      set: jest.fn((x, y, z) => {
        mesh.scale.x = x;
        mesh.scale.y = y;
        mesh.scale.z = z;
      }),
      fromArray: jest.fn((arr) => {
        mesh.scale.x = arr[0];
        mesh.scale.y = arr[1];
        mesh.scale.z = arr[2];
      }),
      toArray: jest.fn(() => [mesh.scale.x, mesh.scale.y, mesh.scale.z]),
      clone: jest.fn(),
    },
    visible: true,
    userData: {},
    parent: null,
    children: [],
    add: jest.fn(),
    remove: jest.fn(),
    dispose: jest.fn(),
  };
  return mesh;
});
THREE.Mesh = mockMesh;

// Mock group
THREE.Group = jest.fn().mockImplementation(() => ({
  type: 'Group',
  position: {
    x: 0,
    y: 0,
    z: 0,
    set: jest.fn(),
    fromArray: jest.fn(),
    toArray: jest.fn(() => [0, 0, 0]),
  },
  rotation: {
    x: 0,
    y: 0,
    z: 0,
    set: jest.fn(),
    fromArray: jest.fn(),
    toArray: jest.fn(() => [0, 0, 0]),
  },
  scale: {
    x: 1,
    y: 1,
    z: 1,
    set: jest.fn(),
    fromArray: jest.fn(),
    toArray: jest.fn(() => [1, 1, 1]),
  },
  visible: true,
  userData: {},
  parent: null,
  children: [],
  add: jest.fn(),
  remove: jest.fn(),
}));

// Mock vector2
THREE.Vector2 = jest.fn().mockImplementation((x = 0, y = 0) => ({
  x,
  y,
  set: jest.fn((newX, newY) => {
    if (typeof newX === 'object') {
      vector2.x = newX.x;
      vector2.y = newX.y;
    } else {
      vector2.x = newX;
      vector2.y = newY;
    }
  }),
  clone: jest.fn(() => new THREE.Vector2(x, y)),
  copy: jest.fn((v) => {
    vector2.x = v.x;
    vector2.y = v.y;
    return vector2;
  }),
  add: jest.fn((v) => new THREE.Vector2(x + v.x, y + v.y)),
  addVectors: jest.fn((a, b) => new THREE.Vector2(a.x + b.x, a.y + b.y)),
  sub: jest.fn((v) => new THREE.Vector2(x - v.x, y - v.y)),
  subVectors: jest.fn((a, b) => new THREE.Vector2(a.x - b.x, a.y - b.y)),
  multiplyScalar: jest.fn((s) => new THREE.Vector2(x * s, y * s)),
  divideScalar: jest.fn((s) => new THREE.Vector2(x / s, y / s)),
  distanceTo: jest.fn((v) => Math.sqrt((x - v.x) ** 2 + (y - v.y) ** 2)),
  length: jest.fn(() => Math.sqrt(x * x + y * y)),
  normalize: jest.fn(() => {
    const len = Math.sqrt(x * x + y * y);
    if (len > 0) {
      return new THREE.Vector2(x / len, y / len);
    }
    return new THREE.Vector2(0, 0);
  }),
  dot: jest.fn((v) => x * v.x + y * v.y),
  cross: jest.fn((v) => x * v.y - y * v.x),
  lerp: jest.fn((v, alpha) => new THREE.Vector2(x + (v.x - x) * alpha, y + (v.y - y) * alpha)),
  equals: jest.fn((v) => x === v.x && y === v.y),
  toArray: jest.fn(() => [x, y]),
  fromArray: jest.fn((arr) => {
    x = arr[0];
    y = arr[1];
    return vector2;
  }),
}));

// Mock vector3
THREE.Vector3 = jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
  x,
  y,
  z,
  set: jest.fn((newX, newY, newZ) => {
    if (typeof newX === 'object') {
      vector3.x = newX.x;
      vector3.y = newX.y;
      vector3.z = newX.z || 0;
    } else {
      vector3.x = newX;
      vector3.y = newY;
      vector3.z = newZ;
    }
  }),
  clone: jest.fn(() => new THREE.Vector3(x, y, z)),
  copy: jest.fn((v) => {
    vector3.x = v.x;
    vector3.y = v.y;
    vector3.z = v.z;
    return vector3;
  }),
  add: jest.fn((v) => new THREE.Vector3(x + v.x, y + v.y, z + v.z)),
  addVectors: jest.fn((a, b) => new THREE.Vector3(a.x + b.x, a.y + b.y, a.z + b.z)),
  sub: jest.fn((v) => new THREE.Vector3(x - v.x, y - v.y, z - v.z)),
  subVectors: jest.fn((a, b) => new THREE.Vector3(a.x - b.x, a.y - b.y, a.z - b.z)),
  multiplyScalar: jest.fn((s) => new THREE.Vector3(x * s, y * s, z * s)),
  divideScalar: jest.fn((s) => new THREE.Vector3(x / s, y / s, z / s)),
  distanceTo: jest.fn((v) => Math.sqrt((x - v.x) ** 2 + (y - v.y) ** 2 + (z - v.z) ** 2)),
  length: jest.fn(() => Math.sqrt(x * x + y * y + z * z)),
  normalize: jest.fn(() => {
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len > 0) {
      return new THREE.Vector3(x / len, y / len, z / len);
    }
    return new THREE.Vector3(0, 0, 0);
  }),
  dot: jest.fn((v) => x * v.x + y * v.y + z * v.z),
  cross: jest.fn((v) => new THREE.Vector3(y * v.z - z * v.y, z * v.x - x * v.z, x * v.y - y * v.x)),
  lerp: jest.fn(
    (v, alpha) =>
      new THREE.Vector3(x + (v.x - x) * alpha, y + (v.y - y) * alpha, z + (v.z - z) * alpha)
  ),
  equals: jest.fn((v) => x === v.x && y === v.y && z === v.z),
  toArray: jest.fn(() => [x, y, z]),
  fromArray: jest.fn((arr) => {
    x = arr[0];
    y = arr[1];
    z = arr[2];
    return vector3;
  }),
}));

// Mock box3
THREE.Box3 = jest
  .fn()
  .mockImplementation((min = new THREE.Vector3(), max = new THREE.Vector3()) => ({
    min,
    max,
    setFromObject: jest.fn((object) => {
      // Mock bounding box calculation
      return {
        min: new THREE.Vector3(-1, -1, -1),
        max: new THREE.Vector3(1, 1, 1),
      };
    }),
    setFromAttribute: jest.fn((attribute) => {
      return {
        min: new THREE.Vector3(-1, -1, -1),
        max: new THREE.Vector3(1, 1, 1),
      };
    }),
    getSize: jest.fn((target) => {
      if (target) {
        target.x = 2;
        target.y = 2;
        target.z = 2;
      }
      return new THREE.Vector3(2, 2, 2);
    }),
    getCenter: jest.fn((target) => {
      if (target) {
        target.x = 0;
        target.y = 0;
        target.z = 0;
      }
      return new THREE.Vector3(0, 0, 0);
    }),
    clone: jest.fn(() => new THREE.Box3()),
    copy: jest.fn((box) => {
      min.copy(box.min);
      max.copy(box.max);
      return new THREE.Box3();
    }),
    expandByPoint: jest.fn(() => new THREE.Box3()),
    expandByVector: jest.fn(() => new THREE.Box3()),
    intersect: jest.fn(() => new THREE.Box3()),
    union: jest.fn(() => new THREE.Box3()),
    translate: jest.fn(() => new THREE.Box3()),
    equals: jest.fn(() => true),
    isEmpty: jest.fn(() => false),
  }));

// Mock box2
THREE.Box2 = jest
  .fn()
  .mockImplementation((min = new THREE.Vector2(), max = new THREE.Vector2()) => ({
    min,
    max,
    setFromPoints: jest.fn((points) => {
      // Mock bounding box calculation
      return {
        min: new THREE.Vector2(-1, -1),
        max: new THREE.Vector2(1, 1),
      };
    }),
    getSize: jest.fn((target) => {
      if (target) {
        target.x = 2;
        target.y = 2;
      }
      return new THREE.Vector2(2, 2);
    }),
    getCenter: jest.fn((target) => {
      if (target) {
        target.x = 0;
        target.y = 0;
      }
      return new THREE.Vector2(0, 0);
    }),
    clone: jest.fn(() => new THREE.Box2()),
    copy: jest.fn((box) => {
      min.copy(box.min);
      max.copy(box.max);
      return new THREE.Box2();
    }),
  }));

// Mock repeat wrapping
THREE.RepeatWrapping = 1000;

// Helper function to reset mocks
export const resetThreeMocks = () => {
  mockUUIDs.length = 0;
  jest.clearAllMocks();
};

// Helper function to restore original UUID generation
export const restoreOriginalUUID = () => {
  THREE.MathUtils.generateUUID = originalGenerateUUID;
};

// Export mock constructors for test access
export { mockExtrudeGeometry, mockShape, mockBoxGeometry, mockMeshStandardMaterial, mockMesh };

export default THREE;
