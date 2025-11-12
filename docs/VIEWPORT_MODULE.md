# Viewport State Module Documentation

## Overview

The viewport state module provides centralized management for all viewport-related functionality in the Vue2 CAD application. It handles view modes, layout modes, zoom/pan controls, grid visibility, snapping options, camera configurations, and controls settings.

## Features

### View Mode Management
- **2D Mode**: Traditional 2D floorplan view with orthographic camera
- **3D Mode**: Full 3D perspective view with orbit controls
- **Sync Mode**: Synchronized 2D and 3D views (split or floating layout)

### Layout Mode Management
- **Single Layout**: One viewport at a time
- **Split Layout**: Side-by-side 2D and 3D views
- **Floating Layout**: 3D preview floating over 2D main view

### Zoom and Pan Controls
- Zoom level with min/max boundaries (0.2 - 5.0)
- Pan offset with X/Y coordinates
- Smooth zoom in/out actions
- Reset zoom and pan to defaults

### Grid and Snapping
- Grid visibility toggle
- Comprehensive snap options:
  - Grid snapping
  - Orthogonal snapping (90° angles)
  - 45° diagonal snapping
  - Node snapping
  - Intersection snapping

### Camera Configurations
- **Orthographic Camera**: For 2D views with configurable frustum size
- **Perspective Camera**: For 3D views with FOV, near/far planes
- Position, target, and up vector configuration

### Controls Configuration
- Enable/disable rotate, pan, zoom controls
- Damping configuration for smooth movement
- Min/max zoom boundaries

## State Structure

```javascript
{
  viewMode: '2d' | '3d' | 'sync',
  layoutMode: 'single' | 'split' | 'floating',
  zoomLevel: number,
  panOffset: { x: number, y: number },
  gridVisible: boolean,
  snapOptions: {
    grid: boolean,
    orthogonal: boolean,
    diagonal45: boolean,
    node: boolean,
    intersection: boolean
  },
  cameraConfig: {
    orthographic: {
      frustumSize: number,
      position: { x: number, y: number, z: number },
      target: { x: number, y: number, z: number },
      up: { x: number, y: number, z: number }
    },
    perspective: {
      fov: number,
      near: number,
      far: number,
      position: { x: number, y: number, z: number },
      target: { x: number, y: number, z: number }
    }
  },
  controls: {
    enableRotate: boolean,
    enablePan: boolean,
    enableZoom: boolean,
    enableDamping: boolean,
    dampingFactor: number,
    minZoom: number,
    maxZoom: number
  }
}
```

## Getters

### View Mode Getters
- `is2DMode`: Returns true if in 2D mode
- `is3DMode`: Returns true if in 3D mode
- `isSyncMode`: Returns true if in sync mode

### Layout Mode Getters
- `isSingleLayout`: Returns true if using single layout
- `isSplitLayout`: Returns true if using split layout
- `isFloatingLayout`: Returns true if using floating layout

### Camera Getters
- `activeCameraConfig`: Returns appropriate camera config based on view mode
- `controlsConfig`: Returns controls configuration

### Utility Getters
- `snapEnabled`: Returns true if any snap option is enabled
- `snapOptionsList`: Returns complete snap options object
- `viewportState`: Returns core viewport state subset
- `serializableState`: Returns complete state for persistence

## Mutations

### View Mode Mutations
- `SET_VIEW_MODE`: Sets view mode with validation
- `SET_LAYOUT_MODE`: Sets layout mode with validation

### Zoom Mutations
- `SET_ZOOM_LEVEL`: Sets zoom level with boundary clamping
- `INCREMENT_ZOOM`: Increments/decrements zoom by delta

### Pan Mutations
- `SET_PAN_OFFSET`: Sets absolute pan offset
- `UPDATE_PAN_OFFSET`: Updates pan offset by delta
- `RESET_PAN_OFFSET`: Resets pan to origin

### Grid Mutations
- `SET_GRID_VISIBLE`: Sets grid visibility
- `TOGGLE_GRID_VISIBLE`: Toggles grid visibility

### Snap Mutations
- `SET_SNAP_OPTION`: Sets individual snap option
- `SET_SNAP_OPTIONS`: Sets multiple snap options
- `TOGGLE_SNAP_OPTION`: Toggles individual snap option

### Camera Mutations
- `SET_CAMERA_CONFIG`: Sets camera config for specific mode
- `SET_ORTHOGRAPHIC_CAMERA`: Sets orthographic camera config
- `SET_PERSPECTIVE_CAMERA`: Sets perspective camera config

### Controls Mutations
- `SET_CONTROLS_CONFIG`: Sets controls configuration

### Reset Mutations
- `RESET_VIEWPORT_STATE`: Resets all state to defaults
- `RESET_CAMERA_POSITION`: Resets camera positions and viewport transforms

### Import/Export Mutations
- `IMPORT_VIEWPORT_STATE`: Imports serialized state with validation

## Actions

### View Mode Actions
- `setViewMode`: Sets view mode
- `toggleViewMode`: Cycles through view modes

### Layout Mode Actions
- `setLayoutMode`: Sets layout mode

### Zoom Actions
- `setZoomLevel`: Sets zoom level
- `zoomIn`: Zooms in by optional delta
- `zoomOut`: Zooms out by optional delta
- `resetZoom`: Resets zoom to default

### Pan Actions
- `setPanOffset`: Sets pan offset
- `updatePanOffset`: Updates pan offset by delta
- `resetPanOffset`: Resets pan to origin

### Grid Actions
- `setGridVisible`: Sets grid visibility
- `toggleGridVisible`: Toggles grid visibility

### Snap Actions
- `setSnapOption`: Sets individual snap option
- `setSnapOptions`: Sets multiple snap options
- `toggleSnapOption`: Toggles individual snap option

### Camera Actions
- `setCameraConfig`: Sets camera config
- `setOrthographicCamera`: Sets orthographic camera config
- `setPerspectiveCamera`: Sets perspective camera config

### Controls Actions
- `setControlsConfig`: Sets controls configuration

### Reset Actions
- `resetViewportState`: Resets all viewport state
- `resetCameraPosition`: Resets camera positions

### Complex Actions
- `fitToView`: Fits content to viewport with optional bounds

### Import/Export Actions
- `exportViewportState`: Exports serializable state
- `importViewportState`: Imports serialized state

### Persistence Actions
- `saveToLocalStorage`: Saves state to localStorage
- `loadFromLocalStorage`: Loads state from localStorage
- `clearFromLocalStorage`: Clears localStorage

## Usage Examples

### Basic View Mode Control
```javascript
// Set to 3D mode
this.$store.dispatch('viewport/setViewMode', '3d');

// Toggle view mode
this.$store.dispatch('viewport/toggleViewMode');

// Check current mode
if (this.$store.getters['viewport/is3DMode']) {
  // Handle 3D specific logic
}
```

### Zoom Control
```javascript
// Zoom in
this.$store.dispatch('viewport/zoomIn', 0.2);

// Set specific zoom level
this.$store.dispatch('viewport/setZoomLevel', 2.5);

// Reset zoom
this.$store.dispatch('viewport/resetZoom');
```

### Grid Control
```javascript
// Toggle grid visibility
this.$store.dispatch('viewport/toggleGridVisible');

// Set grid visibility
this.$store.dispatch('viewport/setGridVisible', false);

// Check grid state
if (this.$store.getters['viewport/viewportState'].gridVisible) {
  // Grid is visible
}
```

### Snap Control
```javascript
// Enable grid snapping
this.$store.dispatch('viewport/setSnapOption', { key: 'grid', value: true });

// Toggle orthogonal snapping
this.$store.dispatch('viewport/toggleSnapOption', 'orthogonal');

// Check if any snapping is enabled
if (this.$store.getters['viewport/snapEnabled']) {
  // At least one snap option is enabled
}
```

### Camera Control
```javascript
// Update orthographic camera
this.$store.dispatch('viewport/setOrthographicCamera', {
  frustumSize: 80,
  position: { x: 0, y: 100, z: 0 }
});

// Update perspective camera
this.$store.dispatch('viewport/setPerspectiveCamera', {
  fov: 75,
  position: { x: 20, y: 20, z: 20 }
});
```

### Persistence
```javascript
// Save current state
this.$store.dispatch('viewport/saveToLocalStorage');

// Load saved state
this.$store.dispatch('viewport/loadFromLocalStorage');

// Export state for project save
const viewportData = this.$store.dispatch('viewport/exportViewportState');

// Import state from project load
this.$store.dispatch('viewport/importViewportState', projectData.viewport);
```

## Component Integration

### FloorplanViewport Integration
- Watches viewport state for grid visibility changes
- Updates grid helper visibility dynamically
- Applies controls configuration changes
- Uses orthographic camera config for 2D mode

### PreviewViewport Integration  
- Watches viewport state for grid visibility changes
- Updates grid helper visibility dynamically
- Applies controls configuration changes
- Uses perspective camera config for 3D mode

### EditorLayout Integration
- Binds view mode and layout mode to UI controls
- Dispatches viewport actions based on user input
- Maps viewport state to CSS classes for layout styling

## Testing

The viewport module includes comprehensive unit tests covering:
- Default state validation
- All getters with various state combinations
- All mutations with edge cases
- All actions with parameter validation
- Import/export functionality
- Persistence operations
- Error handling scenarios

Run tests with:
```bash
npm run test:unit -- tests/unit/store/viewport.spec.js
```

## Migration Notes

When migrating from the previous editor module viewport state:

1. Update component state mappings from `editor.viewport` to `viewport` namespace
2. Update action dispatches to use `viewport/` prefix
3. Update getter access to use `viewport/` prefix
4. Remove viewport-related mutations from editor module
5. Update component watchers to use new viewport module structure

## Best Practices

1. **Use getters for computed properties**: Always access viewport state through getters for consistency
2. **Dispatch actions for state changes**: Never mutate state directly, use actions
3. **Handle view mode transitions**: Use layout mode appropriately for sync mode
4. **Validate input**: Actions include validation for view modes and layout modes
5. **Boundary checking**: Zoom levels are automatically clamped to min/max values
6. **Persistence**: Use built-in persistence actions for localStorage management
7. **Camera synchronization**: Keep camera configs in sync with view mode changes