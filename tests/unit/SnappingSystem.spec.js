import * as THREE from 'three';
// eslint-disable-next-line import/extensions, import/no-unresolved
import { SnappingSystem } from '@/three/utils';

describe('SnappingSystem', () => {
  let snappingSystem;

  beforeEach(() => {
    snappingSystem = new SnappingSystem(0.5);
  });

  it('should initialize with default settings', () => {
    expect(snappingSystem.enabled).toBe(true);
    expect(snappingSystem.tolerance).toBe(0.5);
    expect(snappingSystem.snappingModes.node).toBe(true);
    expect(snappingSystem.snappingModes.intersection).toBe(true);
  });

  it('should add and remove nodes', () => {
    const point = new THREE.Vector3(1, 0, 0);
    snappingSystem.addNode(point, 'node-1');

    expect(snappingSystem.nodes.length).toBe(1);

    snappingSystem.removeNode('node-1');
    expect(snappingSystem.nodes.length).toBe(0);
  });

  it('should add and remove lines', () => {
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(1, 0, 0);

    snappingSystem.addLine(start, end, 'line-1');
    expect(snappingSystem.lines.length).toBe(1);

    snappingSystem.removeLine('line-1');
    expect(snappingSystem.lines.length).toBe(0);
  });

  it('should snap to grid', () => {
    snappingSystem.gridSize = 0.1;

    const point = new THREE.Vector3(0.35, 0.47, 0.09);
    const snapped = snappingSystem.snapToGrid(point);

    expect(snapped.x).toBeCloseTo(0.4, 5);
    expect(snapped.y).toBeCloseTo(0.5, 5);
    expect(snapped.z).toBeCloseTo(0.1, 5);
  });

  it('should snap to nearby node', () => {
    const node = new THREE.Vector3(1, 0, 0);
    snappingSystem.addNode(node, 'node-1');

    const point = new THREE.Vector3(1.2, 0, 0);
    const snapped = snappingSystem.snapPoint(point, []);

    expect(snapped.distanceTo(node)).toBeLessThan(0.1);
  });

  it('should snap orthogonal to reference point', () => {
    snappingSystem.snappingModes.grid = false;
    snappingSystem.snappingModes.node = false;

    const point = new THREE.Vector3(2, 1.2, 3);
    const reference = new THREE.Vector3(2, 0, 3);

    const snapped = snappingSystem.snapPoint(point, [reference]);

    expect(snapped.x).toBeCloseTo(2, 5);
    expect(snapped.z).toBeCloseTo(3, 5);
  });

  it('should snap diagonal 45 degrees', () => {
    snappingSystem.snappingModes.diagonal45 = true;
    snappingSystem.snappingModes.grid = false;
    snappingSystem.snappingModes.node = false;
    snappingSystem.snappingModes.orthogonal = false;

    const reference = new THREE.Vector3(0, 0, 0);
    const point = new THREE.Vector3(1.4, 0, 1.4);

    const snapped = snappingSystem.snapPoint(point, [reference]);

    expect(snapped).not.toBeNull();
  });

  it('should calculate line intersection', () => {
    const line1 = {
      start: new THREE.Vector3(0, 0, 0),
      end: new THREE.Vector3(2, 0, 0),
    };

    const line2 = {
      start: new THREE.Vector3(1, -1, 0),
      end: new THREE.Vector3(1, 1, 0),
    };

    const intersection = snappingSystem.getLineIntersection(line1, line2);

    expect(intersection).not.toBeNull();
    expect(intersection.x).toBeCloseTo(1, 5);
    expect(intersection.z).toBeCloseTo(0, 5);
  });

  it('should detect parallel lines (no intersection)', () => {
    const line1 = {
      start: new THREE.Vector3(0, 0, 0),
      end: new THREE.Vector3(1, 0, 0),
    };

    const line2 = {
      start: new THREE.Vector3(0, 1, 0),
      end: new THREE.Vector3(1, 1, 0),
    };

    const intersection = snappingSystem.getLineIntersection(line1, line2);
    expect(intersection).toBeNull();
  });

  it('should set snapping mode', () => {
    snappingSystem.setMode('node', false);
    expect(snappingSystem.snappingModes.node).toBe(false);

    snappingSystem.setMode('grid', true);
    expect(snappingSystem.snappingModes.grid).toBe(true);
  });

  it('should enable and disable snapping', () => {
    expect(snappingSystem.enabled).toBe(true);

    snappingSystem.setEnabled(false);
    expect(snappingSystem.enabled).toBe(false);

    snappingSystem.setEnabled(true);
    expect(snappingSystem.enabled).toBe(true);
  });

  it('should return unchanged point when snapping disabled', () => {
    snappingSystem.setEnabled(false);

    const point = new THREE.Vector3(1.234, 5.678, 9.012);
    const snapped = snappingSystem.snapPoint(point, []);

    expect(snapped.x).toBeCloseTo(1.234, 5);
    expect(snapped.y).toBeCloseTo(5.678, 5);
    expect(snapped.z).toBeCloseTo(9.012, 5);
  });

  it('should set tolerance', () => {
    snappingSystem.setTolerance(2.0);
    expect(snappingSystem.tolerance).toBe(2.0);
  });

  it('should get snapping info', () => {
    const node = new THREE.Vector3(1, 0, 0);
    snappingSystem.addNode(node, 'node-1');

    const point = new THREE.Vector3(1.1, 0, 0);
    snappingSystem.snapPoint(point, []);

    const info = snappingSystem.getSnappingInfo();
    expect(info).not.toBeNull();
    expect(info.type).toBe('node');
  });

  it('should clear all nodes and lines', () => {
    snappingSystem.addNode(new THREE.Vector3(0, 0, 0), 'node-1');
    snappingSystem.addLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 'line-1');

    expect(snappingSystem.nodes.length).toBe(1);
    expect(snappingSystem.lines.length).toBe(1);

    snappingSystem.clear();

    expect(snappingSystem.nodes.length).toBe(0);
    expect(snappingSystem.lines.length).toBe(0);
  });
});
