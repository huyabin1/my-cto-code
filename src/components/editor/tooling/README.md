# Tooling Components

This directory contains the toolbar UI components for the editor.

## Components

### EditorToolbar.vue
Top navigation bar that provides global actions and view controls:
- Project operations (New, Open, Save)
- Undo/Redo controls with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- View mode toggles (2D, 3D, Sync)
- Project title display
- Integration with Vuex for command stack state

**Events:**
- `new-project` - Triggered when creating a new project
- `open-project` - Triggered when opening a project
- `save-project` - Triggered when saving a project
- `undo` - Triggered when undo is requested
- `redo` - Triggered when redo is requested

**Keyboard Shortcuts:**
- `Ctrl+N` - New project
- `Ctrl+O` - Open project
- `Ctrl+S` - Save project
- `Ctrl+Z` - Undo
- `Ctrl+Y` or `Ctrl+Shift+Z` - Redo

### ToolPalette.vue
Left-side vertical tool palette for tool selection:
- Select tool (V)
- Wall drawing tool (W)
- Door/Window tools (D/N) - Placeholders for future implementation
- Measurement tools (M/A/G) - Distance, Area, Angle
- Layer panel toggle (L)
- Object explorer toggle (O)

**Events:**
- `toggle-layer-panel` - Emitted when layer button is clicked
- `toggle-object-explorer` - Emitted when object explorer button is clicked

**Keyboard Shortcuts:**
- `V` - Select tool
- `W` - Wall tool
- `M` - Distance measurement
- `A` - Area measurement
- `G` - Angle measurement
- `L` - Toggle layer panel
- `O` - Toggle object explorer

**Vuex Integration:**
- Syncs with `editor.drawWallToolEnabled` for wall tool state
- Syncs with `editor.activeTool` for measurement tool state
- Dispatches `setDrawWallTool` and `setActiveTool` actions

## Integration

Both components are integrated into `EditorLayout.vue`:

```vue
<EditorToolbar
  @new-project="handleNewProject"
  @open-project="handleOpenProject"
  @save-project="handleSaveProject"
  @undo="handleUndo"
  @redo="handleRedo"
/>

<ToolPalette
  @toggle-layer-panel="handleToggleLayerPanel"
  @toggle-object-explorer="handleToggleObjectExplorer"
/>
```

## Internationalization

Components include placeholder support for i18n with fallback Chinese text. The `translate()` helper method checks for `$t` function and falls back to default text if not available.

## Testing

Unit tests are provided in `tests/unit/components/editor/tooling/`:
- `EditorToolbar.spec.js` - Tests toolbar rendering, button states, events, and view mode actions
- `ToolPalette.spec.js` - Tests tool button rendering, tool selection, and event emissions
