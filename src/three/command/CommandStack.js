import Command from './Command';

/**
 * CommandStack - 命令栈管理器
 * 负责管理命令的执行、撤销和重做
 */
class CommandStack {
  /**
   * @param {number} maxStackSize - 最大栈大小（默认100）
   */
  constructor(maxStackSize = 100) {
    this.undoStack = []; // 撤销栈
    this.redoStack = []; // 重做栈
    this.maxStackSize = maxStackSize;
    this.listeners = new Map(); // 事件监听器
    this.isExecuting = false; // 防止递归执行
  }

  /**
   * 执行命令
   * @param {Command} command - 要执行的命令
   * @returns {Promise<any>} 执行结果
   */
  async execute(command) {
    if (this.isExecuting) {
      throw new Error('Cannot execute command while another command is executing');
    }

    if (!(command instanceof Command)) {
      throw new Error('Command must be an instance of Command');
    }

    try {
      this.isExecuting = true;

      // 尝试与最后一个命令合并
      if (this.undoStack.length > 0) {
        const lastCommand = this.undoStack[this.undoStack.length - 1];
        if (lastCommand.canMerge(command)) {
          const mergedCommand = lastCommand.merge(command);
          this.undoStack[this.undoStack.length - 1] = mergedCommand;
          await lastCommand.undo(); // 撤销原命令
          await mergedCommand.execute(); // 执行合并后的命令
          this.emit('commandMerged', { original: lastCommand, merged: mergedCommand });
          return mergedCommand.execute();
        }
      }

      // 执行新命令
      const result = await command.execute();

      // 添加到撤销栈
      this.undoStack.push(command);

      // 清空重做栈（新操作会清空重做历史）
      this.redoStack = [];

      // 检查栈大小限制
      if (this.undoStack.length > this.maxStackSize) {
        const removed = this.undoStack.shift();
        this.emit('commandEvicted', { command: removed });
      }

      // 触发事件
      this.emit('commandExecuted', { command, result });
      this.emit('stackChanged', {
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length,
      });

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 撤销上一个命令
   * @returns {Promise<any>} 撤销结果
   */
  async undo() {
    if (!this.canUndo()) {
      throw new Error('Cannot undo: no commands to undo');
    }

    if (this.isExecuting) {
      throw new Error('Cannot undo while a command is executing');
    }

    try {
      this.isExecuting = true;

      const command = this.undoStack.pop();
      const result = await command.undo();

      // 添加到重做栈
      this.redoStack.push(command);

      // 触发事件
      this.emit('commandUndone', { command, result });
      this.emit('stackChanged', {
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length,
      });

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 重做下一个命令
   * @returns {Promise<any>} 重做结果
   */
  async redo() {
    if (!this.canRedo()) {
      throw new Error('Cannot redo: no commands to redo');
    }

    if (this.isExecuting) {
      throw new Error('Cannot redo while a command is executing');
    }

    try {
      this.isExecuting = true;

      const command = this.redoStack.pop();
      const result = await command.execute();

      // 添加到撤销栈
      this.undoStack.push(command);

      // 触发事件
      this.emit('commandRedone', { command, result });
      this.emit('stackChanged', {
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length,
      });

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 检查是否可以撤销
   * @returns {boolean} 是否可以撤销
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * 检查是否可以重做
   * @returns {boolean} 是否可以重做
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销栈中的命令列表（用于UI显示）
   * @returns {Array<{command: Command, description: string}>} 命令列表
   */
  getUndoHistory() {
    return this.undoStack.map((command) => ({
      command,
      description: command.getDescription(),
      id: command.getId(),
    }));
  }

  /**
   * 获取重做栈中的命令列表（用于UI显示）
   * @returns {Array<{command: Command, description: string}>} 命令列表
   */
  getRedoHistory() {
    return this.redoStack.map((command) => ({
      command,
      description: command.getDescription(),
      id: command.getId(),
    }));
  }

  /**
   * 清空命令栈
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.emit('stackCleared');
    this.emit('stackChanged', {
      canUndo: false,
      canRedo: false,
      undoCount: 0,
      redoCount: 0,
    });
  }

  /**
   * 获取栈状态
   * @returns {Object} 栈状态信息
   */
  getStackInfo() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      maxStackSize: this.maxStackSize,
      undoHistory: this.getUndoHistory(),
      redoHistory: this.getRedoHistory(),
    };
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  off(event, listener) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @private
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 销毁命令栈
   */
  destroy() {
    this.clear();
    this.listeners.clear();
  }
}

export default CommandStack;
