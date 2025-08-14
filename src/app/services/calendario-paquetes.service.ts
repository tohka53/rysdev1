// src/app/services/calendario-paquetes.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ===============================================
// INTERFACES PARA CALENDARIO DE PAQUETES
// ===============================================

export interface SesionPaqueteCalendario {
  sesion_id: number;
  usuario_paquete_id: number;
  usuario_id: number;
  usuario_nombre: string;
  username: string;
  fecha_programada: string;
  contenido_tipo: 'rutina' | 'terapia';
  contenido_id: number;
  contenido_nombre: string;
  estado: 'pendiente' | 'completada' | 'cancelada';
  terapeuta_nombre?: string;
  paquete_nombre: string;
  tipo_programa: string;
  origen: string;
  progreso?: number;
  calificacion?: number;
  comentarios?: string;
  puede_modificar?: boolean;
}

export interface UsuarioPaquete {
  usuario_paquete_id: number;
  usuario_id: number;
  usuario_nombre: string;
  paquete_nombre: string;
  paquete_tipo: 'rutina' | 'terapia';
  fecha_inicio: string;
  fecha_fin: string;
  paquete_estado: string;
  sesiones_totales: number;
  sesiones_utilizadas: number;
  sesiones_completadas: number;
  sesiones_pendientes: number;
  proxima_sesion?: string;
  progreso_porcentaje: number;
  terapeuta_nombre?: string;
}

export interface FiltrosCalendarioPaquetes {
  usuarioId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  tipo?: 'rutina' | 'terapia';
  paqueteId?: number;
}

export interface EstadisticasCalendarioPaquetes {
  totalSesiones: number;
  sesionesCompletadas: number;
  sesionesPendientes: number;
  sesionesCanceladas: number;
  progresoPromedio: number;
  proximasSesiones: SesionPaqueteCalendario[];
  sesionesHoy: SesionPaqueteCalendario[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendarioPaquetesService {

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // ===============================================
  // MÉTODOS PRINCIPALES DE CONSULTA
  // ===============================================

  /**
   * Obtener calendario de paquetes según permisos del usuario
   */
  async obtenerCalendarioPaquetes(filtros: FiltrosCalendarioPaquetes = {}): Promise<SesionPaqueteCalendario[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('Usuario no autenticado');
      }

      console.log('🗓️ Obteniendo calendario de paquetes para usuario:', currentUser.id);
      console.log('📋 Filtros aplicados:', filtros);

      // Intentar usar la función SQL optimizada primero
      try {
        return await this.obtenerCalendarioConFuncionSQL(currentUser, filtros);
      } catch (error) {
        console.warn('⚠️ Función SQL no disponible, usando método alternativo:', error);
        return await this.obtenerCalendarioFallback(currentUser, filtros);
      }

    } catch (error) {
      console.error('💥 Error obteniendo calendario de paquetes:', error);
      throw error;
    }
  }

  /**
   * Método principal usando función SQL optimizada
   */
  private async obtenerCalendarioConFuncionSQL(
    currentUser: any, 
    filtros: FiltrosCalendarioPaquetes
  ): Promise<SesionPaqueteCalendario[]> {
    
    const { data, error } = await this.supabaseService.client
      .rpc('get_calendario_usuario', {
        p_requesting_user_id: currentUser.id,
        p_target_user_id: filtros.usuarioId || null,
        p_fecha_desde: filtros.fechaDesde || null,
        p_fecha_hasta: filtros.fechaHasta || null
      });

    if (error) {
      console.error('❌ Error en función SQL:', error);
      throw error;
    }

    let sesiones = (data || []).map((s: any) => ({
      sesion_id: s.sesion_id,
      usuario_paquete_id: s.referencia_id || s.usuario_paquete_id,
      usuario_id: s.usuario_id,
      usuario_nombre: s.usuario_nombre,
      username: s.username || s.usuario_nombre,
      fecha_programada: s.fecha_programada,
      contenido_tipo: s.contenido_tipo,
      contenido_id: s.contenido_id,
      contenido_nombre: s.contenido_nombre,
      estado: s.estado,
      terapeuta_nombre: s.terapeuta_nombre,
      paquete_nombre: s.paquete_nombre,
      tipo_programa: s.tipo_programa || 'paquete',
      origen: s.origen || 'paquete',
      progreso: s.progreso || 0,
      calificacion: s.calificacion,
      comentarios: s.comentarios,
      puede_modificar: s.puede_modificar || this.puedeModificarSesion(s.usuario_id, currentUser)
    }));

    // Aplicar filtros adicionales
    sesiones = this.aplicarFiltrosAdicionales(sesiones, filtros);

    console.log('✅ Sesiones obtenidas con función SQL:', sesiones.length);
    return sesiones;
  }

  /**
   * Método de respaldo usando vistas directas
   */
  private async obtenerCalendarioFallback(
    currentUser: any, 
    filtros: FiltrosCalendarioPaquetes
  ): Promise<SesionPaqueteCalendario[]> {
    
    console.log('🔄 Usando método de respaldo con vistas directas');

    let query = this.supabaseService.client
      .from('vista_calendario_paquetes_usuario')
      .select('*');

    // Filtros por perfil del usuario
    if (currentUser.id_perfil === 2) {
      // Usuarios regulares solo ven sus propias sesiones
      query = query.eq('usuario_id', currentUser.id);
    } else if (filtros.usuarioId) {
      // Admin/Supervisor pueden filtrar por usuario específico
      query = query.eq('usuario_id', filtros.usuarioId);
    }

    // Aplicar filtros de fecha
    if (filtros.fechaDesde) {
      query = query.gte('fecha_programada', filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      query = query.lte('fecha_programada', filtros.fechaHasta);
    }

    // Aplicar otros filtros
    if (filtros.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros.tipo) {
      query = query.eq('contenido_tipo', filtros.tipo);
    }

    // Ordenar por fecha
    query = query.order('fecha_programada', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error en vista de respaldo:', error);
      throw error;
    }

    const sesiones = (data || []).map((s: any) => ({
      sesion_id: s.sesion_id,
      usuario_paquete_id: s.referencia_id || s.usuario_paquete_id,
      usuario_id: s.usuario_id,
      usuario_nombre: s.usuario_nombre,
      username: s.username || s.usuario_nombre,
      fecha_programada: s.fecha_programada,
      contenido_tipo: s.contenido_tipo,
      contenido_id: s.contenido_id,
      contenido_nombre: s.contenido_nombre,
      estado: s.estado,
      terapeuta_nombre: s.terapeuta_nombre,
      paquete_nombre: s.paquete_nombre,
      tipo_programa: s.tipo_programa || 'paquete',
      origen: s.origen || 'paquete',
      progreso: s.progreso || 0,
      calificacion: s.calificacion,
      comentarios: s.comentarios,
      puede_modificar: this.puedeModificarSesion(s.usuario_id, currentUser)
    }));

    console.log('✅ Sesiones obtenidas con vista de respaldo:', sesiones.length);
    return sesiones;
  }

  /**
   * Aplicar filtros adicionales a las sesiones
   */
  private aplicarFiltrosAdicionales(
    sesiones: SesionPaqueteCalendario[], 
    filtros: FiltrosCalendarioPaquetes
  ): SesionPaqueteCalendario[] {
    
    let sesionesFilteradas = [...sesiones];

    if (filtros.estado) {
      sesionesFilteradas = sesionesFilteradas.filter(s => s.estado === filtros.estado);
    }

    if (filtros.tipo) {
      sesionesFilteradas = sesionesFilteradas.filter(s => s.contenido_tipo === filtros.tipo);
    }

    return sesionesFilteradas;
  }

  /**
   * Determinar si el usuario puede modificar una sesión
   */
  private puedeModificarSesion(sesionUserId: number, currentUser: any): boolean {
    // Admin y Supervisor pueden modificar todo
    if ([1, 3].includes(currentUser.id_perfil)) {
      return true;
    }
    // Usuarios regulares solo pueden modificar sus propias sesiones
    return currentUser.id === sesionUserId;
  }

  // ===============================================
  // GESTIÓN DE SESIONES
  // ===============================================

  /**
   * Completar una sesión de paquete
   */
  async completarSesion(sesionId: number, datos?: {
    progreso?: number;
    calificacion?: number;
    comentarios?: string;
  }): Promise<void> {
    try {
      console.log('✅ Completando sesión:', sesionId, datos);

      const updateData: any = {
        estado: 'completada',
        fecha_completada: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (datos?.progreso !== undefined) updateData.progreso = datos.progreso;
      if (datos?.calificacion !== undefined) updateData.calificacion = datos.calificacion;
      if (datos?.comentarios) updateData.comentarios = datos.comentarios;

      const { error } = await this.supabaseService.client
        .from('paquete_seguimiento')
        .update(updateData)
        .eq('id', sesionId);

      if (error) throw error;

      console.log('✅ Sesión completada exitosamente');
    } catch (error) {
      console.error('💥 Error completando sesión:', error);
      throw error;
    }
  }

  /**
   * Cancelar una sesión de paquete
   */
  async cancelarSesion(sesionId: number, motivo?: string): Promise<void> {
    try {
      console.log('❌ Cancelando sesión:', sesionId, motivo);

      const updateData: any = {
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      };

      if (motivo) updateData.comentarios = motivo;

      const { error } = await this.supabaseService.client
        .from('paquete_seguimiento')
        .update(updateData)
        .eq('id', sesionId);

      if (error) throw error;

      console.log('✅ Sesión cancelada exitosamente');
    } catch (error) {
      console.error('💥 Error cancelando sesión:', error);
      throw error;
    }
  }

  /**
   * Reprogramar una sesión
   */
  async reprogramarSesion(sesionId: number, nuevaFecha: string): Promise<void> {
    try {
      console.log('📅 Reprogramando sesión:', sesionId, 'a:', nuevaFecha);

      const { error } = await this.supabaseService.client
        .from('paquete_seguimiento')
        .update({
          fecha_programada: nuevaFecha,
          updated_at: new Date().toISOString()
        })
        .eq('id', sesionId);

      if (error) throw error;

      console.log('✅ Sesión reprogramada exitosamente');
    } catch (error) {
      console.error('💥 Error reprogramando sesión:', error);
      throw error;
    }
  }

  // ===============================================
  // CONSULTAS AUXILIARES
  // ===============================================

  /**
   * Obtener usuarios para filtros (solo admin y supervisor)
   */
  async obtenerUsuariosParaFiltro(): Promise<{ id: number; nombre: string }[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      
      // Solo admin y supervisor pueden ver lista de usuarios
      if (!currentUser || ![1, 3].includes(currentUser.id_perfil)) {
        return [];
      }

      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, full_name, username')
        .eq('status', 1)
        .order('full_name');

      if (error) throw error;

      return (data || []).map(user => ({
        id: user.id,
        nombre: user.full_name || user.username || `Usuario ${user.id}`
      }));
    } catch (error) {
      console.error('💥 Error obteniendo usuarios:', error);
      return [];
    }
  }

  /**
   * Obtener paquetes activos para filtros
   */
  async obtenerPaquetesParaFiltro(): Promise<{ id: number; nombre: string; tipo: string }[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .select('id, nombre, tipo')
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('💥 Error obteniendo paquetes:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas del calendario
   */
  async obtenerEstadisticasCalendario(filtros: FiltrosCalendarioPaquetes = {}): Promise<EstadisticasCalendarioPaquetes> {
    try {
      const sesiones = await this.obtenerCalendarioPaquetes(filtros);
      const hoy = new Date().toISOString().split('T')[0];

      const estadisticas: EstadisticasCalendarioPaquetes = {
        totalSesiones: sesiones.length,
        sesionesCompletadas: sesiones.filter(s => s.estado === 'completada').length,
        sesionesPendientes: sesiones.filter(s => s.estado === 'pendiente').length,
        sesionesCanceladas: sesiones.filter(s => s.estado === 'cancelada').length,
        progresoPromedio: this.calcularProgresoPromedio(sesiones),
        proximasSesiones: sesiones
          .filter(s => s.estado === 'pendiente' && s.fecha_programada >= hoy)
          .slice(0, 5),
        sesionesHoy: sesiones.filter(s => s.fecha_programada === hoy)
      };

      return estadisticas;
    } catch (error) {
      console.error('💥 Error obteniendo estadísticas:', error);
      return {
        totalSesiones: 0,
        sesionesCompletadas: 0,
        sesionesPendientes: 0,
        sesionesCanceladas: 0,
        progresoPromedio: 0,
        proximasSesiones: [],
        sesionesHoy: []
      };
    }
  }

  /**
   * Calcular progreso promedio de las sesiones
   */
  private calcularProgresoPromedio(sesiones: SesionPaqueteCalendario[]): number {
    const sesionesConProgreso = sesiones.filter(s => s.progreso !== undefined && s.progreso > 0);
    if (sesionesConProgreso.length === 0) return 0;
    
    const sumaProgreso = sesionesConProgreso.reduce((sum, s) => sum + (s.progreso || 0), 0);
    return Math.round(sumaProgreso / sesionesConProgreso.length);
  }

  /**
   * Obtener detalles de una sesión específica
   */
  async obtenerDetalleSesion(sesionId: number): Promise<SesionPaqueteCalendario | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('vista_calendario_paquetes_usuario')
        .select('*')
        .eq('sesion_id', sesionId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const currentUser = this.authService.getCurrentUser();
      
      return {
        sesion_id: data.sesion_id,
        usuario_paquete_id: data.usuario_paquete_id,
        usuario_id: data.usuario_id,
        usuario_nombre: data.usuario_nombre,
        username: data.username,
        fecha_programada: data.fecha_programada,
        contenido_tipo: data.contenido_tipo,
        contenido_id: data.contenido_id,
        contenido_nombre: data.contenido_nombre,
        estado: data.estado,
        terapeuta_nombre: data.terapeuta_nombre,
        paquete_nombre: data.paquete_nombre,
        tipo_programa: data.tipo_programa,
        origen: data.origen,
        progreso: data.progreso,
        calificacion: data.calificacion,
        comentarios: data.comentarios,
        puede_modificar: this.puedeModificarSesion(data.usuario_id, currentUser)
      };
    } catch (error) {
      console.error('💥 Error obteniendo detalle de sesión:', error);
      return null;
    }
  }

  // ===============================================
  // MÉTODOS DE UTILIDAD
  // ===============================================

  /**
   * Verificar si hay sesiones para el usuario actual
   */
  async tieneSesionesActivas(): Promise<boolean> {
    try {
      const filtros: FiltrosCalendarioPaquetes = {
        fechaDesde: new Date().toISOString().split('T')[0],
        estado: 'pendiente'
      };
      
      const sesiones = await this.obtenerCalendarioPaquetes(filtros);
      return sesiones.length > 0;
    } catch (error) {
      console.error('💥 Error verificando sesiones activas:', error);
      return false;
    }
  }

  /**
   * Obtener próximas sesiones para dashboard
   */
  async obtenerProximasSesionesDashboard(limite: number = 3): Promise<SesionPaqueteCalendario[]> {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const filtros: FiltrosCalendarioPaquetes = {
        fechaDesde: hoy,
        estado: 'pendiente'
      };
      
      const sesiones = await this.obtenerCalendarioPaquetes(filtros);
      return sesiones.slice(0, limite);
    } catch (error) {
      console.error('💥 Error obteniendo próximas sesiones:', error);
      return [];
    }
  }
}