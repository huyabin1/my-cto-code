# Scene Core - Three.js Rendering Core

This directory contains reusable core modules for 3D rendering lifecycle management and provides a unified architecture for 2D/3D view management.

## Core Modules

### 1. RendererManager
Manages WebGL renderer instances with consistent settings.

**Key Features:**
- Create renderers with default or custom settings
- Manage multiple renderer instances by ID
- Handle shadow mapping configuration
- Proper disposal and cleanup

**Usage:**
```javascript
import { getSharedRendererManager } from '@/three/core';

const rendererManager = getSharedRendererManager();
const renderer = rendererManager.createRenderer('main', {
  antialias: true,
  shadowMap: true,
  clearColor: '#f5f5f5',
});

// Clean up
rendererManager.removeRenderer('main');
```

### 2. CameraManager
Manages camera instances and properties with automatic aspect ratio handling.

**Key Features:**
- Create perspective and orthographic cameras
- Handle camera aspect ratio updates (resize)
- Multiple camera management by ID
- Configurable camera positions and parameters

**Usage:**
```javascript
import { getSharedCameraManager } from '@/three/core';

const cameraManager = getSharedCameraManager();
const camera = cameraManager.createPerspectiveCamera('main', 800, 600, {
  fov: 75,
  position: { x: 20, y: 20, z: 20 },
});

// On window resize
cameraManager.updateAspectRatio('main', newWidth, newHeight);
```

### 3. RenderLoop
Manages the animation/render loop with proper lifecycle management.

**Key Features:**
- Start/stop animation loop with requestAnimationFrame
- Add/remove render callbacks
- Error handling in callbacks
- Proper cleanup and disposal

**Usage:**
```javascript
import { getSharedRenderLoop } from '@/three/core';

const renderLoop = getSharedRenderLoop();

renderLoop.addCallback(() => {
  // Render code here
  renderer.render(scene, camera);
});

renderLoop.start();

// Later...
renderLoop.stop();
renderLoop.dispose();
```

### 4. InteractionBus
Centralized event distribution system for scene components.

**Key Features:**
- Publish-subscribe pattern for events
- One-time event listeners with `once()`
- Event type discovery
- Error handling in event handlers

**Usage:**
```javascript
import { getSharedInteractionBus } from '@/three/core';

const bus = getSharedInteractionBus();

// Subscribe to an event
const unsubscribe = bus.on('camera-updated', (data) => {
  console.log('Camera updated:', data);
});

// Emit an event
bus.emit('camera-updated', { position: [10, 10, 10] });

// Unsubscribe
unsubscribe();
```

### 5. SceneGraph
Shared scene graph manager for 2D/3D viewport synchronization.

**Key Features:**
- Entity management (add, remove, update)
- Material management
- Observer pattern for change notifications
- Serialization/deserialization support

**Documentation:** See `SceneGraph.js` for detailed implementation

### 6. SceneManager
Core scene management utilities (placeholder for future expansion).

### 7. SceneOptimizer
Performance optimization tools including frustum culling, object pooling, and spatial indexing.

**Key Features:**
- Frustum culling for visibility optimization
- Object pool management
- Spatial indexing for efficient queries
- Incremental rendering support

**Documentation:** See `SceneOptimizer.js` for detailed implementation

## Architecture Overview

The Scene Core bootstrap follows a modular composition pattern:

```
┌─────────────────────────────────────┐
│      ThreeScene Component           │
├─────────────────────────────────────┤
│  Uses Core Managers:                │
│  - RendererManager                  │
│  - CameraManager                    │
│  - RenderLoop (with callbacks)      │
│  - InteractionBus (for events)      │
│  - SceneGraph (for entities)        │
└─────────────────────────────────────┘
         │
         ├─► Three.js Scene
         ├─► Three.js WebGL Renderer
         ├─► Three.js Camera
         └─► Animation Loop
```

## Lifecycle Management

### Initialization
1. Get or create shared manager instances
2. Initialize renderer with container and options
3. Create camera with appropriate dimensions
4. Setup scene graph and entity management
5. Start render loop with render callbacks
6. Register event listeners

### Runtime
1. Render loop continuously calls registered callbacks
2. Event bus distributes interactions and updates
3. Scene graph maintains entity state and synchronization
4. Managers handle resource updates (resize, etc.)

### Cleanup
1. Stop render loop
2. Remove render callbacks
3. Dispose of resources (renderer, geometries, materials)
4. Clear event subscriptions
5. Unsubscribe from scene graph changes

## Testing

Comprehensive unit tests are available in `tests/unit/three/core/core.spec.js`:

```bash
npm test -- tests/unit/three/core/core.spec.js
```

Test coverage includes:
- Manager initialization and configuration
- Resource creation and disposal
- Callback management and execution
- Event emission and subscription
- Singleton patterns and instance resets
- Error handling and edge cases
- Integration scenarios

## Integration with ThreeScene

The refactored `ThreeScene.vue` component demonstrates core module usage:

```javascript
// Initialize managers
this.rendererManager = getSharedRendererManager();
this.cameraManager = getSharedCameraManager();
this.renderLoop = getSharedRenderLoop();

// Create renderer
this.renderer = this.rendererManager.createRenderer('main', {...});

// Create camera
this.camera = this.cameraManager.createPerspectiveCamera('main', w, h);

// Add render callback
this.renderLoop.addCallback(() => {
  this.renderer.render(this.scene, this.camera);
});

// Start rendering
this.renderLoop.start();
```

## Shared Singletons

All core managers provide shared singleton instances:

```javascript
// Get or create singleton
const renderLoop = getSharedRenderLoop();

// Reset singleton (useful for testing)
resetSharedRenderLoop();
```

## Future Enhancements

- [ ] Automatic resource pooling
- [ ] Performance profiling integration
- [ ] Advanced shadow techniques (VSM, CSM)
- [ ] Compute shader support
- [ ] LOD (Level of Detail) system
- [ ] Streaming geometry loader

## Related Files

- `src/three/helper/lightingHelper.js` - Lighting setup utilities
- `src/components/editor/ThreeScene.vue` - Component implementation
- `tests/unit/three/core/core.spec.js` - Unit tests
- `IMPLEMENTATION_SUMMARY.md` - Architecture overview

---

**Version:** 1.0  
**Status:** Implemented ✓
