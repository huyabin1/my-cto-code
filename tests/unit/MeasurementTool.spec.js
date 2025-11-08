import * as THREE from 'three';
// eslint-disable-next-line import/extensions, import/no-unresolved
import {
  MeasurementTool,
  DistanceMeasurement,
  AreaMeasurement,
  AngleMeasurement,
} from '@/three/tool';

describe('MeasurementTool - Base Class', () => {
  it('should activate and deactivate', () => {
    const tool = new MeasurementTool();
    expect(tool.isActive).toBe(false);

    tool.activate();
    expect(tool.isActive).toBe(true);

    tool.deactivate();
    expect(tool.isActive).toBe(false);
  });

  it('should add and remove points', () => {
    const tool = new MeasurementTool();
    tool.activate();

    const point1 = new THREE.Vector3(0, 0, 0);
    const point2 = new THREE.Vector3(1, 0, 0);

    tool.addPoint(point1);
    tool.addPoint(point2);

    expect(tool.points.length).toBe(2);

    tool.removeLastPoint();
    expect(tool.points.length).toBe(1);
  });

  it('should clear all data', () => {
    const tool = new MeasurementTool();
    tool.activate();

    tool.addPoint(new THREE.Vector3(0, 0, 0));
    tool.addPoint(new THREE.Vector3(1, 0, 0));

    tool.clear();

    expect(tool.points.length).toBe(0);
    expect(tool.measurements.length).toBe(0);
  });
});

describe('DistanceMeasurement', () => {
  it('should calculate distance between two points', () => {
    const tool = new DistanceMeasurement();
    tool.activate();

    const point1 = new THREE.Vector3(0, 0, 0);
    const point2 = new THREE.Vector3(3, 4, 0);

    tool.addPoint(point1);
    tool.addPoint(point2);

    const measurements = tool.getMeasurements();
    expect(measurements.length).toBe(1);
    expect(measurements[0].type).toBe('distance');
    expect(measurements[0].distance).toBeCloseTo(5, 5); // 3-4-5 triangle
  });

  it('should support continuous measurement mode', () => {
    const tool = new DistanceMeasurement();
    tool.mode = 'continuous';
    tool.activate();

    const point1 = new THREE.Vector3(0, 0, 0);
    const point2 = new THREE.Vector3(1, 0, 0);
    const point3 = new THREE.Vector3(1, 1, 0);

    tool.addPoint(point1);
    tool.addPoint(point2);
    tool.addPoint(point3);

    const measurements = tool.getMeasurements();
    expect(measurements.length).toBe(2);
  });

  it('should create visual helpers', () => {
    const tool = new DistanceMeasurement();
    tool.activate();

    const point1 = new THREE.Vector3(0, 0, 0);
    const point2 = new THREE.Vector3(1, 0, 0);

    tool.addPoint(point1);
    tool.addPoint(point2);

    const helpers = tool.getVisualHelpers();
    expect(helpers.length).toBeGreaterThan(0);
  });
});

describe('AreaMeasurement', () => {
  it('should calculate area of a triangle', () => {
    const tool = new AreaMeasurement();
    tool.activate();

    const point1 = new THREE.Vector3(0, 0, 0);
    const point2 = new THREE.Vector3(2, 0, 0);
    const point3 = new THREE.Vector3(1, 2, 0);

    tool.addPoint(point1);
    tool.addPoint(point2);
    tool.addPoint(point3);

    tool.completeMeasurement();

    const measurements = tool.getMeasurements();
    expect(measurements.length).toBe(1);
    expect(measurements[0].type).toBe('area');
    expect(measurements[0].area).toBeCloseTo(2, 5);
  });

  it('should calculate perimeter', () => {
    const tool = new AreaMeasurement();
    tool.activate();

    const point1 = new THREE.Vector3(0, 0, 0);
    const point2 = new THREE.Vector3(1, 0, 0);
    const point3 = new THREE.Vector3(1, 1, 0);
    const point4 = new THREE.Vector3(0, 1, 0);

    tool.addPoint(point1);
    tool.addPoint(point2);
    tool.addPoint(point3);
    tool.addPoint(point4);

    tool.completeMeasurement();

    const measurements = tool.getMeasurements();
    expect(measurements.length).toBe(1);
    expect(measurements[0].perimeter).toBeCloseTo(4, 5);
  });

  it('should not complete measurement with less than 3 points', () => {
    const tool = new AreaMeasurement();
    tool.activate();

    tool.addPoint(new THREE.Vector3(0, 0, 0));
    tool.addPoint(new THREE.Vector3(1, 0, 0));

    tool.completeMeasurement();

    expect(tool.getMeasurements().length).toBe(0);
  });
});

describe('AngleMeasurement', () => {
  it('should calculate right angle (90 degrees)', () => {
    const tool = new AngleMeasurement();
    tool.activate();

    const vertex = new THREE.Vector3(0, 0, 0);
    const point1 = new THREE.Vector3(1, 0, 0);
    const point2 = new THREE.Vector3(0, 1, 0);

    tool.addPoint(point1);
    tool.addPoint(vertex);
    tool.addPoint(point2);

    const measurements = tool.getMeasurements();
    expect(measurements.length).toBe(1);
    expect(measurements[0].type).toBe('angle');
    expect(measurements[0].angle).toBeCloseTo(90, 1);
  });

  it('should calculate straight angle (180 degrees)', () => {
    const tool = new AngleMeasurement();
    tool.activate();

    const vertex = new THREE.Vector3(0, 0, 0);
    const point1 = new THREE.Vector3(-1, 0, 0);
    const point2 = new THREE.Vector3(1, 0, 0);

    tool.addPoint(point1);
    tool.addPoint(vertex);
    tool.addPoint(point2);

    const measurements = tool.getMeasurements();
    expect(measurements.length).toBe(1);
    expect(measurements[0].angle).toBeCloseTo(180, 1);
  });

  it('should calculate 45 degree angle', () => {
    const tool = new AngleMeasurement();
    tool.activate();

    const vertex = new THREE.Vector3(0, 0, 0);
    const point1 = new THREE.Vector3(1, 0, 0);
    const point2 = new THREE.Vector3(1, 1, 0);

    tool.addPoint(point1);
    tool.addPoint(vertex);
    tool.addPoint(point2);

    const measurements = tool.getMeasurements();
    expect(measurements.length).toBe(1);
    expect(measurements[0].angle).toBeCloseTo(45, 1);
  });
});
