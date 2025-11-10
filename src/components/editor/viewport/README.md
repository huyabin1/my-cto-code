# Viewport Components

This directory contains viewport components for the editor.

## Components

### PreviewViewport.vue

A 3D preview viewport component that provides perspective camera viewing with orbit controls.

**Features:**
- Perspective camera with 60° FOV
- OrbitControls for mouse interaction
- View control buttons (reset, zoom in/out)
- Scene graph integration for 2D/3D synchronization
- Shadow support and multi-light setup

**Usage:**
```vue
<PreviewViewport 
  :backgroundColor="#2c3e50"
  @scene-graph-change="handleChange"
  @view-reset="handleReset"
  @zoom-change="handleZoom"
/>
```

**Props:**
- `backgroundColor` (String): Background color (default: '#2c3e50')

**Events:**
- `scene-graph-change`: Emitted when scene graph changes
- `view-reset`: Emitted when view is reset
- `zoom-change`: Emitted when zoom changes (with 'in' or 'out' parameter)

**Methods:**
- `getCamera()`: Returns the camera instance
- `getScene()`: Returns the scene instance
- `getRenderer()`: Returns the renderer instance
- `resetView()`: Resets camera to default position
- `zoomIn()`: Zooms camera in
- `zoomOut()`: Zooms camera out

For more details, see the [Viewport Integration Documentation](../../../docs/VIEWPORT_INTEGRATION.md).
