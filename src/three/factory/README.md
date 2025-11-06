# Factory

Scene factory helpers for constructing Three.js entities reside here.

## WallFactory

A factory class for creating parameterized walls in Three.js scenes.

### Usage

```javascript
import WallFactory from '@/three/factory/WallFactory.js';

// Create a wall with default parameters
const wall = WallFactory.create({
  start: new THREE.Vector2(0, 0),
  end: new THREE.Vector2(5, 0)
});

// Create a wall with custom parameters
const customWall = WallFactory.create({
  start: new THREE.Vector2(0, 0),
  end: new THREE.Vector2(3, 4),
  height: 3.5,
  thickness: 0.3,
  material: 'wood',
  color: 0xFF0000
});

// Update an existing wall
WallFactory.update(wall, { height: 4.0 });

// Get bounding box
const box = WallFactory.getBoundingBox(wall);
```

### Configuration

- `start` (THREE.Vector2): Starting point of the wall
- `end` (THREE.Vector2): Ending point of the wall  
- `height` (number): Wall height (default: 2.8)
- `thickness` (number): Wall thickness (default: 0.2)
- `material` (string): Material type - 'concrete', 'wood', or 'glass' (default: 'concrete')
- `color` (number): Custom color override (optional)

### Materials

- **concrete**: Gray color (0x888888), roughness: 0.8, metalness: 0.2
- **wood**: Brown color (0x8B4513), roughness: 0.9, metalness: 0.1  
- **glass**: Light blue color (0x87CEEB), roughness: 0.1, metalness: 0.0

### Features

- Automatic UV mapping with 1m texture repeat
- Proper positioning and rotation based on start/end points
- Unique UUID generation for each wall
- Runtime updates with geometry and material changes
- Bounding box calculation for collision detection
