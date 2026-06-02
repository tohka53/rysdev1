// src/app/interfaces/mis-rutinas.interfaces.ts
import { Rutina } from './rutinas.interfaces';

// Interface extendida para el seguimiento detallado en "Mis Rutinas"
export interface SeguimientoDetalladoExtendido {
  // Datos del seguimiento individual
  seguimiento_id: number;
  asignacion_id: number;
  id_profile: number;
  username: string;
  full_name: string;
  
  // Datos básicos de la rutina
  rutina_id: number;
  rutina_nombre: string;
  rutina_descripcion?: string;
  rutina_tipo: string;
  rutina_nivel: string;
  rutina_duracion?: number;
  rutina_tags?: string[];
  rutina_completa?: Rutina; // Rutina completa con todas las secciones
  
  // Progreso y estado individual
  progreso: number; // 0-100
  estado_individual: 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  notas_individuales?: string;
  
  // Fechas programadas de la asignación
  fecha_inicio_programada: string;
  fecha_fin_programada: string;
  
  // Estados calculados
  estado_temporal: 'vigente' | 'pendiente' | 'vencida';
  dias_restantes: number;
}

// Interface para estadísticas personales del usuario
export interface EstadisticasPersonales {
  total_rutinas_asignadas: number;
  rutinas_vigentes: number;
  rutinas_completadas: number;
  rutinas_en_progreso: number;
  rutinas_pendientes: number;
  rutinas_vencidas: number;
  progreso_promedio: number;
  racha_actual: number; // Días consecutivos con progreso
  mejor_racha: number;
}

// Interface para filtros específicos de "Mis Rutinas"
export interface FiltrosMisRutinas {
  busqueda?: string;
  estado_temporal?: 'all' | 'vigente' | 'pendiente' | 'vencida';
  estado_individual?: 'all' | 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
  progreso?: 'all' | 'sin_iniciar' | 'en_progreso' | 'completado';
  tipo_rutina?: 'all' | 'entrenamiento' | 'recuperacion' | 'evaluacion';
  nivel?: 'all' | 'principiante' | 'intermedio' | 'avanzado';
}

// Interface para respuesta de actualización de progreso
export interface ActualizacionProgresoResponse {
  success: boolean;
  message: string;
  nuevo_estado?: string;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
}