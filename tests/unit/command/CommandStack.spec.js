import CommandStack from '@/three/command/CommandStack';
import Command from '@/three/command/Command';

// 创建测试用的命令类
class TestCommand extends Command {
  constructor(value, shouldFail = false) {
    super();
    this.value = value;
    this.shouldFail = shouldFail;
    this.executed = false;
    this.undone = false;
  }

  async execute() {
    this.executed = true;
    if (this.shouldFail) {
      throw new Error(`Command ${this.value} failed`);
    }
    return this.value;
  }

  async undo() {
    this.undone = true;
    if (this.shouldFail) {
      throw new Error(`Undo ${this.value} failed`);
    }
    return `undone_${this.value}`;
  }

  getDescription() {
    return `Test Command ${this.value}`;
  }

  canMerge(other) {
    return (
      other instanceof TestCommand &&
      typeof this.value === 'number' &&
      typeof other.value === 'number'
    );
  }

  merge(other) {
    return new TestCommand(this.value + other.value);
  }
}

describe('CommandStack', () => {
  let commandStack;

  beforeEach(() => {
    commandStack = new CommandStack(5); // 小栈大小用于测试限制
  });

  afterEach(() => {
    if (commandStack) {
      commandStack.destroy();
    }
  });

  describe('Basic Operations', () => {
    it('should create empty command stack', () => {
      expect(commandStack.canUndo()).toBe(false);
      expect(commandStack.canRedo()).toBe(false);
      expect(commandStack.getUndoHistory()).toHaveLength(0);
      expect(commandStack.getRedoHistory()).toHaveLength(0);
    });

    it('should execute command and add to undo stack', async () => {
      const command = new TestCommand('test1');
      const result = await commandStack.execute(command);

      expect(result).toBe('test1');
      expect(command.executed).toBe(true);
      expect(commandStack.canUndo()).toBe(true);
      expect(commandStack.canRedo()).toBe(false);
      expect(commandStack.getUndoHistory()).toHaveLength(1);
      expect(commandStack.getRedoHistory()).toHaveLength(0);
    });

    it('should undo command and add to redo stack', async () => {
      const command = new TestCommand('test1');
      await commandStack.execute(command);

      const undoResult = await commandStack.undo();

      expect(undoResult).toBe('undone_test1');
      expect(command.undone).toBe(true);
      expect(commandStack.canUndo()).toBe(false);
      expect(commandStack.canRedo()).toBe(true);
      expect(commandStack.getUndoHistory()).toHaveLength(0);
      expect(commandStack.getRedoHistory()).toHaveLength(1);
    });

    it('should redo command and add back to undo stack', async () => {
      const command = new TestCommand('test1');
      await commandStack.execute(command);
      await commandStack.undo();

      const redoResult = await commandStack.redo();

      expect(redoResult).toBe('test1');
      expect(commandStack.canUndo()).toBe(true);
      expect(commandStack.canRedo()).toBe(false);
      expect(commandStack.getUndoHistory()).toHaveLength(1);
      expect(commandStack.getRedoHistory()).toHaveLength(0);
    });

    it('should clear redo stack when executing new command', async () => {
      const command1 = new TestCommand('test1');
      const command2 = new TestCommand('test2');

      await commandStack.execute(command1);
      await commandStack.undo();
      expect(commandStack.canRedo()).toBe(true);

      await commandStack.execute(command2);
      expect(commandStack.canRedo()).toBe(false);
      expect(commandStack.getUndoHistory()).toHaveLength(1);
      expect(commandStack.getUndoHistory()[0].description).toBe('Test Command test2');
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution failure', async () => {
      const command = new TestCommand('fail', true);

      await expect(commandStack.execute(command)).rejects.toThrow('Command fail failed');
      expect(commandStack.canUndo()).toBe(false);
      expect(commandStack.canRedo()).toBe(false);
    });

    it('should handle undo failure', async () => {
      const command = new TestCommand('fail', true);
      await commandStack.execute(command);

      await expect(commandStack.undo()).rejects.toThrow('Undo fail failed');
      // 失败的撤销不应该改变栈状态
      expect(commandStack.canUndo()).toBe(true);
      expect(commandStack.canRedo()).toBe(false);
    });

    it('should throw error when undoing with no commands', async () => {
      await expect(commandStack.undo()).rejects.toThrow('Cannot undo: no commands to undo');
    });

    it('should throw error when redoing with no commands', async () => {
      await expect(commandStack.redo()).rejects.toThrow('Cannot redo: no commands to redo');
    });

    it('should throw error for invalid command type', async () => {
      await expect(commandStack.execute({})).rejects.toThrow(
        'Command must be an instance of Command'
      );
    });
  });

  describe('Stack Size Limits', () => {
    it('should enforce maximum stack size', async () => {
      // 添加超过最大栈大小的命令
      for (let i = 0; i < 7; i++) {
        await commandStack.execute(new TestCommand(`test${i}`)); // Use strings to avoid merging
      }

      // 栈大小应该被限制为5
      expect(commandStack.getUndoHistory()).toHaveLength(5);
      expect(commandStack.canUndo()).toBe(true);

      // 最旧的命令应该被移除
      const history = commandStack.getUndoHistory();
      expect(history[0].description).toBe('Test Command test2');
      expect(history[4].description).toBe('Test Command test6');
    });

    it('should emit command evicted event when stack is full', async () => {
      const evictedListener = jest.fn();
      commandStack.on('commandEvicted', evictedListener);

      // 填满栈
      for (let i = 0; i < 5; i++) {
        await commandStack.execute(new TestCommand(`test${i}`)); // Use strings to avoid merging
      }

      // 添加一个命令导致驱逐
      await commandStack.execute(new TestCommand('test5'));

      expect(evictedListener).toHaveBeenCalledTimes(1);
      expect(evictedListener).toHaveBeenCalledWith({
        command: expect.any(TestCommand),
      });
    });
  });

  describe('Command Merging', () => {
    it('should merge compatible commands', async () => {
      const command1 = new TestCommand(1);
      const command2 = new TestCommand(2);

      await commandStack.execute(command1);
      await commandStack.execute(command2);

      // 应该只有一个合并后的命令
      expect(commandStack.getUndoHistory()).toHaveLength(1);
      expect(commandStack.getUndoHistory()[0].description).toBe('Test Command 3');
    });

    it('should emit command merged event', async () => {
      const mergedListener = jest.fn();
      commandStack.on('commandMerged', mergedListener);

      const command1 = new TestCommand(1);
      const command2 = new TestCommand(2);

      await commandStack.execute(command1);
      await commandStack.execute(command2);

      expect(mergedListener).toHaveBeenCalledTimes(1);
      expect(mergedListener).toHaveBeenCalledWith({
        original: command1,
        merged: expect.any(TestCommand),
      });
    });

    it('should not merge incompatible commands', async () => {
      const command1 = new TestCommand('string1');
      const command2 = new TestCommand('string2');

      await commandStack.execute(command1);
      await commandStack.execute(command2);

      // 应该有两个独立的命令
      expect(commandStack.getUndoHistory()).toHaveLength(2);
    });
  });

  describe('Events', () => {
    it('should emit events for command execution', async () => {
      const executedListener = jest.fn();
      const stackChangedListener = jest.fn();

      commandStack.on('commandExecuted', executedListener);
      commandStack.on('stackChanged', stackChangedListener);

      const command = new TestCommand('test');
      const result = await commandStack.execute(command);

      expect(executedListener).toHaveBeenCalledWith({
        command,
        result,
      });

      expect(stackChangedListener).toHaveBeenCalledWith({
        canUndo: true,
        canRedo: false,
        undoCount: 1,
        redoCount: 0,
      });
    });

    it('should emit events for undo', async () => {
      const undoneListener = jest.fn();
      const stackChangedListener = jest.fn();

      commandStack.on('commandUndone', undoneListener);
      commandStack.on('stackChanged', stackChangedListener);

      const command = new TestCommand('test');
      await commandStack.execute(command);
      const undoResult = await commandStack.undo();

      expect(undoneListener).toHaveBeenCalledWith({
        command,
        result: undoResult,
      });

      expect(stackChangedListener).toHaveBeenCalledWith({
        canUndo: false,
        canRedo: true,
        undoCount: 0,
        redoCount: 1,
      });
    });

    it('should emit events for redo', async () => {
      const redoneListener = jest.fn();
      const stackChangedListener = jest.fn();

      commandStack.on('commandRedone', redoneListener);
      commandStack.on('stackChanged', stackChangedListener);

      const command = new TestCommand('test');
      await commandStack.execute(command);
      await commandStack.undo();
      const redoResult = await commandStack.redo();

      expect(redoneListener).toHaveBeenCalledWith({
        command,
        result: redoResult,
      });

      expect(stackChangedListener).toHaveBeenCalledWith({
        canUndo: true,
        canRedo: false,
        undoCount: 1,
        redoCount: 0,
      });
    });
  });

  describe('Utility Methods', () => {
    it('should provide stack info', () => {
      const info = commandStack.getStackInfo();

      expect(info).toEqual({
        canUndo: false,
        canRedo: false,
        undoCount: 0,
        redoCount: 0,
        maxStackSize: 5,
        undoHistory: [],
        redoHistory: [],
      });
    });

    it('should clear stack', async () => {
      const clearedListener = jest.fn();
      const stackChangedListener = jest.fn();

      commandStack.on('stackCleared', clearedListener);
      commandStack.on('stackChanged', stackChangedListener);

      await commandStack.execute(new TestCommand('test1'));
      await commandStack.execute(new TestCommand('test2'));
      await commandStack.undo();

      expect(commandStack.canUndo()).toBe(true);
      expect(commandStack.canRedo()).toBe(true);

      commandStack.clear();

      expect(commandStack.canUndo()).toBe(false);
      expect(commandStack.canRedo()).toBe(false);
      expect(clearedListener).toHaveBeenCalled();
      expect(stackChangedListener).toHaveBeenCalledWith({
        canUndo: false,
        canRedo: false,
        undoCount: 0,
        redoCount: 0,
      });
    });
  });

  describe('Recursive Execution Protection', () => {
    it('should prevent recursive execution', async () => {
      const command1 = new TestCommand('test1');
      const command2 = new TestCommand('test2');

      // 创建一个在执行期间会尝试执行另一个命令的命令
      command1.execute = async () => {
        try {
          await commandStack.execute(command2);
        } catch (error) {
          // 预期会失败
        }
        return 'test1';
      };

      await expect(commandStack.execute(command1)).resolves.toBe('test1');

      // 只有第一个命令应该被执行
      expect(commandStack.getUndoHistory()).toHaveLength(1);
    });
  });
});
