import * as THREE from 'three';

const UNIT_SCALE = {
  auto: 1,
  mm: 0.001,
  cm: 0.01,
  m: 1,
  ft: 0.3048,
};

const ensurePositive = (value, fallback) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  return value;
};

/**
 * AxisHelperManager - Wrapper around THREE.AxesHelper with Vuex integration
 */
class AxisHelperManager {
  /**
   * @param {Object} params - Configuration parameters
   * @param {Object} params.store - Vuex store instance
   * @param {THREE.Scene} params.scene - Target Three.js scene
   * @param {number} [params.size=1000] - Base axis size
   */
  constructor({ store, scene, size = 1000 } = {}) {
    this.store = store;
    this.scene = scene;

    this.baseSize = ensurePositive(size, 1000);
    this.visible = true;
    this.unitScale = 1;

    this.axis = null;
    this.unwatchViewport = null;
    this.unwatchUnit = null;

    this.syncAxisSettings(this.getCurrentAxisSettings());
    this.syncUnitScale(this.getCurrentUnit());

    this.axis = this.buildAxis();
    if (this.scene && this.axis) {
      this.scene.add(this.axis);
    }

    this.bindWatchers();
  }

  getCurrentAxisSettings() {
    return this.store?.state?.editor?.viewport?.axis || {};
  }

  getCurrentUnit() {
    return this.store?.state?.cad?.selectedUnit ?? 'auto';
  }

  bindWatchers() {
    if (!this.store || typeof this.store.watch !== 'function') {
      return;
    }

    this.unwatchViewport = this.store.watch(
      (state) => state.editor?.viewport?.axis,
      (axisSettings) => this.handleAxisSettingsChange(axisSettings || {}),
      { deep: true }
    );

    this.unwatchUnit = this.store.watch(
      (state) => state.cad?.selectedUnit,
      (unit) => this.handleUnitChange(unit),
      { deep: false }
    );
  }

  handleAxisSettingsChange(settings) {
    const { needsRebuild, visibilityChanged } = this.syncAxisSettings(settings);
    if (needsRebuild && this.axis) {
      this.refreshAxis();
      return;
    }

    if (visibilityChanged && this.axis) {
      this.axis.visible = this.visible;
    }
  }

  handleUnitChange(unit) {
    const changed = this.syncUnitScale(unit);
    if (changed && this.axis) {
      this.refreshAxis();
    }
  }

  syncAxisSettings(settings = {}) {
    const nextSize = ensurePositive(settings.size, this.baseSize);
    const nextVisible = settings.visible !== undefined ? Boolean(settings.visible) : this.visible;

    const sizeChanged = nextSize !== this.baseSize;
    const visibilityChanged = nextVisible !== this.visible;

    this.baseSize = nextSize;
    this.visible = nextVisible;

    return {
      needsRebuild: sizeChanged,
      visibilityChanged,
    };
  }

  syncUnitScale(unit) {
    const scale = UNIT_SCALE[unit] ?? 1;
    if (scale === this.unitScale) {
      return false;
    }
    this.unitScale = scale;
    return true;
  }

  buildAxis() {
    const size = Math.max(1, this.baseSize * this.unitScale);
    const axis = new THREE.AxesHelper(size);
    axis.name = 'FloorplanAxis';
    axis.userData.__floorplanAxis = true;
    axis.visible = this.visible;
    axis.position.y = 0.01;
    axis.renderOrder = 10;

    const material = axis.material;
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((mat) => {
      if (mat) {
        mat.depthWrite = false;
        mat.depthTest = false;
      }
    });

    return axis;
  }

  refreshAxis() {
    if (this.scene && this.axis) {
      this.scene.remove(this.axis);
    }

    this.disposeAxisResources();
    this.axis = this.buildAxis();

    if (this.scene && this.axis) {
      this.scene.add(this.axis);
    }
  }

  disposeAxisResources() {
    if (!this.axis) {
      return;
    }

    if (this.axis.geometry && typeof this.axis.geometry.dispose === 'function') {
      this.axis.geometry.dispose();
    }

    const material = this.axis.material;
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((mat) => {
      if (mat && typeof mat.dispose === 'function') {
        mat.dispose();
      }
    });
  }

  /**
   * Returns the underlying THREE.AxesHelper instance
   * @returns {THREE.AxesHelper|null}
   */
  getObject() {
    return this.axis;
  }

  /**
   * Disposes helper and removes watchers
   */
  dispose() {
    if (this.unwatchViewport) {
      this.unwatchViewport();
      this.unwatchViewport = null;
    }

    if (this.unwatchUnit) {
      this.unwatchUnit();
      this.unwatchUnit = null;
    }

    if (this.scene && this.axis) {
      this.scene.remove(this.axis);
    }

    this.disposeAxisResources();

    this.axis = null;
    this.scene = null;
    this.store = null;
  }
}

export default AxisHelperManager;
