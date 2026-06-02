// src/app/interfaces/rutinas.interfaces.ts

export interface TipoSeccion {
  id?: number;
  nombre: string;
  descripcion: string;
  icono?: string;
  status: number;
  created_at?: string;
}

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

// Interface principal para rutina con index signature
export interface Rutina {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo: string;
  nivel: string;
  duracion_estimada?: number;
  warm_up?: SeccionRutina;
  met_con?: SeccionRutina;
  strength?: SeccionRutina;
  core?: SeccionRutina;
  extra?: SeccionRutina;
  tags?: string[];
  status: number;
  created_at?: string;
  updated_at?: string;
  // Index signature para permitir acceso dinámico
  [key: string]: any;
}

export interface SeccionInfo {
  key: string;
  nombre: string;
  descripcion: string;
}

export interface SeccionConEjercicios {
  key: string;
  nombre: string;
  seccion: SeccionRutina;
}