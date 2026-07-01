import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure Axios defaults
axios.defaults.baseURL = import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStationId, setActiveStationId] = useState(() => {
    return localStorage.getItem('ecos_active_station_id') || '';
  });

  useEffect(() => {
    // Load auth from localStorage on boot
    const savedToken = localStorage.getItem('ecos_token');
    const savedUser = localStorage.getItem('ecos_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      // 1. Try real backend first
      const response = await axios.post('/api/auth/login', { email, password });
      const { token: apiToken, user: apiUser } = response.data;

      localStorage.setItem('ecos_token', apiToken);
      localStorage.setItem('ecos_user', JSON.stringify(apiUser));
      setToken(apiToken);
      setUser(apiUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      console.warn("Backend login failed, attempting local fallback/mock validation...", error);

      // 2. Demo mode fallback: if backend is not running, allow mock login for presentation
      const mockUsers = [
        {
          id: 1,
          name: "Dr. Amine Bensaid",
          email: "admin@um6ss.ma",
          role: "super_admin"
        },
        {
          id: 2,
          name: "Dr. Sofia Alami",
          email: "examiner@um6ss.ma",
          role: "admin_examiner"
        },
        {
          id: 3,
          name: "Yassine Filali",
          email: "yassine.filali@student.um6ss.ma",
          role: "student",
          student_profile: { id: 101, user_id: 3, matricule: "DENT-2026-042" }
        }
      ];

      const foundMock = mockUsers.find(u => u.email === email && password === "password");

      if (foundMock) {
        const mockToken = "mock_token_" + foundMock.role + "_" + Date.now();
        localStorage.setItem('ecos_token', mockToken);
        localStorage.setItem('ecos_user', JSON.stringify(foundMock));
        setToken(mockToken);
        setUser(foundMock);
        axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { 
        success: false, 
        message: error.response?.data?.message || "Identifiants invalides (ou tapez 'password' pour le mode démo)." 
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.log("Logout api error (or offline)", e);
    }
    localStorage.removeItem('ecos_token');
    localStorage.removeItem('ecos_user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const selectStation = (stationId) => {
    setActiveStationId(stationId);
    if (stationId) {
      localStorage.setItem('ecos_active_station_id', stationId);
    } else {
      localStorage.removeItem('ecos_active_station_id');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      login, 
      logout,
      activeStationId,
      selectStation
    }}>
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
