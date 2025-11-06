import * as THREE from 'three';
import { EventBus, WALL_EVENTS } from '../../utils/eventBus';

/**
 * DrawWallTool - Interactive wall drawing tool with snapping and undo functionality
 * 
 * State machine: idle -> drawing -> committing -> idle
 * 
 * Usage:
 * const tool = new DrawWallTool(scene, camera, renderer.domElement, store);
 * tool.activate(config);
 * tool.deactivate();
 */
export class DrawWallTool {
  constructor(scene, camera, domElement, store) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.store = store;
    
    // State machine
    this.state = 'idle'; // idle, drawing, committing
    this.startPoint = null;
    this.currentPoint = null;
    this.previewLine = null;
    this.undoStack = [];
    
    // Raycasting for plane projection
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 plane
    
    // Snapping configuration
    this.config = {
      gridSnap: true,
      gridInterval: 0.1, // 0.1m intervals
      angularSnap: true,
      angularSnapAngles: [0, 45, 90], // degrees
      endpointSnap: true,
      endpointSnapDistance: 0.5, // meters
    };
    
    // Event handlers
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    
    // Existing walls for endpoint snapping
    this.existingWalls = [];
  }

  /**
   * Activate the tool with optional configuration overrides
   * @param {Object} config - Configuration overrides
   */
  activate(config = {}) {
    this.config = { ...this.config, ...config };
    this.state = 'idle';
    this.undoStack = [];
    this.updateExistingWalls();
    
    // Bind event listeners
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    
    // Set cursor style
    this.domElement.style.cursor = 'crosshair';
  }

  /**
   * Deactivate the tool and clean up
   */
  deactivate() {
    // Remove event listeners
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    
    // Reset cursor
    this.domElement.style.cursor = 'default';
    
    // Clear preview
    this.clearPreview();
    
    // Clear undo stack
    this.undoStack = [];
    
    // Reset state
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
  }

  /**
   * Update existing walls from store for endpoint snapping
   */
  updateExistingWalls() {
    this.existingWalls = this.store.getters['walls/allWalls'] || [];
  }

  /**
   * Handle pointer down event
   */
  onPointerDown(event) {
    if (event.button !== 0) return; // Only left click
    
    const point = this.getIntersectionPoint(event);
    if (!point) return;
    
    const snappedPoint = this.applySnapping(point);
    
    if (this.state === 'idle') {
      // Start drawing
      this.state = 'drawing';
      this.startPoint = snappedPoint;
      this.currentPoint = snappedPoint;
      this.createPreview();
    } else if (this.state === 'drawing') {
      // Commit wall segment
      this.commitWall();
    }
  }

  /**
   * Handle pointer move event
   */
  onPointerMove(event) {
    if (this.state !== 'drawing') return;
    
    const point = this.getIntersectionPoint(event);
    if (!point) return;
    
    this.currentPoint = this.applySnapping(point);
    this.updatePreview();
    
    // Emit preview event
    EventBus.emit(WALL_EVENTS.PREVIEW, {
      start: this.startPoint,
      end: this.currentPoint,
    });
  }

  /**
   * Handle pointer up event
   */
  onPointerUp(event) {
    // Currently not used, but available for future enhancements
  }

  /**
   * Get intersection point with y=0 plane
   * @param {Event} event - Pointer event
   * @returns {THREE.Vector3|null} Intersection point or null
   */
  getIntersectionPoint(event) {
    const rect = this.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const intersects = this.raycaster.intersectObject(this.createPlaneMesh());
    
    return intersects.length > 0 ? intersects[0].point.clone() : null;
  }

  /**
   * Create temporary plane mesh for raycasting
   * @returns {THREE.Mesh}
   */
  createPlaneMesh() {
    const geometry = new THREE.PlaneGeometry(1000, 1000);
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  /**
   * Apply snapping strategies to a point
   * @param {THREE.Vector3} point - Input point
   * @returns {THREE.Vector3} Snapped point
   */
  applySnapping(point) {
    let result = point.clone();
    
    // Grid snapping
    if (this.config.gridSnap) {
      result.x = Math.round(result.x / this.config.gridInterval) * this.config.gridInterval;
      result.z = Math.round(result.z / this.config.gridInterval) * this.config.gridInterval;
    }
    
    // Endpoint snapping (takes precedence)
    if (this.config.endpointSnap) {
      const nearestEndpoint = this.findNearestEndpoint(result);
      if (nearestEndpoint) {
        result = nearestEndpoint.clone();
      }
    }
    
    // Angular snapping (only if we have a start point)
    if (this.config.angularSnap && this.startPoint) {
      result = this.applyAngularSnapping(result);
    }
    
    return result;
  }

  /**
   * Find nearest endpoint within snap distance
   * @param {THREE.Vector3} point - Point to check from
   * @returns {THREE.Vector3|null} Nearest endpoint or null
   */
  findNearestEndpoint(point) {
    let nearest = null;
    let minDistance = this.config.endpointSnapDistance;
    
    this.existingWalls.forEach(wall => {
      [wall.start, wall.end].forEach(endpoint => {
        const distance = point.distanceTo(endpoint);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = endpoint;
        }
      });
    });
    
    return nearest;
  }

  /**
   * Apply angular snapping to current point relative to start point
   * @param {THREE.Vector3} point - Current point
   * @returns {THREE.Vector3} Angular snapped point
   */
  applyAngularSnapping(point) {
    const direction = new THREE.Vector3()
      .subVectors(point, this.startPoint)
      .normalize();
    
    let angle = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
    angle = (angle + 360) % 360; // Normalize to 0-360
    
    let snappedAngle = angle;
    let minAngleDiff = Infinity;
    
    this.config.angularSnapAngles.forEach(targetAngle => {
      const diff = Math.abs(angle - targetAngle);
      const wrappedDiff = Math.min(diff, 360 - diff);
      
      if (wrappedDiff < minAngleDiff && wrappedDiff < 5) { // 5 degree tolerance
        minAngleDiff = wrappedDiff;
        snappedAngle = targetAngle;
      }
    });
    
    if (snappedAngle !== angle) {
      const distance = this.startPoint.distanceTo(point);
      const snappedDirection = new THREE.Vector3(
        Math.sin(snappedAngle * Math.PI / 180),
        0,
        Math.cos(snappedAngle * Math.PI / 180)
      );
      
      return this.startPoint.clone().add(
        snappedDirection.multiplyScalar(distance)
      );
    }
    
    return point;
  }

  /**
   * Create preview line geometry
   */
  createPreview() {
    this.clearPreview();
    
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 2,
      opacity: 0.7,
      transparent: true,
    });
    
    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }

  /**
   * Update preview line geometry
   */
  updatePreview() {
    if (!this.previewLine) return;
    
    const positions = new Float32Array([
      this.startPoint.x, this.startPoint.y, this.startPoint.z,
      this.currentPoint.x, this.currentPoint.y, this.currentPoint.z,
    ]);
    
    this.previewLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  /**
   * Clear preview line
   */
  clearPreview() {
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      this.previewLine.material.dispose();
      this.previewLine = null;
    }
  }

  /**
   * Commit the current wall segment to the store
   */
  commitWall() {
    if (!this.startPoint || !this.currentPoint) return;
    
    // Don't commit if points are too close
    if (this.startPoint.distanceTo(this.currentPoint) < 0.01) {
      this.state = 'idle';
      this.startPoint = null;
      this.currentPoint = null;
      this.clearPreview();
      return;
    }
    
    // Get material and color from editor state
    const material = this.store.state.editor.activeSelection.material;
    const color = this.store.state.editor.activeSelection.color;
    
    const wallData = {
      start: this.startPoint.clone(),
      end: this.currentPoint.clone(),
      material,
      color,
    };
    
    // Add to undo stack
    this.undoStack.push(wallData);
    
    // Commit to store
    this.store.dispatch('walls/addWall', wallData);
    
    // Emit commit event
    EventBus.emit(WALL_EVENTS.COMMIT, wallData);
    
    // Reset for next segment - stay in drawing mode
    this.startPoint = this.currentPoint.clone();
    // Update preview to show new start point
    this.updatePreview();
    // State remains 'drawing' for continuous drawing
  }

  /**
   * Cancel current drawing operation
   */
  cancelDrawing() {
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    this.clearPreview();
  }

  /**
   * Undo the last wall segment
   */
  undo() {
    if (this.undoStack.length === 0) return;
    
    const lastWall = this.undoStack.pop();
    
    // Find and remove the wall from store
    const walls = this.store.getters['walls/allWalls'];
    const wallToRemove = walls.find(wall => 
      wall.start.equals(lastWall.start) && wall.end.equals(lastWall.end)
    );
    
    if (wallToRemove) {
      this.store.dispatch('walls/removeWall', wallToRemove.id);
      EventBus.emit(WALL_EVENTS.UNDO, wallToRemove);
    }
    
    // If we were drawing, reset to idle
    if (this.state === 'drawing') {
      this.state = 'idle';
      this.startPoint = null;
      this.currentPoint = null;
      this.clearPreview();
    }
  }

  /**
   * Get current tool state
   * @returns {string} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get current undo stack size
   * @returns {number} Undo stack size
   */
  getUndoStackSize() {
    return this.undoStack.length;
  }
}