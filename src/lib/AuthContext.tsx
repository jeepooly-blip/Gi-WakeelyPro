import React, { createContext, useContext, useState, useEffect } from 'react';

export type SubscriptionTier = 'Free Trial' | 'Solo Practice' | 'Pro Practice' | 'Enterprise & Arbitration';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  firmName: string;
  role: 'Managing Partner' | 'Senior Associate' | 'In-House Counsel' | 'Legal Executive' | 'Client Representative';
  barAssociationId: string;
  jurisdiction: string;
  accountType: 'Law Firm' | 'Solo Practitioner' | 'Corporate Counsel' | 'Client';
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  planStatus: 'Active' | 'Trial' | 'Expired';
  trialDaysLeft: number;
  seats: number;
  maxSeats: number;
  billingCycle: 'Monthly' | 'Annual';
  renewalDate: string;
  biometricEnabled: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (userData: Partial<UserProfile>, password?: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  upgradeSubscription: (tier: SubscriptionTier, billingCycle: 'Monthly' | 'Annual') => Promise<boolean>;
  toggleBiometricAuth: (enabled: boolean) => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr_lead_01',
  name: 'Adv. Tareq Al-Husseini',
  email: 'tareq@wakeely.law',
  firmName: 'Al-Husseini & Partners Law Firm',
  role: 'Managing Partner',
  barAssociationId: 'JBA-2012-9842',
  jurisdiction: 'Jordan & DIFC Courts',
  accountType: 'Law Firm',
  subscriptionTier: 'Pro Practice',
  planStatus: 'Active',
  trialDaysLeft: 14,
  seats: 5,
  maxSeats: 10,
  billingCycle: 'Annual',
  renewalDate: '2027-01-15',
  biometricEnabled: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check current session from server on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('wakeely_auth_token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
          localStorage.removeItem('wakeely_auth_token');
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: password || '' }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Invalid login credentials' }));
      throw new Error(errorData.error || 'Authentication failed');
    }

    const data = await res.json();
    if (data.token) {
      localStorage.setItem('wakeely_auth_token', data.token);
    }
    setUser(data.user);
    return true;
  };

  const signup = async (userData: Partial<UserProfile>, password?: string): Promise<boolean> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: password || '',
        firmName: userData.firmName,
        barAssociationId: userData.barAssociationId,
        jurisdiction: userData.jurisdiction,
        accountType: userData.accountType,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(errorData.error || 'Registration failed');
    }

    const data = await res.json();
    if (data.token) {
      localStorage.setItem('wakeely_auth_token', data.token);
    }
    setUser(data.user);
    return true;
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  };

  const logout = async () => {
    const token = localStorage.getItem('wakeely_auth_token');
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    }).catch(() => {});

    localStorage.removeItem('wakeely_auth_token');
    setUser(null);
  };

  const upgradeSubscription = async (tier: SubscriptionTier, billingCycle: 'Monthly' | 'Annual'): Promise<boolean> => {
    if (!user) return false;

    const token = localStorage.getItem('wakeely_auth_token');
    const res = await fetch('/api/auth/subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ tier, billingCycle })
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      return true;
    }
    return false;
  };

  const toggleBiometricAuth = (enabled: boolean) => {
    if (user) {
      setUser({ ...user, biometricEnabled: enabled });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        resetPassword,
        logout,
        upgradeSubscription,
        toggleBiometricAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
