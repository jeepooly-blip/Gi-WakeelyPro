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
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('wakeely_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_USER;
      }
    }
    return DEFAULT_USER;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('wakeely_user_profile', JSON.stringify(user));
    } else {
      localStorage.removeItem('wakeely_user_profile');
    }
  }, [user]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    // Simulate server authentication delay
    await new Promise((res) => setTimeout(res, 600));

    const updatedUser: UserProfile = {
      ...DEFAULT_USER,
      email: email.trim(),
      name: email.split('@')[0].replace('.', ' ').toUpperCase() || DEFAULT_USER.name,
    };
    setUser(updatedUser);
    return true;
  };

  const signup = async (userData: Partial<UserProfile>, password?: string): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 700));

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: userData.name || 'Adv. Legal Counsel',
      email: userData.email || 'counsel@firm.law',
      firmName: userData.firmName || 'Premier Legal Chambers',
      role: userData.role || 'Senior Associate',
      barAssociationId: userData.barAssociationId || 'BAR-2025-001',
      jurisdiction: userData.jurisdiction || 'Jordan & UAE',
      accountType: userData.accountType || 'Law Firm',
      subscriptionTier: 'Free Trial',
      planStatus: 'Trial',
      trialDaysLeft: 14,
      seats: 1,
      maxSeats: 2,
      billingCycle: 'Monthly',
      renewalDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      biometricEnabled: false,
    };

    setUser(newUser);
    return true;
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 500));
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const upgradeSubscription = async (tier: SubscriptionTier, billingCycle: 'Monthly' | 'Annual'): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 800));

    if (!user) return false;

    const maxSeats = tier === 'Enterprise & Arbitration' ? 99 : tier === 'Pro Practice' ? 10 : 1;

    const updated: UserProfile = {
      ...user,
      subscriptionTier: tier,
      planStatus: 'Active',
      billingCycle,
      maxSeats,
      renewalDate: billingCycle === 'Annual' ? '2027-02-01' : '2026-03-01',
    };

    setUser(updated);
    return true;
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
