/**
 * RenderLoop - Manages the animation/render loop
 *
 * Handles requestAnimationFrame lifecycle and cleanup
 */
export class RenderLoop {
  constructor() {
    this.animationFrameId = null;
    this.isRunning = false;
    this.callbacks = [];
    this.renderFunction = this.render.bind(this);
  }

  /**
   * Add a callback to be called every frame
   * @param {Function} callback - Function to call each frame
   */
  addCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.callbacks.push(callback);
  }

  /**
   * Remove a callback
   * @param {Function} callback - Callback to remove
   */
  removeCallback(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Start the render loop
   */
  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.animationFrameId = requestAnimationFrame(this.renderFunction);
  }

  /**
   * Stop the render loop
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Check if the loop is running
   */
  getIsRunning() {
    return this.isRunning;
  }

  /**
   * Internal render function
   */
  render() {
    if (!this.isRunning) {
      return;
    }

    // Call all registered callbacks
    this.callbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in render loop callback:', error);
      }
    });

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.renderFunction);
  }

  /**
   * Dispose the render loop
   */
  dispose() {
    this.stop();
    this.callbacks = [];
    this.animationFrameId = null;
  }
}

// Singleton instance
let sharedRenderLoop = null;

/**
 * Get or create the shared render loop instance
 */
export function getSharedRenderLoop() {
  if (!sharedRenderLoop) {
    sharedRenderLoop = new RenderLoop();
  }
  return sharedRenderLoop;
}

/**
 * Reset the shared render loop (useful for testing)
 */
export function resetSharedRenderLoop() {
  if (sharedRenderLoop) {
    sharedRenderLoop.dispose();
  }
  sharedRenderLoop = null;
}

export default RenderLoop;
