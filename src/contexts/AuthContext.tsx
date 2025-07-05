
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로컬스토리지에서 사용자 정보 로드
    const loadUser = () => {
      const savedUser = localStorage.getItem('meditalk_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      // 기존 사용자 확인
      const users = JSON.parse(localStorage.getItem('meditalk_users') || '[]');
      const existingUser = users.find((u: any) => u.email === email);
      
      if (existingUser) {
        return { error: { message: 'User already registered' } };
      }

      // 새 사용자 생성
      const newUser = {
        id: Date.now().toString(),
        email,
        password, // 실제 프로덕션에서는 해시화 필요
        full_name: fullName || ''
      };

      users.push(newUser);
      localStorage.setItem('meditalk_users', JSON.stringify(users));
      
      return { error: null };
    } catch (error) {
      return { error: { message: '회원가입에 실패했습니다.' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const users = JSON.parse(localStorage.getItem('meditalk_users') || '[]');
      const foundUser = users.find((u: any) => u.email === email && u.password === password);
      
      if (!foundUser) {
        return { error: { message: 'Invalid login credentials' } };
      }

      const userInfo = {
        id: foundUser.id,
        email: foundUser.email,
        full_name: foundUser.full_name
      };

      setUser(userInfo);
      localStorage.setItem('meditalk_user', JSON.stringify(userInfo));
      
      return { error: null };
    } catch (error) {
      return { error: { message: '로그인에 실패했습니다.' } };
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('meditalk_user');
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
