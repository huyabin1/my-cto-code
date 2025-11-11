# Object Explorer Panel

## Overview

The Object Explorer panel provides a hierarchical view of all entities in the 3D editor, enabling users to:
- View and navigate all objects organized by type
- Select objects for editing
- Toggle visibility of individual objects
- Lock/unlock objects to prevent accidental editing
- Delete, rename, or duplicate objects via context menu
- Synchronize selection with the canvas

## Architecture

### Component Location
`src/components/editor/panels/ObjectExplorer.vue`

### Integration
The ObjectExplorer is integrated into the EditorLayout sidebar, positioned between the MeasurementPanel and PropertyPanel for convenient access.

## Features

### 1. Hierarchical Tree View
- Entities are grouped by type (walls, doors, windows, measurements, etc.)
- Each group shows the count of child entities
- Groups are expanded by default for easy access
- Uses Element UI Tree component for rich interaction

### 2. Entity Selection
- Click any entity node to select it in the editor
- Selected entities are highlighted in the tree
- Selection synchronizes bidirectionally with canvas
- Locked entities cannot be selected (shows warning message)

### 3. Visibility Control
- Each entity has a checkbox to toggle visibility
- Visibility changes immediately update the canvas
- Emits `visibility-changed` event for canvas integration
- Changes persist in the Vuex store

### 4. Lock/Unlock
- Lock icon button appears on hover for each entity
- Locked entities:
  - Display a lock icon
  - Cannot be selected
  - Have grayed-out visibility checkbox
- Lock state persists in the entity properties

### 5. Context Menu
Right-click on any entity to access:
- **Delete**: Remove the entity with confirmation dialog
- **Lock/Unlock**: Toggle lock state
- **Rename**: Change entity name via prompt dialog
- **Duplicate**: Copy entity (coming soon)

### 6. Batch Operations
- Delete button in header when entities are selected
- Supports multi-entity deletion with confirmation

## State Management

### Vuex Store Binding

**editor module:**
```javascript
state: {
  entities: [],      // Array of all entities
  selection: {       // Current selection state
    ids: [],
    primaryId: null,
    mode: 'none' | 'single' | 'multi'
  }
}
```

**cad module:**
```javascript
state: {
  layers: []        // Array of CAD layers
}
```

### Entity Properties
Each entity supports:
- `id`: Unique identifier
- `name`: Display name
- `type`: Entity type (wall, door, window, etc.)
- `visible`: Visibility flag (default: true)
- `locked`: Lock flag (default: false)
- `layer`: Optional layer assignment

## Testing

Comprehensive unit tests cover:
- Component rendering with/without entities
- Tree data generation and grouping
- Entity selection and synchronization
- Visibility toggle behavior
- Lock/unlock functionality
- Delete operations with confirmation
- Context menu interactions
- All helper methods and computed properties

Run tests:
```bash
npm run test:unit -- ObjectExplorer.spec.js
```

## Usage Example

```vue
<template>
  <ObjectExplorer 
    @visibility-changed="handleVisibilityChange"
  />
</template>

<script>
export default {
  methods: {
    handleVisibilityChange({ entityId, visible }) {
      // Update 3D scene based on visibility change
      const object = this.scene.getObjectById(entityId);
      if (object) {
        object.visible = visible;
      }
    }
  }
}
</script>
```

## Future Enhancements

1. **Duplicate Entity**: Complete the duplicate functionality
2. **Drag & Drop**: Reorder entities or move between groups
3. **Layer-based Grouping**: Alternative grouping by layer instead of type
4. **Search/Filter**: Search entities by name or filter by type
5. **Bulk Operations**: Select multiple entities with checkboxes
6. **Custom Icons**: Entity-specific icons based on subtypes
7. **Property Preview**: Show key properties in tree nodes
8. **Export Selection**: Export selected entities only

## Styling

The component uses scoped styles with:
- Consistent spacing with sidebar blocks
- Hover effects for better interactivity
- Element UI theme integration
- Responsive tree container with max-height
- Visual feedback for selected/locked/hidden states

## Accessibility

- Keyboard navigation via Element UI Tree
- Clear visual indicators for states
- Confirmation dialogs for destructive actions
- Meaningful aria labels (inherited from Element UI)
