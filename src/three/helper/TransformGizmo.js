import * as THREE from 'three';
import { TransformControls } from 'three-stdlib';
import { TransformEntityCommand } from '@/three/command/TransformCommands';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

const DEFAULT_TRANSLATION_SNAP = 0.5;

export default class TransformGizmo {
  constructor(options) {
    const { camera, domElement, scene, store, commandStack, sceneGraph, onDragStateChange } =
      options;

    if (!camera || !domElement || !scene || !store || !commandStack) {
      throw new Error('TransformGizmo requires camera, domElement, scene, store, and commandStack');
    }

    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.store = store;
    this.commandStack = commandStack;
    this.sceneGraph = sceneGraph || getSharedSceneGraph();
    this.onDragStateChange = onDragStateChange;

    this.controls = new TransformControls(camera, domElement);
    this.controls.setMode('translate');
    this.controls.setSpace('world');
    this.controls.visible = false;

    this.scene.add(this.controls);

    this.attachedObject = null;
    this.attachedEntityId = null;
    this.startTransform = null;

    this._onMouseDown = () => this.handleMouseDown();
    this._onMouseUp = () => this.handleMouseUp();
    this._onDraggingChanged = (event) => this.handleDraggingChanged(event);

    this.controls.addEventListener('mouseDown', this._onMouseDown);
    this.controls.addEventListener('mouseUp', this._onMouseUp);
    this.controls.addEventListener('dragging-changed', this._onDraggingChanged);
  }

  handleMouseDown() {
    if (!this.attachedObject) {
      return;
    }
    this.startTransform = this.captureTransform(this.attachedObject);
  }

  async handleMouseUp() {
    if (!this.attachedObject || !this.attachedEntityId || !this.startTransform) {
      return;
    }

    const endTransform = this.captureTransform(this.attachedObject);

    if (!this.transformsDiffer(this.startTransform, endTransform)) {
      return;
    }

    const command = new TransformEntityCommand(
      this.store,
      this.attachedEntityId,
      this.startTransform,
      endTransform,
      { sceneGraph: this.sceneGraph }
    );

    await this.commandStack.execute(command);
    this.startTransform = null;
  }

  handleDraggingChanged(event) {
    if (typeof this.onDragStateChange === 'function') {
      this.onDragStateChange(event.value);
    }
  }

  attach(object3d, entityId) {
    if (!object3d || !entityId) {
      this.detach();
      return;
    }

    this.attachedObject = object3d;
    this.attachedEntityId = entityId;
    this.controls.attach(object3d);
    this.controls.visible = true;
  }

  detach() {
    this.attachedObject = null;
    this.attachedEntityId = null;
    this.controls.detach();
    this.controls.visible = false;
  }

  setMode(mode) {
    if (['translate', 'rotate', 'scale'].includes(mode)) {
      this.controls.setMode(mode);
    }
  }

  updateSnapping(snappingState = {}) {
    if (!snappingState) {
      this.controls.setTranslationSnap(null);
      this.controls.setRotationSnap(null);
      this.controls.setScaleSnap(null);
      return;
    }

    const { grid, orthogonal, diagonal45 } = snappingState;

    if (grid) {
      this.controls.setTranslationSnap(DEFAULT_TRANSLATION_SNAP);
    } else {
      this.controls.setTranslationSnap(null);
    }

    if (diagonal45) {
      this.controls.setRotationSnap(Math.PI / 4);
    } else if (orthogonal) {
      this.controls.setRotationSnap(Math.PI / 2);
    } else {
      this.controls.setRotationSnap(null);
    }
  }

  captureTransform(object3d) {
    return {
      position: object3d.position.toArray(),
      rotation: [object3d.rotation.x, object3d.rotation.y, object3d.rotation.z],
      scale: object3d.scale.toArray(),
    };
  }

  transformsDiffer(a, b) {
    return (
      !this.arraysEqual(a.position, b.position) ||
      !this.arraysEqual(a.rotation, b.rotation) ||
      !this.arraysEqual(a.scale, b.scale)
    );
  }

  arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (Math.abs(a[i] - b[i]) > Number.EPSILON) {
        return false;
      }
    }
    return true;
  }

  destroy() {
    this.controls.removeEventListener('mouseDown', this._onMouseDown);
    this.controls.removeEventListener('mouseUp', this._onMouseUp);
    this.controls.removeEventListener('dragging-changed', this._onDraggingChanged);
    this.scene.remove(this.controls);
    this.controls.dispose();
  }
}
