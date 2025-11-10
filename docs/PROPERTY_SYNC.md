# Entity Property Sync System

## Overview

The Entity Property Sync System enables real-time synchronization of entity properties (like height, thickness, material) with corresponding 3D geometry updates. It integrates with the command system to provide full undo/redo support for all property changes.

## Architecture

### Key Components

1. **UpdateEntityPropertyCommand** (`src/three/command/EntityPropertyCommands.js`)
   - Implements the Command pattern for property updates
   - Handles geometry recalculation through factory methods
   - Supports undo/redo with command merging
   - Integrates with SceneGraph for viewport synchronization

2. **Editor Store Module** (`src/store/modules/editor.js`)
   - Maintains entity data in state
   - Provides mutations for entity management:
     - `ADD_ENTITY`: Add new entity
     - `REMOVE_ENTITY`: Remove entity
     - `UPDATE_ENTITY_PROPERTY`: Update single property
     - `SET_COMMAND_STACK`: Store reference to command stack
   - Provides actions:
     - `addEntity`: Add entity via action
     - `removeEntity`: Remove entity via action
     - `setCommandStack`: Initialize command stack reference
     - `updateProperties`: Execute property update with undo/redo support

3. **SceneGraph Integration** (`src/three/core/SceneGraph.js`)
   - Maintains entity registry with metadata
   - Provides `updateEntity()` method for property sync
   - Notifies observers on changes for real-time viewport updates

4. **WallFactory** (`src/three/factory/WallFactory.js`)
   - `update()` method for geometry recalculation
   - Supports property changes: height, thickness, material, color
   - Handles geometry disposal and recreation

## Workflow

### Property Update Flow

```
User Input (PropertyPanel)
    ↓
updateProperties Action
    ↓
UpdateEntityPropertyCommand
    ↓
├─ Update entity in store
├─ Call WallFactory.update() for geometry recalculation
├─ Update SceneGraph
└─ Trigger viewport refresh
    ↓
CommandStack (Undo/Redo)
```

### Data Sync Path

```
Store (entities array)
    ↓
SceneGraph (entity registry)
    ↓
Three.js Scene (3D objects)
    ↓
Viewports (2D/3D/Sync)
```

## Usage

### Store Actions

```javascript
// Update entity property with undo/redo support
await this.$store.dispatch('editor/updateProperties', {
  entityId: 'wall-1',
  property: 'height',
  newValue: 3.5,
  oldValue: 2.8 // optional, inferred if not provided
});
```

### Direct Command Execution

```javascript
import { UpdateEntityPropertyCommand } from '@/three/command/EntityPropertyCommands';

const command = new UpdateEntityPropertyCommand(
  store,
  entityId,
  property,
  newValue,
  oldValue
);

await commandStack.execute(command);
```

### Adding Entities to Store

```javascript
await this.$store.dispatch('editor/addEntity', {
  id: 'wall-1',
  type: 'wall',
  name: 'Test Wall',
  height: 2.8,
  thickness: 0.2,
  material: 'concrete',
  color: 0x888888
});
```

## Supported Properties

The system supports the following entity properties:

- **height**: Wall height in meters
- **thickness**: Wall thickness in meters
- **material**: Material type (concrete, wood, brick, drywall)
- **color**: Wall color as hexadecimal number (0xRRGGBB)

## Command Merging

Compatible commands are automatically merged to reduce command stack size:

- Multiple consecutive height changes on the same entity merge into one command
- The old value from the first command and new value from the last are preserved
- Undo/redo restore to the original state correctly

## Error Handling

The system handles various error scenarios:

1. **Missing Entity**: Throws error during command creation
2. **Failed Geometry Update**: Logs error but continues (store is updated)
3. **Missing Three.js Object**: Updates store only (graceful degradation)
4. **Factory Errors**: Caught and logged, operation continues

## Integration with UI

### PropertyPanel Component

The PropertyPanel can integrate with the property sync system:

```vue
<template>
  <div class="property-field">
    <label>Wall Height</label>
    <el-input v-model="wallHeight" type="number" @change="updateHeight" />
  </div>
</template>

<script>
export default {
  methods: {
    async updateHeight() {
      await this.$store.dispatch('editor/updateProperties', {
        entityId: this.selectedEntityId,
        property: 'height',
        newValue: parseFloat(this.wallHeight)
      });
    }
  }
};
</script>
```

## Testing

Comprehensive test suites are provided:

### Test Files
- `tests/unit/command/EntityPropertyCommands.spec.js`: Unit tests for command
- `tests/unit/store/editor.spec.js`: Unit tests for store actions
- `tests/unit/EntityPropertySync.spec.js`: Integration tests

### Test Coverage
- Property updates and undo/redo
- Geometry recalculation verification
- SceneGraph synchronization
- Command merging
- Error handling
- Multiple entity support
- Batch operations
- History tracking

## Performance Considerations

1. **Command Merging**: Reduces command stack size for rapid property changes
2. **Lazy Geometry Update**: Geometry only updated when necessary
3. **SceneGraph Subscription**: Efficient observer pattern for viewport updates
4. **Three.js Disposal**: Proper cleanup of geometry/materials on update

## Future Enhancements

1. **Property Validation**: Add validators for property values
2. **Batch Updates**: Support for multiple property changes in single command
3. **Undo/Redo Grouping**: Group related operations together
4. **Diff Tracking**: Track what changed for more efficient updates
5. **Persistence**: Auto-save property changes to localStorage
6. **Animation**: Smooth transitions for property changes

## Troubleshooting

### Properties Not Updating in 3D View
- Verify CommandStack is initialized: `store.state.editor.commandStack !== null`
- Check SceneGraph has entity: `sceneGraph.getEntity(entityId) !== undefined`
- Verify Three.js object exists and is in scene

### Undo/Redo Not Working
- Ensure `setCommandStack` action was called to initialize store reference
- Check CommandStack is properly subscribed to events
- Verify commands are being executed through CommandStack, not directly

### Geometry Not Recalculating
- Verify entity type is 'wall' (only walls trigger factory update)
- Check property is in supported list: height, thickness, material, color
- Verify WallFactory.update() is not throwing errors
