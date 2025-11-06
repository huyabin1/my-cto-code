import * as THREE from 'three';

class SceneManager {
  constructor(scene = null) {
    this.scene = scene || new THREE.Scene();
    this.groups = new Map();
  }

  getScene() {
    return this.scene;
  }

  addGroup(name, group = null) {
    if (!name) {
      throw new Error('Group name is required.');
    }

    if (this.groups.has(name)) {
      return this.groups.get(name);
    }

    const targetGroup = group || new THREE.Group();
    targetGroup.name = name;

    this.groups.set(name, targetGroup);

    if (this.scene) {
      this.scene.add(targetGroup);
    }

    return targetGroup;
  }

  getGroup(name) {
    return this.groups.get(name);
  }

  hasGroup(name) {
    return this.groups.has(name);
  }

  listGroups() {
    return Array.from(this.groups.keys());
  }

  removeGroup(name) {
    const group = this.groups.get(name);

    if (!group) {
      return;
    }

    if (this.scene) {
      this.scene.remove(group);
    }

    if (typeof group.clear === 'function') {
      group.clear();
    }

    this.groups.delete(name);
  }

  dispose() {
    this.groups.forEach((group) => {
      if (this.scene) {
        this.scene.remove(group);
      }

      if (group && typeof group.clear === 'function') {
        group.clear();
      }
    });

    this.groups.clear();
  }
}

export default SceneManager;
