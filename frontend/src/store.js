class Store {
  constructor() {
    this.user = null;
    this.isLoading = true;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    this.listeners.forEach((listener) => listener());
  }

  setUser(user) {
    this.user = user;
    this.emit();
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.emit();
  }
}

export const store = new Store();
