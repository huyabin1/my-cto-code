import * as THREE from 'three';

const UNIT_SCALE = {
  auto: 1,
  mm: 0.001,
  cm: 0.01,
  m: 1,
  ft: 0.3048,
};

const clampDensity = (value) => {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 1;
  return Math.min(Math.max(numeric, 0.25), 8);
};

const ensurePositive = (value, fallback) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  return value;
};

/**
 * GridHelperManager - Wrapper around THREE.GridHelper with Vuex integration
 */
class GridHelperManager {
  /**
   * @param {Object} params - Configuration parameters
   * @param {Object} params.store - Vuex store instance
   * @param {THREE.Scene} params.scene - Target Three.js scene
   * @param {number} [params.size=5000] - Base grid size
   * @param {number} [params.divisions=50] - Base grid divisions
   * @param {string|number} [params.majorColor='#d1d5db'] - Major line color
   * @param {string|number} [params.minorColor='#e5e7eb'] - Minor line color
   */
  constructor({
    store,
    scene,
    size = 5000,
    divisions = 50,
    majorColor = '#d1d5db',
    minorColor = '#e5e7eb',
  } = {}) {
    this.store = store;
    this.scene = scene;

    this.baseSize = ensurePositive(size, 5000);
    this.baseDivisions = ensurePositive(divisions, 50);
    this.visible = true;
    this.gridDensity = 1;
    this.unitScale = 1;
    this.majorColor = majorColor;
    this.minorColor = minorColor;

    this.grid = null;
    this.unwatchViewport = null;
    this.unwatchUnit = null;

    this.syncGridSettings(this.getCurrentGridSettings());
    this.syncUnitScale(this.getCurrentUnit());

    this.grid = this.buildGrid();
    if (this.scene && this.grid) {
      this.scene.add(this.grid);
    }

    this.bindWatchers();
  }

  getCurrentGridSettings() {
    return this.store?.state?.editor?.viewport?.grid || {};
  }

  getCurrentUnit() {
    return this.store?.state?.cad?.selectedUnit ?? 'auto';
  }

  bindWatchers() {
    if (!this.store || typeof this.store.watch !== 'function') {
      return;
    }

    this.unwatchViewport = this.store.watch(
      (state) => state.editor?.viewport?.grid,
      (gridSettings) => this.handleGridSettingsChange(gridSettings || {}),
      { deep: true }
    );

    this.unwatchUnit = this.store.watch(
      (state) => state.cad?.selectedUnit,
      (unit) => this.handleUnitChange(unit),
      { deep: false }
    );
  }

  handleGridSettingsChange(settings) {
    const { needsRebuild, visibilityChanged } = this.syncGridSettings(settings);
    if (needsRebuild && this.grid) {
      this.refreshGrid();
      return;
    }

    if (visibilityChanged && this.grid) {
      this.grid.visible = this.visible;
    }
  }

  handleUnitChange(unit) {
    const changed = this.syncUnitScale(unit);
    if (changed && this.grid) {
      this.refreshGrid();
    }
  }

  syncGridSettings(settings = {}) {
    const nextDensity = clampDensity(settings.density ?? this.gridDensity);
    const nextSize = ensurePositive(settings.size, this.baseSize);
    const nextVisible = settings.visible !== undefined ? Boolean(settings.visible) : this.visible;
    const nextDivisions = ensurePositive(settings.divisions, this.baseDivisions);

    const densityChanged = nextDensity !== this.gridDensity;
    const sizeChanged = nextSize !== this.baseSize;
    const divisionsChanged = nextDivisions !== this.baseDivisions;
    const visibilityChanged = nextVisible !== this.visible;

    this.gridDensity = nextDensity;
    this.baseSize = nextSize;
    this.visible = nextVisible;
    this.baseDivisions = nextDivisions;

    return {
      needsRebuild: densityChanged || sizeChanged || divisionsChanged,
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

  buildGrid() {
    const size = Math.max(10, this.baseSize * this.unitScale);
    const divisions = Math.max(1, Math.round(this.baseDivisions * this.gridDensity));

    const grid = new THREE.GridHelper(size, divisions, this.majorColor, this.minorColor);
    grid.name = 'FloorplanGrid';
    grid.userData.__floorplanGrid = true;
    grid.rotation.x = Math.PI / 2;
    grid.position.y = 0;
    grid.visible = this.visible;
    grid.renderOrder = -1;

    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((material) => {
      if (material) {
        material.depthWrite = false;
        material.depthTest = false;
        material.transparent = true;
        material.opacity = 0.9;
      }
    });

    return grid;
  }

  refreshGrid() {
    if (this.scene && this.grid) {
      this.scene.remove(this.grid);
    }

    this.disposeGridResources();
    this.grid = this.buildGrid();

    if (this.scene && this.grid) {
      this.scene.add(this.grid);
    }
  }

  disposeGridResources() {
    if (!this.grid) {
      return;
    }

    if (this.grid.geometry && typeof this.grid.geometry.dispose === 'function') {
      this.grid.geometry.dispose();
    }

    const materials = Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material];
    materials.forEach((material) => {
      if (material && typeof material.dispose === 'function') {
        material.dispose();
      }
    });
  }

  /**
   * Returns the underlying THREE.GridHelper instance
   * @returns {THREE.GridHelper|null}
   */
  getObject() {
    return this.grid;
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

    if (this.scene && this.grid) {
      this.scene.remove(this.grid);
    }

    this.disposeGridResources();

    this.grid = null;
    this.scene = null;
    this.store = null;
  }
}

export default GridHelperManager;
