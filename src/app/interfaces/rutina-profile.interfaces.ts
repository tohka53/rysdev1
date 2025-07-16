// src/app/interfaces/rutina-profile.interfaces.ts

// Interface para rutinas
export interface Rutina {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo: 'entrenamiento' | 'recuperacion' | 'evaluacion';
  nivel: 'principiante' | 'intermedio' | 'avanzado';
  duracion_estimada?: number; // en minutos
  warm_up?: any;
  met_con?: any;
  strength?: any;
  core?: any;
  extra?: any;
  tags?: string[];
  status?: number;
  created_at?: string;
  updated_at?: string;
}

// Interface para la relación rutina-profile
export interface RutinaProfile {
  id?: number;
  id_profile: number;
  id_rutina: number;
  fecha_inicio: string; // formato YYYY-MM-DD
  fecha_fin: string; // formato YYYY-MM-DD
  estado: 'activa' | 'completada' | 'pausada' | 'cancelada';
  progreso: number; // 0-100
  notas?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

// Interface extendida para la vista
export interface RutinaProfileVista {
  id: number;
  id_profile: number;
  id_rutina: number;
  username: string;
  full_name: string;
  rutina_nombre: string;
  rutina_descripcion?: string;
  rutina_tipo: string;
  rutina_nivel: string;
  duracion_estimada?: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  progreso: number;
  notas?: string;
  created_at: string;
  estado_temporal: 'vigente' | 'pendiente' | 'vencida';
}

// Interface para crear/asignar rutina
export interface AsignarRutinaRequest {
  id_profile: number;
  id_rutina: number;
  fecha_inicio: string;
  fecha_fin: string;
  notas?: string;
}

// Interface para actualizar progreso
export interface ActualizarProgresoRequest {
  id: number;
  progreso: number;
  estado?: 'activa' | 'completada' | 'pausada' | 'cancelada';
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
}

// Interface para estadísticas
export interface EstadisticasRutinas {
  total_rutinas: number;
  rutinas_activas: number;
  rutinas_completadas: number;
  progreso_promedio: number;
  rutinas_vigentes: number;
  rutinas_vencidas: number;
}