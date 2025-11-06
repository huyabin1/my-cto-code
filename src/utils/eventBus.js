import Vue from 'vue';

/**
 * Simple event bus implementation for component communication
 */
export const EventBus = new Vue();

/**
 * Event constants for wall drawing operations
 */
export const WALL_EVENTS = {
  PREVIEW: 'wall:preview',
  COMMIT: 'wall:commit',
  UNDO: 'wall:undo',
  SNAP: 'wall:snap',
};