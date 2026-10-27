import { api } from './api.js';
import { store } from './store.js';

let initRequestId = 0;
let refreshRequestId = 0;

const initializeWorkspace = async () => {
  const workspaces = await api.listWorkspaces();
  const selectedId = api.getWorkspaceId();
  const selectedWorkspace = workspaces.find((w) => w.id === selectedId);
  if (!selectedWorkspace) {
    api.setWorkspaceId(
      workspaces.find((w) => w.is_personal)?.id ?? null,
    );
  }
};

const refreshUser = async () => {
  const requestId = ++refreshRequestId;
  try {
    const currentUser = await api.getMe();
    await initializeWorkspace();
    if (requestId === refreshRequestId) {
      store.setUser(currentUser);
    }
  } catch {
    if (requestId === refreshRequestId) {
      store.setUser(null);
      api.setWorkspaceId(null);
    }
  } finally {
    if (requestId === refreshRequestId) {
      store.setLoading(false);
    }
  }
};

export const auth = {
  get user() {
    return store.user;
  },
  get isAuthenticated() {
    return !!store.user;
  },
  get isLoading() {
    return store.isLoading;
  },
  subscribe(listener) {
    return store.subscribe(listener);
  },
  init() {
    initRequestId = ++initRequestId;
    void Promise.resolve().then(refreshUser);
    window.addEventListener('auth:expired', () => {
      store.setUser(null);
    });
  },
  async login(email, password) {
    const requestId = ++refreshRequestId;
    try {
      const res = await api.login({ email, password });
      await initializeWorkspace();
      if (requestId === refreshRequestId) {
        store.setUser(res.user);
      }
      return res.user;
    } finally {
      if (requestId === refreshRequestId) {
        store.setLoading(false);
      }
    }
  },
  async register(email, password, fullName) {
    await api.register({ email, password, full_name: fullName });
    await this.login(email, password);
  },
  async logout() {
    try {
      await api.logout();
    } finally {
      store.setUser(null);
      api.setWorkspaceId(null);
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  },
  async refreshUser() {
    await refreshUser();
  },
};
