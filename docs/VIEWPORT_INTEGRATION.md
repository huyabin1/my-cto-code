# Preview Viewport Integration

## Overview

The Preview Viewport Integration feature enables 2D/3D synchronized viewing capabilities in the editor. Users can switch between different view modes and layout configurations to visualize their designs from multiple perspectives simultaneously.

## Architecture

### Components

#### 1. PreviewViewport.vue
Location: `src/components/editor/viewport/PreviewViewport.vue`

A dedicated 3D preview component that:
- Uses a perspective camera for realistic 3D visualization
- Implements OrbitControls for intuitive camera manipulation
- Shares scene data through the SceneGraph
- Provides view control buttons (reset, zoom in/out)

**Key Features:**
- **Perspective Camera**: 60° FOV for natural 3D viewing
- **Orbit Controls**: Mouse-based rotation, pan, and zoom
- **Scene Lighting**: Multi-light setup with ambient, directional, hemisphere, and fill lights
- **Helpers**: Grid and axis helpers for spatial reference
- **Shadow Support**: Real-time shadow rendering

**Props:**
- `backgroundColor` (String): Background color for the viewport (default: '#2c3e50')

**Events:**
- `scene-graph-change`: Emitted when the scene graph changes
- `view-reset`: Emitted when the view is reset to default
- `zoom-change`: Emitted when zoom in/out is triggered

#### 2. SceneGraph
Location: `src/three/core/SceneGraph.js`

A shared scene graph manager that synchronizes data between 2D and 3D viewports:

**Entity Management:**
```javascript
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

const sceneGraph = getSharedSceneGraph();

// Add entity
sceneGraph.addEntity('wall-1', entityData, threeObject);

// Update entity
sceneGraph.updateEntity('wall-1', { height: 3.0 });

// Remove entity
sceneGraph.removeEntity('wall-1');

// Get entity
const entity = sceneGraph.getEntity('wall-1');
```

**Material Management:**
```javascript
// Register material
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
sceneGraph.registerMaterial('red-material', material);

// Get material
const mat = sceneGraph.getMaterial('red-material');
```

**Observer Pattern:**
```javascript
// Subscribe to changes
const unsubscribe = sceneGraph.subscribe((event) => {
  console.log('Scene graph changed:', event.type, event.id);
});

// Unsubscribe
unsubscribe();
```

#### 3. EditorLayout Updates
Location: `src/components/editor/EditorLayout.vue`

Enhanced with viewport switching capabilities:

**View Mode Controls:**
- **平面 (2D)**: Traditional 2D top-down view
- **3D**: 3D perspective preview only
- **同步 (Sync)**: Both views simultaneously

**Layout Modes** (available in Sync mode):
- **分屏 (Split)**: Side-by-side split screen
- **悬浮 (Floating)**: 3D preview floats over 2D view

### Store Integration

#### Viewport State
Location: `src/store/modules/editor.js`

```javascript
state: {
  viewport: {
    viewMode: '2d', // '2d' | '3d' | 'sync'
    layoutMode: 'single', // 'single' | 'split' | 'floating'
  }
}
```

**Actions:**
- `setViewMode(mode)`: Change the view mode
- `setLayoutMode(mode)`: Change the layout mode

**Usage:**
```javascript
// In components
this.$store.dispatch('editor/setViewMode', '3d');
this.$store.dispatch('editor/setLayoutMode', 'split');

// Access state
const viewMode = this.$store.state.editor.viewport.viewMode;
```

## Usage Guide

### Switching View Modes

1. **2D View Only**
   - Select "平面" in the view mode controls
   - Shows traditional top-down editing view
   - Best for precise 2D layout work

2. **3D View Only**
   - Select "3D" in the view mode controls
   - Shows full-screen 3D preview
   - Best for reviewing spatial design

3. **Synchronized Views**
   - Select "同步" in the view mode controls
   - Shows both 2D and 3D views
   - Best for comprehensive design review

### Layout Configurations (Sync Mode)

1. **Split Screen Layout**
   - Select "分屏" under layout options
   - Views displayed side-by-side
   - Equal space for both views
   - Ideal for dual-monitor setups or large screens

2. **Floating Layout**
   - Select "悬浮" under layout options
   - 3D preview floats over 2D view (400x300px)
   - Positioned at top-right corner
   - Ideal for quick 3D reference while working in 2D

### View Controls

The 3D preview viewport includes control buttons:

1. **Reset View** (↺ icon)
   - Resets camera to default position (15, 15, 15)
   - Centers view on origin
   - Restores default zoom level

2. **Zoom In** (+ icon)
   - Moves camera closer to scene
   - Incremental zoom step: 2 units

3. **Zoom Out** (- icon)
   - Moves camera away from scene
   - Incremental zoom step: 2 units

### Mouse Controls (3D View)

- **Left Click + Drag**: Rotate camera around target
- **Right Click + Drag**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **Damping**: Smooth camera movements enabled

## Integration with Existing Systems

### ThreeScene Integration

The existing `ThreeScene.vue` component has been updated to:
- Initialize and connect to the shared SceneGraph
- Add the scene graph root group to its scene
- Subscribe to scene graph changes
- Properly cleanup subscriptions on destroy

### Entity Synchronization

When entities are created or modified:

```javascript
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

// Create a wall
const wall = WallFactory.create(config);
const sceneGraph = getSharedSceneGraph();

// Add to scene graph (automatically syncs to all viewports)
sceneGraph.addEntity(`wall-${id}`, {
  type: 'wall',
  config,
}, wall);
```

Both 2D and 3D views will automatically display the new entity.

### Material Synchronization

Materials can be shared across views:

```javascript
// Register once
sceneGraph.registerMaterial('concrete', concreteMaterial);

// Use in multiple entities
const mat = sceneGraph.getMaterial('concrete');
```

## Styling and Appearance

### CSS Classes

- `.split-layout`: Applied to canvas container in split mode
- `.floating-layout`: Applied to canvas container in floating mode
- `.split-view`: Applied to individual viewport in split mode
- `.floating-preview`: Applied to 3D viewport in floating mode

### Customization

To customize the floating preview size:

```css
.floating-preview {
  width: 400px;  /* Adjust width */
  height: 300px; /* Adjust height */
  top: 20px;     /* Adjust position */
  right: 20px;
}
```

## Performance Considerations

### Rendering Optimization

1. **Separate Animation Loops**: Each viewport has its own animation loop
2. **Shared Geometry**: Entities use the same Three.js objects (added to scene graph root)
3. **Efficient Updates**: Observer pattern ensures minimal re-renders

### Best Practices

1. **Use Sync Mode Sparingly**: Running two viewports doubles rendering overhead
2. **Floating Layout**: More efficient than split (2D view is larger, 3D is smaller)
3. **Scene Graph**: Add entities to scene graph rather than directly to scenes

## Testing

### Unit Tests

Tests are provided for:

1. **SceneGraph** (`tests/unit/three/core/SceneGraph.spec.js`)
   - Entity management
   - Material management
   - Observer pattern
   - Serialization
   - Resource disposal

2. **PreviewViewport** (`tests/unit/components/editor/viewport/PreviewViewport.spec.js`)
   - Component rendering
   - View controls
   - Resize handling
   - SceneGraph integration
   - Cleanup

3. **EditorLayout Viewport** (`tests/unit/components/editor/EditorLayout.viewport.spec.js`)
   - View mode switching
   - Layout mode switching
   - CSS class application
   - Responsive behavior

### Running Tests

```bash
npm test -- SceneGraph
npm test -- PreviewViewport
npm test -- EditorLayout.viewport
```

## Troubleshooting

### Common Issues

1. **Views Not Syncing**
   - Ensure entities are added to SceneGraph, not directly to scenes
   - Check that both viewports are subscribed to scene graph changes

2. **Performance Issues**
   - Switch to floating layout instead of split
   - Reduce shadow quality in PreviewViewport
   - Check for memory leaks (entities not properly disposed)

3. **Layout Not Responding**
   - Verify viewport state in Vuex store
   - Check CSS classes are applied correctly
   - Ensure components are properly mounted

### Debug Tips

```javascript
// Check scene graph state
import { getSharedSceneGraph } from '@/three/core/SceneGraph';
const sg = getSharedSceneGraph();
console.log('Entities:', sg.getAllEntities());
console.log('Materials:', sg.getAllMaterials());

// Monitor scene graph changes
sg.subscribe((event) => {
  console.log('Scene graph event:', event);
});

// Check viewport state
console.log('View mode:', this.$store.state.editor.viewport.viewMode);
console.log('Layout mode:', this.$store.state.editor.viewport.layoutMode);
```

## Future Enhancements

Potential improvements for future versions:

1. **Camera Synchronization**: Option to sync camera positions between views
2. **Viewport Presets**: Save/load custom viewport configurations
3. **Picture-in-Picture**: Detachable floating viewport
4. **Multi-camera Views**: Support for multiple custom camera angles
5. **Performance Metrics**: Real-time FPS and render statistics
6. **View Linking**: Coordinate highlighting between 2D and 3D views

## API Reference

### SceneGraph

```typescript
class SceneGraph {
  addEntity(id: string, entity: object, threeObject: THREE.Object3D): EntityData
  removeEntity(id: string): boolean
  updateEntity(id: string, updates: object): boolean
  getEntity(id: string): EntityData | undefined
  getAllEntities(): EntityData[]
  clearEntities(): void
  
  registerMaterial(name: string, material: THREE.Material): void
  getMaterial(name: string): THREE.Material | undefined
  getAllMaterials(): [string, THREE.Material][]
  
  getRootGroup(): THREE.Group
  
  subscribe(callback: (event: Event) => void): () => void
  unsubscribe(callback: Function): void
  
  serialize(): SerializedData
  deserialize(data: SerializedData): EntityData[]
  
  dispose(): void
}
```

### PreviewViewport Methods

```typescript
interface PreviewViewport {
  resetView(): void
  zoomIn(): void
  zoomOut(): void
  getCamera(): THREE.Camera
  getScene(): THREE.Scene
  getRenderer(): THREE.WebGLRenderer
}
```

## License

This feature is part of the main application and follows the same license.
