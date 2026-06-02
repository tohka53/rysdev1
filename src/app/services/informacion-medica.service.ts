// src/app/services/informacion-medica.service.ts
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface InformacionMedicaUsuario {
  id?: number;
  usuario_id: number;
  fecha_nacimiento?: Date | string | null;
  genero?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  diagnostico_principal?: string | null;
  diagnosticos_secundarios?: string[] | null;
  historial_medico?: string | null;
  medicamentos_actuales?: string | null;
  alergias?: string | null;
  limitaciones_fisicas?: string | null;
  observaciones_generales?: string | null;
  contacto_emergencia_nombre?: string | null;
  contacto_emergencia_telefono?: string | null;
  contacto_emergencia_relacion?: string | null;
  peso?: number | null;
  altura?: number | null;
  imc?: number | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}

export interface UsuarioConInformacionMedica {
  id: number;
  username: string;
  full_name: string;
  email?: string; // Opcional porque tu Profile no lo tiene
  id_perfil: number;
  informacion_medica?: InformacionMedicaUsuario | null;
}

@Injectable({
  providedIn: 'root'
})
export class InformacionMedicaService {

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  /**
   * Obtiene la información médica según los permisos del usuario
   * Utiliza la misma lógica que ya tienes en tu proyecto
   */
  async getInformacionMedicaConPermisos(usuarioId?: number): Promise<UsuarioConInformacionMedica[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        throw new Error('Usuario no autenticado');
      }

      const isAdmin = currentUser.id_perfil === 1;
      
      if (isAdmin) {
        // Admin puede ver todos los usuarios
        return await this.getAllUsuariosConInformacionMedica();
      } else {
        // Usuario regular solo puede ver su propio perfil
        if (usuarioId && usuarioId !== currentUser.id) {
          throw new Error('No tienes permisos para ver la información de este usuario');
        }
        const usuario = await this.getUsuarioConInformacionMedica(currentUser.id);
        return usuario ? [usuario] : [];
      }
    } catch (error) {
      console.error('Error al obtener información médica con permisos:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los usuarios con su información médica (solo para admins)
   */
  private async getAllUsuariosConInformacionMedica(): Promise<UsuarioConInformacionMedica[]> {
    try {
      // Primero obtenemos todos los usuarios activos
      const { data: usuarios, error: errorUsuarios } = await this.supabaseService.supabase
        .from('profiles')
        .select('id, username, full_name, id_perfil')
        .eq('status', 1)
        .order('full_name', { ascending: true });

      if (errorUsuarios) throw errorUsuarios;

      if (!usuarios || usuarios.length === 0) {
        return [];
      }

      // Luego obtenemos toda la información médica
      const { data: infoMedica, error: errorInfo } = await this.supabaseService.supabase
        .from('informacion_medica_usuarios')
        .select('*');

      if (errorInfo) {
        console.warn('Error al obtener información médica:', errorInfo);
      }

      // Combinar usuarios con su información médica
      const usuariosCompletos = usuarios.map(usuario => {
        const infoUsuario = infoMedica?.find(info => info.usuario_id === usuario.id) || null;
        
        return {
          id: usuario.id,
          username: usuario.username || '',
          full_name: usuario.full_name || '',
          id_perfil: usuario.id_perfil || 2,
          informacion_medica: infoUsuario
        };
      });

      console.log('Usuarios cargados:', usuariosCompletos);
      return usuariosCompletos;
    } catch (error) {
      console.error('Error al obtener todos los usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario específico con su información médica
   */
  private async getUsuarioConInformacionMedica(usuarioId: number): Promise<UsuarioConInformacionMedica | null> {
    try {
      // Obtener información del usuario
      const { data: usuario, error: errorUsuario } = await this.supabaseService.supabase
        .from('profiles')
        .select('id, username, full_name, id_perfil')
        .eq('id', usuarioId)
        .eq('status', 1)
        .single();

      if (errorUsuario) {
        console.error('Error al obtener usuario:', errorUsuario);
        return null;
      }

      if (!usuario) return null;

      // Obtener información médica del usuario
      const { data: infoMedica, error: errorInfo } = await this.supabaseService.supabase
        .from('informacion_medica_usuarios')
        .select('*')
        .eq('usuario_id', usuarioId)
        .single();

      // Si no hay información médica, no es un error
      if (errorInfo && errorInfo.code !== 'PGRST116') {
        console.warn('Error al obtener información médica:', errorInfo);
      }

      return {
        id: usuario.id,
        username: usuario.username || '',
        full_name: usuario.full_name || '',
        id_perfil: usuario.id_perfil || 2,
        informacion_medica: infoMedica || null
      };
    } catch (error) {
      console.error('Error al obtener usuario con información médica:', error);
      return null;
    }
  }

  /**
   * Guarda o actualiza la información médica usando upsert real
   */
  async saveInformacionMedica(informacion: InformacionMedicaUsuario): Promise<InformacionMedicaUsuario> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        throw new Error('Usuario no autenticado');
      }

      const isAdmin = currentUser.id_perfil === 1;
      const isOwnProfile = informacion.usuario_id === currentUser.id;

      // Verificar permisos
      if (!isAdmin && !isOwnProfile) {
        throw new Error('No tienes permisos para editar la información de este usuario');
      }

      // Calcular IMC si hay peso y altura
      let imc = null;
      if (informacion.peso && informacion.altura) {
        imc = informacion.peso / Math.pow(informacion.altura / 100, 2);
      }

      // Preparar datos para upsert
      const dataToUpsert = {
        usuario_id: informacion.usuario_id,
        fecha_nacimiento: informacion.fecha_nacimiento || null,
        genero: informacion.genero || null,
        telefono: informacion.telefono || null,
        direccion: informacion.direccion || null,
        diagnostico_principal: informacion.diagnostico_principal || null,
        diagnosticos_secundarios: informacion.diagnosticos_secundarios || null,
        historial_medico: informacion.historial_medico || null,
        medicamentos_actuales: informacion.medicamentos_actuales || null,
        alergias: informacion.alergias || null,
        limitaciones_fisicas: informacion.limitaciones_fisicas || null,
        observaciones_generales: informacion.observaciones_generales || null,
        contacto_emergencia_nombre: informacion.contacto_emergencia_nombre || null,
        contacto_emergencia_telefono: informacion.contacto_emergencia_telefono || null,
        contacto_emergencia_relacion: informacion.contacto_emergencia_relacion || null,
        peso: informacion.peso || null,
        altura: informacion.altura || null,
        imc: imc,
        updated_at: new Date().toISOString()
      };

      console.log('Datos a guardar:', dataToUpsert);

      const { data, error } = await this.supabaseService.supabase
        .from('informacion_medica_usuarios')
        .upsert(dataToUpsert, { 
          onConflict: 'usuario_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('Error en upsert:', error);
        throw error;
      }

      console.log('Datos guardados exitosamente:', data);
      return data;
    } catch (error) {
      console.error('Error al guardar información médica:', error);
      throw error;
    }
  }

  /**
   * Verifica si el usuario actual puede editar la información de otro usuario
   */
  canEditUser(usuarioId: number): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) return false;

    const isAdmin = currentUser.id_perfil === 1;
    const isOwnProfile = usuarioId === currentUser.id;

    return isAdmin || isOwnProfile;
  }

  /**
   * Verifica si el usuario actual puede ver la información de otro usuario
   */
  canViewUser(usuarioId: number): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) return false;

    const isAdmin = currentUser.id_perfil === 1;
    const isOwnProfile = usuarioId === currentUser.id;

    return isAdmin || isOwnProfile;
  }

  /**
   * Obtiene solo la información médica de un usuario específico
   * Reutiliza el método que ya tienes en TerapiasService
   */
  async getInformacionMedicaUsuario(usuarioId: number): Promise<InformacionMedicaUsuario | null> {
    try {
      // Verificar permisos
      if (!this.canViewUser(usuarioId)) {
        throw new Error('No tienes permisos para ver la información de este usuario');
      }

      const { data, error } = await this.supabaseService.supabase
        .from('informacion_medica_usuarios')
        .select('*')
        .eq('usuario_id', usuarioId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener información médica:', error);
      throw error;
    }
  }

  /**
   * Método para calcular estadísticas (para uso futuro o reportes)
   */
  async getEstadisticasInformacionMedica(): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('get_estadisticas_informacion_medica');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return null;
    }
  }
}