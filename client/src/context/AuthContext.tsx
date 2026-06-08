import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Define the User structure based on our Database/Backend logic
interface User {
  id: string;
  name: string;
  role: string; // Changed to string to match server
  avatar?: string | null;
  passport?: string | null;
  isProfileComplete?: boolean;
  securityQuestion?: string | null;
  securityQuestions?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // On initial load: Check if a session exists in the browser
  useEffect(() => {
    const initAuth = () => {
      try {
        const savedUser = localStorage.getItem('highland_user');
        const token = localStorage.getItem('highland_token');

        if (savedUser && token) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        // If data is corrupted, clear it
        localStorage.removeItem('highland_user');
        localStorage.removeItem('highland_token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * LOGIN: Saves user data and token to storage and updates state
   */
  const login = (userData: User, token: string) => {
    localStorage.setItem('highland_token', token);
    localStorage.setItem('highland_user', JSON.stringify(userData));
    setUser(userData);
    if (userData.role?.toLowerCase() !== 'admin' && !userData.isProfileComplete) {
      navigate('/complete-profile', { replace: true });
    } else if (userData.role && userData.role.toLowerCase() === 'financial manager') {
      navigate('/financial-manager', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  /**
   * LOGOUT: Clears all security credentials and redirects to login
   */
  const logout = () => {
    localStorage.removeItem('highland_token');
    localStorage.removeItem('highland_user');
    setUser(null);
    
    // Using replace: true prevents the user from going "back" into the system
    navigate('/login', { replace: true });
    console.log("🔒 Session terminated.");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {/* 
        We only render the children once the initial loading check is done.
        This prevents the "Protected Page" from flashing for a split second 
        before redirecting to login.
      */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth anywhere in the system
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};