import * as THREE from 'three';
import CADOverlayBuilder from '@/three/helper/CADOverlayBuilder';

describe('CADOverlayBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new CADOverlayBuilder();
  });

  it('builds a CAD overlay group with layer materials and visibility applied', () => {
    const polylines = [
      {
        id: 'poly-structure',
        layerId: 'layer-structure',
        color: '#1d4ed8',
        closed: true,
        points: [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      },
      {
        id: 'poly-furniture',
        layerId: 'layer-furniture',
        points: [
          { x: 2, y: 2 },
          { x: 3, y: 2 },
        ],
      },
    ];

    const overlayGroup = builder.build(polylines, {
      opacity: 0.6,
      visibilityByLayer: {
        'layer-structure': true,
        'layer-furniture': false,
      },
      layerStyles: {
        'layer-furniture': { color: '#f97316' },
      },
    });

    expect(overlayGroup).toBeInstanceOf(THREE.Group);
    expect(overlayGroup.name).toBe('CADOverlay');

    const { layerGroups, layerMaterials } = overlayGroup.userData;
    expect(layerGroups.size).toBe(2);
    expect(layerMaterials.size).toBe(2);

    const structureGroup = layerGroups.get('layer-structure');
    expect(structureGroup.visible).toBe(true);
    const structureMaterial = layerMaterials.get('layer-structure');
    expect(structureMaterial.opacity).toBeCloseTo(0.6);
    expect(structureMaterial.color.getHexString()).toBe('1d4ed8');

    const furnitureGroup = layerGroups.get('layer-furniture');
    expect(furnitureGroup.visible).toBe(false);
    const furnitureMaterial = layerMaterials.get('layer-furniture');
    expect(furnitureMaterial.color.getHexString()).toBe('f97316');

    const structureLine = structureGroup.children[0];
    const structurePositions = structureLine.geometry.getAttribute('position');
    // closed polyline should add an extra segment back to the start
    expect(structurePositions.array.length).toBe(18);

    const furnitureLine = furnitureGroup.children[0];
    const furniturePositions = furnitureLine.geometry.getAttribute('position');
    expect(furniturePositions.array.length).toBe(6);
  });

  it('updates opacity and visibility without rebuilding geometry', () => {
    const polylines = [
      {
        id: 'poly-structure',
        layerId: 'layer-structure',
        points: [
          [0, 0],
          [1, 0],
        ],
      },
    ];

    const overlayGroup = builder.build(polylines, { opacity: 1 });

    builder.updateOpacity(overlayGroup, 0.3);
    const material = overlayGroup.userData.layerMaterials.get('layer-structure');
    expect(material.opacity).toBeCloseTo(0.3);
    expect(material.transparent).toBe(true);

    builder.applyLayerVisibility(overlayGroup, { 'layer-structure': false });
    const group = overlayGroup.userData.layerGroups.get('layer-structure');
    expect(group.visible).toBe(false);
  });

  it('updates layer styles when colors change', () => {
    const polylines = [
      {
        id: 'poly-structure',
        layerId: 'layer-structure',
        points: [
          [0, 0],
          [1, 0],
        ],
      },
    ];

    const overlayGroup = builder.build(polylines, {
      layerStyles: {
        'layer-structure': { color: '#2563eb' },
      },
    });

    const material = overlayGroup.userData.layerMaterials.get('layer-structure');
    expect(material.color.getHexString()).toBe('2563eb');

    builder.updateLayerStyles(overlayGroup, {
      'layer-structure': { color: '#facc15' },
    });

    expect(material.color.getHexString()).toBe('facc15');
    expect(material.needsUpdate).toBe(true);
  });
});
