// src/app/services/terapias-asignacion.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import {
  TerapiaAsignacionMasiva,
  TerapiaSeguimientoIndividual,
  TerapiaAsignadaUsuario,
  EstadisticasTerapias
} from '../interfaces/terapias.interfaces';

@Injectable({
  providedIn: 'root'
})
export class TerapiasAsignacionService {

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // ===============================================
  // ASIGNACIÓN MASIVA DE TERAPIAS
  // ===============================================

  async asignarTerapiaMasiva(asignacion: TerapiaAsignacionMasiva): Promise<void> {
    try {
      // 1. Crear la asignación masiva
      const asignacionData = await this.supabaseService.insertData('terapia_asignaciones_masivas', asignacion);
      
      if (!asignacionData || !asignacionData[0]) {
        throw new Error('Error creando la asignación masiva');
      }

      const asignacionId = asignacionData[0].id;

      // 2. Crear registros individuales para cada usuario
      const seguimientosIndividuales = asignacion.usuarios_asignados.map(userId => ({
        id_asignacion_masiva: asignacionId,
        id_profile: userId,
        id_terapia: asignacion.id_terapia,
        progreso: 0,
        estado_individual: 'pendiente',
        adherencia_porcentaje: 0,
        sesiones_completadas: 0,
        sesiones_programadas: this.calcularSesionesProgramadas(
          asignacion.fecha_inicio.toString(), 
          asignacion.fecha_fin.toString()
        ),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Insertar seguimientos individuales uno por uno
      for (const seguimiento of seguimientosIndividuales) {
        await this.supabaseService.insertData('terapia_seguimiento_individual', seguimiento);
      }

    } catch (error) {
      console.error('Error en asignarTerapiaMasiva:', error);
      throw error;
    }
  }

  async obtenerAsignacionesMasivas(): Promise<TerapiaAsignacionMasiva[]> {
    try {
      const data = await this.supabaseService.getData('terapia_asignaciones_masivas');
      return this.supabaseService.ensureArray(data);
    } catch (error) {
      console.error('Error obteniendo asignaciones masivas:', error);
      return [];
    }
  }



  // ===============================================
  // SEGUIMIENTO INDIVIDUAL
  // ===============================================



  async actualizarProgresoIndividual(idSeguimiento: number, progreso: number): Promise<void> {
    try {
      const updateData: any = {
        progreso: progreso,
        updated_at: new Date().toISOString()
      };

      // Si el progreso es 100%, marcar como completada
      if (progreso >= 100) {
        updateData.estado_individual = 'completada';
        updateData.fecha_fin_real = new Date().toISOString();
      }

      await this.supabaseService.updateData(
        'terapia_seguimiento_individual', 
        idSeguimiento.toString(), 
        updateData
      );
    } catch (error) {
      console.error('Error actualizando progreso individual:', error);
      throw error;
    }
  }

  async actualizarEstadoIndividual(
    idSeguimiento: number, 
    estado: string, 
    datos?: any
  ): Promise<void> {
    try {
      const updateData: any = {
        estado_individual: estado,
        updated_at: new Date().toISOString(),
        ...datos
      };

      await this.supabaseService.updateData(
        'terapia_seguimiento_individual',
        idSeguimiento.toString(),
        updateData
      );
    } catch (error) {
      console.error('Error actualizando estado individual:', error);
      throw error;
    }
  }

  // ===============================================
  // OBTENER DATOS RELACIONADOS
  // ===============================================

  

 

  // ===============================================
  // ESTADÍSTICAS
  // ===============================================

  async obtenerEstadisticasGlobales(): Promise<EstadisticasTerapias> {
    try {
      const [asignaciones, seguimientos] = await Promise.all([
        this.supabaseService.getData('terapia_asignaciones_masivas'),
        this.supabaseService.getData('terapia_seguimiento_individual')
      ]);

      const asignacionesArray = this.supabaseService.ensureArray(asignaciones);
      const seguimientosArray = this.supabaseService.ensureArray(seguimientos);

      const totalAsignaciones = asignacionesArray.length;
      const asignacionesActivas = asignacionesArray.filter(a => a.estado === 'activa').length;
      const asignacionesGrupales = asignacionesArray.filter(a => a.tipo_asignacion === 'grupal').length;
      const asignacionesIndividuales = asignacionesArray.filter(a => a.tipo_asignacion === 'individual').length;

      const usuariosConTerapias = new Set(seguimientosArray.map(s => s.id_profile)).size;

      const progresoPromedio = seguimientosArray.length > 0
        ? Math.round(seguimientosArray.reduce((acc, s) => acc + (s.progreso || 0), 0) / seguimientosArray.length)
        : 0;

      const adherenciaPromedio = seguimientosArray.length > 0
        ? Math.round(seguimientosArray.reduce((acc, s) => acc + (s.adherencia_porcentaje || 0), 0) / seguimientosArray.length)
        : 0;

      const sesionesTotalesCompletadas = seguimientosArray.reduce((acc, s) => acc + (s.sesiones_completadas || 0), 0);
      const sesionesTotalesProgramadas = seguimientosArray.reduce((acc, s) => acc + (s.sesiones_programadas || 0), 0);

      return {
        total_asignaciones: totalAsignaciones,
        asignaciones_activas: asignacionesActivas,
        asignaciones_grupales: asignacionesGrupales,
        asignaciones_individuales: asignacionesIndividuales,
        usuarios_con_terapias: usuariosConTerapias,
        terapias_mas_asignadas: 0, // Calcular si es necesario
        promedio_progreso: progresoPromedio,
        promedio_adherencia: adherenciaPromedio,
        sesiones_totales_completadas: sesionesTotalesCompletadas,
        sesiones_totales_programadas: sesionesTotalesProgramadas
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas globales:', error);
      return this.getEstadisticasVacias();
    }
  }

  async obtenerEstadisticasUsuario(idUsuario: number): Promise<any> {
    try {
      const seguimientos = await this.obtenerTerapiasAsignadasUsuario(idUsuario);
      
      const terapiasAsignadas = seguimientos.length;
      const terapiasCompletadas = seguimientos.filter(s => s.estado_individual === 'completada').length;
      const progresoPromedio = seguimientos.length > 0
        ? Math.round(seguimientos.reduce((acc, s) => acc + s.progreso, 0) / seguimientos.length)
        : 0;
      const adherenciaPromedio = seguimientos.length > 0
        ? Math.round(seguimientos.reduce((acc, s) => acc + s.adherencia_porcentaje, 0) / seguimientos.length)
        : 0;

      return {
        terapiasAsignadas,
        terapiasCompletadas,
        progresoPromedio,
        adherenciaPromedio
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas del usuario:', error);
      return {
        terapiasAsignadas: 0,
        terapiasCompletadas: 0,
        progresoPromedio: 0,
        adherenciaPromedio: 0
      };
    }
  }

  // ===============================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ===============================================

  private calcularSesionesProgramadas(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferenciaDias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    
    // Asumir 3 sesiones por semana
    return Math.ceil((diferenciaDias / 7) * 3);
  }

  private calcularAdherencia(seguimiento: any): number {
    if (!seguimiento.sesiones_programadas || seguimiento.sesiones_programadas === 0) {
      return 0;
    }
    return Math.round((seguimiento.sesiones_completadas / seguimiento.sesiones_programadas) * 100);
  }

  private calcularDiasTranscurridos(fechaCreacion: string): number {
    const creacion = new Date(fechaCreacion);
    const hoy = new Date();
    return Math.ceil((hoy.getTime() - creacion.getTime()) / (1000 * 60 * 60 * 24));
  }

  private procesarTerapiasAsignadas(datos: any[]): TerapiaAsignadaUsuario[] {
    return datos.map(item => ({
      seguimiento_id: item.id,
      asignacion_id: item.id_asignacion_masiva,
      id_terapia: item.id_terapia,
      id_profile: item.id_profile,
      username: item.profiles?.username || '',
      full_name: item.profiles?.full_name || '',
      terapia_nombre: item.terapias?.nombre || '',
      terapia_descripcion: item.terapias?.descripcion || '',
      terapia_tipo: item.terapias?.tipo || '',
      area_especializacion: item.terapias?.area_especializacion || '',
      terapia_nivel: item.terapias?.nivel || '',
      duracion_estimada: item.terapias?.duracion_estimada || 0,
      tipo_asignacion: item.terapia_asignaciones_masivas?.tipo_asignacion || '',
      sesiones_por_semana: item.terapia_asignaciones_masivas?.sesiones_por_semana || 0,
      duracion_sesion: item.terapia_asignaciones_masivas?.duracion_sesion || 0,
      fecha_inicio_programada: item.terapia_asignaciones_masivas?.fecha_inicio || new Date(),
      fecha_fin_programada: item.terapia_asignaciones_masivas?.fecha_fin || new Date(),
      fecha_inicio_real: item.fecha_inicio_real || undefined,
      fecha_fin_real: item.fecha_fin_real || undefined,
      estado_asignacion: item.terapia_asignaciones_masivas?.estado || '',
      estado_individual: item.estado_individual || '',
      progreso: item.progreso || 0,
      sesiones_completadas: item.sesiones_completadas || 0,
      sesiones_programadas: item.sesiones_programadas || 0,
      adherencia_porcentaje: item.adherencia_porcentaje || 0,
      nivel_dolor_inicial: item.nivel_dolor_inicial,
      nivel_dolor_actual: item.nivel_dolor_actual,
      nivel_funcionalidad_inicial: item.nivel_funcionalidad_inicial,
      nivel_funcionalidad_actual: item.nivel_funcionalidad_actual,
      notas_asignacion: item.terapia_asignaciones_masivas?.notas || '',
      notas_individuales: item.notas_individuales || '',
      objetivos_individuales: item.objetivos_individuales || '',
      asignado_por_nombre: 'Usuario', // Obtener del JOIN si es necesario
      terapeuta_nombre: 'Terapeuta', // Obtener del JOIN si es necesario
      fecha_asignacion: item.terapia_asignaciones_masivas?.created_at || '',
      fecha_inicio_seguimiento: item.created_at || '',
      ultima_actualizacion: item.updated_at || '',
      estado_temporal: this.calcularEstadoTemporal(item.terapia_asignaciones_masivas?.fecha_fin),
      dias_restantes: this.calcularDiasRestantes(item.terapia_asignaciones_masivas?.fecha_fin),
      duracion_total_dias: this.calcularDuracionTotal(
        item.terapia_asignaciones_masivas?.fecha_inicio,
        item.terapia_asignaciones_masivas?.fecha_fin
      ),
      sesiones_totales_estimadas: item.sesiones_programadas || 0,
      progreso_sesiones_porcentaje: this.calcularProgreseSesiones(item.sesiones_completadas, item.sesiones_programadas)
    }));
  }

  private calcularEstadoTemporal(fechaFin: string): 'vigente' | 'pendiente' | 'vencida' {
    if (!fechaFin) return 'pendiente';
    
    const fin = new Date(fechaFin);
    const hoy = new Date();
    
    if (hoy > fin) return 'vencida';
    return 'vigente';
  }

  private calcularDiasRestantes(fechaFin: string): number {
    if (!fechaFin) return 0;
    
    const fin = new Date(fechaFin);
    const hoy = new Date();
    const diferencia = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diferencia);
  }

  private calcularDuracionTotal(fechaInicio: string, fechaFin: string): number {
    if (!fechaInicio || !fechaFin) return 0;
    
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    return Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calcularProgreseSesiones(completadas: number, programadas: number): number {
    if (!programadas || programadas === 0) return 0;
    return Math.round((completadas / programadas) * 100);
  }

  private getEstadisticasVacias(): EstadisticasTerapias {
    return {
      total_asignaciones: 0,
      asignaciones_activas: 0,
      asignaciones_grupales: 0,
      asignaciones_individuales: 0,
      usuarios_con_terapias: 0,
      terapias_mas_asignadas: 0,
      promedio_progreso: 0,
      promedio_adherencia: 0,
      sesiones_totales_completadas: 0,
      sesiones_totales_programadas: 0
    };
  }


  // src/app/services/terapias-asignacion.service.ts
// REEMPLAZAR estos métodos específicos:

async obtenerSeguimientoIndividual(idAsignacionMasiva: number, idProfile: number): Promise<TerapiaSeguimientoIndividual | null> {
  try {
    const { data: seguimientos, error } = await this.supabaseService.client
      .from('terapia_seguimiento_individual')
      .select('*')
      .eq('id_asignacion_masiva', idAsignacionMasiva)
      .eq('id_profile', idProfile);

    if (error) throw error;
    
    return seguimientos && seguimientos.length > 0 ? seguimientos[0] : null;
  } catch (error) {
    console.error('Error obteniendo seguimiento individual:', error);
    return null;
  }
}

async obtenerTerapiasAsignadasUsuario(idUsuario: number): Promise<TerapiaAsignadaUsuario[]> {
  try {
    const { data, error } = await this.supabaseService.client
      .from('terapia_seguimiento_individual')
      .select(`
        *,
        terapia_asignaciones_masivas(*),
        profiles(username, full_name),
        terapias(nombre, descripcion, tipo, area_especializacion, nivel, duracion_estimada)
      `)
      .eq('id_profile', idUsuario);

    if (error) throw error;

    return this.procesarTerapiasAsignadas(data || []);
  } catch (error) {
    console.error('Error obteniendo terapias asignadas del usuario:', error);
    return [];
  }
}

async obtenerTodosLosSeguimientos(): Promise<TerapiaAsignadaUsuario[]> {
  try {
    const { data: seguimientos, error } = await this.supabaseService.client
      .from('terapia_seguimiento_individual')
      .select(`
        *,
        terapia_asignaciones_masivas(*),
        profiles(full_name, username),
        terapias(nombre, descripcion, tipo, area_especializacion, nivel, duracion_estimada)
      `);

    if (error) throw error;
    
    return this.procesarTerapiasAsignadas(this.supabaseService.ensureArray(seguimientos));
  } catch (error) {
    console.error('Error obteniendo todos los seguimientos:', error);
    return [];
  }
}

async cancelarAsignacionMasiva(idAsignacion: number): Promise<void> {
  try {
    await this.supabaseService.updateData(
      'terapia_asignaciones_masivas',
      idAsignacion.toString(),
      {
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      }
    );

    // También actualizar los seguimientos individuales
    const { data: seguimientos } = await this.supabaseService.client
      .from('terapia_seguimiento_individual')
      .select('id')
      .eq('id_asignacion_masiva', idAsignacion);

    if (seguimientos) {
      for (const seguimiento of seguimientos) {
        await this.supabaseService.updateData(
          'terapia_seguimiento_individual',
          seguimiento.id.toString(),
          {
            estado_individual: 'cancelada',
            updated_at: new Date().toISOString()
          }
        );
      }
    }
  } catch (error) {
    console.error('Error cancelando asignación masiva:', error);
    throw error;
  }
}
}