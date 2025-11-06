import fs from 'fs';
import path from 'path';
import { parseDxfArrayBuffer, unitToMeters } from '@/utils/dxf';

const toArrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

describe('dxf utils', () => {
  it('parses DXF fixture and aggregates geometry by layer', () => {
    const filePath = path.resolve(__dirname, '../fixtures/simple.dxf');
    const fileBuffer = fs.readFileSync(filePath);
    const result = parseDxfArrayBuffer(toArrayBuffer(fileBuffer));

    expect(result.detectedUnit).toBe('mm');
    expect(result.layers).toHaveLength(2);

    const layerNames = result.layers.map((layer) => layer.id);
    expect(layerNames).toEqual(expect.arrayContaining(['LayerVisible', 'LayerArc']));

    const visibleLayer = result.layerGeometries.LayerVisible;
    const arcLayer = result.layerGeometries.LayerArc;

    expect(visibleLayer.polylines).toHaveLength(2);
    expect(arcLayer.polylines).toHaveLength(1);

    const [linePolyline, lwPolyline] = visibleLayer.polylines;
    expect(linePolyline.points[0]).toEqual({ x: 0, y: 0 });
    expect(linePolyline.points[1]).toEqual({ x: 1000, y: 0 });
    expect(lwPolyline.isClosed).toBe(true);
    expect(lwPolyline.points).toHaveLength(3);

    const arcPolyline = arcLayer.polylines[0];
    expect(arcPolyline.points.length).toBeGreaterThan(8);
    expect(arcPolyline.points[0].x).toBeCloseTo(500, 0);
    expect(visibleLayer.color).toBe('#ff0000');
    expect(arcLayer.color).toBe('#0000ff');
  });

  it('returns correct unit scaling to meters', () => {
    expect(unitToMeters('mm')).toBeCloseTo(0.001);
    expect(unitToMeters('cm')).toBeCloseTo(0.01);
    expect(unitToMeters('m')).toBeCloseTo(1);
    expect(unitToMeters('unknown')).toBeCloseTo(0.001);
  });
});
