import * as THREE from 'three';
// eslint-disable-next-line import/extensions, import/no-unresolved
import { QuadTree, SpatialIndex } from '@/three/utils';

describe('QuadTree', () => {
  let quadTree;

  beforeEach(() => {
    quadTree = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 10, 8);
  });

  it('should create a quadtree with correct bounds', () => {
    expect(quadTree.bounds.width).toBe(100);
    expect(quadTree.bounds.height).toBe(100);
    expect(quadTree.maxObjects).toBe(10);
  });

  it('should insert objects', () => {
    const obj = { x: 10, y: 10, width: 5, height: 5 };
    quadTree.insert(obj);

    expect(quadTree.objects.length).toBe(1);
  });

  it('should subdivide when max objects exceeded', () => {
    for (let i = 0; i < 15; i += 1) {
      const obj = { x: Math.random() * 100, y: Math.random() * 100, width: 1, height: 1 };
      quadTree.insert(obj);
    }

    expect(quadTree.nodes.length).toBeGreaterThan(0);
  });

  it('should retrieve objects in bounds', () => {
    const obj1 = { x: 10, y: 10, width: 5, height: 5 };
    const obj2 = { x: 80, y: 80, width: 5, height: 5 };

    quadTree.insert(obj1);
    quadTree.insert(obj2);

    const retrieved = quadTree.retrieve({ x: 5, y: 5, width: 20, height: 20 });
    expect(retrieved.length).toBeGreaterThan(0);
  });

  it('should retrieve objects near a point', () => {
    const obj1 = { x: 10, y: 10, width: 5, height: 5 };
    const obj2 = { x: 50, y: 50, width: 5, height: 5 };

    quadTree.insert(obj1);
    quadTree.insert(obj2);

    const retrieved = quadTree.retrieveNear(new THREE.Vector2(12, 12), 10);
    expect(retrieved.length).toBeGreaterThan(0);
  });

  it('should clear objects', () => {
    quadTree.insert({ x: 10, y: 10, width: 5, height: 5 });
    expect(quadTree.objects.length).toBe(1);

    quadTree.clear();
    expect(quadTree.objects.length).toBe(0);
  });

  it('should contain objects correctly', () => {
    const obj = { x: 10, y: 10, width: 5, height: 5 };
    expect(quadTree.contains(obj)).toBe(true);

    const objOutside = { x: 150, y: 150, width: 5, height: 5 };
    expect(quadTree.contains(objOutside)).toBe(false);
  });

  it('should detect bounds intersection', () => {
    const bounds1 = { x: 10, y: 10, width: 20, height: 20 };
    const bounds2 = { x: 25, y: 25, width: 20, height: 20 };
    const bounds3 = { x: 50, y: 50, width: 20, height: 20 };

    expect(quadTree.boundsIntersect(bounds1)).toBe(true);
    expect(quadTree.boundsIntersect(bounds2)).toBe(true);
    expect(quadTree.boundsIntersect(bounds3)).toBe(true);
  });

  it('should not intersect bounds outside', () => {
    const boundsOutside = { x: 150, y: 150, width: 20, height: 20 };
    expect(quadTree.boundsIntersect(boundsOutside)).toBe(false);
  });
});

describe('SpatialIndex', () => {
  let spatialIndex;

  beforeEach(() => {
    spatialIndex = new SpatialIndex({ x: -100, y: -100, width: 200, height: 200 }, 10);
  });

  it('should create a spatial index', () => {
    expect(spatialIndex.cellSize).toBe(10);
    expect(spatialIndex.objects.size).toBe(0);
  });

  it('should add and remove objects', () => {
    const obj = {
      position: new THREE.Vector3(10, 0, 10),
      scale: new THREE.Vector3(5, 5, 5),
    };

    spatialIndex.add('obj-1', obj);
    expect(spatialIndex.objects.size).toBe(1);

    spatialIndex.remove('obj-1');
    expect(spatialIndex.objects.size).toBe(0);
  });

  it('should get nearby objects', () => {
    const obj1 = {
      position: new THREE.Vector3(10, 0, 10),
      scale: new THREE.Vector3(1, 1, 1),
    };

    const obj2 = {
      position: new THREE.Vector3(50, 0, 50),
      scale: new THREE.Vector3(1, 1, 1),
    };

    spatialIndex.add('obj-1', obj1);
    spatialIndex.add('obj-2', obj2);

    const nearby = spatialIndex.getNearby(new THREE.Vector3(11, 0, 11), 5);
    expect(nearby.length).toBeGreaterThan(0);
  });

  it('should update object position', () => {
    const obj = {
      position: new THREE.Vector3(10, 0, 10),
      scale: new THREE.Vector3(1, 1, 1),
    };

    spatialIndex.add('obj-1', obj);

    const newPos = new THREE.Vector3(20, 0, 20);
    spatialIndex.update('obj-1', newPos);

    const nearby = spatialIndex.getNearby(new THREE.Vector3(21, 0, 21), 5);
    expect(nearby.length).toBeGreaterThan(0);
  });

  it('should clear all objects', () => {
    spatialIndex.add('obj-1', {
      position: new THREE.Vector3(10, 0, 10),
      scale: new THREE.Vector3(1, 1, 1),
    });

    expect(spatialIndex.objects.size).toBe(1);

    spatialIndex.clear();
    expect(spatialIndex.objects.size).toBe(0);
  });

  it('should get grid cells for bounds', () => {
    const cells = spatialIndex.getGridCells(5, 5, 25, 25);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should handle multiple objects in same cell', () => {
    const obj1 = {
      position: new THREE.Vector3(10, 0, 10),
      scale: new THREE.Vector3(1, 1, 1),
    };

    const obj2 = {
      position: new THREE.Vector3(12, 0, 12),
      scale: new THREE.Vector3(1, 1, 1),
    };

    spatialIndex.add('obj-1', obj1);
    spatialIndex.add('obj-2', obj2);

    const nearby = spatialIndex.getNearby(new THREE.Vector3(11, 0, 11), 5);
    expect(nearby.length).toBe(2);
  });
});
