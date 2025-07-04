// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';

export interface Profile {
  id?: number;
  username: string;
  full_name: string;
  password: string;
  status: number;
  created_at?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: Profile | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    // Verificar si hay un usuario guardado al inicializar
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: Profile }> {
    try {
      console.log('Intentando login con:', credentials.username);
      
      // Buscar usuario por username
      const { data: users, error } = await this.supabaseService.client
        .from('profiles')
        .select('*')
        .eq('username', credentials.username)
        .eq('status', 1); // Solo usuarios activos

      console.log('Respuesta de Supabase:', { users, error });

      if (error) {
        console.error('Error de Supabase:', error);
        return { success: false, message: 'Error al conectar con la base de datos' };
      }

      if (!users || users.length === 0) {
        return { success: false, message: 'Usuario no encontrado o inactivo' };
      }

      const user = users[0];

      // Verificar contraseña
      if (user.password !== credentials.password) {
        return { success: false, message: 'Contraseña incorrecta' };
      }

      // Guardar usuario
      this.currentUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      console.log('Login exitoso para:', user.username);
      return { success: true, message: 'Login exitoso', user: user };

    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, message: 'Error inesperado del servidor' };
    }
  }

  async register(profile: Omit<Profile, 'id' | 'created_at'>): Promise<{ success: boolean; message: string; user?: Profile }> {
    try {
      console.log('Intentando registrar usuario:', profile.username);

      // Verificar si el username ya existe
      const { data: existingUser, error: checkError } = await this.supabaseService.client
        .from('profiles')
        .select('username')
        .eq('username', profile.username);

      console.log('Verificación de usuario existente:', { existingUser, checkError });

      if (checkError) {
        console.error('Error verificando usuario:', checkError);
        return { success: false, message: 'Error al verificar usuario existente' };
      }

      if (existingUser && existingUser.length > 0) {
        return { success: false, message: 'El nombre de usuario ya existe' };
      }

      // Crear nuevo usuario
      const dataToInsert = {
        username: profile.username,
        full_name: profile.full_name,
        password: profile.password,
        status: 1
      };

      console.log('Datos a insertar:', dataToInsert);

      const { data: newUser, error: insertError } = await this.supabaseService.client
        .from('profiles')
        .insert(dataToInsert)
        .select();

      console.log('Resultado de inserción:', { newUser, insertError });

      if (insertError) {
        console.error('Error insertando usuario:', insertError);
        return { success: false, message: 'Error al crear usuario: ' + insertError.message };
      }

      if (newUser && newUser.length > 0) {
        console.log('Usuario creado exitosamente:', newUser[0]);
        return { success: true, message: 'Usuario creado exitosamente', user: newUser[0] };
      } else {
        return { success: false, message: 'Error al crear usuario - no se recibieron datos' };
      }

    } catch (error) {
      console.error('Error en registro:', error);
      return { success: false, message: 'Error inesperado del servidor' };
    }
  }

  logout(): void {
    console.log('Cerrando sesión');
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  getCurrentUser(): Profile | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}