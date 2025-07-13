import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
import { Profile, LoginCredentials, AuthResponse, RegisterData } from '../interfaces/user.interfaces';

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

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
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

      // Convertir el usuario de Supabase al formato Profile
      const profileUser: Profile = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        password: user.password,
        status: user.status,
        id_perfil: user.id_perfil,
        created_at: user.created_at
      };

      // Guardar usuario
      this.currentUser = profileUser;
      localStorage.setItem('currentUser', JSON.stringify(profileUser));
      
      console.log('Login exitoso para:', profileUser.username);
      return { success: true, message: 'Login exitoso', user: profileUser };

    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, message: 'Error inesperado del servidor' };
    }
  }

  async register(profile: RegisterData): Promise<AuthResponse> {
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

      // Crear nuevo usuario - asignar perfil básico por defecto
      const dataToInsert = {
        username: profile.username,
        full_name: profile.full_name,
        password: profile.password,
        status: 1,
        id_perfil: profile.id_perfil || 2 // Asignar perfil "Usuario" por defecto
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
        
        // Convertir el resultado al formato Profile
        const createdUser: Profile = {
          id: newUser[0].id,
          username: newUser[0].username,
          full_name: newUser[0].full_name,
          password: newUser[0].password,
          status: newUser[0].status,
          id_perfil: newUser[0].id_perfil,
          created_at: newUser[0].created_at
        };
        
        return { success: true, message: 'Usuario creado exitosamente', user: createdUser };
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
    
    // Nota: No inyectamos PermissionsService directamente para evitar dependencias circulares
    // El componente que llame a logout debe limpiar los datos de permisos si es necesario
    
    this.router.navigate(['/langing']);
  }

  getCurrentUser(): Profile | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Método para obtener el perfil del usuario actual
  getCurrentUserProfile(): number | null {
    const user = this.getCurrentUser();
    return user?.id_perfil || null;
  }

  // Método para verificar si el usuario tiene un perfil específico
  hasProfile(profileId: number): boolean {
    const userProfile = this.getCurrentUserProfile();
    return userProfile === profileId;
  }

  // Método para verificar si es administrador
  isAdmin(): boolean {
    return this.hasProfile(1); // Asumiendo que perfil 1 es Administrador
  }
}