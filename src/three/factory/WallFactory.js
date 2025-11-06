import * as THREE from 'three';

export class WallFactory {
  constructor() {
    this.walls = new Map();
    this.nextId = 1;
  }

  create(wallData) {
    const id = `wall-${this.nextId++}`;
    const wall = {
      id,
      name: wallData.name || `墙体 ${id.split('-')[1]}`,
      startX: wallData.startX || 0,
      startZ: wallData.startZ || 0,
      endX: wallData.endX || 10,
      endZ: wallData.endZ || 0,
      height: wallData.height || 3,
      thickness: wallData.thickness || 0.2,
      material: wallData.material || 'concrete',
      color: wallData.color || '#ffffff',
      mesh: null,
    };

    this.walls.set(id, wall);
    this.updateMesh(id);
    return wall;
  }

  update(id, updates) {
    const wall = this.walls.get(id);
    if (!wall) return null;

    Object.assign(wall, updates);
    this.updateMesh(id);
    return wall;
  }

  delete(id) {
    const wall = this.walls.get(id);
    if (!wall) return false;

    if (wall.mesh) {
      wall.mesh.geometry.dispose();
      if (Array.isArray(wall.mesh.material)) {
        wall.mesh.material.forEach(material => material.dispose());
      } else {
        wall.mesh.material.dispose();
      }
    }
    
    this.walls.delete(id);
    return true;
  }

  copy(id, offset = { x: 2, z: 2 }) {
    const wall = this.walls.get(id);
    if (!wall) return null;

    const newWallData = {
      ...wall,
      startX: wall.startX + offset.x,
      startZ: wall.startZ + offset.z,
      endX: wall.endX + offset.x,
      endZ: wall.endZ + offset.z,
    };
    delete newWallData.id;
    delete newWallData.mesh;

    return this.create(newWallData);
  }

  get(id) {
    return this.walls.get(id) || null;
  }

  getAll() {
    return Array.from(this.walls.values());
  }

  updateMesh(id) {
    const wall = this.walls.get(id);
    if (!wall) return;

    // Dispose existing mesh if it exists
    if (wall.mesh) {
      wall.mesh.geometry.dispose();
      if (Array.isArray(wall.mesh.material)) {
        wall.mesh.material.forEach(material => material.dispose());
      } else {
        wall.mesh.material.dispose();
      }
    }

    // Use global THREE for testing, otherwise import THREE
    const Three = (typeof global !== 'undefined' && global.THREE) ? global.THREE : THREE;

    // Create wall geometry
    const width = Math.sqrt(
      Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endZ - wall.startZ, 2)
    );
    const height = wall.height;
    const thickness = wall.thickness;

    const geometry = new Three.BoxGeometry(width, height, thickness);
    
    // Create material
    const material = new Three.MeshLambertMaterial({
      color: new Three.Color(wall.color),
    });

    // Create mesh
    const mesh = new Three.Mesh(geometry, material);

    // Position mesh at center of wall
    const centerX = (wall.startX + wall.endX) / 2;
    const centerZ = (wall.startZ + wall.endZ) / 2;
    mesh.position.set(centerX, height / 2, centerZ);

    // Rotate mesh to align with wall direction
    const angle = Math.atan2(wall.endZ - wall.startZ, wall.endX - wall.startX);
    mesh.rotation.y = -angle;

    wall.mesh = mesh;
  }
}