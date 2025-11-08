import Command from './Command';

/**
 * ImportDxfCommand - 导入DXF文件命令
 */
class ImportDxfCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {string} fileName - 文件名
   * @param {Function} importFunction - 实际执行导入的函数
   */
  constructor(store, fileName, importFunction) {
    super();
    this.store = store;
    this.fileName = fileName;
    this.importFunction = importFunction;
    this.previousStatus = null;
    this.previousError = null;
    this.previousFile = null;
    this.importResult = null;
    this.description = `导入DXF文件: ${fileName}`;
  }

  async execute() {
    // 保存当前状态
    this.previousStatus = this.store.state.cad.importStatus;
    this.previousError = this.store.state.cad.importError;
    this.previousFile = this.store.state.cad.lastImportedFile;

    try {
      // 开始导入
      this.store.commit('cad/SET_IMPORT_STATUS', 'processing');
      this.store.commit('cad/SET_IMPORT_ERROR', null);
      this.store.commit('cad/SET_LAST_IMPORTED_FILE', this.fileName);

      // 执行实际导入
      this.importResult = await this.importFunction(this.fileName);

      // 导入成功
      this.store.commit('cad/SET_IMPORT_STATUS', 'success');

      return this.importResult;
    } catch (error) {
      // 导入失败
      this.store.commit('cad/SET_IMPORT_STATUS', 'error');
      this.store.commit('cad/SET_IMPORT_ERROR', error.message || '导入失败');
      throw error;
    }
  }

  async undo() {
    // 恢复之前的状态
    if (this.previousStatus !== null) {
      this.store.commit('cad/SET_IMPORT_STATUS', this.previousStatus);
    }
    if (this.previousError !== null) {
      this.store.commit('cad/SET_IMPORT_ERROR', this.previousError);
    }
    if (this.previousFile !== null) {
      this.store.commit('cad/SET_LAST_IMPORTED_FILE', this.previousFile);
    }

    // 如果有清理导入数据的函数，可以在这里调用
    // 这通常需要根据具体的导入逻辑来实现

    return true;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `import_dxf_${this.fileName}_${Date.now()}`;
  }
}

/**
 * UpdateLayerVisibilityCommand - 更新图层可见性命令
 */
class UpdateLayerVisibilityCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {string} layerId - 图层ID
   * @param {boolean} newVisibility - 新的可见性
   * @param {boolean} [oldVisibility] - 旧的可见性
   */
  constructor(store, layerId, newVisibility, oldVisibility = null) {
    super();
    this.store = store;
    this.layerId = layerId;
    this.newVisibility = newVisibility;
    this.oldVisibility = oldVisibility !== null ? oldVisibility : this.getCurrentVisibility();
    this.description = `切换图层${layerId}可见性: ${this.oldVisibility} -> ${newVisibility}`;
  }

  getCurrentVisibility() {
    const layer = this.store.state.cad.layers.find((l) => l.id === this.layerId);
    return layer ? layer.visible : false;
  }

  async execute() {
    this.store.commit('cad/SET_LAYER_VISIBILITY', {
      id: this.layerId,
      value: this.newVisibility,
    });
    return this.newVisibility;
  }

  async undo() {
    this.store.commit('cad/SET_LAYER_VISIBILITY', {
      id: this.layerId,
      value: this.oldVisibility,
    });
    return this.oldVisibility;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `update_layer_visibility_${this.layerId}_${Date.now()}`;
  }
}

/**
 * UpdateOpacityCommand - 更新不透明度命令
 */
class UpdateOpacityCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {number} newOpacity - 新的不透明度
   * @param {number} [oldOpacity] - 旧的不透明度
   */
  constructor(store, newOpacity, oldOpacity = null) {
    super();
    this.store = store;
    this.newOpacity = newOpacity;
    this.oldOpacity = oldOpacity !== null ? oldOpacity : store.state.cad.opacity;
    this.description = `更新CAD不透明度: ${this.oldOpacity} -> ${newOpacity}`;
  }

  async execute() {
    this.store.commit('cad/SET_OPACITY', this.newOpacity);
    return this.newOpacity;
  }

  async undo() {
    this.store.commit('cad/SET_OPACITY', this.oldOpacity);
    return this.oldOpacity;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `update_opacity_${Date.now()}`;
  }

  canMerge(other) {
    return other instanceof UpdateOpacityCommand;
  }

  merge(other) {
    return new UpdateOpacityCommand(this.store, other.newOpacity, this.oldValue);
  }
}

export { ImportDxfCommand, UpdateLayerVisibilityCommand, UpdateOpacityCommand };
