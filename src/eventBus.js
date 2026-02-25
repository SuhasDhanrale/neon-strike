// Simple event bus for module communication without circular imports

const listeners = {}

export const EventBus = {
  on(event, fn) {
    (listeners[event] ??= []).push(fn)
  },
  
  once(event, fn) {
    const wrapper = (...args) => {
      fn(...args)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  },
  
  off(event, fn) {
    listeners[event] = (listeners[event] || []).filter(f => f !== fn)
  },
  
  emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data))
  }
}
