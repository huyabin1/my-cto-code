import * as THREE from 'three';

const DEFAULTS = {
  height: 3,
  thickness: 0.2,
};

const ensurePoint = (point = {}) => ({
  x: typeof point.x === 'number' ? point.x : 0,
  y: typeof point.y === 'number' ? point.y : 0,
  z: typeof point.z === 'number' ? point.z : 0,
});

class WallFactory {
  constructor({ materialFactory } = {}) {
    this.materialFactory =
      materialFactory || (() => new THREE.MeshStandardMaterial({ color: 0xb0b0b0 }));
  }

  createGeometry(wall) {
    const start = ensurePoint(wall.start);
    const end = ensurePoint(wall.end);

    const dx = end.x - start.x;
    const dz = end.y - start.y;

    const length = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const height = wall.height != null ? wall.height : DEFAULTS.height;
    const thickness = wall.thickness != null ? wall.thickness : DEFAULTS.thickness;

    return new THREE.BoxGeometry(length, height, thickness);
  }

  create(wall) {
    if (!wall || !wall.id) {
      throw new Error('Wall data requires an id for tracking.');
    }

    const geometry = this.createGeometry(wall);
    const material = this.materialFactory(wall);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      ...(mesh.userData || {}),
      wallId: wall.id,
    };

    this.applyTransform(mesh, wall);

    return mesh;
  }

  update(mesh, wall) {
    if (!mesh || !wall) {
      return;
    }

    if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose();
    }

    mesh.geometry = this.createGeometry(wall);
    mesh.userData = {
      ...(mesh.userData || {}),
      wallId: wall.id,
    };

    this.applyTransform(mesh, wall);
  }

  applyTransform(mesh, wall) {
    const start = ensurePoint(wall.start);
    const end = ensurePoint(wall.end);

    const midX = (start.x + end.x) / 2;
    const midZ = (start.y + end.y) / 2;
    const height = wall.height != null ? wall.height : DEFAULTS.height;

    if (mesh.position && typeof mesh.position.set === 'function') {
      mesh.position.set(midX, height / 2, midZ);
    }

    const dx = end.x - start.x;
    const dz = end.y - start.y;

    if (mesh.rotation) {
      mesh.rotation.y = Math.atan2(dz, dx);
    }
  }

  highlight(mesh, color = 0x409eff) {
    if (!mesh || !mesh.material || !mesh.material.color) {
      return;
    }

    if (mesh.userData && mesh.userData.__originalColor === undefined) {
      mesh.userData.__originalColor = this.resolveCurrentColor(mesh.material.color);
    }

    if (typeof mesh.material.color.set === 'function') {
      mesh.material.color.set(color);
    }
  }

  clearHighlight(mesh) {
    if (!mesh || !mesh.material || !mesh.material.color || !mesh.userData) {
      return;
    }

    const originalColor = mesh.userData.__originalColor;

    if (originalColor !== undefined && typeof mesh.material.color.set === 'function') {
      mesh.material.color.set(originalColor);
    }

    delete mesh.userData.__originalColor;
  }

  resolveCurrentColor(colorRef) {
    if (!colorRef) {
      return undefined;
    }

    if (typeof colorRef.getHex === 'function') {
      return colorRef.getHex();
    }

    if (typeof colorRef.value !== 'undefined') {
      return colorRef.value;
    }

    if (typeof colorRef.getStyle === 'function') {
      return colorRef.getStyle();
    }

    return colorRef;
  }

  dispose(mesh) {
    if (!mesh) {
      return;
    }

    if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose();
    }

    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => {
          if (material && typeof material.dispose === 'function') {
            material.dispose();
          }
        });
      } else if (typeof mesh.material.dispose === 'function') {
        mesh.material.dispose();
      }
    }
  }
}

export default WallFactory;
