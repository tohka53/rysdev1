// src/app/services/supabase.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Profile {
  id?: number;
  username: string;
  full_name: string;
  avatar_url?: string;
  id_perfil: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.loadUser();
  }

  private async loadUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    this.currentUserSubject.next(user);
  }

  // ================================
  // MÉTODOS DE AUTENTICACIÓN
  // ================================

  public async signUp(email: string, password: string, userData?: any) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    
    if (data.user) {
      this.currentUserSubject.next(data.user);
    }
    
    return { data, error };
  }

  public async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (data.user) {
      this.currentUserSubject.next(data.user);
    }
    
    return { data, error };
  }

  public async signOut() {
    const { error } = await this.supabase.auth.signOut();
    this.currentUserSubject.next(null);
    return { error };
  }

  public async getCurrentUser() {
    return await this.supabase.auth.getUser();
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
  // MÉTODOS CRUD GENERALES
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

  public async getDataWithFilters(
    table: string, 
    select: string = '*', 
    filters?: { [key: string]: any }
  ): Promise<any[] | null> {
    try {
      let query = this.supabase
        .from(table)
        .select(select);

      // Aplicar filtros si existen
      if (filters) {
        Object.keys(filters).forEach(key => {
          query = query.eq(key, filters[key]);
        });
      }

      query = query.order('id', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en getDataWithFilters:', error);
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

  public async insertBulkData(table: string, dataToInsert: any[]): Promise<any[] | null> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .insert(dataToInsert)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en insertBulkData:', error);
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

  // ================================
  // MÉTODOS ADICIONALES
  // ================================

  public async getDataCustomQuery(
    table: string,
    selectQuery: string,
    whereClause?: string,
    orderBy?: { column: string, ascending: boolean }
  ): Promise<any[] | null> {
    try {
      let query = this.supabase
        .from(table)
        .select(selectQuery);

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending });
      } else {
        query = query.order('id', { ascending: false });
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en getDataCustomQuery:', error);
      throw error;
    }
  }

  public async executeRPC(functionName: string, params?: any): Promise<any[] | null> {
    try {
      const { data, error } = await this.supabase
        .rpc(functionName, params);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en executeRPC:', error);
      throw error;
    }
  }

  // ================================
  // GETTERS Y HELPERS
  // ================================

  public get client(): SupabaseClient {
    return this.supabase;
  }

  public isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  public getCurrentUser$(): Observable<User | null> {
    return this.currentUser$;
  }

  // Método auxiliar para manejar arrays null
  public ensureArray<T>(data: T[] | null): T[] {
    return data || [];
  }






}