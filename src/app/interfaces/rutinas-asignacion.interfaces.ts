// src/app/interfaces/rutinas-asignacion.interfaces.ts

// Interface para asignaciones masivas de rutinas
export interface AsignacionMasiva {
  id?: number;
  id_rutina: number;
  usuarios_asignados: number[];
  asignado_por: number;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string; // YYYY-MM-DD
  estado: 'activa' | 'completada' | 'pausada' | 'cancelada';
  notas?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

// Interface para seguimiento individual de cada usuario
export interface SeguimientoIndividual {
  id?: number;
  id_asignacion_masiva: number;
  id_profile: number;
  id_rutina: number;
  progreso: number; // 0-100
  estado_individual: 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  notas_individuales?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface para la vista completa de asignaciones
export interface AsignacionCompleta {
  asignacion_id: number;
  rutina_id: number;
  rutina_nombre: string;
  rutina_descripcion?: string;
  rutina_tipo: string;
  rutina_nivel: string;
  fecha_inicio_programada: string;
  fecha_fin_programada: string;
  usuarios_count: number;
  estado_asignacion: string;
  asignado_por_nombre: string;
  fecha_asignacion: string;
  notas_asignacion?: string;
  usuarios_asignados?: number[];
}

// Interface para el seguimiento detallado en la vista
export interface SeguimientoDetallado {
  seguimiento_id: number;
  asignacion_id: number;
  id_profile: number;
  username: string;
  full_name: string;
  rutina_nombre: string;
  progreso: number;
  estado_individual: string;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  fecha_inicio_programada: string;
  fecha_fin_programada: string;
  notas_individuales?: string;
  estado_temporal: 'vigente' | 'pendiente' | 'vencida';
  dias_restantes: number;
}

// Interface para crear una nueva asignación
export interface CrearAsignacionRequest {
  id_rutina: number;
  usuarios_ids: number[];
  fecha_inicio: string;
  fecha_fin: string;
  notas?: string;
}

// Interface para actualizar progreso individual
export interface ActualizarProgresoRequest {
  seguimiento_id: number;
  progreso: number;
  estado_individual?: 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
  notas_individuales?: string;
}

// Interface para filtros de asignaciones
export interface FiltrosAsignaciones {
  estado?: string;
  rutina?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  asignado_por?: number;
}

// Interface para estadísticas de asignaciones
export interface EstadisticasAsignaciones {
  total_asignaciones: number;
  asignaciones_activas: number;
  usuarios_con_rutinas: number;
  rutinas_mas_asignadas: number;
  promedio_progreso: number;
  usuarios_completados: number;
  usuarios_en_progreso: number;
  usuarios_pendientes: number;
}

// Interface para respuesta de la función de asignación
export interface AsignacionResponse {
  success: boolean;
  asignacion_id?: number;
  message: string;
  usuarios_asignados?: number;
}


export interface SeguimientoDetalladoCompleto extends SeguimientoDetallado {
  rutina_completa?: any; // Rutina completa
  rutina_duracion?: number;
  rutina_tags?: string[];
  rutina_id?: number;
  rutina_descripcion?: string;
  rutina_tipo?: string;
  rutina_nivel?: string;
}

// Interface para el servicio que puede no estar disponible
export interface RutinasUsuarioResponse {
  success: boolean;
  data: SeguimientoDetalladoCompleto[];
  message?: string;
}