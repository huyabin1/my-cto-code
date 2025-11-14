/**
 * InteractionBus - Central event distribution system
 *
 * Provides a publish-subscribe pattern for event distribution between scene components
 */
export class InteractionBus {
  constructor() {
    this.subscribers = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} eventType - Type of event to subscribe to
   * @param {Function} handler - Handler function to call when event is emitted
   */
  on(eventType, handler) {
    if (!eventType || typeof handler !== 'function') {
      throw new Error('Event type and handler function are required');
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType).push(handler);

    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventType - Type of event
   * @param {Function} handler - Handler function to remove
   */
  off(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      return;
    }

    const handlers = this.subscribers.get(eventType);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.subscribers.delete(eventType);
    }
  }

  /**
   * Emit an event
   * @param {string} eventType - Type of event to emit
   * @param {*} data - Data to pass to handlers
   */
  emit(eventType, data) {
    if (!this.subscribers.has(eventType)) {
      return;
    }

    const handlers = this.subscribers.get(eventType);
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event with a one-time handler
   * @param {string} eventType - Type of event
   * @param {Function} handler - Handler function
   */
  once(eventType, handler) {
    const wrappedHandler = (data) => {
      handler(data);
      this.off(eventType, wrappedHandler);
    };

    return this.on(eventType, wrappedHandler);
  }

  /**
   * Get all subscribers for an event type
   * @param {string} eventType - Type of event
   */
  getSubscribers(eventType) {
    if (!this.subscribers.has(eventType)) {
      return [];
    }
    return this.subscribers.get(eventType).slice();
  }

  /**
   * Get all event types
   */
  getAllEventTypes() {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Clear all subscribers
   */
  clear() {
    this.subscribers.clear();
  }

  /**
   * Dispose the interaction bus
   */
  dispose() {
    this.clear();
  }
}

// Singleton instance
let sharedInteractionBus = null;

/**
 * Get or create the shared interaction bus instance
 */
export function getSharedInteractionBus() {
  if (!sharedInteractionBus) {
    sharedInteractionBus = new InteractionBus();
  }
  return sharedInteractionBus;
}

/**
 * Reset the shared interaction bus (useful for testing)
 */
export function resetSharedInteractionBus() {
  if (sharedInteractionBus) {
    sharedInteractionBus.dispose();
  }
  sharedInteractionBus = null;
}

export default InteractionBus;
