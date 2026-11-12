import { create } from 'zustand';
import { UserRole, AuthenticatedUser } from '@ledgerflow/types';

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  token: string | null;
  user: AuthenticatedUser | null;
  tenant: TenantContext | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: AuthenticatedUser, tenant: TenantContext) => void;
  logout: () => void;
}

const STORAGE_KEY_TOKEN = 'lf_access_token';
const STORAGE_KEY_USER = 'lf_user_data';
const STORAGE_KEY_TENANT = 'lf_tenant_data';

// Try to hydrate from local storage
const initialToken = localStorage.getItem(STORAGE_KEY_TOKEN);
let initialUser: AuthenticatedUser | null = null;
let initialTenant: TenantContext | null = null;

try {
  const savedUser = localStorage.getItem(STORAGE_KEY_USER);
  const savedTenant = localStorage.getItem(STORAGE_KEY_TENANT);
  if (savedUser) initialUser = JSON.parse(savedUser);
  if (savedTenant) initialTenant = JSON.parse(savedTenant);
} catch {
  // Ignore parse errors
}

// Default fallback mock session for local demo inspection if not logged in
const defaultDemoUser: AuthenticatedUser = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  email: 'admin@fintech.cl',
  role: UserRole.ADMIN,
  tenantId: 'c0a80101-0000-0000-0000-000000000001',
  firstName: 'Diego',
  lastName: 'Administrador',
};

const defaultDemoTenant: TenantContext = {
  id: 'c0a80101-0000-0000-0000-000000000001',
  name: 'FinTech Andes SpA',
  slug: 'fintech-cl',
};

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken || 'mock-demo-jwt-token',
  user: initialUser || defaultDemoUser,
  tenant: initialTenant || defaultDemoTenant,
  isAuthenticated: true,

  setSession: (token, user, tenant) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_TENANT, JSON.stringify(tenant));
    set({ token, user, tenant, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TENANT);
    set({ token: null, user: null, tenant: null, isAuthenticated: false });
  },
}));
