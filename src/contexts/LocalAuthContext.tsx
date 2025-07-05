import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, type User } from '@/lib/indexedDB';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      await db.init();
      
      // 로컬 스토리지에서 세션 확인
      const sessionData = localStorage.getItem('medinalab_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.expires_at > Date.now()) {
          setUser(session.user);
        } else {
          localStorage.removeItem('medinalab_session');
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const user = await db.authenticateUser(email, password);
      if (user) {
        setUser(user);
        
        // 세션을 로컬 스토리지에 저장 (24시간 유효)
        const session = {
          user,
          expires_at: Date.now() + (24 * 60 * 60 * 1000)
        };
        localStorage.setItem('medinalab_session', JSON.stringify(session));
        
        return {};
      } else {
        return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: '로그인 중 오류가 발생했습니다.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const newUser = await db.createUser(email, password, fullName);
      setUser(newUser);
      
      // 세션을 로컬 스토리지에 저장
      const session = {
        user: newUser,
        expires_at: Date.now() + (24 * 60 * 60 * 1000)
      };
      localStorage.setItem('medinalab_session', JSON.stringify(session));
      
      return {};
    } catch (error) {
      console.error('Sign up error:', error);
      if (error instanceof Error && error.message.includes('unique')) {
        return { error: '이미 사용 중인 이메일입니다.' };
      }
      return { error: '회원가입 중 오류가 발생했습니다.' };
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('medinalab_session');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};