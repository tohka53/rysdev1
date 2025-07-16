// src/app/services/rutinas.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { 
  Rutina,
  RutinaAsignacionMasiva,
  RutinaSeguimientoIndividual,
  RutinaAsignadaVista,
  AsignacionMasivaRequest,
  ActualizarProgresoRequest,
  FiltrosRutinas,
  EstadisticasRutinas,
  RespuestaOperacionMasiva,
  ReporteDetallado,
  TendenciaProgreso,
  ConflictoHorario,
  AnalisisUsuario,
  EventoCalendario,
  CriteriosBusquedaAvanzada
} from '../interfaces/rutina-profile.interfaces';

@Injectable({
  providedIn: 'root'
})
export class RutinasService {

  constructor(
    public supabaseService: SupabaseService, // Público para acceso desde componentes
    private authService: AuthService
  ) {}

  // ================================
  // CRUD RUTINAS BÁSICAS
  // ================================

  async getRutinas(): Promise<Rutina[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutinas')
        .select('*')
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo rutinas:', error);
      throw error;
    }
  }

  async getRutinaById(id: number): Promise<Rutina | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutinas')
        .select('*')
        .eq('id', id)
        .eq('status', 1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo rutina:', error);
      return null;
    }
  }

  async createRutina(rutina: Rutina): Promise<Rutina | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutinas')
        .insert(rutina)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creando rutina:', error);
      throw error;
    }
  }

  async updateRutina(id: number, rutina: Partial<Rutina>): Promise<Rutina | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutinas')
        .update({ ...rutina, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando rutina:', error);
      throw error;
    }
  }

  async deleteRutina(id: number): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('rutinas')
        .update({ status: 0 })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando rutina:', error);
      throw error;
    }
  }

  // ================================
  // ASIGNACIÓN MASIVA (OPCIÓN 2)
  // ================================

  async asignarRutinaMasiva(asignacion: AsignacionMasivaRequest): Promise<number> {
    try {
      // Si la función PostgreSQL existe, usarla
      const { data, error } = await this.supabaseService.client
        .rpc('asignar_rutina_masiva', {
          p_id_rutina: asignacion.id_rutina,
          p_usuarios_ids: asignacion.usuarios_ids,
          p_asignado_por: asignacion.asignado_por,
          p_fecha_inicio: asignacion.fecha_inicio,
          p_fecha_fin: asignacion.fecha_fin,
          p_notas: asignacion.notas
        });

      if (error) {
        // Si la función no existe, hacerlo manualmente
        console.log('Función PostgreSQL no disponible, creando asignación manual');
        return await this.asignarRutinaMasivaManual(asignacion);
      }
      
      return data;
    } catch (error) {
      console.error('Error asignando rutina masiva:', error);
      // Fallback manual si la función PostgreSQL falla
      return await this.asignarRutinaMasivaManual(asignacion);
    }
  }

  // Método manual para asignación masiva (fallback)
  private async asignarRutinaMasivaManual(asignacion: AsignacionMasivaRequest): Promise<number> {
    try {
      // 1. Crear registro en rutina_asignaciones_masivas
      const { data: asignacionMasiva, error: errorAsignacion } = await this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .insert({
          id_rutina: asignacion.id_rutina,
          usuarios_asignados: asignacion.usuarios_ids,
          asignado_por: asignacion.asignado_por,
          fecha_inicio: asignacion.fecha_inicio,
          fecha_fin: asignacion.fecha_fin,
          estado: 'activa',
          notas: asignacion.notas
        })
        .select()
        .single();

      if (errorAsignacion) throw errorAsignacion;

      // 2. Crear registros de seguimiento individual
      const seguimientosIndividuales = asignacion.usuarios_ids.map(userId => ({
        id_asignacion_masiva: asignacionMasiva.id,
        id_profile: userId,
        id_rutina: asignacion.id_rutina,
        progreso: 0,
        estado_individual: 'pendiente'
      }));

      const { error: errorSeguimiento } = await this.supabaseService.client
        .from('rutina_seguimiento_individual')
        .insert(seguimientosIndividuales);

      if (errorSeguimiento) throw errorSeguimiento;

      return asignacionMasiva.id;
    } catch (error) {
      console.error('Error en asignación manual:', error);
      throw error;
    }
  }

  async getAsignacionesMasivas(): Promise<RutinaAsignacionMasiva[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .select(`
          *,
          rutinas!inner(nombre, descripcion, tipo, nivel),
          profiles!inner(full_name)
        `)
        .eq('status', 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo asignaciones masivas:', error);
      throw error;
    }
  }

  async getRutinasAsignadasExpandidas(): Promise<RutinaAsignadaVista[]> {
    try {
      // Intentar usar la vista primero
      const { data, error } = await this.supabaseService.client
        .from('v_rutinas_masivas_expandidas')
        .select('*')
        .order('fecha_asignacion', { ascending: false });

      if (error) {
        // Si la vista no existe, construir datos manualmente
        console.log('Vista no disponible, construyendo datos manualmente');
        return await this.getRutinasAsignadasManual();
      }

      return data || [];
    } catch (error) {
      console.error('Error obteniendo rutinas asignadas expandidas:', error);
      return await this.getRutinasAsignadasManual();
    }
  }

  // Método manual para obtener rutinas asignadas (fallback)
  private async getRutinasAsignadasManual(): Promise<RutinaAsignadaVista[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutina_seguimiento_individual')
        .select(`
          id,
          id_asignacion_masiva,
          id_profile,
          id_rutina,
          progreso,
          estado_individual,
          fecha_inicio_real,
          fecha_fin_real,
          notas_individuales,
          created_at,
          updated_at,
          rutina_asignaciones_masivas!inner(
            id,
            fecha_inicio,
            fecha_fin,
            notas,
            created_at,
            profiles!inner(full_name)
          ),
          profiles!inner(
            username,
            full_name
          ),
          rutinas!inner(
            nombre,
            descripcion,
            tipo,
            nivel,
            duracion_estimada
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar datos al formato esperado
      return (data || []).map(item => ({
        seguimiento_id: item.id,
        asignacion_masiva_id: item.id_asignacion_masiva,
        id_rutina: item.id_rutina,
        id_profile: item.id_profile,
        tipo_asignacion: 'masiva' as const,
        username: item.profiles.username,
        full_name: item.profiles.full_name,
        rutina_nombre: item.rutinas.nombre,
        rutina_descripcion: item.rutinas.descripcion,
        rutina_tipo: item.rutinas.tipo,
        rutina_nivel: item.rutinas.nivel,
        duracion_estimada: item.rutinas.duracion_estimada,
        fecha_inicio: item.rutina_asignaciones_masivas.fecha_inicio,
        fecha_fin: item.rutina_asignaciones_masivas.fecha_fin,
        estado_individual: item.estado_individual,
        progreso: item.progreso,
        fecha_inicio_real: item.fecha_inicio_real,
        fecha_fin_real: item.fecha_fin_real,
        notas_asignacion: item.rutina_asignaciones_masivas.notas,
        notas_individuales: item.notas_individuales,
        asignado_por_nombre: item.rutina_asignaciones_masivas.profiles.full_name,
        fecha_asignacion: item.rutina_asignaciones_masivas.created_at,
        fecha_inicio_seguimiento: item.created_at,
        estado_temporal: this.calcularEstadoTemporal(
          item.rutina_asignaciones_masivas.fecha_inicio,
          item.rutina_asignaciones_masivas.fecha_fin
        )
      }));
    } catch (error) {
      console.error('Error obteniendo rutinas asignadas manual:', error);
      return [];
    }
  }

  private calcularEstadoTemporal(fechaInicio: string, fechaFin: string): 'vigente' | 'pendiente' | 'vencida' {
    const ahora = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (ahora < inicio) return 'pendiente';
    if (ahora > fin) return 'vencida';
    return 'vigente';
  }

  async getRutinasUsuario(userId: number): Promise<RutinaAsignadaVista[]> {
    try {
      // Intentar usar función PostgreSQL primero
      const { data, error } = await this.supabaseService.client
        .rpc('get_rutinas_usuario', { p_user_id: userId });

      if (error) {
        // Fallback manual
        const todasLasRutinas = await this.getRutinasAsignadasExpandidas();
        return todasLasRutinas.filter(rutina => rutina.id_profile === userId);
      }

      return data || [];
    } catch (error) {
      console.error('Error obteniendo rutinas del usuario:', error);
      const todasLasRutinas = await this.getRutinasAsignadasExpandidas();
      return todasLasRutinas.filter(rutina => rutina.id_profile === userId);
    }
  }

  // ================================
  // SEGUIMIENTO INDIVIDUAL
  // ================================

  async actualizarProgresoUsuario(
    seguimientoId: number, 
    progreso: number, 
    estado?: string,
    notas?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { 
        progreso,
        updated_at: new Date().toISOString()
      };
      
      if (estado) updateData.estado_individual = estado;
      if (notas) updateData.notas_individuales = notas;
      
      // Si el progreso es 100, marcar como completada
      if (progreso === 100) {
        updateData.estado_individual = 'completada';
        updateData.fecha_fin_real = new Date().toISOString().split('T')[0];
      }
      
      // Si es la primera vez que se actualiza, marcar fecha de inicio
      if (progreso > 0) {
        const { data: current } = await this.supabaseService.client
          .from('rutina_seguimiento_individual')
          .select('fecha_inicio_real')
          .eq('id', seguimientoId)
          .single();
        
        if (current && !current.fecha_inicio_real) {
          updateData.fecha_inicio_real = new Date().toISOString().split('T')[0];
          updateData.estado_individual = 'en_progreso';
        }
      }

      const { error } = await this.supabaseService.client
        .from('rutina_seguimiento_individual')
        .update(updateData)
        .eq('id', seguimientoId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error actualizando progreso:', error);
      throw error;
    }
  }

  async abandonarRutina(seguimientoId: number, motivo?: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('rutina_seguimiento_individual')
        .update({
          estado_individual: 'abandonada',
          fecha_fin_real: new Date().toISOString().split('T')[0],
          notas_individuales: motivo || 'Rutina abandonada',
          updated_at: new Date().toISOString()
        })
        .eq('id', seguimientoId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error abandonando rutina:', error);
      throw error;
    }
  }

  // ================================
  // ESTADÍSTICAS Y REPORTES
  // ================================

  async getEstadisticasRutinas(): Promise<EstadisticasRutinas> {
    try {
      const rutinasAsignadas = await this.getRutinasAsignadasExpandidas();

      const estadisticas = {
        total_asignaciones: rutinasAsignadas.length,
        completadas: rutinasAsignadas.filter(r => r.estado_individual === 'completada').length,
        en_progreso: rutinasAsignadas.filter(r => r.estado_individual === 'en_progreso').length,
        pendientes: rutinasAsignadas.filter(r => r.estado_individual === 'pendiente').length,
        abandonadas: rutinasAsignadas.filter(r => r.estado_individual === 'abandonada').length,
        vigentes: rutinasAsignadas.filter(r => r.estado_temporal === 'vigente').length,
        vencidas: rutinasAsignadas.filter(r => r.estado_temporal === 'vencida').length,
        promedio_progreso: rutinasAsignadas.length > 0 
          ? rutinasAsignadas.reduce((sum, r) => sum + r.progreso, 0) / rutinasAsignadas.length 
          : 0,
        por_tipo: this.agruparPorTipo(rutinasAsignadas),
        asignaciones_finalizadas: rutinasAsignadas.filter(r => 
          r.estado_individual === 'completada' || r.estado_individual === 'abandonada'
        ).length
      };

      return estadisticas;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  private agruparPorTipo(data: RutinaAsignadaVista[]): any {
    const tipos = {};
    data.forEach(item => {
      if (!tipos[item.rutina_tipo]) {
        tipos[item.rutina_tipo] = {
          total: 0,
          completadas: 0,
          en_progreso: 0,
          promedio_progreso: 0
        };
      }
      tipos[item.rutina_tipo].total++;
      if (item.estado_individual === 'completada') tipos[item.rutina_tipo].completadas++;
      if (item.estado_individual === 'en_progreso') tipos[item.rutina_tipo].en_progreso++;
    });

    // Calcular promedios
    Object.keys(tipos).forEach(tipo => {
      const itemsTipo = data.filter(item => item.rutina_tipo === tipo);
      tipos[tipo].promedio_progreso = itemsTipo.reduce((sum, item) => sum + item.progreso, 0) / itemsTipo.length;
    });

    return tipos;
  }

  async getUsuariosDisponibles(): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, id_perfil')
        .eq('status', 1)
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo usuarios disponibles:', error);
      throw error;
    }
  }

  // ================================
  // MÉTODOS DE GESTIÓN MASIVA
  // ================================

  async actualizarProgresoMasivo(seguimientosIds: number[], progreso: number): Promise<RespuestaOperacionMasiva> {
    let exitosas = 0;
    let fallidas = 0;
    const errores: string[] = [];

    for (const seguimientoId of seguimientosIds) {
      try {
        await this.actualizarProgresoUsuario(seguimientoId, progreso);
        exitosas++;
      } catch (error) {
        fallidas++;
        errores.push(`Seguimiento ${seguimientoId}: ${error}`);
      }
    }

    return { exitosas, fallidas, errores };
  }

  async eliminarAsignacionesMasivas(seguimientosIds: number[]): Promise<RespuestaOperacionMasiva> {
    let exitosas = 0;
    let fallidas = 0;
    const errores: string[] = [];

    for (const seguimientoId of seguimientosIds) {
      try {
        const { error } = await this.supabaseService.client
          .from('rutina_seguimiento_individual')
          .delete()
          .eq('id', seguimientoId);

        if (error) throw error;
        exitosas++;
      } catch (error) {
        fallidas++;
        errores.push(`Seguimiento ${seguimientoId}: ${error}`);
      }
    }

    return { exitosas, fallidas, errores };
  }

  // ================================
  // REPORTES Y ANÁLISIS
  // ================================

  generarReporteDetallado(rutinasAsignadas: RutinaAsignadaVista[]): ReporteDetallado {
    const estadisticas = this.calcularEstadisticasDetalladas(rutinasAsignadas);
    const tendencia = this.obtenerTendenciaProgreso(rutinasAsignadas);
    const conflictos = this.obtenerConflictosHorarios(rutinasAsignadas);
    const analisisPorUsuario = this.calcularAnalisisPorUsuario(rutinasAsignadas);

    return {
      resumenGeneral: estadisticas,
      tendenciaProgreso: tendencia,
      conflictosHorarios: conflictos,
      analisisPorUsuario,
      fechaGeneracion: new Date().toISOString()
    };
  }

  private calcularEstadisticasDetalladas(asignaciones: RutinaAsignadaVista[]): EstadisticasRutinas {
    if (asignaciones.length === 0) {
      return {
        total_asignaciones: 0,
        completadas: 0,
        en_progreso: 0,
        pendientes: 0,
        abandonadas: 0,
        vigentes: 0,
        vencidas: 0,
        promedio_progreso: 0,
        por_tipo: {},
        asignaciones_finalizadas: 0
      };
    }

    return {
      total_asignaciones: asignaciones.length,
      completadas: asignaciones.filter(a => a.estado_individual === 'completada').length,
      en_progreso: asignaciones.filter(a => a.estado_individual === 'en_progreso').length,
      pendientes: asignaciones.filter(a => a.estado_individual === 'pendiente').length,
      abandonadas: asignaciones.filter(a => a.estado_individual === 'abandonada').length,
      vigentes: asignaciones.filter(a => a.estado_temporal === 'vigente').length,
      vencidas: asignaciones.filter(a => a.estado_temporal === 'vencida').length,
      promedio_progreso: asignaciones.reduce((sum, a) => sum + a.progreso, 0) / asignaciones.length,
      por_tipo: this.agruparPorTipo(asignaciones),
      asignaciones_finalizadas: asignaciones.filter(a => 
        a.estado_individual === 'completada' || a.estado_individual === 'abandonada'
      ).length
    };
  }

  private obtenerTendenciaProgreso(asignaciones: RutinaAsignadaVista[]): TendenciaProgreso[] {
    const agrupados = asignaciones.reduce((acc, asignacion) => {
      const fecha = asignacion.fecha_inicio_seguimiento.split('T')[0];
      if (!acc[fecha]) {
        acc[fecha] = { total: 0, suma: 0, fecha };
      }
      acc[fecha].total++;
      acc[fecha].suma += asignacion.progreso;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(agrupados)
      .map((grupo: any) => ({
        fecha: grupo.fecha,
        promedioProgreso: Math.round((grupo.suma / grupo.total) * 100) / 100,
        totalAsignaciones: grupo.total
      }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  private obtenerConflictosHorarios(asignaciones: RutinaAsignadaVista[]): ConflictoHorario[] {
    const usuariosConRutinas = asignaciones.reduce((acc, asignacion) => {
      const key = asignacion.id_profile;
      if (!acc[key]) {
        acc[key] = {
          usuario: asignacion.full_name,
          rutinas: []
        };
      }
      acc[key].rutinas.push(asignacion);
      return acc;
    }, {} as Record<number, any>);

    const conflictos = [];
    
    Object.values(usuariosConRutinas).forEach((usuario: any) => {
      if (usuario.rutinas.length > 1) {
        for (let i = 0; i < usuario.rutinas.length; i++) {
          for (let j = i + 1; j < usuario.rutinas.length; j++) {
            const rutina1 = usuario.rutinas[i];
            const rutina2 = usuario.rutinas[j];
            
            const inicio1 = new Date(rutina1.fecha_inicio);
            const fin1 = new Date(rutina1.fecha_fin);
            const inicio2 = new Date(rutina2.fecha_inicio);
            const fin2 = new Date(rutina2.fecha_fin);
            
            if (inicio1 <= fin2 && inicio2 <= fin1) {
              conflictos.push({
                usuario: usuario.usuario,
                rutina1: rutina1.rutina_nombre,
                rutina2: rutina2.rutina_nombre,
                periodo1: `${this.formatearFecha(rutina1.fecha_inicio)} - ${this.formatearFecha(rutina1.fecha_fin)}`,
                periodo2: `${this.formatearFecha(rutina2.fecha_inicio)} - ${this.formatearFecha(rutina2.fecha_fin)}`
              });
            }
          }
        }
      }
    });

    return conflictos;
  }

  private calcularAnalisisPorUsuario(asignaciones: RutinaAsignadaVista[]): AnalisisUsuario[] {
    const analisisPorUsuario = asignaciones.reduce((acc, asignacion) => {
      const key = asignacion.id_profile;
      if (!acc[key]) {
        acc[key] = {
          usuario: asignacion.full_name,
          username: asignacion.username,
          totalRutinas: 0,
          completadas: 0,
          enProgreso: 0,
          abandonadas: 0,
          progresoPromedio: 0,
          sumaProgreso: 0,
          tasaCompletitud: 0
        };
      }
      
      const analisis = acc[key];
      analisis.totalRutinas++;
      analisis.sumaProgreso += asignacion.progreso;
      
      switch (asignacion.estado_individual) {
        case 'completada': analisis.completadas++; break;
        case 'en_progreso': analisis.enProgreso++; break;
        case 'abandonada': analisis.abandonadas++; break;
      }
      
      return acc;
    }, {} as Record<number, any>);

    return Object.values(analisisPorUsuario).map((analisis: any) => ({
      usuario: analisis.usuario,
      username: analisis.username,
      totalRutinas: analisis.totalRutinas,
      completadas: analisis.completadas,
      enProgreso: analisis.enProgreso,
      abandonadas: analisis.abandonadas,
      progresoPromedio: Math.round((analisis.sumaProgreso / analisis.totalRutinas) * 100) / 100,
      tasaCompletitud: Math.round((analisis.completadas / analisis.totalRutinas) * 100)
    }));
  }

  // ================================
  // BÚSQUEDA Y FILTRADO
  // ================================

  busquedaAvanzada(asignaciones: RutinaAsignadaVista[], criterios: CriteriosBusquedaAvanzada): RutinaAsignadaVista[] {
    let resultados = [...asignaciones];

    if (criterios.texto) {
      const texto = criterios.texto.toLowerCase();
      resultados = resultados.filter(rutina =>
        rutina.rutina_nombre.toLowerCase().includes(texto) ||
        rutina.full_name.toLowerCase().includes(texto) ||
        rutina.username.toLowerCase().includes(texto) ||
        rutina.rutina_descripcion?.toLowerCase().includes(texto)
      );
    }

    if (criterios.progresoMin !== undefined || criterios.progresoMax !== undefined) {
      resultados = resultados.filter(rutina => {
        const progreso = rutina.progreso;
        const min = criterios.progresoMin || 0;
        const max = criterios.progresoMax || 100;
        return progreso >= min && progreso <= max;
      });
    }

    if (criterios.fechaDesde || criterios.fechaHasta) {
      resultados = resultados.filter(rutina => {
        const fechaInicio = new Date(rutina.fecha_inicio);
        const desde = criterios.fechaDesde ? new Date(criterios.fechaDesde) : new Date(0);
        const hasta = criterios.fechaHasta ? new Date(criterios.fechaHasta) : new Date();
        
        return fechaInicio >= desde && fechaInicio <= hasta;
      });
    }

    if (criterios.estados && criterios.estados.length > 0) {
      resultados = resultados.filter(rutina =>
        criterios.estados!.includes(rutina.estado_individual)
      );
    }

    if (criterios.tipos && criterios.tipos.length > 0) {
      resultados = resultados.filter(rutina =>
        criterios.tipos!.includes(rutina.rutina_tipo)
      );
    }

    return resultados;
  }

  // ================================
  // CALENDAR Y EVENTOS
  // ================================

  obtenerCalendarioRutinas(asignaciones: RutinaAsignadaVista[]): EventoCalendario[] {
    return asignaciones.map(asignacion => ({
      id: asignacion.seguimiento_id,
      title: `${asignacion.rutina_nombre} - ${asignacion.full_name}`,
      start: asignacion.fecha_inicio,
      end: asignacion.fecha_fin,
      color: this.getColorCalendario(asignacion.estado_individual),
      extendedProps: {
        usuario: asignacion.full_name,
        rutina: asignacion.rutina_nombre,
        progreso: asignacion.progreso,
        estado: asignacion.estado_individual
      }
    }));
  }

  private getColorCalendario(estado: string): string {
    switch (estado) {
      case 'completada': return '#10b981';
      case 'en_progreso': return '#3b82f6';
      case 'pendiente': return '#f59e0b';
      case 'abandonada': return '#ef4444';
      default: return '#6b7280';
    }
  }

  // ================================
  // MÉTODOS UTILITARIOS
  // ================================

  formatearFecha(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getColorEstado(estado: string): string {
    switch (estado) {
      case 'completada': return 'green';
      case 'en_progreso': return 'blue';
      case 'pendiente': return 'yellow';
      case 'abandonada': return 'red';
      default: return 'gray';
    }
  }

  getIconoEstado(estado: string): string {
    switch (estado) {
      case 'completada': return 'fas fa-check-circle';
      case 'en_progreso': return 'fas fa-play-circle';
      case 'pendiente': return 'fas fa-clock';
      case 'abandonada': return 'fas fa-times-circle';
      default: return 'fas fa-question-circle';
    }
  }

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

  getColorEstadoTemporal(estadoTemporal: string): string {
    switch (estadoTemporal) {
      case 'vigente': return 'green';
      case 'pendiente': return 'blue';
      case 'vencida': return 'red';
      default: return 'gray';
    }
  }

  // ================================
  // EXPORTACIÓN Y REPORTES
  // ================================

  async exportarReporteCompleto(asignaciones: RutinaAsignadaVista[]): Promise<string> {
    const reporte = this.generarReporteDetallado(asignaciones);
    return JSON.stringify(reporte, null, 2);
  }

  convertirACSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  prepararDatosParaExportacion(asignaciones: RutinaAsignadaVista[]): any[] {
    return asignaciones.map(asignacion => ({
      'Usuario': asignacion.full_name,
      'Username': asignacion.username,
      'Rutina': asignacion.rutina_nombre,
      'Tipo': asignacion.rutina_tipo,
      'Nivel': asignacion.rutina_nivel,
      'Duración': `${asignacion.duracion_estimada} min`,
      'Progreso': `${asignacion.progreso}%`,
      'Estado': asignacion.estado_individual,
      'Estado Temporal': asignacion.estado_temporal,
      'Fecha Inicio': this.formatearFecha(asignacion.fecha_inicio),
      'Fecha Fin': this.formatearFecha(asignacion.fecha_fin),
      'Fecha Inicio Real': this.formatearFecha(asignacion.fecha_inicio_real),
      'Fecha Fin Real': this.formatearFecha(asignacion.fecha_fin_real),
      'Asignado Por': asignacion.asignado_por_nombre,
      'Notas Asignación': asignacion.notas_asignacion || '',
      'Notas Individuales': asignacion.notas_individuales || ''
    }));
  }

  // ================================
  // MÉTODOS DE COMPATIBILIDAD CON SISTEMA ORIGINAL
  // ================================

  // Mantener compatibilidad con el sistema original de rutina_profiles
  async asignarRutinaIndividual(asignacion: any): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutina_profiles')
        .insert({
          id_profile: asignacion.id_profile,
          id_rutina: asignacion.id_rutina,
          fecha_inicio: asignacion.fecha_inicio,
          fecha_fin: asignacion.fecha_fin,
          estado: 'activa',
          progreso: 0,
          notas: asignacion.notas
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error asignando rutina individual:', error);
      throw error;
    }
  }

  async getRutinasPerfilUsuario(idProfile?: number, filtros?: FiltrosRutinas): Promise<any[]> {
    try {
      let query = this.supabaseService.client
        .from('v_rutinas_activas')
        .select('*');

      if (idProfile) {
        query = query.eq('id_profile', idProfile);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.estado_temporal) {
        query = query.eq('estado_temporal', filtros.estado_temporal);
      }

      if (filtros?.tipo) {
        query = query.eq('rutina_tipo', filtros.tipo);
      }

      if (filtros?.nivel) {
        query = query.eq('rutina_nivel', filtros.nivel);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_inicio', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_fin', filtros.fecha_hasta);
      }

      query = query.order('fecha_inicio', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo rutinas del perfil usuario:', error);
      throw error;
    }
  }

  async getRutinasVigentes(idProfile?: number): Promise<any[]> {
    const filtros: FiltrosRutinas = {
      estado_temporal: 'vigente',
      estado: 'activa'
    };
    return this.getRutinasPerfilUsuario(idProfile, filtros);
  }

  async actualizarProgresoRutinaPerfil(actualizacion: any): Promise<any> {
    try {
      const updateData: any = {
        progreso: actualizacion.progreso,
        updated_at: new Date().toISOString()
      };

      if (actualizacion.estado) {
        updateData.estado = actualizacion.estado;
      }

      if (actualizacion.notas !== undefined) {
        updateData.notas = actualizacion.notas;
      }

      // Si el progreso es 100%, marcar como completada automáticamente
      if (actualizacion.progreso >= 100) {
        updateData.estado = 'completada';
      }

      const { data, error } = await this.supabaseService.client
        .from('rutina_profiles')
        .update(updateData)
        .eq('id', actualizacion.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando progreso rutina perfil:', error);
      throw error;
    }
  }

  async cancelarRutinaPerfil(id: number, motivo?: string): Promise<boolean> {
    try {
      const updateData: any = {
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      };

      if (motivo) {
        updateData.notas = motivo;
      }

      const { error } = await this.supabaseService.client
        .from('rutina_profiles')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cancelando rutina perfil:', error);
      throw error;
    }
  }

  async pausarRutinaPerfil(id: number, motivo?: string): Promise<boolean> {
    try {
      const updateData: any = {
        estado: 'pausada',
        updated_at: new Date().toISOString()
      };

      if (motivo) {
        updateData.notas = motivo;
      }

      const { error } = await this.supabaseService.client
        .from('rutina_profiles')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error pausando rutina perfil:', error);
      throw error;
    }
  }

  async reanudarRutinaPerfil(id: number): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('rutina_profiles')
        .update({ 
          estado: 'activa',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error reanudando rutina perfil:', error);
      throw error;
    }
  }

  async getEstadisticasUsuario(idProfile?: number): Promise<any> {
    try {
      const currentUser = this.authService.getCurrentUser();
      const userId = idProfile || currentUser?.id;

      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Intentar obtener desde vista v_rutinas_activas primero
      const { data, error } = await this.supabaseService.client
        .from('v_rutinas_activas')
        .select('estado, estado_temporal, progreso')
        .eq('id_profile', userId);

      if (error) {
        // Fallback: obtener desde sistema de asignación masiva
        const rutinasUsuario = await this.getRutinasUsuario(userId);
        return this.calcularEstadisticasDesdeAsignaciones(rutinasUsuario);
      }

      const rutinas = data || [];
      const total = rutinas.length;
      const activas = rutinas.filter(r => r.estado === 'activa').length;
      const completadas = rutinas.filter(r => r.estado === 'completada').length;
      const vigentes = rutinas.filter(r => r.estado_temporal === 'vigente').length;
      const vencidas = rutinas.filter(r => r.estado_temporal === 'vencida').length;
      
      const progresoPromedio = rutinas.length > 0 
        ? rutinas.reduce((acc, r) => acc + r.progreso, 0) / rutinas.length 
        : 0;

      return {
        total_rutinas: total,
        rutinas_activas: activas,
        rutinas_completadas: completadas,
        progreso_promedio: Math.round(progresoPromedio),
        rutinas_vigentes: vigentes,
        rutinas_vencidas: vencidas
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas usuario:', error);
      throw error;
    }
  }

  private calcularEstadisticasDesdeAsignaciones(rutinas: RutinaAsignadaVista[]): any {
    const total = rutinas.length;
    const activas = rutinas.filter(r => r.estado_individual === 'en_progreso').length;
    const completadas = rutinas.filter(r => r.estado_individual === 'completada').length;
    const vigentes = rutinas.filter(r => r.estado_temporal === 'vigente').length;
    const vencidas = rutinas.filter(r => r.estado_temporal === 'vencida').length;
    
    const progresoPromedio = rutinas.length > 0 
      ? rutinas.reduce((acc, r) => acc + r.progreso, 0) / rutinas.length 
      : 0;

    return {
      total_rutinas: total,
      rutinas_activas: activas,
      rutinas_completadas: completadas,
      progreso_promedio: Math.round(progresoPromedio),
      rutinas_vigentes: vigentes,
      rutinas_vencidas: vencidas
    };
  }

  // ================================
  // MÉTODOS DE DEBUGGING Y UTILIDAD
  // ================================

  async verificarEstructuraBaseDatos(): Promise<{
    tablas: string[],
    vistas: string[],
    funciones: string[],
    errores: string[]
  }> {
    const resultado = {
      tablas: [],
      vistas: [],
      funciones: [],
      errores: []
    };

    try {
      // Verificar tabla rutinas
      const { data: rutinas, error: errorRutinas } = await this.supabaseService.client
        .from('rutinas')
        .select('*')
        .limit(1);
      
      if (!errorRutinas) {
        resultado.tablas.push('rutinas');
      } else {
        resultado.errores.push('Tabla rutinas: ' + errorRutinas.message);
      }

      // Verificar tabla rutina_asignaciones_masivas
      const { data: asignaciones, error: errorAsignaciones } = await this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .select('*')
        .limit(1);
      
      if (!errorAsignaciones) {
        resultado.tablas.push('rutina_asignaciones_masivas');
      } else {
        resultado.errores.push('Tabla rutina_asignaciones_masivas: ' + errorAsignaciones.message);
      }

      // Verificar tabla rutina_seguimiento_individual
      const { data: seguimiento, error: errorSeguimiento } = await this.supabaseService.client
        .from('rutina_seguimiento_individual')
        .select('*')
        .limit(1);
      
      if (!errorSeguimiento) {
        resultado.tablas.push('rutina_seguimiento_individual');
      } else {
        resultado.errores.push('Tabla rutina_seguimiento_individual: ' + errorSeguimiento.message);
      }

      // Verificar vista v_rutinas_masivas_expandidas
      const { data: vista, error: errorVista } = await this.supabaseService.client
        .from('v_rutinas_masivas_expandidas')
        .select('*')
        .limit(1);
      
      if (!errorVista) {
        resultado.vistas.push('v_rutinas_masivas_expandidas');
      } else {
        resultado.errores.push('Vista v_rutinas_masivas_expandidas: ' + errorVista.message);
      }

      // Verificar función asignar_rutina_masiva
      const { data: funcion, error: errorFuncion } = await this.supabaseService.client
        .rpc('asignar_rutina_masiva', {
          p_id_rutina: 0,
          p_usuarios_ids: [],
          p_asignado_por: 0,
          p_fecha_inicio: '2025-01-01',
          p_fecha_fin: '2025-01-02',
          p_notas: 'test'
        });
      
      if (!errorFuncion) {
        resultado.funciones.push('asignar_rutina_masiva');
      } else {
        resultado.errores.push('Función asignar_rutina_masiva: ' + errorFuncion.message);
      }

    } catch (error) {
      resultado.errores.push('Error general: ' + error);
    }

    return resultado;
  }

  // Método para obtener información del sistema
  async getInfoSistema(): Promise<any> {
    const verificacion = await this.verificarEstructuraBaseDatos();
    const estadisticas = await this.getEstadisticasRutinas();
    const totalRutinas = await this.getRutinas();
    const totalUsuarios = await this.getUsuariosDisponibles();

    return {
      verificacion,
      estadisticas,
      totalRutinasDisponibles: totalRutinas.length,
      totalUsuarios: totalUsuarios.length,
      fechaConsulta: new Date().toISOString()
    };
  }
}