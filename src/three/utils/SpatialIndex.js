/**
 * SpatialIndex - 空间索引，支持动态更新的对象查询
 */
class SpatialIndex {
  constructor(worldBounds, cellSize = 10) {
    this.worldBounds = worldBounds;
    this.cellSize = cellSize;
    this.grid = new Map();
    this.objects = new Map();
  }

  /**
   * 向索引中添加对象
   */
  add(id, obj) {
    this.objects.set(id, obj);
    this.updateObjectInGrid(id, obj);
  }

  /**
   * 从索引中移除对象
   */
  remove(id) {
    const obj = this.objects.get(id);
    if (obj) {
      this.removeFromGrid(id, obj);
      this.objects.delete(id);
    }
  }

  /**
   * 更新对象位置
   */
  update(id, newPos) {
    const obj = this.objects.get(id);
    if (!obj) return;

    this.removeFromGrid(id, obj);
    obj.position.copy(newPos);
    this.updateObjectInGrid(id, obj);
  }

  /**
   * 获取点附近的对象
   */
  getNearby(point, radius) {
    const result = [];
    const cellCoords = this.getGridCells(
      point.x - radius,
      point.z - radius,
      point.x + radius,
      point.z + radius
    );

    cellCoords.forEach(({ x, y }) => {
      const key = `${x},${y}`;
      const cellObjects = this.grid.get(key);
      if (cellObjects) {
        cellObjects.forEach((id) => {
          const obj = this.objects.get(id);
          if (obj && obj.position.distanceTo(point) <= radius) {
            result.push(obj);
          }
        });
      }
    });

    return result;
  }

  /**
   * 清空索引
   */
  clear() {
    this.grid.clear();
    this.objects.clear();
  }

  /**
   * 更新对象在网格中的位置
   */
  updateObjectInGrid(id, obj) {
    const { position, scale } = obj;
    const halfExtent = (scale?.x || 1) / 2;

    const cellCoords = this.getGridCells(
      position.x - halfExtent,
      position.z - halfExtent,
      position.x + halfExtent,
      position.z + halfExtent
    );

    cellCoords.forEach(({ x, y }) => {
      const key = `${x},${y}`;
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      const cell = this.grid.get(key);
      if (!cell.includes(id)) {
        cell.push(id);
      }
    });
  }

  /**
   * 从网格中移除对象
   */
  removeFromGrid(id, obj) {
    const { position, scale } = obj;
    const halfExtent = (scale?.x || 1) / 2;

    const cellCoords = this.getGridCells(
      position.x - halfExtent,
      position.z - halfExtent,
      position.x + halfExtent,
      position.z + halfExtent
    );

    cellCoords.forEach(({ x, y }) => {
      const key = `${x},${y}`;
      const cell = this.grid.get(key);
      if (cell) {
        const index = cell.indexOf(id);
        if (index > -1) {
          cell.splice(index, 1);
        }
      }
    });
  }

  /**
   * 获取覆盖给定范围的网格单元坐标
   */
  getGridCells(minX, minZ, maxX, maxZ) {
    const cells = [];
    const minCellX = Math.floor(minX / this.cellSize);
    const minCellZ = Math.floor(minZ / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const maxCellZ = Math.floor(maxZ / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x += 1) {
      for (let z = minCellZ; z <= maxCellZ; z += 1) {
        cells.push({ x, y: z });
      }
    }

    return cells;
  }
}

export default SpatialIndex;
