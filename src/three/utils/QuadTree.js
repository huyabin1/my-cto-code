/**
 * QuadTree - 二维四叉树，用于空间分割和高效拾取
 */
class QuadTree {
  constructor(bounds, maxObjects = 10, maxDepth = 8, depth = 0) {
    this.bounds = bounds; // { x, y, width, height }
    this.maxObjects = maxObjects;
    this.maxDepth = maxDepth;
    this.depth = depth;
    this.objects = [];
    this.nodes = [];
  }

  /**
   * 向四叉树中插入对象
   */
  insert(obj) {
    if (this.nodes.length === 0) {
      this.objects.push(obj);

      if (this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
        this.subdivide();
      }

      return true;
    }

    // 查找合适的子节点
    for (let i = 0; i < this.nodes.length; i += 1) {
      if (this.nodes[i].contains(obj)) {
        this.nodes[i].insert(obj);
        return true;
      }
    }

    // 如果对象跨越多个子节点，存储在当前节点
    this.objects.push(obj);
    return true;
  }

  /**
   * 获取边界内的所有对象
   */
  retrieve(searchBounds, result = []) {
    result.push(...this.objects);

    if (this.nodes.length > 0) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        if (this.nodes[i].boundsIntersect(searchBounds)) {
          this.nodes[i].retrieve(searchBounds, result);
        }
      }
    }

    return result;
  }

  /**
   * 查找点附近的对象
   */
  retrieveNear(point, radius, result = []) {
    const searchBounds = {
      x: point.x - radius,
      y: point.y - radius,
      width: radius * 2,
      height: radius * 2,
    };

    return this.retrieve(searchBounds, result);
  }

  /**
   * 清空四叉树
   */
  clear() {
    this.objects = [];
    this.nodes = [];
  }

  /**
   * 子分割
   */
  subdivide() {
    const { x, y, width, height } = this.bounds;
    const hw = width / 2;
    const hh = height / 2;

    this.nodes = [
      new QuadTree(
        { x: x + hw, y, width: hw, height: hh },
        this.maxObjects,
        this.maxDepth,
        this.depth + 1
      ),
      new QuadTree({ x, y, width: hw, height: hh }, this.maxObjects, this.maxDepth, this.depth + 1),
      new QuadTree(
        { x, y: y + hh, width: hw, height: hh },
        this.maxObjects,
        this.maxDepth,
        this.depth + 1
      ),
      new QuadTree(
        { x: x + hw, y: y + hh, width: hw, height: hh },
        this.maxObjects,
        this.maxDepth,
        this.depth + 1
      ),
    ];

    // 重新分配对象
    const { objects } = this;
    this.objects = [];

    objects.forEach((obj) => {
      for (let i = 0; i < this.nodes.length; i += 1) {
        if (this.nodes[i].contains(obj)) {
          this.nodes[i].insert(obj);
          return;
        }
      }
      this.objects.push(obj);
    });
  }

  /**
   * 检查对象是否在此节点边界内
   */
  contains(obj) {
    const bounds = QuadTree.getBounds(obj);
    const { x, y, width, height } = this.bounds;

    return (
      bounds.x >= x &&
      bounds.x + bounds.width <= x + width &&
      bounds.y >= y &&
      bounds.y + bounds.height <= y + height
    );
  }

  /**
   * 检查两个边界是否相交
   */
  boundsIntersect(searchBounds) {
    const { x, y, width, height } = this.bounds;
    return !(
      searchBounds.x + searchBounds.width < x ||
      searchBounds.x > x + width ||
      searchBounds.y + searchBounds.height < y ||
      searchBounds.y > y + height
    );
  }

  /**
   * 获取对象的边界
   */
  static getBounds(obj) {
    if (obj.bounds) {
      return obj.bounds;
    }
    if (obj.position && obj.scale) {
      return {
        x: obj.position.x - obj.scale.x / 2,
        y: obj.position.z - obj.scale.z / 2,
        width: obj.scale.x,
        height: obj.scale.z,
      };
    }
    return { x: obj.x || 0, y: obj.y || 0, width: 0, height: 0 };
  }
}

export { QuadTree };
