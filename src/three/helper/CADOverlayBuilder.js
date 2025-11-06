import * as THREE from 'three';

const DEFAULT_LINE_COLOR = '#9ca3af';

export default class CADOverlayBuilder {
  constructor({ defaultColor = DEFAULT_LINE_COLOR, groupName = 'CADOverlay' } = {}) {
    this.defaultColor = defaultColor;
    this.groupName = groupName;
  }

  build(polylines = [], options = {}) {
    const { opacity = 1, visibilityByLayer = {}, layerStyles = {} } = options;

    const overlayGroup = new THREE.Group();
    overlayGroup.name = this.groupName;
    overlayGroup.userData = {
      layerGroups: new Map(),
      layerMaterials: new Map(),
    };

    if (!Array.isArray(polylines) || polylines.length === 0) {
      return overlayGroup;
    }

    polylines.forEach((polyline) => {
      if (!polyline || !Array.isArray(polyline.points) || polyline.points.length < 2) {
        return;
      }

      const layerId = polyline.layerId || 'default';
      const layerGroup = this.ensureLayerGroup(
        overlayGroup,
        layerId,
        visibilityByLayer[layerId]
      );
      const material = this.ensureLayerMaterial(
        overlayGroup,
        layerId,
        opacity,
        this.resolveColor(polyline, layerStyles[layerId])
      );

      const geometry = this.createGeometryFromPolyline(polyline);
      if (!geometry) {
        return;
      }

      const line = new THREE.LineSegments(geometry, material);
      line.name = polyline.id || `cad-polyline-${layerGroup.children.length + 1}`;
      line.userData = {
        layerId,
        sourceId: polyline.id || null,
      };
      layerGroup.add(line);
    });

    return overlayGroup;
  }

  ensureLayerGroup(overlayGroup, layerId, visible) {
    const { layerGroups } = overlayGroup.userData;
    if (layerGroups.has(layerId)) {
      return layerGroups.get(layerId);
    }
    const group = new THREE.Group();
    group.name = `cad-layer-${layerId}`;
    group.visible = typeof visible === 'boolean' ? visible : true;
    overlayGroup.add(group);
    layerGroups.set(layerId, group);
    return group;
  }

  ensureLayerMaterial(overlayGroup, layerId, opacity, color) {
    const { layerMaterials } = overlayGroup.userData;
    if (layerMaterials.has(layerId)) {
      const existing = layerMaterials.get(layerId);
      existing.opacity = opacity;
      existing.transparent = opacity < 1;
      if (existing.color && typeof existing.color.set === 'function') {
        existing.color.set(color);
      }
      existing.needsUpdate = true;
      return existing;
    }
    const material = new THREE.LineBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      depthWrite: false,
    });
    material.name = `cad-layer-material-${layerId}`;
    layerMaterials.set(layerId, material);
    return material;
  }

  createGeometryFromPolyline(polyline) {
    const points = Array.isArray(polyline.points) ? polyline.points : [];
    if (points.length < 2) {
      return null;
    }

    const vertices = [];

    for (let i = 0; i < points.length - 1; i += 1) {
      const start = this.parsePoint(points[i]);
      const end = this.parsePoint(points[i + 1]);
      vertices.push(start.x, 0, start.y, end.x, 0, end.y);
    }

    if (polyline.closed) {
      const first = this.parsePoint(points[0]);
      const last = this.parsePoint(points[points.length - 1]);
      if (first.x !== last.x || first.y !== last.y) {
        vertices.push(last.x, 0, last.y, first.x, 0, first.y);
      }
    }

    if (vertices.length === 0) {
      return null;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }

  parsePoint(point) {
    if (Array.isArray(point)) {
      return {
        x: Number(point[0]) || 0,
        y: Number(point[1]) || 0,
      };
    }
    if (point && typeof point === 'object') {
      return {
        x: Number(point.x) || 0,
        y: Number(point.y) || 0,
      };
    }
    return { x: 0, y: 0 };
  }

  resolveColor(polyline, layerStyle = {}) {
    if (polyline && polyline.color) {
      return polyline.color;
    }
    if (layerStyle && layerStyle.color) {
      return layerStyle.color;
    }
    return this.defaultColor;
  }

  updateOpacity(overlayGroup, opacity) {
    if (!overlayGroup || !overlayGroup.userData || !overlayGroup.userData.layerMaterials) {
      return;
    }
    overlayGroup.userData.layerMaterials.forEach((material) => {
      if (!material) {
        return;
      }
      material.opacity = opacity;
      material.transparent = opacity < 1;
      material.needsUpdate = true;
    });
  }

  applyLayerVisibility(overlayGroup, visibilityByLayer = {}) {
    if (!overlayGroup || !overlayGroup.userData || !overlayGroup.userData.layerGroups) {
      return;
    }
    overlayGroup.userData.layerGroups.forEach((group, layerId) => {
      if (typeof visibilityByLayer[layerId] === 'boolean') {
        group.visible = visibilityByLayer[layerId];
      }
    });
  }

  updateLayerStyles(overlayGroup, layerStyles = {}) {
    if (!overlayGroup || !overlayGroup.userData || !overlayGroup.userData.layerMaterials) {
      return;
    }
    overlayGroup.userData.layerMaterials.forEach((material, layerId) => {
      const style = layerStyles[layerId];
      const color = style && style.color ? style.color : this.defaultColor;
      if (material && material.color && typeof material.color.set === 'function') {
        material.color.set(color);
        material.needsUpdate = true;
      }
    });
  }
}
