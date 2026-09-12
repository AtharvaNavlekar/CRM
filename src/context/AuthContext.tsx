import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { api, getStoredToken, setStoredToken } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  sessionExpiredMessage: string | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  updateCurrentRole: (role: UserRole) => Promise<void>;
  showRoleSelector: boolean;
  setShowRoleSelector: (show: boolean) => void;
  refreshUsers: () => Promise<void>;
  clearSessionExpiredMessage: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
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
            await fetchUsers();
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // Token is invalid or expired
          setStoredToken(null);
          setCurrentUser(null);
          setSessionExpiredMessage('Previous session expired. Please sign in.');
        }
      }

      // If no valid session token exists, user must log in
      setCurrentUser(null);
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
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setCurrentUser(res.user);
      await fetchUsers();
    } catch (e: any) {
      console.error('Failed to switch user:', e);
      throw e;
    }
  };

  const updateCurrentRole = async (role: UserRole) => {
    if (!currentUser) return;
    try {
      const res = await api.switchUser(currentUser.id, role);
      setCurrentUser(res.user);
      await fetchUsers();
    } catch (e: any) {
      console.error('Failed to switch role:', e);
      throw e;
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
        users,
        isLoading,
        sessionExpiredMessage,
        login,
        logout,
        switchUser,
        updateCurrentRole,
        showRoleSelector,
        setShowRoleSelector,
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
