
import React, { createContext, useState, useEffect } from 'react';

interface User {
  email: string;
  role: 'user' | 'admin';
  status: 'PENDING' | 'APPROVED' | 'BLOCKED';
  mustChangePassword?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUserInSession: (updatedUser: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const user = sessionStorage.getItem("currentUser");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  });

  const login = (user: User) => {
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    setCurrentUser(user);
  };

  const logout = () => {
    sessionStorage.removeItem("currentUser");
    setCurrentUser(null);
    window.location.hash = "#/login";
  };

  const updateUserInSession = (updatedUser: Partial<User>) => {
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedUser };
      sessionStorage.setItem("currentUser", JSON.stringify(newUser));
      setCurrentUser(newUser);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updateUserInSession }}>
      {children}
    </AuthContext.Provider>
  );
};