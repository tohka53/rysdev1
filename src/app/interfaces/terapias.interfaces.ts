// src/app/interfaces/terapias.interfaces.ts

// ===============================================
// INTERFACES BÁSICAS DE TERAPIAS
// ===============================================

export interface Terapia {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo: 'fisica' | 'ocupacional' | 'respiratoria' | 'neurologica' | 'cardiaca';
  area_especializacion?: string;
  nivel: 'principiante' | 'intermedio' | 'avanzado';
  duracion_estimada?: number; // en minutos
  objetivo_principal?: string;
  contraindicaciones?: string;
  criterios_progresion?: string;
  tags?: string[];
  status: number;
  ejercicios: { [key: string]: SeccionTerapia };
  created_at?: string;
  updated_at?: string;
}

export interface SeccionTerapia {
  descripcion?: string;
  tiempo_total?: string;
  objetivos?: string[];
  ejercicios: EjercicioTerapeutico[];
}

export interface EjercicioTerapeutico {
  orden: number;
  nombre: string;
  tipo: string;
  repeticiones?: number;
  series?: number;
  duracion?: string;
  descripcion?: string;
  intensidad?: 'muy_baja' | 'baja' | 'moderada' | 'alta' | 'muy_alta';
  precauciones?: string;
}

export interface TipoEjercicioTerapeutico {
  id?: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  status?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SeccionInfo {
  key: string;
  nombre: string;
  descripcion: string;
}

// ===============================================
// INTERFACES DE ASIGNACIÓN MASIVA
// ===============================================

export interface TerapiaAsignacionMasiva {
  id?: number;
  id_terapia: number;
  usuarios_asignados: number[];
  asignado_por: number;
  terapeuta_responsable?: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  sesiones_por_semana: number;
  duracion_sesion: number;
  tipo_asignacion: 'grupal' | 'individual';
  estado: 'activa' | 'pausada' | 'completada' | 'cancelada';
  notas?: string;
  objetivos_grupales?: string;
  modificaciones_generales?: any;
  created_at?: string;
  updated_at?: string;
  status: number;
}

export interface TerapiaSeguimientoIndividual {
  id?: number;
  id_asignacion_masiva: number;
  id_profile: number;
  id_terapia: number;
  progreso: number;
  estado_individual: 'pendiente' | 'en_progreso' | 'completada' | 'abandonada' | 'pausada';
  fecha_inicio_real?: Date;
  fecha_fin_real?: Date;
  sesiones_completadas: number;
  sesiones_programadas: number;
  modificaciones_individuales?: any;
  objetivos_individuales?: string;
  notas_individuales?: string;
  evaluacion_inicial?: any;
  evaluacion_actual?: any;
  nivel_dolor_inicial?: number;
  nivel_dolor_actual?: number;
  nivel_funcionalidad_inicial?: number;
  nivel_funcionalidad_actual?: number;
  adherencia_porcentaje: number;
  satisfaccion_usuario?: number;
  created_at?: string;
  updated_at?: string;
}

// ===============================================
// INTERFACES DE SEGUIMIENTO Y SESIONES
// ===============================================

export interface TerapiaRegistroSesion {
  id?: number;
  id_seguimiento: number;
  numero_sesion: number;
  fecha_sesion: Date;
  hora_inicio?: string;
  hora_fin?: string;
  duracion_real?: number;
  terapeuta_id?: number;
  ejercicios_realizados?: any;
  dolor_inicio?: number;
  dolor_fin?: number;
  nivel_fatiga?: number;
  nivel_esfuerzo?: number;
  adherencia_sesion?: number;
  observaciones_usuario?: string;
  observaciones_terapeuta?: string;
  recomendaciones?: string;
  estado_sesion: 'programada' | 'completada' | 'cancelada' | 'reprogramada' | 'no_asistio';
  motivo_cancelacion?: string;
  created_at?: string;
  updated_at?: string;
}

// ===============================================
// INTERFACES DE VISTA COMBINADA
// ===============================================

export interface TerapiaAsignadaUsuario {
  seguimiento_id: number;
  asignacion_id: number;
  id_terapia: number;
  id_profile: number;
  username: string;
  full_name: string;
  terapia_nombre: string;
  terapia_descripcion?: string;
  terapia_tipo: string;
  area_especializacion?: string;
  terapia_nivel: string;
  duracion_estimada?: number;
  tipo_asignacion: string;
  sesiones_por_semana: number;
  duracion_sesion: number;
  fecha_inicio_programada: Date;
  fecha_fin_programada: Date;
  fecha_inicio_real?: Date;
  fecha_fin_real?: Date;
  estado_asignacion: string;
  estado_individual: string;
  progreso: number;
  sesiones_completadas: number;
  sesiones_programadas: number;
  adherencia_porcentaje: number;
  nivel_dolor_inicial?: number;
  nivel_dolor_actual?: number;
  nivel_funcionalidad_inicial?: number;
  nivel_funcionalidad_actual?: number;
  notas_asignacion?: string;
  notas_individuales?: string;
  objetivos_individuales?: string;
  asignado_por_nombre: string;
  terapeuta_nombre?: string;
  fecha_asignacion: string;
  fecha_inicio_seguimiento: string;
  ultima_actualizacion: string;
  estado_temporal: 'vigente' | 'pendiente' | 'vencida';
  dias_restantes: number;
  duracion_total_dias: number;
  sesiones_totales_estimadas: number;
  progreso_sesiones_porcentaje: number;
}

// ===============================================
// INTERFACES DE INFORMACIÓN MÉDICA
// ===============================================

export interface InformacionMedicaUsuario {
  id?: number;
  usuario_id: number;
  fecha_nacimiento?: Date;
  genero?: string;
  telefono?: string;
  direccion?: string;
  diagnostico_principal?: string;
  diagnosticos_secundarios?: string[];
  historial_medico?: string;
  medicamentos_actuales?: string;
  alergias?: string;
  limitaciones_fisicas?: string;
  observaciones_generales?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  contacto_emergencia_relacion?: string;
  peso?: number;
  altura?: number;
  imc?: number;
  nivel_dolor_inicial?: number;
  nivel_funcionalidad_inicial?: number;
  objetivos_paciente?: string;
  created_at?: string;
  updated_at?: string;
}

// ===============================================
// INTERFACES DE ESTADÍSTICAS
// ===============================================

export interface EstadisticasTerapias {
  total_asignaciones: number;
  asignaciones_activas: number;
  asignaciones_grupales: number;
  asignaciones_individuales: number;
  usuarios_con_terapias: number;
  terapias_mas_asignadas: number;
  promedio_progreso: number;
  promedio_adherencia: number;
  sesiones_totales_completadas: number;
  sesiones_totales_programadas: number;
}

export interface EstadisticasUsuario {
  terapiasAsignadas: number;
  terapiasCompletadas: number;
  progresoPromedio: number;
  adherenciaPromedio: number;
}

// ===============================================
// INTERFACES PARA FORMULARIOS
// ===============================================

export interface AsignacionTerapiaForm {
  id_terapia: number;
  usuarios_ids: number[];
  terapeuta_responsable?: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  sesiones_por_semana: number;
  duracion_sesion: number;
  tipo_asignacion: 'grupal' | 'individual';
  notas?: string;
  objetivos_grupales?: string;
}

export interface PerfilUsuarioForm {
  // Información básica del perfil
  username?: string;
  full_name: string;
  email?: string;
  
  // Información médica
  fecha_nacimiento?: Date;
  genero?: string;
  telefono?: string;
  direccion?: string;
  diagnostico_principal?: string;
  diagnosticos_secundarios?: string[];
  historial_medico?: string;
  medicamentos_actuales?: string;
  alergias?: string;
  limitaciones_fisicas?: string;
  observaciones_generales?: string;
  
  // Contacto de emergencia
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  contacto_emergencia_relacion?: string;
  
  // Información física
  peso?: number;
  altura?: number;
  
  // Evaluación inicial
  nivel_dolor_inicial?: number;
  nivel_funcionalidad_inicial?: number;
  objetivos_paciente?: string;
}

// ===============================================
// INTERFACES DE FILTROS Y BÚSQUEDA
// ===============================================

export interface FiltrosTerapias {
  searchTerm: string;
  tipoFilter: string;
  areaFilter: string;
  nivelFilter: string;
  statusFilter: string;
}

export interface FiltrosAsignaciones {
  searchTerm: string;
  estadoFilter: string;
  terapiaFilter: string;
  usuarioFilter: string;
  fechaInicioFilter?: Date;
  fechaFinFilter?: Date;
}

// ===============================================
// INTERFACES DE RESPUESTA DE API
// ===============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===============================================
// INTERFACES DE CONFIGURACIÓN
// ===============================================

export interface ConfiguracionTerapias {
  duracionSesionDefault: number;
  sesionesPorSemanaDefault: number;
  duracionTerapiaDefault: number; // en días
  recordatoriosActivos: boolean;
  evaluacionesRequeridas: boolean;
}

// ===============================================
// ENUMS Y CONSTANTES
// ===============================================

export enum TipoTerapia {
  FISICA = 'fisica',
  OCUPACIONAL = 'ocupacional',
  RESPIRATORIA = 'respiratoria',
  NEUROLOGICA = 'neurologica',
  CARDIACA = 'cardiaca'
}

export enum NivelTerapia {
  PRINCIPIANTE = 'principiante',
  INTERMEDIO = 'intermedio',
  AVANZADO = 'avanzado'
}

export enum EstadoTerapia {
  PENDIENTE = 'pendiente',
  EN_PROGRESO = 'en_progreso',
  COMPLETADA = 'completada',
  ABANDONADA = 'abandonada',
  PAUSADA = 'pausada'
}

export enum TipoAsignacion {
  INDIVIDUAL = 'individual',
  GRUPAL = 'grupal'
}

export enum EstadoAsignacion {
  ACTIVA = 'activa',
  PAUSADA = 'pausada',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada'
}