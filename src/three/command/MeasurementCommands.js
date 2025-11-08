import Command from './Command';

/**
 * AddMeasurementCommand - 添加测量命令
 */
class AddMeasurementCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {Object} measurement - 测量数据
   */
  constructor(store, measurement) {
    super();
    this.store = store;
    this.measurement = { ...measurement };
    this.description = `添加${measurement.type}测量`;
  }

  async execute() {
    this.store.commit('editor/ADD_MEASUREMENT', this.measurement);
    return this.measurement;
  }

  async undo() {
    const measurements = [...this.store.state.editor.measurements];
    const index = measurements.findIndex(
      (m) =>
        m.type === this.measurement.type && JSON.stringify(m) === JSON.stringify(this.measurement)
    );

    if (index > -1) {
      measurements.splice(index, 1);
      this.store.commit('editor/SET_MEASUREMENTS', measurements);
    }

    return true;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `add_measurement_${this.measurement.type}_${Date.now()}`;
  }
}

/**
 * ClearMeasurementsCommand - 清空测量命令
 */
class ClearMeasurementsCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   */
  constructor(store) {
    super();
    this.store = store;
    this.previousMeasurements = [...store.state.editor.measurements];
    this.description = '清空所有测量';
  }

  async execute() {
    this.store.commit('editor/CLEAR_MEASUREMENTS');
    return true;
  }

  async undo() {
    this.store.commit('editor/SET_MEASUREMENTS', this.previousMeasurements);
    return true;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `clear_measurements_${Date.now()}`;
  }
}

/**
 * ToggleToolCommand - 切换工具命令
 */
class ToggleToolCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {string} newTool - 新工具名称
   * @param {string} [oldTool] - 旧工具名称
   */
  constructor(store, newTool, oldTool = null) {
    super();
    this.store = store;
    this.newTool = newTool;
    this.oldTool = oldTool !== null ? oldTool : store.state.editor.activeTool;
    this.description = `切换工具: ${this.oldTool || '无'} -> ${newTool || '无'}`;
  }

  async execute() {
    this.store.commit('editor/SET_ACTIVE_TOOL', this.newTool);
    return this.newTool;
  }

  async undo() {
    this.store.commit('editor/SET_ACTIVE_TOOL', this.oldTool);
    return this.oldTool;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `toggle_tool_${this.newTool}_${Date.now()}`;
  }
}

export { AddMeasurementCommand, ClearMeasurementsCommand, ToggleToolCommand };
