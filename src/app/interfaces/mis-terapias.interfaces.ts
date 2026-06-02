// src/app/interfaces/mis-terapias.interfaces.ts
import { TerapiaAsignadaUsuario, EstadisticasTerapias } from './terapias.interfaces';

// Usando la interface existente TerapiaAsignadaUsuario como base
export interface SeguimientoTerapiaDetallado extends TerapiaAsignadaUsuario {
  // Campos adicionales si son necesarios
  terapia_completa?: any; // Terapia completa con todos los ejercicios
}

// Alias para compatibilidad con las estadísticas existentes
export interface EstadisticasTerapiasPersonales extends EstadisticasTerapias {
  // Campos adicionales específicos para vista personal
  terapias_vigentes?: number;
  terapias_pendientes?: number;
  terapias_vencidas?: number;
  racha_actual?: number;
  mejor_racha?: number;
  tiempo_total_rehabilitacion?: number;
  areas_tratamiento?: string[];
}

// Interface para filtros específicos de "Mis Terapias" - adaptada a la estructura existente
export interface FiltrosMisTerapias {
  busqueda?: string;
  estado_temporal?: 'all' | 'vigente' | 'pendiente' | 'vencida';
  estado_individual?: 'all' | 'pendiente' | 'en_progreso' | 'completada' | 'abandonada' | 'pausada';
  progreso?: 'all' | 'sin_iniciar' | 'en_progreso' | 'completado';
  tipo_terapia?: 'all' | 'fisica' | 'ocupacional' | 'respiratoria' | 'neurologica' | 'cardiaca';
  nivel?: 'all' | 'principiante' | 'intermedio' | 'avanzado';
  area_especializacion?: 'all' | string;
}

// Interface para respuesta de actualización de progreso - simplificada
export interface ActualizacionProgresoTerapiaResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// Interface para el formulario de actualización de progreso - ÚNICA DEFINICIÓN
export interface FormularioProgresoTerapia {
  progreso: number;
  estado: string; // Usando string para compatibilidad con tu estructura existente
  notas?: string;
  sesiones_completadas?: number;
  adherencia_porcentaje?: number;
  nivel_dolor_actual?: number;
  nivel_funcionalidad_actual?: number;
  // Campos adicionales opcionales
  evaluacion_subjetiva?: number; // 1-10 escala de percepción del paciente
  dolor_nivel?: number; // 0-10 escala de dolor (alias de nivel_dolor_actual)
  dificultades_encontradas?: string[];
  mejoras_percibidas?: string[];
}

// Interface para evaluación de progreso terapéutico
export interface EvaluacionProgresoTerapeutico {
  fecha_evaluacion: string;
  progreso_funcional: number; // 0-100
  progreso_dolor: number; // reducción del dolor 0-100
  progreso_movilidad: number; // mejora en movilidad 0-100
  progreso_fuerza: number; // mejora en fuerza 0-100
  adherencia_tratamiento: number; // 0-100
  satisfaccion_paciente: number; // 1-10
  observaciones_terapeuta?: string;
  recomendaciones?: string;
  ajustes_tratamiento?: string;
}

// Interface para métricas de seguimiento específicas de terapia
export interface MetricasSeguimientoTerapia {
  sesiones_completadas: number;
  sesiones_programadas: number;
  adherencia_porcentaje: number;
  tiempo_promedio_sesion: number; // en minutos
  ejercicios_dominados: number;
  ejercicios_totales: number;
  nivel_dolor_inicial: number;
  nivel_dolor_actual: number;
  capacidad_funcional_inicial: number;
  capacidad_funcional_actual: number;
}

// Interface para notificaciones de terapia
export interface NotificacionTerapia {
  id: number;
  tipo: 'recordatorio_sesion' | 'evaluacion_pendiente' | 'progreso_estancado' | 'objetivo_alcanzado';
  titulo: string;
  mensaje: string;
  fecha_creacion: string;
  leida: boolean;
  terapia_id: number;
  terapia_nombre: string;
  accion_requerida?: string;
  url_accion?: string;
}