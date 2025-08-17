// src/app/interfaces/user.interfaces.ts

// Interface principal para el perfil de usuario
export interface Profile {
  id?: number;
  username: string;
  full_name: string;
  password?: string; // Opcional para seguridad
  status: number;
  id_perfil?: number; // Referencia al perfil/rol
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
  provider?: string;
  
}

// Interface para credenciales de login
export interface LoginCredentials {
  username: string;
  password: string;
}

// Interface para el perfil/rol del sistema
export interface UserRole {
  id_perfil: number;
  perfil: string;
  descripcion?: string;
  status: number;
  created_at?: string;
  updated_at?: string;
}

// Interface para Supabase User (del sistema de auth de Supabase)
export interface SupabaseUser {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  id_perfil?: number;
  provider?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

// Interface para respuesta de autenticación
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Profile;
}

// Interface para datos de registro
export interface RegisterData {
  username: string;
  full_name: string;
  password: string;
  status?: number;
  id_perfil?: number;
  avatar_url?: string; // Nueva propiedad para la foto

}

// Interface para actualización de perfil
export interface ProfileUpdate {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  id_perfil?: number;
  status?: number;
  
}