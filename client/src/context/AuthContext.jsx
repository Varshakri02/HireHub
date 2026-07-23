// Auth state: current user + token, restored from localStorage on load.
import { createContext, useContext, useEffect, useState } from "react";
import api from "../api.js";
import { connectSocket, disconnectSocket } from "../socket.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token, verify it and load the user.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => {
        setUser(r.data.user);
        connectSocket();
      })
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  function login(token, userObj) {
    localStorage.setItem("token", token);
    setUser(userObj);
    connectSocket();
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    disconnectSocket();
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
