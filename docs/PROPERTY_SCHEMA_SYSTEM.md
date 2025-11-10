# Property Schema System Documentation

## Overview

The Property Schema System is a data-driven architecture for managing property panels that support multiple entity types. It provides a flexible, extensible, and maintainable way to define, render, and validate properties for different types of elements in the CAD application.

## Architecture

### Core Components

1. **Schema Definitions** (`src/components/editor/properties/`)
   - `walls.js` - Wall entity property schema
   - `doors.js` - Door entity property schema  
   - `windows.js` - Window entity property schema
   - `measurements.js` - Measurement entity property schema
   - `index.js` - Schema registry and exports

2. **Field Components** (`src/components/editor/properties/fields/`)
   - `PropertyFieldText.vue` - Text input field
   - `PropertyFieldSelect.vue` - Dropdown select field
   - `PropertyFieldNumber.vue` - Numeric input field
   - `PropertyFieldColor.vue` - Color picker field
   - `PropertyFieldCheckbox.vue` - Checkbox field
   - `index.js` - Field component registry
   - `_styles.scss` - Shared SCSS styles

3. **Renderer Components**
   - `PropertyRenderer.vue` - Dynamic property rendering engine
   - `PropertyPanel.vue` - Main property panel component (refactored)

## Schema Structure

### Basic Schema Format

```javascript
export const exampleSchema = {
  type: 'entityType',           // Entity type identifier
  title: '属性标题',            // Display title for the property panel
  fields: [                     // Array of field definitions
    {
      key: 'propertyName',      // Property key in entity data
      label: '显示标签',        // Human-readable label
      type: 'fieldType',        // Field component type
      // Field-specific properties
      // Validation rules
    }
  ]
};
```

### Field Types

#### 1. Text Field
```javascript
{
  key: 'name',
  label: '名称',
  type: 'text',
  placeholder: '输入名称',
  validation: {
    required: true,
    minLength: 1,
    maxLength: 50,
  },
}
```

#### 2. Select Field
```javascript
{
  key: 'material',
  label: '材料',
  type: 'select',
  options: [
    { label: '混凝土', value: 'concrete' },
    { label: '砖', value: 'brick' },
  ],
  validation: {
    required: true,
  },
}
```

#### 3. Number Field
```javascript
{
  key: 'height',
  label: '高度',
  type: 'number',
  unit: 'm',
  min: 0.1,
  max: 10,
  step: 0.1,
  validation: {
    required: true,
    min: 0.1,
    max: 10,
  },
}
```

#### 4. Color Field
```javascript
{
  key: 'color',
  label: '颜色',
  type: 'color',
  validation: {
    required: true,
    pattern: /^#[0-9A-Fa-f]{6}$/,
  },
}
```

#### 5. Checkbox Field
```javascript
{
  key: 'visible',
  label: '可见',
  type: 'checkbox',
  checkboxLabel: '显示元素',
  default: true,
}
```

## Validation System

### Validation Rules

Each field can define validation rules that are automatically enforced:

- **required**: Field must have a value
- **minLength**: Minimum string length (text fields)
- **maxLength**: Maximum string length (text fields)
- **min**: Minimum numeric value (number fields)
- **max**: Maximum numeric value (number fields)
- **pattern**: Regular expression pattern (text/color fields)

### Validation Flow

1. **Input Validation**: Real-time validation during user input
2. **Blur Validation**: Final validation when field loses focus
3. **Error Display**: Error messages shown below fields
4. **Visual Feedback**: Error states highlighted in UI

## Multi-Selection Support

The system supports selecting and editing multiple entities simultaneously:

### Aggregation Logic

- **Same Values**: Field shows the common value and is editable
- **Different Values**: Field shows null/empty and is disabled
- **Mixed Selection**: Only fields common to all entity types are shown

### Multi-Select UI

- Alert banner showing selection count
- Disabled fields for conflicting values
- Batch updates applied to all selected entities

## Schema Registry

### Registration

```javascript
import { registerSchema } from '@/components/editor/properties';

const customSchema = {
  type: 'custom',
  title: '自定义属性',
  fields: [/* ... */],
};

registerSchema('custom', customSchema);
```

### Retrieval

```javascript
import { getSchema, hasSchema, getSchemaTypes } from '@/components/editor/properties';

// Check if schema exists
if (hasSchema('wall')) {
  // Get schema
  const schema = getSchema('wall');
}

// Get all available types
const types = getSchemaTypes(); // ['wall', 'door', 'window', 'measurement']
```

## Integration with Vuex Store

### Property Updates

Property changes are handled through the Vuex store with command pattern support:

```javascript
// Automatic dispatch through PropertyRenderer
await this.$store.dispatch('editor/updateProperties', {
  entityId: 'entity-id',
  property: 'material',
  newValue: 'brick',
  oldValue: 'concrete',
});
```

### Command Pattern Integration

- **Undo/Redo Support**: All property changes can be undone
- **History Tracking**: Changes recorded in command stack
- **Batch Operations**: Multi-select changes grouped as single command

## Styling System

### SCSS Architecture

- **Base Styles**: Common field styles in `_styles.scss`
- **Component Styles**: Component-specific styles in each Vue file
- **Theme Variables**: Consistent design tokens across fields
- **Responsive Design**: Mobile-friendly field layouts

### Style Customization

```scss
// Custom field appearance
.property-field {
  .el-input__inner {
    border-radius: 4px;
    border: 1px solid #d1d5db;
  }
  
  &.has-error {
    .field-label {
      color: #ef4444;
    }
  }
}
```

## Testing Strategy

### Unit Tests Coverage

1. **Schema Registry Tests**
   - Schema registration and retrieval
   - Type validation
   - Schema overrides

2. **Field Component Tests**
   - Rendering correctness
   - Input handling
   - Validation logic
   - Error states

3. **PropertyRenderer Tests**
   - Schema-based rendering
   - Multi-select behavior
   - Property updates
   - Error handling

4. **PropertyPanel Tests**
   - Selection state management
   - Component integration
   - Event handling

### Test Structure

```
tests/unit/components/editor/properties/
├── SchemaRegistry.spec.js
├── WallSchema.spec.js
├── PropertyFieldComponents.spec.js
├── PropertyRenderer.spec.js
└── PropertyPanel.spec.js
```

## Usage Examples

### Adding a New Entity Type

1. **Create Schema Definition**

```javascript
// src/components/editor/properties/furniture.js
export const furnitureSchema = {
  type: 'furniture',
  title: '家具属性',
  fields: [
    {
      key: 'name',
      label: '名称',
      type: 'text',
      validation: { required: true, maxLength: 50 },
    },
    {
      key: 'category',
      label: '类别',
      type: 'select',
      options: [
        { label: '椅子', value: 'chair' },
        { label: '桌子', value: 'table' },
      ],
      validation: { required: true },
    },
  ],
};
```

2. **Register Schema**

```javascript
// src/components/editor/properties/index.js
import { furnitureSchema } from './furniture';
schemas.set('furniture', furnitureSchema);
```

3. **Create Entity**

```javascript
const furniture = {
  id: 'furniture-1',
  type: 'furniture',
  name: '办公椅',
  category: 'chair',
};
```

### Custom Field Component

1. **Create Component**

```vue
<template>
  <div class="property-field">
    <label>{{ field.label }}</label>
    <custom-input v-model="localValue" @input="handleInput" />
  </div>
</template>

<script>
export default {
  name: 'PropertyFieldCustom',
  props: ['field', 'value'],
  // ... component logic
};
</script>
```

2. **Register Component**

```javascript
// src/components/editor/properties/fields/index.js
import PropertyFieldCustom from './PropertyFieldCustom.vue';

export const fieldComponents = {
  // ... existing components
  custom: PropertyFieldCustom,
};
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Schema definitions loaded on demand
2. **Component Caching**: Field components reused across entities
3. **Validation Debouncing**: Input validation debounced for performance
4. **Virtual Scrolling**: Large property lists use virtual scrolling

### Memory Management

- **Schema Cleanup**: Unused schemas can be unregistered
- **Component Disposal**: Proper cleanup of field components
- **Event Listener Management**: Automatic cleanup of event listeners

## Future Enhancements

### Planned Features

1. **Conditional Fields**: Fields shown/hidden based on other field values
2. **Custom Validators**: User-defined validation functions
3. **Field Groups**: Logical grouping of related fields
4. **Templates**: Reusable field configuration templates
5. **Internationalization**: Multi-language support for labels and messages

### Extension Points

- **Custom Field Types**: Plugin system for new field components
- **Validation Extensions**: Custom validation rule system
- **Theme System**: Customizable UI themes for property panels
- **Export/Import**: Schema definition export/import functionality

## Troubleshooting

### Common Issues

1. **Schema Not Found**
   - Check schema registration in `index.js`
   - Verify entity type matches schema type
   - Ensure proper import of schema definitions

2. **Validation Not Working**
   - Check validation rule format
   - Verify field component implements validation
   - Check for JavaScript errors in console

3. **Multi-Select Issues**
   - Verify entity types are compatible
   - Check field aggregation logic
   - Ensure proper entity selection state

### Debug Tools

- **Vue DevTools**: Inspect component state and props
- **Console Logging**: Built-in logging for field changes
- **Schema Inspector**: Development tool for schema validation

## Conclusion

The Property Schema System provides a robust foundation for managing entity properties in the CAD application. Its data-driven approach ensures maintainability, extensibility, and consistency across different entity types while supporting advanced features like multi-selection and validation.