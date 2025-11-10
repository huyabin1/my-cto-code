# Properties Directory

This directory contains the property schema system for the CAD application.

## Structure

```
properties/
├── index.js              # Schema registry and exports
├── walls.js              # Wall entity schema
├── doors.js              # Door entity schema  
├── windows.js            # Window entity schema
├── measurements.js       # Measurement entity schema
├── PropertyRenderer.vue   # Dynamic property rendering component
└── fields/               # Field component library
    ├── index.js          # Field component registry
    ├── _styles.scss      # Shared field styles
    ├── PropertyFieldText.vue
    ├── PropertyFieldSelect.vue
    ├── PropertyFieldNumber.vue
    ├── PropertyFieldColor.vue
    └── PropertyFieldCheckbox.vue
```

## Usage

```javascript
// Get schema for entity type
import { getSchema } from '@/components/editor/properties';
const schema = getSchema('wall');

// Render properties dynamically
<PropertyRenderer :entity="selectedEntity" :selected-entities="selectedEntities" />
```

## Adding New Entity Types

1. Create schema file in this directory
2. Register schema in `index.js`
3. Add entity type labels to `PropertyPanel.vue`
4. Create unit tests

See `docs/PROPERTY_SCHEMA_SYSTEM.md` for detailed documentation.