# Project Persistence System

This document describes the project persistence system that enables saving, loading, and exporting projects in the space editor.

## Overview

The project persistence system provides comprehensive functionality for:

- **Project Serialization**: Converting the editor state to a structured JSON format
- **Auto-save**: Automatic background saving to localStorage
- **Manual Save/Load**: User-initiated project operations
- **Export**: Generating glTF and OBJ files for external use
- **Version Management**: Handling data format evolution and compatibility

## Architecture

### Core Components

1. **Project Serializer** (`src/utils/projectSerializer.js`)
   - Converts Vuex store state to/from JSON
   - Handles entity serialization from Three.js scene
   - Provides validation and migration utilities

2. **Auto-save Manager** (`src/utils/autoSave.js`)
   - Manages periodic automatic saves
   - Maintains save history in localStorage
   - Provides restore functionality

3. **Project Manager** (`src/utils/projectManager.js`)
   - Central orchestration of all persistence operations
   - Integrates with Vuex store and Three.js scene
   - Handles file I/O operations

4. **Export Utilities**
   - GLTF Exporter (`src/three/exporter/gltfExporter.js`)
   - OBJ Exporter (`src/three/exporter/objExporter.js`)

5. **UI Components**
   - ProjectPanel (`src/components/editor/ProjectPanel.vue`)

## Data Structure

### Project JSON Schema

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "Project Name",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "autoSave": {
      "saveCount": 1,
      "timestamp": "2023-01-01T00:00:00.000Z",
      "triggeredBy": "timer|manual"
    }
  },
  "scene": {
    "viewport": {
      "camera": {
        "position": [x, y, z],
        "target": [x, y, z],
        "up": [x, y, z]
      },
      "controls": {
        "target": [x, y, z],
        "autoRotate": boolean,
        "autoRotateSpeed": number
      }
    },
    "entities": [
      {
        "id": "unique-id",
        "type": "wall|measurement|entity",
        "name": "Entity Name",
        "position": [x, y, z],
        "rotation": [x, y, z],
        "scale": [x, y, z],
        "geometry": {
          "type": "BoxGeometry",
          "parameters": { ... }
        },
        "properties": { ... }
      }
    ]
  },
  "editor": {
    "drawWallToolEnabled": boolean,
    "snapping": {
      "orthogonal": boolean,
      "diagonal45": boolean,
      "grid": boolean,
      "node": boolean,
      "intersection": boolean
    },
    "materials": [...],
    "activeSelection": { ... },
    "activeTool": "distance|area|angle|null",
    "measurements": [...],
    "measurementResultsVisible": boolean,
    "commandStackInfo": { ... }
  },
  "cad": {
    "layers": [...],
    "opacity": number,
    "importStatus": "idle|processing|success|error",
    "lastImportedFile": "filename.dxf",
    "selectedUnit": "auto|mm|cm|m|ft"
  }
}
```

## Usage

### Basic Operations

#### Saving a Project

```javascript
import { createProjectManager } from '@/utils/projectManager';

const projectManager = createProjectManager(store, threeScene);
await projectManager.saveProject('my-project.json');
```

#### Loading a Project

```javascript
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];
await projectManager.loadProject(file);
```

#### Exporting to glTF

```javascript
// Export entire scene
await projectManager.exportToGLTF({ binary: false });

// Export only walls
await projectManager.exportToGLTF({ 
  binary: true, 
  wallsOnly: true,
  filename: 'walls.glb'
});
```

#### Exporting to OBJ

```javascript
// Export with materials
await projectManager.exportToOBJ({ 
  includeMaterials: true,
  filename: 'model.obj'
});

// Export only walls
await projectManager.exportToOBJ({ 
  wallsOnly: true,
  includeMaterials: false
});
```

### Auto-save Configuration

The auto-save system automatically saves every 30 seconds to localStorage. It maintains up to 5 recent saves and can restore from any of them.

```javascript
// Enable/disable auto-save
projectManager.autoSaveManager.setEnabled(true);

// Force immediate save
await projectManager.autoSaveManager.forceSave();

// Get save history
const history = projectManager.getAutoSaveHistory();

// Restore from specific save
await projectManager.restoreFromAutoSave(0); // 0 = most recent
```

## Entity Serialization

### Wall Entities

```javascript
{
  "id": "wall-123",
  "type": "wall",
  "name": "Living Room Wall",
  "material": "concrete",
  "color": "#ffffff",
  "position": [0, 0, 0],
  "rotation": [0, 0, 0],
  "scale": [1, 1, 1],
  "geometry": {
    "type": "BoxGeometry",
    "parameters": {
      "width": 5.0,
      "height": 2.8,
      "depth": 0.2
    }
  }
}
```

### Measurement Entities

```javascript
{
  "id": "meas-456",
  "type": "measurement",
  "name": "Room Length",
  "measurementType": "distance",
  "points": [[0, 0, 0], [5, 0, 0]],
  "result": 5.0,
  "unit": "m",
  "position": [2.5, 0, 0],
  "rotation": [0, 0, 0],
  "scale": [1, 1, 1]
}
```

## Version Compatibility

### Migration Strategy

The system includes built-in migration support for handling data format changes:

```javascript
import { migrateProject } from '@/utils/projectSerializer';

// Migrate from version 0.9.0 to 1.0.0
const migratedProject = migrateProject(oldProject, '0.9.0', '1.0.0');
```

### Compatibility Rules

- **Major Version Changes**: Require explicit migration
- **Minor Version Changes**: Generally backward compatible
- **Patch Version Changes**: Always backward compatible

## Export Formats

### glTF Export Options

- **Binary Format (.glb)**: Compressed, single file
- **Text Format (.gltf)**: Human-readable, separate assets
- **Walls Only**: Export only wall entities
- **Include Measurements**: Include measurement tools in export

### OBJ Export Options

- **Include Materials**: Generate accompanying .mtl file
- **Walls Only**: Export only wall entities
- **Include Measurements**: Include measurement tools
- **Optimize Geometries**: Pre-calculate bounds for better performance

## Testing

The persistence system includes comprehensive test coverage:

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Validation Tests**: Data integrity verification
- **Export Tests**: File generation verification

### Running Tests

```bash
# Run all tests
npm run test:unit

# Run specific test file
npm run test:unit -- tests/unit/projectSerializer.spec.js

# Run exporter tests
npm run test:unit -- tests/unit/exporter/
```

## Error Handling

### Common Error Scenarios

1. **Invalid Project File**
   - Validation fails during load
   - User receives clear error message
   - System remains in stable state

2. **Export Failures**
   - Scene validation errors
   - Three.js export errors
   - File system errors

3. **Auto-save Failures**
   - localStorage quota exceeded
   - Serialization errors
   - Graceful degradation

### Error Recovery

The system implements multiple recovery mechanisms:

- **Auto-save Restore**: Automatic restoration on startup
- **Manual Recovery**: User can select from save history
- **Fallback States**: Safe default configurations

## Performance Considerations

### Serialization Performance

- **Incremental Updates**: Only serialize changed entities
- **Lazy Loading**: Load entities on demand
- **Compression**: Compress large project files

### Storage Optimization

- **Auto-save Rotation**: Limit number of stored saves
- **Cleanup Routines**: Remove obsolete data
- **Quota Management**: Handle localStorage limits

## Security Considerations

### Data Validation

- **Schema Validation**: Verify data structure
- **Type Checking**: Ensure data type consistency
- **Range Validation**: Check value bounds

### File Security

- **Content Type Validation**: Verify file types
- **Size Limits**: Prevent oversized uploads
- **Sanitization**: Clean user input

## Future Enhancements

### Planned Features

1. **Cloud Storage Integration**
   - Save to cloud services
   - Collaborative editing
   - Version history

2. **Advanced Export Options**
   - Animation support
   - Custom material properties
   - LOD generation

3. **Performance Optimizations**
   - WebWorker serialization
   - Streaming exports
   - Progressive loading

### Extension Points

The system is designed to be extensible:

- **Custom Entity Types**: Add new entity serializers
- **Export Formats**: Support additional file formats
- **Storage Backends**: Implement different storage mechanisms

## Troubleshooting

### Common Issues

1. **Auto-save Not Working**
   - Check localStorage availability
   - Verify browser privacy settings
   - Clear corrupted save data

2. **Export Fails**
   - Validate scene structure
   - Check Three.js compatibility
   - Verify material definitions

3. **Load Errors**
   - Validate JSON format
   - Check version compatibility
   - Verify file integrity

### Debug Tools

- **Console Logging**: Detailed operation logging
- **Validation Reports**: Comprehensive error reporting
- **Performance Metrics**: Operation timing data

## API Reference

### ProjectSerializer

- `serializeProject(state)`: Convert state to JSON
- `deserializeProject(data)`: Convert JSON to state updates
- `validateProject(data)`: Validate project structure
- `migrateProject(data, fromVersion, toVersion)`: Migrate between versions

### AutoSaveManager

- `start()`: Begin auto-save timer
- `stop()`: Stop auto-save timer
- `forceSave()`: Immediate save operation
- `getAutoSaveHistory()`: Retrieve save history
- `restoreFromAutoSave(index)`: Restore specific save

### ProjectManager

- `saveProject(filename)`: Save project to file
- `loadProject(file)`: Load project from file
- `exportToGLTF(options)`: Export to glTF format
- `exportToOBJ(options)`: Export to OBJ format
- `createNewProject(name)`: Create new project
- `restoreFromAutoSave(index)`: Restore auto-save

## Conclusion

The project persistence system provides a robust foundation for saving, loading, and exporting editor projects. It's designed with extensibility, performance, and user experience in mind, ensuring reliable operation across different use cases and environments.