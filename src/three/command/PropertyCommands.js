import Command from './Command';

/**
 * UpdatePropertyCommand - 更新属性命令
 */
class UpdatePropertyCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {string} module - 模块名称（如 'editor', 'cad'）
   * @param {string} property - 属性名称
   * @param {*} newValue - 新值
   * @param {*} [oldValue] - 旧值（如果不提供，会从store中获取）
   */
  constructor(store, module, property, newValue, oldValue = null) {
    super();
    this.store = store;
    this.module = module;
    this.property = property;
    this.newValue = newValue;
    this.oldValue = oldValue !== null ? oldValue : store.state[module][property];
    this.description = `更新${module}.${property}: ${this.oldValue} -> ${newValue}`;
  }

  async execute() {
    this.store.commit(`${this.module}/SET_${this.property.toUpperCase()}`, this.newValue);
    return this.newValue;
  }

  async undo() {
    this.store.commit(`${this.module}/SET_${this.property.toUpperCase()}`, this.oldValue);
    return this.oldValue;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `update_property_${this.module}_${this.property}_${Date.now()}`;
  }

  canMerge(other) {
    return (
      other instanceof UpdatePropertyCommand &&
      this.module === other.module &&
      this.property === other.property
    );
  }

  merge(other) {
    // 直接使用other的新值，但保持原来的旧值
    return new UpdatePropertyCommand(
      this.store,
      this.module,
      this.property,
      other.newValue,
      this.oldValue
    );
  }
}

/**
 * UpdateNestedPropertyCommand - 更新嵌套属性命令
 */
class UpdateNestedPropertyCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {string} module - 模块名称
   * @param {string} parentProperty - 父属性名称
   * @param {string} childProperty - 子属性名称
   * @param {*} newValue - 新值
   * @param {*} [oldValue] - 旧值
   */
  constructor(store, module, parentProperty, childProperty, newValue, oldValue = null) {
    super();
    this.store = store;
    this.module = module;
    this.parentProperty = parentProperty;
    this.childProperty = childProperty;
    this.newValue = newValue;
    this.oldValue =
      oldValue !== null ? oldValue : store.state[module][parentProperty][childProperty];
    this.description = `更新${module}.${parentProperty}.${childProperty}: ${this.oldValue} -> ${newValue}`;
  }

  async execute() {
    const mutationName =
      this.parentProperty === 'snapping'
        ? `SET_${this.parentProperty.toUpperCase()}`
        : `SET_${this.parentProperty.toUpperCase()}_${this.childProperty.toUpperCase()}`;

    if (this.parentProperty === 'snapping') {
      this.store.commit(`${this.module}/${mutationName}`, {
        key: this.childProperty,
        value: this.newValue,
      });
    } else {
      this.store.commit(`${this.module}/${mutationName}`, this.newValue);
    }

    return this.newValue;
  }

  async undo() {
    const mutationName =
      this.parentProperty === 'snapping'
        ? `SET_${this.parentProperty.toUpperCase()}`
        : `SET_${this.parentProperty.toUpperCase()}_${this.childProperty.toUpperCase()}`;

    if (this.parentProperty === 'snapping') {
      this.store.commit(`${this.module}/${mutationName}`, {
        key: this.childProperty,
        value: this.oldValue,
      });
    } else {
      this.store.commit(`${this.module}/${mutationName}`, this.oldValue);
    }

    return this.oldValue;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `update_nested_property_${this.module}_${this.parentProperty}_${
      this.childProperty
    }_${Date.now()}`;
  }

  canMerge(other) {
    return (
      other instanceof UpdateNestedPropertyCommand &&
      this.module === other.module &&
      this.parentProperty === other.parentProperty &&
      this.childProperty === other.childProperty
    );
  }

  merge(other) {
    return new UpdateNestedPropertyCommand(
      this.store,
      this.module,
      this.parentProperty,
      this.childProperty,
      other.newValue,
      this.oldValue
    );
  }
}

/**
 * UpdateActiveSelectionCommand - 更新活动选择命令
 */
class UpdateActiveSelectionCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {string} property - 属性名称（material 或 color）
   * @param {*} newValue - 新值
   * @param {*} [oldValue] - 旧值
   */
  constructor(store, property, newValue, oldValue = null) {
    super();
    this.store = store;
    this.property = property;
    this.newValue = newValue;
    this.oldValue = oldValue !== null ? oldValue : store.state.editor.activeSelection[property];
    this.description = `更新活动选择.${property}: ${this.oldValue} -> ${newValue}`;
  }

  async execute() {
    const mutationName = `SET_ACTIVE_SELECTION_${this.property.toUpperCase()}`;
    this.store.commit(`editor/${mutationName}`, this.newValue);
    return this.newValue;
  }

  async undo() {
    const mutationName = `SET_ACTIVE_SELECTION_${this.property.toUpperCase()}`;
    this.store.commit(`editor/${mutationName}`, this.oldValue);
    return this.oldValue;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `update_active_selection_${this.property}_${Date.now()}`;
  }

  canMerge(other) {
    return other instanceof UpdateActiveSelectionCommand && this.property === other.property;
  }

  merge(other) {
    return new UpdateActiveSelectionCommand(
      this.store,
      this.property,
      other.newValue,
      this.oldValue
    );
  }
}

export { UpdatePropertyCommand, UpdateNestedPropertyCommand, UpdateActiveSelectionCommand };
