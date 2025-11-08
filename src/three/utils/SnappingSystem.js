import * as THREE from 'three';

/**
 * SnappingSystem - 增强的捕捉系统，支持节点捕捉、交点捕捉、自定义参考线
 */
class SnappingSystem {
  constructor(tolerance = 0.5) {
    this.tolerance = tolerance;
    this.enabled = true;
    this.nodes = []; // 捕捉节点
    this.lines = []; // 参考线
    this.gridSize = 0.1;
    this.snappingModes = {
      node: true, // 节点捕捉
      intersection: true, // 交点捕捉
      grid: false, // 网格捕捉
      orthogonal: true, // 正交捕捉
      diagonal45: false, // 45度捕捉
    };
    this.snappedPoint = null;
    this.snappingVisuals = [];
  }

  /**
   * 添加捕捉节点
   */
  addNode(point, id = null) {
    this.nodes.push({
      position: point.clone(),
      id: id || `node-${Date.now()}-${Math.random()}`,
    });
  }

  /**
   * 移除捕捉节点
   */
  removeNode(id) {
    const index = this.nodes.findIndex((n) => n.id === id);
    if (index > -1) {
      this.nodes.splice(index, 1);
    }
  }

  /**
   * 添加参考线
   */
  addLine(start, end, id = null) {
    this.lines.push({
      start: start.clone(),
      end: end.clone(),
      id: id || `line-${Date.now()}-${Math.random()}`,
    });
  }

  /**
   * 移除参考线
   */
  removeLine(id) {
    const index = this.lines.findIndex((l) => l.id === id);
    if (index > -1) {
      this.lines.splice(index, 1);
    }
  }

  /**
   * 计算捕捉点
   */
  snapPoint(point, referencePoints = []) {
    if (!this.enabled) {
      return point.clone();
    }

    this.snappedPoint = null;
    let snappedPos = point.clone();
    let minDistance = this.tolerance;

    // 节点捕捉
    if (this.snappingModes.node) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        const distance = point.distanceTo(node.position);

        if (distance < minDistance) {
          snappedPos = node.position.clone();
          minDistance = distance;
          this.snappedPoint = { type: 'node', position: node.position.clone(), nodeId: node.id };
        }
      }
    }

    // 交点捕捉
    if (this.snappingModes.intersection) {
      for (let i = 0; i < this.lines.length; i += 1) {
        for (let j = i + 1; j < this.lines.length; j += 1) {
          const intersection = SnappingSystem.getLineIntersection(this.lines[i], this.lines[j]);
          if (intersection) {
            const distance = point.distanceTo(intersection);
            if (distance < minDistance) {
              snappedPos = intersection.clone();
              minDistance = distance;
              this.snappedPoint = { type: 'intersection', position: intersection.clone() };
            }
          }
        }
      }
    }

    // 网格捕捉
    if (this.snappingModes.grid) {
      const gridSnapped = this.snapToGrid(snappedPos);
      const gridDistance = snappedPos.distanceTo(gridSnapped);
      if (gridDistance < minDistance) {
        snappedPos = gridSnapped;
        minDistance = gridDistance;
        this.snappedPoint = { type: 'grid', position: gridSnapped.clone() };
      }
    }

    // 正交捕捉
    if (this.snappingModes.orthogonal && referencePoints.length > 0) {
      const orthSnapped = this.snapOrthogonal(snappedPos, referencePoints);
      if (orthSnapped) {
        const orthDistance = snappedPos.distanceTo(orthSnapped);
        if (orthDistance < minDistance) {
          snappedPos = orthSnapped;
          this.snappedPoint = { type: 'orthogonal', position: orthSnapped.clone() };
        }
      }
    }

    // 45度捕捉
    if (this.snappingModes.diagonal45 && referencePoints.length > 0) {
      const diagSnapped = this.snapDiagonal45(snappedPos, referencePoints);
      if (diagSnapped) {
        const diagDistance = snappedPos.distanceTo(diagSnapped);
        if (diagDistance < minDistance) {
          snappedPos = diagSnapped;
          this.snappedPoint = { type: 'diagonal45', position: diagSnapped.clone() };
        }
      }
    }

    return snappedPos;
  }

  /**
   * 网格捕捉
   */
  snapToGrid(point) {
    const snapped = new THREE.Vector3(
      Math.round(point.x / this.gridSize) * this.gridSize,
      Math.round(point.y / this.gridSize) * this.gridSize,
      Math.round(point.z / this.gridSize) * this.gridSize
    );
    return snapped;
  }

  /**
   * 正交捕捉（水平/竖直）
   */
  snapOrthogonal(point, referencePoints) {
    if (referencePoints.length === 0) return null;

    let snappedPos = null;
    let minDistance = this.tolerance;

    for (let i = 0; i < referencePoints.length; i += 1) {
      const ref = referencePoints[i];

      // 水平捕捉 (X)
      const horSnapped = new THREE.Vector3(ref.x, point.y, point.z);
      const horDistance = Math.abs(point.x - ref.x);
      if (horDistance < minDistance) {
        snappedPos = horSnapped;
        minDistance = horDistance;
      }

      // 竖直捕捉 (Z)
      const verSnapped = new THREE.Vector3(point.x, point.y, ref.z);
      const verDistance = Math.abs(point.z - ref.z);
      if (verDistance < minDistance) {
        snappedPos = verSnapped;
        minDistance = verDistance;
      }
    }

    return snappedPos;
  }

  /**
   * 45度捕捉
   */
  snapDiagonal45(point, referencePoints) {
    if (referencePoints.length === 0) return null;

    let snappedPos = null;
    let minDistance = this.tolerance;

    for (let i = 0; i < referencePoints.length; i += 1) {
      const ref = referencePoints[i];
      const dx = point.x - ref.x;
      const dz = point.z - ref.z;

      // 45度线
      if (Math.abs(dx - dz) < minDistance) {
        const avg = (dx + dz) / 2;
        snappedPos = new THREE.Vector3(ref.x + avg, point.y, ref.z + avg);
        minDistance = Math.abs(dx - dz);
      }

      // -45度线
      if (Math.abs(dx + dz) < minDistance) {
        const avg = (dx - dz) / 2;
        snappedPos = new THREE.Vector3(ref.x + avg, point.y, ref.z - avg);
        minDistance = Math.abs(dx + dz);
      }
    }

    return snappedPos;
  }

  /**
   * 获取两条线的交点
   */
  static getLineIntersection(line1, line2) {
    // 在XZ平面上计算2D交点
    const x1 = line1.start.x;
    const z1 = line1.start.z;
    const x2 = line1.end.x;
    const z2 = line1.end.z;

    const x3 = line2.start.x;
    const z3 = line2.start.z;
    const x4 = line2.end.x;
    const z4 = line2.end.z;

    const denom = (x1 - x2) * (z3 - z4) - (z1 - z2) * (x3 - x4);

    if (Math.abs(denom) < 1e-10) {
      return null; // 平行线
    }

    const t = ((x1 - x3) * (z3 - z4) - (z1 - z3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (z1 - z3) - (z1 - z2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const intX = x1 + t * (x2 - x1);
      const intZ = z1 + t * (z2 - z1);
      const intY = (line1.start.y + line1.end.y) / 2; // 使用平均高度

      return new THREE.Vector3(intX, intY, intZ);
    }

    return null;
  }

  /**
   * 设置捕捉模式
   */
  setMode(mode, enabled) {
    if (Object.prototype.hasOwnProperty.call(this.snappingModes, mode)) {
      this.snappingModes[mode] = enabled;
    }
  }

  /**
   * 获取当前捕捉的信息
   */
  getSnappingInfo() {
    return this.snappedPoint;
  }

  /**
   * 清空所有节点和线
   */
  clear() {
    this.nodes = [];
    this.lines = [];
    this.snappedPoint = null;
  }

  /**
   * 启用/禁用捕捉
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * 设置捕捉容差
   */
  setTolerance(tolerance) {
    this.tolerance = tolerance;
  }
}

export default SnappingSystem;
