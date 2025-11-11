# Tool Interactions Base Implementation

## Overview

This document describes the Tool Interactions Base system that implements the basic drawing tool pipeline to support wall drawing workflows.

## Architecture

### DrawWallTool Class

The `DrawWallTool` class (`src/three/tool/DrawWallTool.js`) encapsulates all wall drawing functionality:

#### State Machine
- **IDLE**: No active drawing
- **DRAWING**: User is actively drawing a wall
- **CONFIRMING**: (Reserved for future use)

#### Key Methods

**Initialization & Lifecycle**
- `constructor(scene, camera, raycaster, groundPlane, store)` - Initialize the tool
- `destroy()` - Clean up resources and listeners

**Drawing Operations**
- `startDrawing(point2D)` - Begin wall drawing at given point
- `updateDrawing(point2D)` - Update wall preview as user moves mouse
- `finishDrawing(point2D)` - Complete wall creation
- `cancel()` - Cancel active drawing (triggered by ESC key)

**State & Configuration**
- `getState()` - Get current tool state
- `isActive()` - Check if tool is actively drawing
- `setWallConfig(config)` - Configure wall height/thickness

**Visualization**
- `createTempWall()` - Create semi-transparent preview wall
- `updateTempWall()` - Update preview as drawing progresses
- `removeTempWall()` - Remove preview when finished
- `updateGuideLines()` - Show start/end markers and connecting line
- `clearGuideLines()` - Remove guide line markers

**Callbacks**
- `onStateChangeCallback(callback)` - Set state change listener
- `onWallCreatedCallback(callback)` - Set wall creation listener (for entity persistence)

### ToolController Integration

The `ToolController` class (`src/three/tool/ToolController.js`) now delegates wall drawing to `DrawWallTool`:

**Changes**
- Created `drawWallTool` instance during initialization
- Mouse events (down/move/up) delegate to tool methods
- ESC key triggers tool cancellation
- Tool completion triggers wall creation via `CreateWallCommand`

### Data Flow

```
User Input (Mouse/Keyboard)
    ↓
ToolController (handles events)
    ↓
DrawWallTool (manages drawing state & preview)
    ↓
onWallCreated callback
    ↓
CreateWallCommand (executes command)
    ↓
SceneGraph & Vuex Store (persistence)
```

## Wall Entity Data Structure

When a wall is created, the following data structure is persisted:

```javascript
{
  id: string,                  // UUID
  type: 'wall',
  name: string,                // Auto-generated or user-defined
  start: [number, number],     // [x, z] coordinates
  end: [number, number],       // [x, z] coordinates
  height: number,              // Default: 2.8
  thickness: number,           // Default: 0.2
  material: string,            // 'concrete' | 'brick' | 'drywall' | 'wood'
  color: string,               // Hex color (e.g., '#ffffff')
  position: [x, y, z],        // Derived from geometry
  rotation: [x, y, z],        // Rotation angles
  scale: [x, y, z]            // Typically [1, 1, 1]
}
```

## Usage Example

### Basic Usage

```javascript
// In FloorplanViewport.vue or any component with ToolController
const toolController = new ToolController(scene, camera, renderer, store);

// Enable wall drawing
store.dispatch('setDrawWallTool', true);

// User clicks canvas to draw walls
// Tool handles the interaction automatically
```

### Configuration

```javascript
// Set wall properties before drawing
toolController.drawWallTool.setWallConfig({
  height: 3.0,
  thickness: 0.25
});
```

### Event Listening

```javascript
// Listen for state changes
toolController.drawWallTool.onStateChangeCallback((state, data) => {
  if (state === DrawWallTool.STATE.DRAWING) {
    console.log('Drawing started at', data.startPoint);
  }
});

// Listen for wall creation
toolController.drawWallTool.onWallCreatedCallback((wallConfig) => {
  console.log('Wall will be created with:', wallConfig);
});
```

## User Interaction Guide

### Drawing Walls

1. **Enable Tool**: Activate wall drawing tool from UI
2. **Click Start Point**: Left-click on canvas to start drawing
3. **Move to End Point**: Move mouse to desired end location
4. **Click End Point**: Left-click to complete wall
5. **Repeat or Cancel**: Draw another wall or press ESC to cancel

### Cancellation

- Press **ESC** at any time during drawing to cancel
- Temporary wall preview and guide lines are cleaned up
- Tool returns to idle state

## State Transitions

```
     ┌─────────────┐
     │   IDLE      │
     └──────┬──────┘
            │ startDrawing()
            ▼
     ┌─────────────┐
     │  DRAWING    │
     ├─────────────┤
     │  - updateDrawing()
     │  - finishDrawing()
     │  - cancel() ─┐
     └──────┬──────┘
            │ finishDrawing() || cancel()
            ▼
     ┌─────────────┐
     │   IDLE      │
     └─────────────┘
```

## Performance Considerations

### Temporary Geometry
- Temp walls use 50% opacity to distinguish from final geometry
- Guide lines use low-poly spheres (8x8) for markers
- All temporary objects are properly disposed on cleanup

### Ray Casting
- Uses existing raycaster from ToolController
- Intersects with ground plane (y=0)
- Efficient for continuous movement updates

## Testing

Comprehensive test suite in `tests/unit/tool/DrawWallTool.spec.js`:

- 40 test cases covering all functionality
- Tests for state management, drawing operations, callbacks, and edge cases
- Mocking of WallFactory for unit test isolation

Run tests:
```bash
npm run test:unit -- tests/unit/tool/DrawWallTool.spec.js
```

## Integration Points

### Vuex Store (editor module)
- `drawWallToolEnabled`: Boolean flag to activate/deactivate tool
- `activeSelection`: Material and color for new walls
- `entities`: Persisted wall entities
- `selection`: Currently selected entities

### CreateWallCommand
- Executes wall creation with proper undo/redo
- Handles SceneGraph and Vuex store updates
- Integrates with CommandStack

### SceneGraph
- Registers created wall entities
- Maintains bidirectional mapping between IDs and Three.js objects

## Future Enhancements

- **Snapping**: Snap to grid points and existing entities
- **Continuous Drawing**: Automatically start next wall from end of previous
- **Wall Editing**: Modify existing walls through drawing
- **Constraints**: Enforce orthogonal/diagonal drawing modes
- **Undo/Redo**: Integrated with CommandStack (already supported)

## Known Limitations

- Currently supports single wall segments (not multi-segment drawing in one interaction)
- No snapping to guide points (can be added in future)
- Minimum wall length of 0.1 units to prevent degenerate geometry

## Troubleshooting

### Wall not appearing
- Check that `drawWallToolEnabled` is true in store
- Verify CreateWallCommand is executing properly
- Check SceneGraph has access to the scene

### Tool not responding to clicks
- Verify ToolController is initialized in viewport
- Check mouse events are not being stopped by overlaying UI
- Confirm raycaster is properly configured

### Temporary preview not showing
- Check that scene has lights for material to render
- Verify WallFactory.create is not throwing errors
- Check temporary objects are being added to scene
