// src/app/interfaces/rutina-profile.interfaces.ts

// Interface para rutinas básicas
export interface Rutina {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo: 'entrenamiento' | 'recuperacion' | 'evaluacion' | 'fuerza' | 'cardio' | 'flexibilidad';
  nivel: 'principiante' | 'intermedio' | 'avanzado';
  duracion_estimada?: number; // en minutos
  warm_up?: SeccionRutina;
  met_con?: SeccionRutina;
  strength?: SeccionRutina;
  core?: SeccionRutina;
  extra?: SeccionRutina;
  tags?: string[];
  status?: number;
  created_at?: string;
  updated_at?: string;
  // Index signature para permitir acceso dinámico
  [key: string]: any;
}

// Interface para ejercicios
export interface Ejercicio {
  orden: number;
  nombre: string;
  tipo: string;
  repeticiones?: number;
  series?: number;
  duracion?: string;
  distancia?: string;
  peso?: string;
  rpe?: number;
  tiempo_trabajo?: string;
  tiempo_descanso?: string;
  observaciones?: string;
}

// Interface para secciones de rutina
export interface SeccionRutina {
  descripcion: string;
  tiempo_total?: string;
  series?: number;
  time_cap?: string;
  tipo?: string;
  estructura?: string;
  notas?: string;
  descanso?: string;
  ejercicios: Ejercicio[];
}

// Interface para información de secciones
export interface SeccionInfo {
  key: string;
  nombre: string;
  descripcion: string;
}

// Interface para secciones con ejercicios
export interface SeccionConEjercicios {
  key: string;
  nombre: string;
  seccion: SeccionRutina;
}

// Interface para asignaciones masivas (OPCIÓN 2)
export interface RutinaAsignacionMasiva {
  id?: number;
  id_rutina: number;
  usuarios_asignados: number[];
  asignado_por: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'pausada' | 'cancelada';
  notas?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

// Interface para seguimiento individual (OPCIÓN 2)
export interface RutinaSeguimientoIndividual {
  id?: number;
  id_asignacion_masiva: number;
  id_profile: number;
  id_rutina: number;
  progreso: number;
  estado_individual: 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  notas_individuales?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface para la vista expandida de asignaciones masivas
export interface RutinaAsignadaVista {
  seguimiento_id: number;
  asignacion_masiva_id: number;
  id_rutina: number;
  id_profile: number;
  tipo_asignacion: 'masiva';
  username: string;
  full_name: string;
  rutina_nombre: string;
  rutina_descripcion?: string;
  rutina_tipo: string;
  rutina_nivel: string;
  duracion_estimada?: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado_individual: string;
  progreso: number;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  notas_asignacion?: string;
  notas_individuales?: string;
  asignado_por_nombre: string;
  fecha_asignacion: string;
  fecha_inicio_seguimiento: string;
  estado_temporal: 'vigente' | 'pendiente' | 'vencida';
}

// Interface para solicitudes de asignación masiva
export interface AsignacionMasivaRequest {
  id_rutina: number;
  usuarios_ids: number[];
  asignado_por: number;
  fecha_inicio: string;
  fecha_fin: string;
  notas?: string;
}

// Interface para actualizar progreso individual
export interface ActualizarProgresoRequest {
  seguimiento_id: number;
  progreso: number;
  estado?: 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
  notas?: string;
}

// Interface para filtros de búsqueda
export interface FiltrosRutinas {
  id_profile?: number;
  estado?: string;
  estado_temporal?: string;
  tipo?: string;
  nivel?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  progreso_min?: number;
  progreso_max?: number;
}

// Interface para estadísticas
export interface EstadisticasRutinas {
  total_asignaciones: number;
  completadas: number;
  en_progreso: number;
  pendientes: number;
  abandonadas: number;
  vigentes: number;
  vencidas: number;
  promedio_progreso: number;
  por_tipo: Record<string, any>;
  asignaciones_finalizadas: number;
}

// Interface para reportes detallados
export interface ReporteDetallado {
  resumenGeneral: EstadisticasRutinas;
  tendenciaProgreso: TendenciaProgreso[];
  conflictosHorarios: ConflictoHorario[];
  analisisPorUsuario: AnalisisUsuario[];
  fechaGeneracion: string;
}

// Interface para tendencia de progreso
export interface TendenciaProgreso {
  fecha: string;
  promedioProgreso: number;
  totalAsignaciones: number;
}

// Interface para conflictos horarios
export interface ConflictoHorario {
  usuario: string;
  rutina1: string;
  rutina2: string;
  periodo1: string;
  periodo2: string;
}

// Interface para análisis por usuario
export interface AnalisisUsuario {
  usuario: string;
  username: string;
  totalRutinas: number;
  completadas: number;
  enProgreso: number;
  abandonadas: number;
  progresoPromedio: number;
  tasaCompletitud: number;
}

// Interface para eventos de calendario
export interface EventoCalendario {
  id: number;
  title: string;
  start: string;
  end: string;
  color: string;
  extendedProps: {
    usuario: string;
    rutina: string;
    progreso: number;
    estado: string;
  };
}

// Interface para criterios de búsqueda avanzada
export interface CriteriosBusquedaAvanzada {
  texto?: string;
  progresoMin?: number;
  progresoMax?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estados?: string[];
  tipos?: string[];
}

// Interface para respuesta de operaciones masivas
export interface RespuestaOperacionMasiva {
  exitosas: number;
  fallidas: number;
  errores: string[];
  mensaje?: string;
}

// Interface para configuración de notificaciones
export interface ConfiguracionNotificacion {
  id_usuario: number;
  tipo_notificacion: 'email' | 'push' | 'sms';
  dias_anticipacion: number;
  activa: boolean;
}

// Enums para mayor type safety
export enum EstadoRutina {
  ACTIVA = 'activa',
  PAUSADA = 'pausada',
  CANCELADA = 'cancelada'
}

export enum EstadoIndividual {
  PENDIENTE = 'pendiente',
  EN_PROGRESO = 'en_progreso',
  COMPLETADA = 'completada',
  ABANDONADA = 'abandonada'
}

export enum EstadoTemporal {
  VIGENTE = 'vigente',
  PENDIENTE = 'pendiente',
  VENCIDA = 'vencida'
}

export enum TipoRutina {
  ENTRENAMIENTO = 'entrenamiento',
  RECUPERACION = 'recuperacion',
  EVALUACION = 'evaluacion',
  FUERZA = 'fuerza',
  CARDIO = 'cardio',
  FLEXIBILIDAD = 'flexibilidad'
}

export enum NivelRutina {
  PRINCIPIANTE = 'principiante',
  INTERMEDIO = 'intermedio',
  AVANZADO = 'avanzado'
}