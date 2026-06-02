// src/app/services/terapias.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Terapia,
  TipoEjercicioTerapeutico,
  InformacionMedicaUsuario,
  TerapiaAsignacionMasiva,
  TerapiaSeguimientoIndividual,
  TerapiaRegistroSesion,
  TerapiaAsignadaUsuario,
  EstadisticasTerapias,
  AsignacionTerapiaForm,
  PerfilUsuarioForm
} from '../interfaces/terapias.interfaces';

@Injectable({
  providedIn: 'root'
})
export class TerapiasService {
  constructor(private supabaseService: SupabaseService) {}

  // ===============================================
  // GESTIÓN DE TERAPIAS
  // ===============================================

  async getTerapias(): Promise<Terapia[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapias')
        .select('*')
        .eq('status', 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener terapias:', error);
      throw error;
    }
  }

  async getTerapiaById(id: number): Promise<Terapia | null> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapias')
        .select('*')
        .eq('id', id)
        .eq('status', 1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener terapia:', error);
      throw error;
    }
  }

  async createTerapia(terapia: Terapia): Promise<Terapia> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapias')
        .insert([terapia])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al crear terapia:', error);
      throw error;
    }
  }

  async updateTerapia(id: number, terapia: Partial<Terapia>): Promise<Terapia> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapias')
        .update({ ...terapia, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al actualizar terapia:', error);
      throw error;
    }
  }

  async deleteTerapia(id: number): Promise<void> {
    try {
      const { error } = await this.supabaseService.supabase
        .from('terapias')
        .update({ status: 0 })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error al eliminar terapia:', error);
      throw error;
    }
  }

  // ===============================================
  // TIPOS DE EJERCICIOS TERAPÉUTICOS
  // ===============================================

  async getTiposEjerciciosTerapeuticos(): Promise<TipoEjercicioTerapeutico[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('tipos_ejercicios_terapeuticos')
        .select('*')
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener tipos de ejercicios:', error);
      throw error;
    }
  }

  // ===============================================
  // INFORMACIÓN MÉDICA DE USUARIOS
  // ===============================================

  async getInformacionMedicaUsuario(usuarioId: number): Promise<InformacionMedicaUsuario | null> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('informacion_medica_usuarios')
        .select('*')
        .eq('usuario_id', usuarioId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      return data;
    } catch (error) {
      console.error('Error al obtener información médica:', error);
      throw error;
    }
  }

  async createOrUpdateInformacionMedica(info: InformacionMedicaUsuario): Promise<InformacionMedicaUsuario> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('informacion_medica_usuarios')
        .upsert(info, { onConflict: 'usuario_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al guardar información médica:', error);
      throw error;
    }
  }

  // ===============================================
  // ASIGNACIÓN DE TERAPIAS
  // ===============================================

  async asignarTerapiaAUsuarios(asignacion: AsignacionTerapiaForm): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('asignar_terapia_a_usuarios', {
          p_id_terapia: asignacion.id_terapia,
          p_usuarios_ids: asignacion.usuarios_ids,
          p_asignado_por: await this.getCurrentUserId(),
          p_fecha_inicio: asignacion.fecha_inicio.toISOString().split('T')[0],
          p_fecha_fin: asignacion.fecha_fin.toISOString().split('T')[0],
          p_terapeuta_responsable: asignacion.terapeuta_responsable || null,
          p_sesiones_por_semana: asignacion.sesiones_por_semana,
          p_duracion_sesion: asignacion.duracion_sesion,
          p_tipo_asignacion: asignacion.tipo_asignacion,
          p_notas: asignacion.notas || null,
          p_objetivos_grupales: asignacion.objetivos_grupales || null
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al asignar terapia:', error);
      throw error;
    }
  }

  async getTerapiasAsignadasUsuarios(): Promise<TerapiaAsignadaUsuario[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('v_terapias_asignadas_usuarios')
        .select('*')
        .order('fecha_asignacion', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener terapias asignadas:', error);
      throw error;
    }
  }

  async getTerapiasUsuario(usuarioId: number): Promise<TerapiaAsignadaUsuario[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('get_terapias_usuario', { p_user_id: usuarioId });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener terapias del usuario:', error);
      throw error;
    }
  }

  // ===============================================
  // SEGUIMIENTO INDIVIDUAL
  // ===============================================

  async actualizarProgresoTerapia(
    seguimientoId: number,
    actualizacion: {
      progreso?: number;
      estado_individual?: string;
      sesiones_completadas?: number;
      adherencia_porcentaje?: number;
      nivel_dolor_actual?: number;
      nivel_funcionalidad_actual?: number;
      notas_individuales?: string;
      objetivos_individuales?: string;
    }
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('actualizar_progreso_terapia', {
          p_seguimiento_id: seguimientoId,
          p_progreso: actualizacion.progreso || null,
          p_estado_individual: actualizacion.estado_individual || null,
          p_sesiones_completadas: actualizacion.sesiones_completadas || null,
          p_adherencia_porcentaje: actualizacion.adherencia_porcentaje || null,
          p_nivel_dolor_actual: actualizacion.nivel_dolor_actual || null,
          p_nivel_funcionalidad_actual: actualizacion.nivel_funcionalidad_actual || null,
          p_notas_individuales: actualizacion.notas_individuales || null,
          p_objetivos_individuales: actualizacion.objetivos_individuales || null
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al actualizar progreso:', error);
      throw error;
    }
  }

  // ===============================================
  // REGISTRO DE SESIONES
  // ===============================================

  async registrarSesionTerapia(sesion: {
    seguimiento_id: number;
    numero_sesion: number;
    fecha_sesion: Date;
    estado_sesion?: string;
    hora_inicio?: string;
    hora_fin?: string;
    terapeuta_id?: number;
    ejercicios_realizados?: any;
    dolor_inicio?: number;
    dolor_fin?: number;
    nivel_fatiga?: number;
    nivel_esfuerzo?: number;
    adherencia_sesion?: number;
    observaciones_usuario?: string;
    observaciones_terapeuta?: string;
  }): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('registrar_sesion_terapia', {
          p_seguimiento_id: sesion.seguimiento_id,
          p_numero_sesion: sesion.numero_sesion,
          p_fecha_sesion: sesion.fecha_sesion.toISOString().split('T')[0],
          p_estado_sesion: sesion.estado_sesion || 'completada',
          p_hora_inicio: sesion.hora_inicio || null,
          p_hora_fin: sesion.hora_fin || null,
          p_terapeuta_id: sesion.terapeuta_id || null,
          p_ejercicios_realizados: sesion.ejercicios_realizados || null,
          p_dolor_inicio: sesion.dolor_inicio || null,
          p_dolor_fin: sesion.dolor_fin || null,
          p_nivel_fatiga: sesion.nivel_fatiga || null,
          p_nivel_esfuerzo: sesion.nivel_esfuerzo || null,
          p_adherencia_sesion: sesion.adherencia_sesion || null,
          p_observaciones_usuario: sesion.observaciones_usuario || null,
          p_observaciones_terapeuta: sesion.observaciones_terapeuta || null
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al registrar sesión:', error);
      throw error;
    }
  }

  async getSesionesUsuario(seguimientoId: number): Promise<TerapiaRegistroSesion[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapia_registro_sesiones')
        .select(`
          *,
          terapeuta:terapeuta_id(full_name)
        `)
        .eq('id_seguimiento', seguimientoId)
        .order('numero_sesion');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener sesiones:', error);
      throw error;
    }
  }

  // ===============================================
  // ESTADÍSTICAS
  // ===============================================

  async getEstadisticasTerapias(): Promise<EstadisticasTerapias> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('get_estadisticas_terapias_asignadas');

      if (error) throw error;
      return data[0] || {
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
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }

  // ===============================================
  // USUARIOS Y PERFILES
  // ===============================================

  async getUsuarios(): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('profiles')
        .select('id, username, full_name, email, id_perfil')
        .eq('status', 1)
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  }

  async getTerapeutas(): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('profiles')
        .select('id, username, full_name, email')
        .eq('id_perfil', 3) // Asumiendo que 3 = terapeuta
        .eq('status', 1)
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener terapeutas:', error);
      throw error;
    }
  }

  async updatePerfilCompleto(userId: number, perfil: PerfilUsuarioForm): Promise<void> {
    try {
      // Actualizar información básica del perfil
      const perfilBasico = {
        full_name: perfil.full_name,
        username: perfil.username,
        email: perfil.email
      };

      const { error: errorPerfil } = await this.supabaseService.supabase
        .from('profiles')
        .update(perfilBasico)
        .eq('id', userId);

      if (errorPerfil) throw errorPerfil;

      // Preparar información médica
      const infoMedica: InformacionMedicaUsuario = {
        usuario_id: userId,
        fecha_nacimiento: perfil.fecha_nacimiento,
        genero: perfil.genero,
        telefono: perfil.telefono,
        direccion: perfil.direccion,
        diagnostico_principal: perfil.diagnostico_principal,
        diagnosticos_secundarios: perfil.diagnosticos_secundarios,
        historial_medico: perfil.historial_medico,
        medicamentos_actuales: perfil.medicamentos_actuales,
        alergias: perfil.alergias,
        limitaciones_fisicas: perfil.limitaciones_fisicas,
        observaciones_generales: perfil.observaciones_generales,
        contacto_emergencia_nombre: perfil.contacto_emergencia_nombre,
        contacto_emergencia_telefono: perfil.contacto_emergencia_telefono,
        contacto_emergencia_relacion: perfil.contacto_emergencia_relacion,
        peso: perfil.peso,
        altura: perfil.altura,
        imc: perfil.peso && perfil.altura ? perfil.peso / ((perfil.altura / 100) ** 2) : undefined,
        nivel_dolor_inicial: perfil.nivel_dolor_inicial,
        nivel_funcionalidad_inicial: perfil.nivel_funcionalidad_inicial,
        objetivos_paciente: perfil.objetivos_paciente,
        updated_at: new Date().toISOString()
      };

      // Actualizar información médica
      await this.createOrUpdateInformacionMedica(infoMedica);

    } catch (error) {
      console.error('Error al actualizar perfil completo:', error);
      throw error;
    }
  }

  async getPerfilCompleto(userId: number): Promise<PerfilUsuarioForm | null> {
    try {
      // Obtener información básica del perfil
      const { data: perfilData, error: perfilError } = await this.supabaseService.supabase
        .from('profiles')
        .select('username, full_name, email')
        .eq('id', userId)
        .single();

      if (perfilError) throw perfilError;

      // Obtener información médica
      const infoMedica = await this.getInformacionMedicaUsuario(userId);

      // Combinar ambos
      const perfilCompleto: PerfilUsuarioForm = {
        username: perfilData.username,
        full_name: perfilData.full_name,
        email: perfilData.email,
        fecha_nacimiento: infoMedica?.fecha_nacimiento,
        genero: infoMedica?.genero,
        telefono: infoMedica?.telefono,
        direccion: infoMedica?.direccion,
        diagnostico_principal: infoMedica?.diagnostico_principal,
        diagnosticos_secundarios: infoMedica?.diagnosticos_secundarios,
        historial_medico: infoMedica?.historial_medico,
        medicamentos_actuales: infoMedica?.medicamentos_actuales,
        alergias: infoMedica?.alergias,
        limitaciones_fisicas: infoMedica?.limitaciones_fisicas,
        observaciones_generales: infoMedica?.observaciones_generales,
        contacto_emergencia_nombre: infoMedica?.contacto_emergencia_nombre,
        contacto_emergencia_telefono: infoMedica?.contacto_emergencia_telefono,
        contacto_emergencia_relacion: infoMedica?.contacto_emergencia_relacion,
        peso: infoMedica?.peso,
        altura: infoMedica?.altura,
        nivel_dolor_inicial: infoMedica?.nivel_dolor_inicial,
        nivel_funcionalidad_inicial: infoMedica?.nivel_funcionalidad_inicial,
        objetivos_paciente: infoMedica?.objetivos_paciente
      };

      return perfilCompleto;
    } catch (error) {
      console.error('Error al obtener perfil completo:', error);
      throw error;
    }
  }

  // ===============================================
  // FUNCIONES ADICIONALES PARA EL SISTEMA
  // ===============================================

  // Obtener terapias por tipo
  async getTerapiasByTipo(tipo: string): Promise<Terapia[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapias')
        .select('*')
        .eq('tipo', tipo)
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener terapias por tipo:', error);
      throw error;
    }
  }

  // Obtener terapias por área de especialización
  async getTerapiasByArea(area: string): Promise<Terapia[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapias')
        .select('*')
        .eq('area_especializacion', area)
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener terapias por área:', error);
      throw error;
    }
  }

  // Duplicar una terapia
  async duplicarTerapia(terapiaId: number, nuevoNombre: string): Promise<Terapia> {
    try {
      const terapiaOriginal = await this.getTerapiaById(terapiaId);
      if (!terapiaOriginal) {
        throw new Error('Terapia no encontrada');
      }

      const nuevaTerapia: Terapia = {
        ...terapiaOriginal,
        id: undefined,
        nombre: nuevoNombre,
        created_at: undefined,
        updated_at: undefined
      };

      return await this.createTerapia(nuevaTerapia);
    } catch (error) {
      console.error('Error al duplicar terapia:', error);
      throw error;
    }
  }

  // Buscar terapias
  async buscarTerapias(termino: string): Promise<Terapia[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapias')
        .select('*')
        .or(`nombre.ilike.%${termino}%,descripcion.ilike.%${termino}%,area_especializacion.ilike.%${termino}%`)
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al buscar terapias:', error);
      throw error;
    }
  }

  // ===============================================
  // GESTIÓN AVANZADA DE SEGUIMIENTO
  // ===============================================

  // Obtener seguimiento detallado de un usuario
  async getSeguimientoDetalladoUsuario(usuarioId: number): Promise<TerapiaSeguimientoIndividual[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('terapia_seguimiento_individual')
        .select(`
          *,
          terapia:id_terapia(*),
          asignacion:id_asignacion_masiva(*),
          profile:id_profile(*)
        `)
        .eq('id_profile', usuarioId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener seguimiento detallado:', error);
      throw error;
    }
  }

  // Obtener asignaciones por terapeuta
  async getAsignacionesPorTerapeuta(terapeutaId: number): Promise<TerapiaAsignadaUsuario[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('v_terapias_asignadas_usuarios')
        .select('*')
        .eq('terapeuta_responsable', terapeutaId)
        .order('fecha_asignacion', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener asignaciones por terapeuta:', error);
      throw error;
    }
  }

  // Obtener próximas sesiones de un terapeuta
  async getProximasSesionesTeruapeuta(terapeutaId: number, dias: number = 7): Promise<TerapiaRegistroSesion[]> {
    try {
      const fechaInicio = new Date().toISOString().split('T')[0];
      const fechaFin = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await this.supabaseService.supabase
        .rpc('get_proximas_sesiones_terapeuta', {
          p_terapeuta_id: terapeutaId,
          p_fecha_inicio: fechaInicio,
          p_dias: dias
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener próximas sesiones:', error);
      throw error;
    }
  }

  // Calcular adherencia de un usuario
  async calcularAdherenciaUsuario(usuarioId: number): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('calcular_adherencia_usuario', { p_usuario_id: usuarioId });

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('Error al calcular adherencia:', error);
      throw error;
    }
  }

  // ===============================================
  // REPORTES Y ANALÍTICAS
  // ===============================================

  // Obtener reporte de progreso por área
  async getReporteProgresoPorArea(): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('v_progreso_por_area')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener reporte por área:', error);
      throw error;
    }
  }

  // Obtener dashboard de terapeuta
  async getDashboardTerapeuta(terapeutaId?: number): Promise<any[]> {
    try {
      let query = this.supabaseService.supabase
        .from('v_dashboard_terapeutas')
        .select('*');

      if (terapeutaId) {
        query = query.eq('terapeuta_id', terapeutaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener dashboard de terapeuta:', error);
      throw error;
    }
  }

  // Obtener usuarios que necesitan seguimiento
  async getUsuariosQueNecesitanSeguimiento(): Promise<TerapiaAsignadaUsuario[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('v_terapias_asignadas_usuarios')
        .select('*')
        .eq('estado_individual', 'en_progreso')
        .or('adherencia_porcentaje.lt.70,progreso.lt.30')
        .order('ultima_actualizacion', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener usuarios que necesitan seguimiento:', error);
      throw error;
    }
  }

  // ===============================================
  // VALIDACIONES Y UTILIDADES
  // ===============================================

  // Validar si un usuario puede ser asignado a una terapia
  async validarAsignacionTerapia(usuarioId: number, terapiaId: number): Promise<{valido: boolean, mensaje?: string}> {
    try {
      // Verificar si el usuario ya tiene esta terapia asignada y activa
      const { data: asignacionExistente, error } = await this.supabaseService.supabase
        .from('v_terapias_asignadas_usuarios')
        .select('*')
        .eq('id_profile', usuarioId)
        .eq('id_terapia', terapiaId)
        .in('estado_individual', ['pendiente', 'en_progreso']);

      if (error) throw error;

      if (asignacionExistente && asignacionExistente.length > 0) {
        return {
          valido: false,
          mensaje: 'El usuario ya tiene esta terapia asignada y activa'
        };
      }

      // Verificar información médica del usuario
      const infoMedica = await this.getInformacionMedicaUsuario(usuarioId);
      if (!infoMedica) {
        return {
          valido: false,
          mensaje: 'El usuario no tiene información médica registrada'
        };
      }

      return { valido: true };
    } catch (error) {
      console.error('Error validando asignación:', error);
      return {
        valido: false,
        mensaje: 'Error al validar la asignación'
      };
    }
  }

  // Obtener historial de cambios de estado
  async getHistorialCambiosEstado(seguimientoId: number): Promise<any[]> {
    try {
      // Esta sería una funcionalidad que requeriría una tabla de auditoría
      // Por ahora retornamos array vacío, pero se puede implementar
      return [];
    } catch (error) {
      console.error('Error al obtener historial de cambios:', error);
      throw error;
    }
  }

  // Exportar datos de seguimiento a CSV
  exportarSeguimientoCSV(asignaciones: TerapiaAsignadaUsuario[]): string {
    const headers = [
      'Usuario', 'Terapia', 'Estado', 'Progreso', 'Adherencia', 
      'Sesiones Completadas', 'Sesiones Programadas', 'Terapeuta',
      'Fecha Inicio', 'Fecha Fin', 'Última Actualización'
    ];

    const rows = asignaciones.map(asignacion => [
      asignacion.full_name,
      asignacion.terapia_nombre,
      asignacion.estado_individual,
      `${asignacion.progreso}%`,
      `${asignacion.adherencia_porcentaje}%`,
      asignacion.sesiones_completadas,
      asignacion.sesiones_programadas,
      asignacion.terapeuta_nombre || 'Sin asignar',
      this.formatearFecha(asignacion.fecha_inicio_programada),
      this.formatearFecha(asignacion.fecha_fin_programada),
      this.formatearFecha(asignacion.ultima_actualizacion)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Formatear fecha para exportación
  private formatearFecha(fecha: string | Date): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  // Generar reporte PDF (función auxiliar que usaría una librería externa)
  async generarReportePDF(asignaciones: TerapiaAsignadaUsuario[]): Promise<Blob> {
    // Esta función requeriría una librería como jsPDF
    // Por ahora retornamos un blob vacío
    return new Blob(['Reporte PDF no implementado'], { type: 'application/pdf' });
  }

  // ===============================================
  // NOTIFICACIONES Y ALERTAS
  // ===============================================

  // Obtener alertas para un terapeuta
  async getAlertasTerapeuta(terapeutaId: number): Promise<any[]> {
    try {
      const alertas: any[] | PromiseLike<any[]> = [];
      
      // Usuarios con baja adherencia
      const { data: bajaAdherencia } = await this.supabaseService.supabase
        .from('v_terapias_asignadas_usuarios')
        .select('*')
        .eq('terapeuta_responsable', terapeutaId)
        .lt('adherencia_porcentaje', 70)
        .eq('estado_individual', 'en_progreso');

      if (bajaAdherencia) {
        bajaAdherencia.forEach(asignacion => {
          alertas.push({
            tipo: 'baja_adherencia',
            mensaje: `${asignacion.full_name} tiene baja adherencia (${asignacion.adherencia_porcentaje}%) en ${asignacion.terapia_nombre}`,
            prioridad: 'alta',
            asignacion: asignacion
          });
        });
      }

      // Terapias próximas a vencer
      const { data: proximasVencer } = await this.supabaseService.supabase
        .from('v_terapias_asignadas_usuarios')
        .select('*')
        .eq('terapeuta_responsable', terapeutaId)
        .lte('dias_restantes', 7)
        .eq('estado_individual', 'en_progreso');

      if (proximasVencer) {
        proximasVencer.forEach(asignacion => {
          alertas.push({
            tipo: 'proxima_vencer',
            mensaje: `La terapia de ${asignacion.full_name} vence en ${asignacion.dias_restantes} días`,
            prioridad: 'media',
            asignacion: asignacion
          });
        });
      }

      return alertas;
    } catch (error) {
      console.error('Error al obtener alertas:', error);
      return [];
    }
  }

  // Marcar alerta como leída (función auxiliar)
  async marcarAlertaLeida(alertaId: string): Promise<void> {
    // Esta función requeriría una tabla de alertas
    // Por ahora es solo un placeholder
    console.log(`Alerta ${alertaId} marcada como leída`);
  }

  // ===============================================
  // UTILIDADES PRIVADAS
  // ===============================================

  private async getCurrentUserId(): Promise<number> {
    try {
      const { data: { user } } = await this.supabaseService.supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      
      const { data, error } = await this.supabaseService.supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error al obtener ID del usuario actual:', error);
      throw error;
    }
  }

  // ===============================================
  // UTILIDADES PÚBLICAS
  // ===============================================

  // Calcular IMC
  calcularIMC(peso: number, altura: number): number {
    if (!peso || !altura) return 0;
    const alturaEnMetros = altura / 100;
    return Math.round((peso / (alturaEnMetros ** 2)) * 100) / 100;
  }

  // Formatear duración en minutos a texto legible
  formatearDuracion(minutos: number): string {
    if (minutos < 60) {
      return `${minutos} min`;
    } else {
      const horas = Math.floor(minutos / 60);
      const min = minutos % 60;
      return min > 0 ? `${horas}h ${min}min` : `${horas}h`;
    }
  }

  // Obtener color para nivel de dolor
  getColorNivelDolor(nivel: number): string {
    if (nivel <= 2) return 'text-green-600';
    if (nivel <= 4) return 'text-yellow-600';
    if (nivel <= 6) return 'text-orange-600';
    return 'text-red-600';
  }

  // Obtener color para progreso
  getColorProgreso(progreso: number): string {
    if (progreso >= 80) return 'text-green-600';
    if (progreso >= 60) return 'text-blue-600';
    if (progreso >= 40) return 'text-yellow-600';
    return 'text-red-600';
  }

  // Obtener color para adherencia
  getColorAdherencia(adherencia: number): string {
    if (adherencia >= 90) return 'text-green-600';
    if (adherencia >= 70) return 'text-blue-600';
    if (adherencia >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }

  // Formatear fecha a texto legible
  formatearFechaLegible(fecha: string | Date): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Formatear fecha corta
  formatearFechaCorta(fecha: string | Date): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Calcular días entre fechas
  calcularDiasEntre(fechaInicio: string | Date, fechaFin: string | Date): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - inicio.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  // Obtener porcentaje de progreso temporal
  calcularProgresoTemporal(fechaInicio: string | Date, fechaFin: string | Date): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const hoy = new Date();
    
    if (hoy < inicio) return 0;
    if (hoy > fin) return 100;
    
    const totalDias = this.calcularDiasEntre(inicio, fin);
    const diasTranscurridos = this.calcularDiasEntre(inicio, hoy);
    
    return Math.round((diasTranscurridos / totalDias) * 100);
  }

  // Validar email
  validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validar teléfono
  validarTelefono(telefono: string): boolean {
    const telefonoRegex = /^[\+]?[0-9\s\-\(\)]{8,20}$/;
    return telefonoRegex.test(telefono);
  }

  // Generar código aleatorio
  generarCodigoAleatorio(longitud: number = 6): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
      resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
  }

  // Limpiar y formatear texto
  limpiarTexto(texto: string): string {
    return texto.trim().replace(/\s+/g, ' ');
  }

  // Convertir texto a título
  toTitleCase(texto: string): string {
    return texto.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  // Truncar texto
  truncarTexto(texto: string, longitud: number): string {
    if (texto.length <= longitud) return texto;
    return texto.substring(0, longitud) + '...';
  }

  // Obtener iniciales de nombre
  obtenerIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  // Generar color basado en texto (para avatares)
  generarColorAvatar(texto: string): string {
    const colores = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colores[Math.abs(hash) % colores.length];
  }

  // Descargar archivo CSV
  descargarCSV(contenido: string, nombreArchivo: string): void {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', nombreArchivo);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Descargar archivo JSON
  descargarJSON(datos: any, nombreArchivo: string): void {
    const contenido = JSON.stringify(datos, null, 2);
    const blob = new Blob([contenido], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', nombreArchivo);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Mostrar notificación de éxito
  mostrarExito(mensaje: string): void {
    // Esta función se integraría con un sistema de notificaciones como ToastR
    console.log('Éxito:', mensaje);
  }

  // Mostrar notificación de error
  mostrarError(mensaje: string): void {
    // Esta función se integraría con un sistema de notificaciones como ToastR
    console.error('Error:', mensaje);
  }

  // Mostrar notificación de información
  mostrarInfo(mensaje: string): void {
    // Esta función se integraría con un sistema de notificaciones como ToastR
    console.info('Info:', mensaje);
  }

  // Debug: imprimir estado del servicio
  debug(): void {
    console.log('=== TerapiasService Debug ===');
    console.log('Supabase conectado:', !!this.supabaseService.supabase);
    console.log('============================');
  }
}