import * as THREE from 'three';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

const DEFAULT_THRESHOLD_PX = 5;

export default class SelectionManager {
  constructor(options) {
    const {
      camera,
      domElement,
      store,
      scene,
      raycaster,
      sceneGraph,
      threshold = DEFAULT_THRESHOLD_PX,
      onSelectionChange,
    } = options;

    if (!camera || !domElement || !store || !scene) {
      throw new Error('SelectionManager requires camera, domElement, scene, and store');
    }

    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.store = store;
    this.sceneGraph = sceneGraph || getSharedSceneGraph();
    this.raycaster = raycaster || new THREE.Raycaster();
    this.threshold = threshold;
    this.onSelectionChange = onSelectionChange;

    this.pointerDown = false;
    this.pointerStart = new THREE.Vector2();
    this.pointerCurrent = new THREE.Vector2();
    this.startNdc = new THREE.Vector2();
    this.currentNdc = new THREE.Vector2();
    this.marqueeActive = false;
    this.pointerModifier = { add: false, toggle: false };

    this._boundPointerDown = (event) => this.handlePointerDown(event);
    this._boundPointerMove = (event) => this.handlePointerMove(event);
    this._boundPointerUp = (event) => this.handlePointerUp(event);

    this.bindEvents();
  }

  bindEvents() {
    this.domElement.addEventListener('pointerdown', this._boundPointerDown);
    window.addEventListener('pointermove', this._boundPointerMove);
    window.addEventListener('pointerup', this._boundPointerUp);
  }

  unbindEvents() {
    this.domElement.removeEventListener('pointerdown', this._boundPointerDown);
    window.removeEventListener('pointermove', this._boundPointerMove);
    window.removeEventListener('pointerup', this._boundPointerUp);
  }

  destroy() {
    this.unbindEvents();
  }

  handlePointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    this.pointerDown = true;
    this.marqueeActive = false;
    this.pointerModifier = {
      add: event.shiftKey,
      toggle: event.ctrlKey || event.metaKey,
    };

    this.pointerStart.set(event.clientX, event.clientY);
    this.startNdc.copy(this.getPointerNDC(event));
    this.store.dispatch('editor/updateSelectionMarquee', {
      active: false,
      start: null,
      end: null,
    });
  }

  handlePointerMove(event) {
    if (!this.pointerDown) {
      return;
    }

    this.pointerCurrent.set(event.clientX, event.clientY);
    this.currentNdc.copy(this.getPointerNDC(event));

    if (!this.marqueeActive) {
      const deltaX = this.pointerCurrent.x - this.pointerStart.x;
      const deltaY = this.pointerCurrent.y - this.pointerStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance >= this.threshold) {
        this.marqueeActive = true;
      }
    }

    if (this.marqueeActive) {
      this.store.dispatch('editor/updateSelectionMarquee', {
        active: true,
        start: { x: this.startNdc.x, y: this.startNdc.y },
        end: { x: this.currentNdc.x, y: this.currentNdc.y },
      });
    }
  }

  async handlePointerUp(event) {
    if (!this.pointerDown || event.button !== 0) {
      return;
    }

    this.pointerDown = false;

    if (this.marqueeActive) {
      await this.applyMarqueeSelection();
    } else {
      await this.applySingleSelection(event);
    }

    this.store.dispatch('editor/updateSelectionMarquee', null);
    this.marqueeActive = false;
  }

  async applySingleSelection(event) {
    const ndc = this.getPointerNDC(event);
    this.raycaster.setFromCamera(ndc, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    let entityId = null;

    for (let i = 0; i < intersects.length; i += 1) {
      const object = intersects[i].object;
      entityId = this.resolveEntityId(object);
      if (entityId) {
        break;
      }
    }

    const mode = this.pointerModifier.toggle ? 'toggle' : this.pointerModifier.add ? 'add' : 'replace';

    if (entityId) {
      const selection = await this.store.dispatch('editor/setSelection', {
        ids: [entityId],
        mode,
      });
      this.notifySelectionChange(selection);
      this.updateHighlights();
    } else if (mode === 'replace') {
      await this.store.dispatch('editor/clearSelection');
      this.notifySelectionChange({ ids: [] });
      this.updateHighlights();
    }
  }

  async applyMarqueeSelection() {
    const ids = this.computeMarqueeIds();
    const mode = this.pointerModifier.toggle ? 'toggle' : this.pointerModifier.add ? 'add' : 'replace';

    const selection = await this.store.dispatch('editor/setSelection', {
      ids,
      mode,
    });
    this.notifySelectionChange(selection);
    this.updateHighlights();
  }

  computeMarqueeIds() {
    const selectionIds = [];
    const minX = Math.min(this.startNdc.x, this.currentNdc.x);
    const maxX = Math.max(this.startNdc.x, this.currentNdc.x);
    const minY = Math.min(this.startNdc.y, this.currentNdc.y);
    const maxY = Math.max(this.startNdc.y, this.currentNdc.y);

    const box = new THREE.Box3();
    const projected = new THREE.Vector3();
    const corners = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ];

    const entities = this.sceneGraph.getAllEntities();

    entities.forEach((entityData) => {
      const { id, threeObject } = entityData;
      if (!threeObject || !threeObject.visible) {
        return;
      }

      box.setFromObject(threeObject);

      const { min, max } = box;
      const points = [
        [min.x, min.y, min.z],
        [min.x, min.y, max.z],
        [min.x, max.y, min.z],
        [min.x, max.y, max.z],
        [max.x, min.y, min.z],
        [max.x, min.y, max.z],
        [max.x, max.y, min.z],
        [max.x, max.y, max.z],
      ];

      let inside = false;
      for (let i = 0; i < corners.length; i += 1) {
        corners[i].set(points[i][0], points[i][1], points[i][2]);
        projected.copy(corners[i]).project(this.camera);
        if (projected.x >= minX && projected.x <= maxX && projected.y >= minY && projected.y <= maxY) {
          inside = true;
          break;
        }
      }

      if (inside) {
        selectionIds.push(id);
      }
    });

    return selectionIds;
  }

  resolveEntityId(object) {
    let current = object;
    while (current) {
      if (current.userData && current.userData.entityId) {
        return current.userData.entityId;
      }
      current = current.parent;
    }
    return null;
  }

  getPointerNDC(event) {
    const rect = this.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  }

  notifySelectionChange(selection) {
    if (typeof this.onSelectionChange === 'function') {
      this.onSelectionChange(selection);
    }
  }

  updateHighlights() {
    const selectedIds = new Set(this.store.state.editor.selection.ids || []);
    this.sceneGraph.getAllEntities().forEach((entityData) => {
      const { id, threeObject } = entityData;
      if (!threeObject) {
        return;
      }
      threeObject.userData = threeObject.userData || {};
      threeObject.userData.isSelected = selectedIds.has(id);
    });
  }
}
