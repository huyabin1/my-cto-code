# Editor Controls

UI controls for the CAD editor live in this folder.

## DXFUpload Component

The DXFUpload component provides a user-friendly interface for importing DXF files into the editor.

### Features

- **Drag-and-drop** file upload
- **Automatic unit detection** with manual override
- **Layer visibility** management
- **Real-time status** updates during parsing
- **Error handling** with user-friendly messages

### Usage

```vue
<template>
  <div>
    <DXFUpload
      @unit-changed="handleUnitChange"
      @layers-changed="handleLayersChange"
      @data-cleared="handleDataCleared"
    />
  </div>
</template>

<script>
import DXFUpload from '@/components/editor/controls/DXFUpload.vue';

export default {
  components: {
    DXFUpload,
  },
  methods: {
    handleUnitChange(unit) {
      console.log('Unit changed to:', unit);
    },
    handleLayersChange(visibleLayers) {
      console.log('Visible layers:', visibleLayers);
    },
    handleDataCleared() {
      console.log('DXF data cleared');
    },
  },
};
</script>
```

### Events

- `unit-changed`: Fired when user changes the unit override
- `layers-changed`: Fired when layer visibility changes
- `data-cleared`: Fired when user clears the imported data

### Integration with Vuex

The component integrates tightly with the `cad` Vuex module:

- Reads `importStatus`, `importError`, `dxfLayers`, `dxfEntities` from state
- Dispatches `parseDxfFile`, `setUserUnitOverride`, `toggleDxfLayerVisibility`, `clearDxfData` actions
- Uses `effectiveUnit` and `visibleDxfLayers` getters

### Styling

The component uses Element UI components:
- `el-upload` for file selection
- `el-select` for unit override
- `el-checkbox-group` for layer visibility
- `el-progress` for loading indicator
- `el-alert` for status messages
