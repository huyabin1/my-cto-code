# Factory

Scene factory helpers for constructing Three.js entities reside here.

## WallFactory

The `WallFactory` is a parametric factory for creating configurable wall meshes in Three.js.

### Usage

```javascript
import { WallFactory } from '@/three/factory/WallFactory';
import * as THREE from 'three';

// Create a wall from point A to point B
const wall = WallFactory({
  start: new THREE.Vector3(0, 0, 0),
  end: new THREE.Vector3(5, 0, 0),
  height: 2.8,
  thickness: 0.2,
  material: 'concrete'
});

scene.add(wall);
```

### Configuration Options

- `start` (Vector3): Starting point of the wall (default: origin)
- `end` (Vector3): Ending point of the wall (default: 1m along X-axis)
- `height` (number): Height in meters (default: 2.8m)
- `thickness` (number): Thickness in meters (default: 0.2m)
- `material` (string): Material preset - 'concrete', 'wood', or 'glass' (default: 'concrete')
- `color` (number): Optional hex color override
- `roughness` (number): Optional PBR roughness override (0-1)
- `metalness` (number): Optional PBR metalness override (0-1)

### Material Presets

The factory provides three built-in PBR material presets:

- **concrete**: Gray concrete surface (rough, non-metallic)
- **wood**: Wooden surface with natural brown tone
- **glass**: Transparent-like surface with metallic properties

### Dynamic Updates

Walls can be updated after creation without losing object references:

```javascript
// Update wall dimensions and material
wall.update({
  height: 4.0,
  thickness: 0.3,
  material: 'wood'
});

// Update just the color
wall.update({
  color: 0xff0000
});
```

### Bounding Box Queries

Get the world-space axis-aligned bounding box:

```javascript
const bbox = wall.getBoundingBox();
console.log('Min:', bbox.min);
console.log('Max:', bbox.max);
```

### UV Mapping

Wall UVs are automatically computed to repeat every meter, making it easy to apply tiled textures. The mapping respects the physical dimensions of the wall geometry.

### Metadata

Each wall stores metadata in `userData`:

```javascript
{
  type: 'wall',
  id: 'unique-uuid-v4',
  config: { /* current configuration */ }
}
```

This allows for easy identification and serialization of wall objects in the scene graph.
