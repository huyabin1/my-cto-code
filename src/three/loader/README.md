# Loaders

Custom loaders and asset import utilities for Three.js assets live in this folder.

## DXF Loader

The DXF loader provides a robust pipeline for importing DXF (Drawing Exchange Format) CAD files into the application.

### Features

- **Web Worker Support**: Utilizes web workers for asynchronous parsing to avoid blocking the main thread
- **Synchronous Fallback**: Gracefully falls back to synchronous parsing when workers are unavailable
- **Entity Normalization**: Converts LINE, LWPOLYLINE, ARC, and CIRCLE entities into unified polyline data
- **Arc Approximation**: Approximates circular arcs into segmented polylines based on sweep angle
- **Layer Management**: Preserves layer names and visibility from DXF files
- **Color Extraction**: Maintains AutoCAD color indices for proper rendering
- **Extent Calculation**: Computes bounding box for unit detection and view fitting

### Usage

```javascript
import DxfLoader from '@/three/loader/DxfLoader';

const loader = new DxfLoader();

// Load from File object
const result = await loader.load(file);

// Or parse content directly
const result = await loader.parseAsync(content);

// Cleanup when done
loader.dispose();
```

### Result Structure

```javascript
{
  entities: [
    {
      type: 'LINE',
      layer: 'WALLS',
      color: 1,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 100, z: 0 }
      ]
    }
  ],
  layers: [
    {
      name: 'WALLS',
      visible: true,
      entities: [...]
    }
  ],
  extent: {
    minX: 0,
    maxX: 1000,
    minY: 0,
    maxY: 1000
  },
  totalEntities: 42
}
```

### Unit Detection

The loader works with the `unitDetection` utility to automatically detect appropriate units based on file extent:

- Extent 100-50,000: millimeters (mm)
- Extent 10-5,000: centimeters (cm)
- Extent 1-500: meters (m)
- Extent 3-1,600: feet (ft)

Users can override the detected unit via the UI.

### Integration with Vuex

The DXF import pipeline integrates with the `cad` Vuex module:

1. User selects file via `DXFUpload` component
2. Component dispatches `parseDxfFile` action with file and loader
3. Store parses file, detects units, and stores normalized geometry
4. Scene components react to changes and render the imported data
5. Users can toggle layer visibility and unit overrides

### Testing

Unit tests are provided for:
- Entity normalization (LINE, LWPOLYLINE, ARC)
- Color and layer extraction
- Extent calculation
- Unit detection heuristics
- Scaling conversions
