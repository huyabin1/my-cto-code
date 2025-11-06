# DrawWallTool Documentation

## Overview

The `DrawWallTool` is an interactive wall drawing tool for Three.js scenes that provides a state machine-based approach to drawing wall segments with snapping capabilities and undo functionality.

## Features

- **State Machine**: idle → drawing → committing → idle
- **Raycasting**: Projects mouse clicks onto the y=0 plane
- **Snapping Strategies**:
  - Grid snapping at configurable intervals (default: 0.1m)
  - Angular snapping at 0°, 45°, 90° (configurable)
  - Endpoint snapping to nearby CAD/wall endpoints
- **Undo Stack**: Limited to last segment, clears on tool deactivation
- **Event Bus Integration**: Emits wall:preview, wall:commit, wall:undo events
- **Vuex Integration**: Persists wall configurations to walls store module

## Usage

### Basic Integration

```javascript
import { DrawWallTool } from '@/three/command/DrawWallTool';

// Create tool instance
const tool = new DrawWallTool(scene, camera, renderer.domElement, store);

// Activate with default configuration
tool.activate();

// Activate with custom configuration
tool.activate({
  gridSnap: true,
  gridInterval: 0.1,
  angularSnap: true,
  angularSnapAngles: [0, 45, 90],
  endpointSnap: true,
  endpointSnapDistance: 0.5,
});

// Deactivate tool
tool.deactivate();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gridSnap` | boolean | true | Enable grid snapping |
| `gridInterval` | number | 0.1 | Grid interval in meters |
| `angularSnap` | boolean | true | Enable angular snapping |
| `angularSnapAngles` | array | [0, 45, 90] | Snap angles in degrees |
| `endpointSnap` | boolean | true | Enable endpoint snapping |
| `endpointSnapDistance` | number | 0.5 | Snap distance in meters |

### State Management

The tool maintains three states:
- **idle**: Tool is active, waiting for first click
- **drawing**: User is actively drawing a wall segment
- **committing**: Wall segment is being committed to store

### Event Bus Events

```javascript
import { EventBus, WALL_EVENTS } from '@/utils/eventBus';

// Listen for preview updates
EventBus.on(WALL_EVENTS.PREVIEW, (data) => {
  console.log('Wall preview:', data.start, data.end);
});

// Listen for wall commits
EventBus.on(WALL_EVENTS.COMMIT, (wallData) => {
  console.log('Wall committed:', wallData);
});

// Listen for undo events
EventBus.on(WALL_EVENTS.UNDO, (wallData) => {
  console.log('Wall undone:', wallData);
});
```

### Vuex Integration

The tool automatically integrates with the `walls` store module:

```javascript
// Wall data structure stored in Vuex
{
  id: 'uuid-v4',
  start: { x: 0, y: 0, z: 0 },
  end: { x: 5, y: 0, z: 0 },
  material: 'concrete',
  color: '#ffffff',
  height: 3.0,
  thickness: 0.2,
  createdAt: '2023-01-01T00:00:00.000Z'
}
```

### Methods

#### Core Methods
- `activate(config)` - Activate tool with optional configuration
- `deactivate()` - Deactivate tool and clean up
- `undo()` - Undo last wall segment

#### Utility Methods
- `getState()` - Get current tool state
- `getUndoStackSize()` - Get undo stack size
- `updateExistingWalls()` - Refresh existing walls for endpoint snapping

## Host Integration Requirements

### Required Dependencies
- Three.js scene, camera, and renderer DOM element
- Vuex store with `walls` module and `editor` module
- Event bus utility

### Integration Steps
1. Create tool instance with required dependencies
2. Activate tool with desired configuration
3. Handle tool deactivation when switching tools
4. Listen to event bus for real-time updates
5. Manage undo functionality through tool methods

### Example Vue Component Integration

```javascript
export default {
  mounted() {
    const threeScene = this.$refs.threeScene;
    this.wallTool = new DrawWallTool(
      threeScene.getScene(),
      threeScene.getCamera(),
      threeScene.getRenderer().domElement,
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
      
      this.wallTool.activate(config);
    },
    
    disableWallDrawing() {
      this.wallTool.deactivate();
    },
    
    undoLastWall() {
      this.wallTool.undo();
    },
  },
  
  beforeDestroy() {
    if (this.wallTool) {
      this.wallTool.deactivate();
    }
  },
};
```

## Testing

The tool includes comprehensive unit tests covering:
- State machine transitions
- Snapping calculations with mocked intersections
- Undo behavior
- Event emissions
- Preview line management

Run tests with:
```bash
npm run test:unit -- tests/unit/DrawWallTool.spec.js
```