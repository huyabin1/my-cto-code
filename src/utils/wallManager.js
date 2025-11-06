import { WallFactory } from '../three/factory/WallFactory';

// Global WallFactory instance
export const wallFactory = new WallFactory();

// Initialize with some default walls
export function initializeWalls(store) {
  // Create initial walls
  const wall1 = wallFactory.create({
    name: '墙体 A1',
    startX: 0,
    startZ: 0,
    endX: 10,
    endZ: 0,
    height: 3,
    thickness: 0.2,
    material: 'concrete',
    color: '#ffffff',
  });

  const wall2 = wallFactory.create({
    name: '墙体 A2',
    startX: 10,
    startZ: 0,
    endX: 10,
    endZ: 8,
    height: 3,
    thickness: 0.2,
    material: 'brick',
    color: '#ffcccc',
  });

  // Update store with initial walls
  store.dispatch('walls/setWalls', wallFactory.getAll());

  // Set first wall as active selection
  if (wall1) {
    store.dispatch('selection/setActiveObjects', [wall1.id]);
  }
}