import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure Axios defaults — dynamically compute subfolder path if hosted in XAMPP subdirectory
const getBaseURL = () => {
  const path = window.location.pathname;
  const publicIndex = path.indexOf('/public');
  if (publicIndex !== -1) {
    return path.substring(0, publicIndex + 7); // returns "/ecos-app/public"
  }
  return '';
};
axios.defaults.baseURL = getBaseURL();

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

    // Intercept 401 Unauthorized API responses to log out invalid/expired sessions
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('ecos_token');
          localStorage.removeItem('ecos_user');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          setToken(null);
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
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
      console.error("Backend login failed:", error);
      setIsLoading(false);
      return { 
        success: false, 
        message: error.response?.data?.message || "Erreur de connexion au serveur (assurez-vous que XAMPP est lancé)." 
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
