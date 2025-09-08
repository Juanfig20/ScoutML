import { createContext } from 'react';
import { AuthResponse } from '@supabase/supabase-js';
export interface UserProfile {
  id: string;          
  user_id: string;     
  email: string;
  first_name: string;
  last_name: string;
  plan: 'gratis' | 'basico' | 'medio' | 'avanzado' | null;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}


export const AuthContext = createContext<AuthContextType | undefined>(undefined);