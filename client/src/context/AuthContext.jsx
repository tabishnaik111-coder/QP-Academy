import { createContext, useContext, useEffect, useState } from "react";

import {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
} from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await getCurrentUser();

      if (data?.success && data?.user) {
        setUser(data.user);
        return data.user;
      }

      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      setIsLoading(true);

      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async ({ email, password }) => {
    const data = await loginUser({
      email,
      password,
    });

    if (!data?.success) {
      throw new Error(data?.message || "Login failed.");
    }

    const currentUser = await refreshUser();

    if (!currentUser) {
      throw new Error(
        "Login succeeded, but the session could not be restored."
      );
    }

    return currentUser;
  };

  const register = async ({
    name,
    email,
    password,
  }) => {
    const data = await registerUser({
      name,
      email,
      password,
    });

    if (!data?.success) {
      throw new Error(
        data?.message || "Registration failed."
      );
    }

    const currentUser = await refreshUser();

    if (!currentUser) {
      throw new Error(
        "Registration succeeded, but the session could not be restored."
      );
    }

    return currentUser;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        isAuthenticated: Boolean(user),
        refreshUser,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};

export default AuthContext;