import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, UserRole, SecurityContext, RolePermission, Action } from '../types';
import { api, getStoredToken, setStoredToken } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  securityContext: SecurityContext | null;
  permissions: RolePermission | null;
  users: User[];
  isLoading: boolean;
  sessionExpiredMessage: string | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  clearSessionExpiredMessage: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [securityContext, setSecurityContext] = useState<SecurityContext | null>(null);
  const [permissions, setPermissions] = useState<RolePermission | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const userList = await api.getUsers();
      setUsers(userList);
      return userList;
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setSecurityContext(null);
      setPermissions(null);
      setSessionExpiredMessage('Your session has expired or token is invalid. Please log in again.');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dialpulse:unauthorized', handleUnauthorized);
    }

    const initAuth = async () => {
      setIsLoading(true);
      const token = getStoredToken();

      if (token) {
        try {
          // Verify token against server
          const me = await api.getCurrentUser();
          if (me && me.user) {
            setCurrentUser(me.user);
            setSecurityContext(me.securityContext || null);
            setPermissions(me.permissions || null);
            await fetchUsers();
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // Token is invalid or expired
          setStoredToken(null);
          setCurrentUser(null);
          setSecurityContext(null);
          setPermissions(null);
          setSessionExpiredMessage('Previous session expired. Please sign in.');
        }
      }

      // If no valid session token exists, user must log in
      setCurrentUser(null);
      setSecurityContext(null);
      setPermissions(null);
      setIsLoading(false);
    };

    initAuth();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('dialpulse:unauthorized', handleUnauthorized);
      }
    };
  }, []);

  const login = async (email: string, password = 'password123') => {
    setIsLoading(true);
    setSessionExpiredMessage(null);
    try {
      const res = await api.login(email, password);
      setCurrentUser(res.user);
      setSecurityContext(res.securityContext || null);
      setPermissions(res.permissions || null);
      await fetchUsers();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setCurrentUser(null);
      setSecurityContext(null);
      setPermissions(null);
      setIsLoading(false);
    }
  };

  const refreshUsers = async () => {
    await fetchUsers();
  };

  const clearSessionExpiredMessage = () => {
    setSessionExpiredMessage(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        securityContext,
        permissions,
        users,
        isLoading,
        sessionExpiredMessage,
        login,
        logout,
        refreshUsers,
        clearSessionExpiredMessage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * usePolicy hook allows components to conditionally render UI based on the backend's SecurityContext
 * Note: Actual data enforcement happens on the backend. This is just for UI presentation.
 */
export const usePolicy = () => {
  const { securityContext, permissions } = useAuth();

  const can = useCallback((action: Action | string): boolean => {
    if (!securityContext || !permissions) return false;

    // 1. Platform Staff Override (if impersonating or platform admin)
    if (securityContext.isPlatformStaff) {
      if (['PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE', 'platform:manage', 'users:impersonate_tenant'].includes(action)) {
        return true;
      }
      if (securityContext.impersonating) {
        return true;
      }
    }

    // 2. Role Permissions check
    const actionMap: Record<string, string> = {
      'users:create': 'MANAGE_USERS',
      'users:impersonate_tenant': 'PLATFORM_IMPERSONATE',
      'leads:read': 'VIEW',
      'leads:create': 'EDIT',
      'leads:update': 'EDIT',
      'leads:reassign': 'REASSIGN',
      'leads:export': 'EXPORT',
      'leads:delete': 'DELETE',
      'leads:import': 'EDIT',
      'calls:read': 'VIEW',
      'calls:create': 'EDIT',
      'messages:create': 'EDIT',
      'compliance:update': 'MANAGE_COMPLIANCE_RULES',
      'compliance:manage': 'MANAGE_COMPLIANCE_RULES',
      'platform:manage': 'PLATFORM_ADMIN',
      'ai:use': 'EDIT',
    };

    const mappedAction = actionMap[action] || action;
    const actionsList: string[] = (permissions.actions as string[]) || (permissions as any).permissions || [];
    if (actionsList.includes('all')) return true;
    return actionsList.includes(mappedAction) || actionsList.includes(action as any);
  }, [securityContext, permissions]);

  return { can, securityContext };
};
