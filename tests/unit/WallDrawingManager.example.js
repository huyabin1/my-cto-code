import { DrawWallTool } from '@/three/command/DrawWallTool';

/**
 * Integration example showing how to use the DrawWallTool
 * This demonstrates the expected host integration pattern
 */

// Example usage in a Vue component or Three.js manager
export class WallDrawingManager {
  constructor(scene, camera, domElement, store) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.store = store;
    this.tool = null;
  }

  /**
   * Enable the wall drawing tool
   * @param {Object} config - Optional configuration overrides
   */
  enableDrawing(config = {}) {
    if (this.tool) {
      this.disableDrawing();
    }

    this.tool = new DrawWallTool(this.scene, this.camera, this.domElement, this.store);
    
    // Configure based on editor settings
    const editorConfig = {
      gridSnap: this.store.state.editor.snapping.grid,
      angularSnap: this.store.state.editor.snapping.orthogonal || this.store.state.editor.snapping.diagonal45,
      endpointSnap: true,
      ...config,
    };

    this.tool.activate(editorConfig);
    
    console.log('Wall drawing tool enabled');
  }

  /**
   * Disable the wall drawing tool
   */
  disableDrawing() {
    if (this.tool) {
      this.tool.deactivate();
      this.tool = null;
      console.log('Wall drawing tool disabled');
    }
  }

  /**
   * Undo last wall segment
   */
  undo() {
    if (this.tool) {
      this.tool.undo();
    }
  }

  /**
   * Get current tool state
   */
  getToolState() {
    return this.tool ? this.tool.getState() : null;
  }

  /**
   * Get undo stack size
   */
  getUndoCount() {
    return this.tool ? this.tool.getUndoStackSize() : 0;
  }
}

// Example Vue component integration
/*
export default {
  data() {
    return {
      drawingManager: null,
    };
  },
  
  mounted() {
    const threeScene = this.$refs.threeScene;
    const scene = threeScene.getScene();
    const camera = threeScene.getCamera();
    const renderer = threeScene.getRenderer();
    
    this.drawingManager = new WallDrawingManager(
      scene,
      camera,
      renderer.domElement,
      this.$store
    );
  },
  
  methods: {
    enableWallDrawing() {
      const config = {
        gridSnap: this.$store.state.editor.snapping.grid,
        angularSnap: this.$store.state.editor.snapping.orthogonal,
        endpointSnap: true,
      };
      
      this.drawingManager.enableDrawing(config);
    },
    
    disableWallDrawing() {
      this.drawingManager.disableDrawing();
    },
    
    undoLastWall() {
      this.drawingManager.undo();
    },
  },
};
*/