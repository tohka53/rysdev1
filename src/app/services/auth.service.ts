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
        created_at: user.created_at,
        avatar_url: user.avatar_url // Incluir avatar_url
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
        id_perfil: profile.id_perfil || 2, // Asignar perfil "Usuario" por defecto
        avatar_url: profile.avatar_url || null // Incluir avatar_url si se proporciona
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
          created_at: newUser[0].created_at,
          avatar_url: newUser[0].avatar_url
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

  // ========================================
  // NUEVOS MÉTODOS PARA MANEJO DE AVATARES
  // ========================================

  /**
   * Validar archivo de imagen
   */
  private validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no permitido. Use JPG, PNG o GIF.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo es demasiado grande. Máximo 5MB.' };
    }

    return { valid: true };
  }

  /**
   * Convertir archivo a Base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Redimensionar imagen usando canvas
   */
  private resizeImage(file: File, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspecto
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen redimensionada
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64
        const base64 = canvas.toDataURL(file.type, quality);
        resolve(base64);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Actualizar avatar del usuario actual
   */
  async updateUserAvatar(file: File): Promise<AuthResponse> {
    try {
      if (!this.currentUser) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      // Validar archivo
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Archivo inválido' };
      }

      // Redimensionar y convertir a base64
      const base64Image = await this.resizeImage(file, 300, 300, 0.8);
      
      // Actualizar en la base de datos
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .update({ avatar_url: base64Image })
        .eq('id', this.currentUser.id)
        .select();

      if (error) {
        console.error('Error actualizando avatar:', error);
        return { success: false, message: 'Error al actualizar la foto de perfil' };
      }

      if (data && data.length > 0) {
        // Actualizar usuario actual en memoria y localStorage
        this.currentUser.avatar_url = base64Image;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        return { 
          success: true, 
          message: 'Foto de perfil actualizada correctamente',
          user: this.currentUser 
        };
      }

      return { success: false, message: 'No se pudo actualizar la foto' };

    } catch (error) {
      console.error('Error en updateUserAvatar:', error);
      return { success: false, message: 'Error interno del servidor' };
    }
  }

  /**
   * Actualizar perfil del usuario (incluyendo avatar)
   */
  async updateUserProfile(updates: Partial<Profile>): Promise<AuthResponse> {
    try {
      if (!this.currentUser) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      // Actualizar en la base de datos
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .update(updates)
        .eq('id', this.currentUser.id)
        .select();

      if (error) {
        console.error('Error actualizando perfil:', error);
        return { success: false, message: 'Error al actualizar el perfil' };
      }

      if (data && data.length > 0) {
        // Actualizar usuario actual
        const updatedUser = { ...this.currentUser, ...updates };
        this.currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        return { 
          success: true, 
          message: 'Perfil actualizado correctamente',
          user: updatedUser 
        };
      }

      return { success: false, message: 'No se pudo actualizar el perfil' };

    } catch (error) {
      console.error('Error en updateUserProfile:', error);
      return { success: false, message: 'Error interno del servidor' };
    }
  }

  /**
   * Obtener URL del avatar con fallback
   */
  getAvatarUrl(user?: Profile): string {
    const targetUser = user || this.currentUser;
    
    if (targetUser?.avatar_url) {
      return targetUser.avatar_url;
    }
    
    // Fallback: generar avatar con iniciales usando servicio externo
    if (targetUser?.full_name) {
      const initials = targetUser.full_name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      // Generar color consistente basado en el nombre
      const colors = ['6366f1', '8b5cf6', 'ec4899', 'ef4444', 'f59e0b', '10b981', '06b6d4', '3b82f6'];
      const colorIndex = (targetUser.full_name?.charCodeAt(0) || 0) % colors.length;
      const backgroundColor = colors[colorIndex];
      
      return `https://ui-avatars.com/api/?name=${initials}&background=${backgroundColor}&color=fff&size=150`;
    }
    
    return 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&size=150';
  }

  /**
   * Obtener iniciales del usuario
   */
  getUserInitials(user?: Profile): string {
    const targetUser = user || this.currentUser;
    
    if (targetUser?.full_name) {
      const names = targetUser.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      }
      return targetUser.full_name.charAt(0).toUpperCase();
    }
    
    return 'U';
  }

  // ========================================
  // MÉTODOS EXISTENTES (sin cambios)
  // ========================================

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