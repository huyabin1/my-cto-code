/**
 * Command - 命令接口
 * 实现撤销/重做机制的基础接口
 */
class Command {
  /**
   * 执行命令
   * @returns {Promise<any>} 命令执行结果
   */
  async execute() {
    throw new Error('execute method must be implemented');
  }

  /**
   * 撤销命令
   * @returns {Promise<any>} 撤销结果
   */
  async undo() {
    throw new Error('undo method must be implemented');
  }

  /**
   * 获取命令描述（用于UI显示）
   * @returns {string} 命令描述
   */
  getDescription() {
    return 'Unknown Command';
  }

  /**
   * 获取命令ID（用于去重等操作）
   * @returns {string} 命令ID
   */
  getId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 命令是否可以合并（用于批量操作）
   * @param {Command} other - 另一个命令
   * @returns {boolean} 是否可以合并
   */
  canMerge(other) {
    return false;
  }

  /**
   * 合并命令（当canMerge返回true时调用）
   * @param {Command} other - 要合并的命令
   * @returns {Command} 合并后的命令
   */
  merge(other) {
    throw new Error('merge method must be implemented when canMerge returns true');
  }
}

export default Command;
