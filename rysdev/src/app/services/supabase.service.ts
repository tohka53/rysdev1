import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthResponse, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  id_perfil?: number;
  provider?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    // Escuchar cambios en el estado de autenticación
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });

    // Obtener usuario actual al inicializar
    this.getCurrentUser();
  }

  // ================================
  // MÉTODOS DE AUTENTICACIÓN
  // ================================

  public async signUp(email: string, password: string, userData?: any): Promise<AuthResponse> {
    return await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // Datos adicionales del usuario
      }
    });
  }

  public async signIn(email: string, password: string): Promise<AuthResponse> {
    return await this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  public async signInWithGoogle(): Promise<{ data: { provider: string; url: string | null }, error: any }> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard` // Cambia por tu ruta de dashboard
      }
    });
    return { data, error };
  }

  public async signInWithFacebook(): Promise<{ data: { provider: string; url: string | null }, error: any }> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    return { data, error };
  }

  public async signOut(): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signOut();
    this.currentUserSubject.next(null);
    return { error };
  }

  public async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      this.currentUserSubject.next(user);
      return user;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  public async resetPassword(email: string): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { error };
  }

  public async updatePassword(newPassword: string): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    return { error };
  }

  // ================================
  // MÉTODOS DE PERFIL
  // ================================

  public async getProfile(userId?: string): Promise<Profile | null> {
    try {
      const id = userId || this.currentUserSubject.value?.id;
      if (!id) throw new Error('No user ID provided');

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }
  }

  public async updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const userId = this.currentUserSubject.value?.id;
      if (!userId) throw new Error('No authenticated user');

      const { data, error } = await this.supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  public async uploadAvatar(file: File): Promise<string | null> {
    try {
      const userId = this.currentUserSubject.value?.id;
      if (!userId) throw new Error('No authenticated user');

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error subiendo avatar:', error);
      return null;
    }
  }

  // ================================
  // MÉTODOS CRUD GENERALES (mantener los existentes)
  // ================================

  public async getData(table: string): Promise<any[] | null> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .order('id', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en getData:', error);
      throw error;
    }
  }

  public async insertData(table: string, dataToInsert: any): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .insert(dataToInsert)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en insertData:', error);
      throw error;
    }
  }

  public async deleteData(table: string, id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error en deleteData:', error);
      throw error;
    }
  }

  public async updateData(table: string, id: string, dataToUpdate: any): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .update(dataToUpdate)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en updateData:', error);
      throw error;
    }
  }

  public get client(): SupabaseClient {
    return this.supabase;
  }

  // Método helper para verificar si el usuario está autenticado
  public isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // Método helper para obtener el usuario actual como Observable
  public getCurrentUser$(): Observable<User | null> {
    return this.currentUser$;
  }
}