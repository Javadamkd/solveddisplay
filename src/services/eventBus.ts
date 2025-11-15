type Unsubscribe = () => void;

type Handler = (payload: any) => void;

class EventBus {
  private listeners: Map<string, Set<Handler>> = new Map();

  on(event: string, handler: Handler): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  emit(event: string, payload: any) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error('EventBus handler error for', event, err);
      }
    }
  }
}

export const eventBus = new EventBus();