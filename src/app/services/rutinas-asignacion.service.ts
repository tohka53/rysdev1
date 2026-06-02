// src/app/services/rutinas-asignacion.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { 
  AsignacionMasiva,
  SeguimientoIndividual,
  AsignacionCompleta,
  SeguimientoDetallado,
  CrearAsignacionRequest,
  ActualizarProgresoRequest,
  FiltrosAsignaciones,
  EstadisticasAsignaciones,
  AsignacionResponse
} from '../interfaces/rutinas-asignacion.interfaces';

@Injectable({
  providedIn: 'root'
})
export class RutinasAsignacionService {

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // ================================
  // ASIGNACIÓN MASIVA DE RUTINAS
  // ================================

  async asignarRutinaAUsuarios(request: CrearAsignacionRequest): Promise<AsignacionResponse> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Validaciones
      if (!request.id_rutina || request.usuarios_ids.length === 0) {
        return {
          success: false,
          message: 'Debe especificar una rutina y al menos un usuario'
        };
      }

      if (new Date(request.fecha_fin) <= new Date(request.fecha_inicio)) {
        return {
          success: false,
          message: 'La fecha de fin debe ser posterior a la fecha de inicio'
        };
      }

      // Llamar a la función de PostgreSQL
      const { data, error } = await this.supabaseService.client
        .rpc('asignar_rutina_a_usuarios', {
          p_id_rutina: request.id_rutina,
          p_usuarios_ids: request.usuarios_ids,
          p_asignado_por: currentUser.id,
          p_fecha_inicio: request.fecha_inicio,
          p_fecha_fin: request.fecha_fin,
          p_notas: request.notas || null
        });

      if (error) throw error;

      return {
        success: true,
        asignacion_id: data,
        message: 'Rutina asignada exitosamente',
        usuarios_asignados: request.usuarios_ids.length
      };

    } catch (error) {
      console.error('Error asignando rutina:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al asignar la rutina'
      };
    }
  }

  // ================================
  // CONSULTAS DE ASIGNACIONES
  // ================================

  async getAsignacionesMasivas(filtros?: FiltrosAsignaciones): Promise<AsignacionCompleta[]> {
    try {
      let query = this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .select(`
          id,
          id_rutina,
          usuarios_asignados,
          fecha_inicio,
          fecha_fin,
          estado,
          notas,
          created_at,
          rutinas!inner(nombre, descripcion, tipo, nivel),
          profiles!rutina_asignaciones_masivas_asignado_por_fkey(full_name)
        `)
        .eq('status', 1);

      // Aplicar filtros
      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_inicio', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_fin', filtros.fecha_hasta);
      }

      if (filtros?.asignado_por) {
        query = query.eq('asignado_por', filtros.asignado_por);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => ({
        asignacion_id: item.id,
        rutina_id: item.id_rutina,
        rutina_nombre: item.rutinas.nombre,
        rutina_descripcion: item.rutinas.descripcion,
        rutina_tipo: item.rutinas.tipo,
        rutina_nivel: item.rutinas.nivel,
        fecha_inicio_programada: item.fecha_inicio,
        fecha_fin_programada: item.fecha_fin,
        usuarios_count: item.usuarios_asignados?.length || 0,
        estado_asignacion: item.estado,
        asignado_por_nombre: item.profiles.full_name,
        fecha_asignacion: item.created_at,
        notas_asignacion: item.notas,
        usuarios_asignados: item.usuarios_asignados
      }));

    } catch (error) {
      console.error('Error obteniendo asignaciones:', error);
      throw error;
    }
  }

  async getSeguimientoDetallado(asignacionId: number): Promise<SeguimientoDetallado[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('v_rutinas_asignadas_usuarios')
        .select('*')
        .eq('asignacion_id', asignacionId)
        .order('full_name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo seguimiento detallado:', error);
      throw error;
    }
  }

  async getRutinasUsuario(userId?: number): Promise<SeguimientoDetallado[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      const targetUserId = userId || currentUser?.id;

      if (!targetUserId) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      const { data, error } = await this.supabaseService.client
        .rpc('get_rutinas_usuario', { p_user_id: targetUserId });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo rutinas del usuario:', error);
      throw error;
    }
  }

  // ================================
  // ACTUALIZACIÓN DE PROGRESO
  // ================================

  async actualizarProgreso(request: ActualizarProgresoRequest): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('actualizar_progreso_rutina', {
          p_seguimiento_id: request.seguimiento_id,
          p_progreso: request.progreso,
          p_estado_individual: request.estado_individual || null,
          p_notas_individuales: request.notas_individuales || null
        });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error actualizando progreso:', error);
      throw error;
    }
  }

  async cambiarEstadoIndividual(
    seguimientoId: number, 
    nuevoEstado: 'pendiente' | 'en_progreso' | 'completada' | 'abandonada',
    notas?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        estado_individual: nuevoEstado,
        updated_at: new Date().toISOString()
      };

      if (notas) {
        updateData.notas_individuales = notas;
      }

      // Si se marca como completada, actualizar progreso al 100%
      if (nuevoEstado === 'completada') {
        updateData.progreso = 100;
        updateData.fecha_fin_real = new Date().toISOString().split('T')[0];
      }

      // Si se marca como en progreso y no tiene fecha de inicio, agregarla
      if (nuevoEstado === 'en_progreso') {
        const { data: current } = await this.supabaseService.client
          .from('rutina_seguimiento_individual')
          .select('fecha_inicio_real')
          .eq('id', seguimientoId)
          .single();

        if (current && !current.fecha_inicio_real) {
          updateData.fecha_inicio_real = new Date().toISOString().split('T')[0];
        }
      }

      const { error } = await this.supabaseService.client
        .from('rutina_seguimiento_individual')
        .update(updateData)
        .eq('id', seguimientoId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cambiando estado individual:', error);
      throw error;
    }
  }

  // ================================
  // GESTIÓN DE ASIGNACIONES
  // ================================

  async cancelarAsignacion(asignacionId: number, motivo?: string): Promise<boolean> {
    try {
      const updateData: any = {
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      };

      if (motivo) {
        updateData.notas = motivo;
      }

      const { error } = await this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .update(updateData)
        .eq('id', asignacionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cancelando asignación:', error);
      throw error;
    }
  }

  async pausarAsignacion(asignacionId: number, motivo?: string): Promise<boolean> {
    try {
      const updateData: any = {
        estado: 'pausada',
        updated_at: new Date().toISOString()
      };

      if (motivo) {
        updateData.notas = motivo;
      }

      const { error } = await this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .update(updateData)
        .eq('id', asignacionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error pausando asignación:', error);
      throw error;
    }
  }

  async reanudarAsignacion(asignacionId: number): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .update({ 
          estado: 'activa',
          updated_at: new Date().toISOString()
        })
        .eq('id', asignacionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error reanudando asignación:', error);
      throw error;
    }
  }

  // ================================
  // ESTADÍSTICAS Y REPORTES
  // ================================

  async getEstadisticasAsignaciones(): Promise<EstadisticasAsignaciones> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('get_estadisticas_asignaciones');

      if (error) throw error;

      const stats = data?.[0] || {};
      
      return {
        total_asignaciones: stats.total_asignaciones || 0,
        asignaciones_activas: stats.asignaciones_activas || 0,
        usuarios_con_rutinas: stats.usuarios_con_rutinas || 0,
        rutinas_mas_asignadas: stats.rutinas_mas_asignadas || 0,
        promedio_progreso: stats.promedio_progreso || 0,
        usuarios_completados: 0, // Calcular si es necesario
        usuarios_en_progreso: 0, // Calcular si es necesario
        usuarios_pendientes: 0   // Calcular si es necesario
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  async getEstadisticasUsuario(userId?: number): Promise<any> {
    try {
      const currentUser = this.authService.getCurrentUser();
      const targetUserId = userId || currentUser?.id;

      if (!targetUserId) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      const { data, error } = await this.supabaseService.client
        .from('v_rutinas_asignadas_usuarios')
        .select('estado_individual, progreso, estado_temporal')
        .eq('id_profile', targetUserId);

      if (error) throw error;

      const rutinas = data || [];
      const total = rutinas.length;
      const completadas = rutinas.filter(r => r.estado_individual === 'completada').length;
      const en_progreso = rutinas.filter(r => r.estado_individual === 'en_progreso').length;
      const pendientes = rutinas.filter(r => r.estado_individual === 'pendiente').length;
      const vigentes = rutinas.filter(r => r.estado_temporal === 'vigente').length;
      
      const progresoPromedio = rutinas.length > 0 
        ? rutinas.reduce((acc, r) => acc + r.progreso, 0) / rutinas.length 
        : 0;

      return {
        total_rutinas: total,
        rutinas_completadas: completadas,
        rutinas_en_progreso: en_progreso,
        rutinas_pendientes: pendientes,
        rutinas_vigentes: vigentes,
        progreso_promedio: Math.round(progresoPromedio)
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas del usuario:', error);
      throw error;
    }
  }

  // ================================
  // MÉTODOS UTILITARIOS
  // ================================

  calcularDiasRestantes(fechaFin: string): number {
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  calcularDuracionTotal(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - inicio.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24)) + 1;
  }

  validarFechas(fechaInicio: string, fechaFin: string): boolean {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const hoy = new Date();
    
    return inicio >= hoy && fin > inicio;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getColorEstado(estado: string): string {
    switch (estado) {
      case 'activa': return 'green';
      case 'completada': return 'blue';
      case 'pausada': return 'yellow';
      case 'cancelada': return 'red';
      case 'en_progreso': return 'blue';
      case 'pendiente': return 'gray';
      case 'abandonada': return 'red';
      default: return 'gray';
    }
  }

  getIconoEstado(estado: string): string {
    switch (estado) {
      case 'activa': return 'fas fa-play-circle';
      case 'completada': return 'fas fa-check-circle';
      case 'pausada': return 'fas fa-pause-circle';
      case 'cancelada': return 'fas fa-times-circle';
      case 'en_progreso': return 'fas fa-spinner';
      case 'pendiente': return 'fas fa-clock';
      case 'abandonada': return 'fas fa-ban';
      default: return 'fas fa-circle';
    }
  }

  // Verificar si el usuario actual puede gestionar asignaciones
  puedeGestionarAsignaciones(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id_perfil === 1 || currentUser?.id_perfil === 3; // Admin o Supervisor
  }

  // Verificar si el usuario puede ver el seguimiento de otros usuarios
  puedeVerSeguimientoCompleto(): boolean {
    return this.puedeGestionarAsignaciones();
  }




  
}