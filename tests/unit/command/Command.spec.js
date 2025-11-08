import Command from '@/three/command/Command';

describe('Command', () => {
  // 创建一个测试用的具体命令类
  class TestCommand extends Command {
    constructor(executeResult = null, undoResult = null, shouldFail = false) {
      super();
      this.executeResult = executeResult;
      this.undoResult = undoResult;
      this.shouldFail = shouldFail;
      this.executeCalled = false;
      this.undoCalled = false;
    }

    async execute() {
      this.executeCalled = true;
      if (this.shouldFail) {
        throw new Error('Test command failed');
      }
      return this.executeResult;
    }

    async undo() {
      this.undoCalled = true;
      if (this.shouldFail) {
        throw new Error('Test undo failed');
      }
      return this.undoResult;
    }

    getDescription() {
      return 'Test Command';
    }

    getId() {
      return 'test_command_123';
    }

    canMerge(other) {
      return other instanceof TestCommand;
    }

    merge(other) {
      return new TestCommand(
        this.executeResult + other.executeResult,
        this.undoResult + other.undoResult
      );
    }
  }

  it('should create a command with default properties', () => {
    const command = new TestCommand();

    expect(command.executeCalled).toBe(false);
    expect(command.undoCalled).toBe(false);
    expect(command.getDescription()).toBe('Test Command');
    expect(command.getId()).toBe('test_command_123');
  });

  it('should execute and return result', async () => {
    const expectedResult = { success: true };
    const command = new TestCommand(expectedResult);

    const result = await command.execute();

    expect(command.executeCalled).toBe(true);
    expect(result).toBe(expectedResult);
  });

  it('should undo and return result', async () => {
    const expectedResult = { undone: true };
    const command = new TestCommand(null, expectedResult);

    const result = await command.undo();

    expect(command.undoCalled).toBe(true);
    expect(result).toBe(expectedResult);
  });

  it('should throw error when execute fails', async () => {
    const command = new TestCommand(null, null, true);

    await expect(command.execute()).rejects.toThrow('Test command failed');
    expect(command.executeCalled).toBe(true);
  });

  it('should throw error when undo fails', async () => {
    const command = new TestCommand(null, null, true);

    await expect(command.undo()).rejects.toThrow('Test undo failed');
    expect(command.undoCalled).toBe(true);
  });

  it('should support command merging', () => {
    const command1 = new TestCommand(1, 10);
    const command2 = new TestCommand(2, 20);

    expect(command1.canMerge(command2)).toBe(true);

    const merged = command1.merge(command2);
    expect(merged.executeResult).toBe(3);
    expect(merged.undoResult).toBe(30);
  });

  it('should generate unique IDs by default', () => {
    const command1 = new Command();
    const command2 = new Command();

    expect(command1.getId()).not.toBe(command2.getId());
    expect(command1.getId()).toMatch(/^cmd_\d+_[a-z0-9]+$/);
  });

  it('should not merge incompatible commands by default', () => {
    const command1 = new Command();
    const command2 = new Command();

    expect(command1.canMerge(command2)).toBe(false);
  });

  it('should throw error when trying to merge without implementation', () => {
    const command1 = new Command();
    const command2 = new Command();

    // 临时修改canMerge返回true但不实现merge
    command1.canMerge = () => true;

    expect(() => command1.merge(command2)).toThrow(
      'merge method must be implemented when canMerge returns true'
    );
  });
});
