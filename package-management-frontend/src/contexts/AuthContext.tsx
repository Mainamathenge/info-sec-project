import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import apiClient from '../api/client';
import type { User, AuthResponse } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string, mfaToken?: string) => Promise<void>;
    register: (username: string, email: string, password: string, role?: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored user on mount
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('authToken');

        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string, mfaToken?: string) => {
        const response = await apiClient.post<AuthResponse>('/auth/login', {
            username,
            password,
            mfaToken,
        });

        if (response.data.requiresMFA) {
            throw new Error('MFA_REQUIRED');
        }

        if (response.data.token && response.data.user) {
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setUser(response.data.user);
        }
    };

    const register = async (username: string, email: string, password: string, role: string = 'USER') => {
        await apiClient.post('/auth/register', {
            username,
            email,
            password,
            role,
        });

        // Auto-login after registration
        await login(username, password);
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
