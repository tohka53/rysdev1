import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  public async getData(table: string): Promise<any[] | null> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .order('id', { ascending: false }); // Ordenar por ID descendente para ver los más recientes primero
      
      if (error) {
        console.error('Error obteniendo datos:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error en getData:', error);
      throw error;
    }
  }

  public async insertData(table: string, dataToInsert: any): Promise<any | null> {
    try {
      // Para bigint autoincremental, no necesitamos enviar el ID
      const { data, error } = await this.supabase
        .from(table)
        .insert(dataToInsert)
        .select();
      
      if (error) {
        console.error('Error insertando datos:', error);
        throw error;
      }
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
        .eq('id', parseInt(id)); // Convertir a número para la comparación
      
      if (error) {
        console.error('Error eliminando datos:', error);
        throw error;
      }
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
        .eq('id', parseInt(id)) // Convertir a número para la comparación
        .select();
      
      if (error) {
        console.error('Error actualizando datos:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error en updateData:', error);
      throw error;
    }
  }

  public get client(): SupabaseClient {
    return this.supabase;
  }

  // Métodos de autenticación (si los necesitas)
  public async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });
    return { data, error };
  }

  public async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  public async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  public async getCurrentUser() {
    return await this.supabase.auth.getUser();
  }
}