// src/app/interfaces/paquetes.interfaces.ts

export interface Paquete {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad_sesiones: number;
  tipo: 'terapia' | 'rutina';
  descuento: number;
  precio_final?: number;
  status: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  // Nuevas propiedades para selección de rutinas/terapias
  rutinas_seleccionadas?: number[];
  terapias_seleccionadas?: number[];
}

export interface PaqueteFormData {
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad_sesiones: number;
  tipo: 'terapia' | 'rutina';
  descuento: number;
  rutinas_seleccionadas?: number[];
  terapias_seleccionadas?: number[];
}

// Interfaces para mostrar opciones disponibles
export interface RutinaOpcion {
  id: number;
  nombre: string;
  descripcion?: string;
  nivel: string;
  duracion_estimada?: number;
  total_ejercicios?: number;
  categoria?: string;
  status: number;
}

export interface TerapiaOpcion {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: string;
  area_especializacion?: string;
  nivel: string;
  duracion_estimada?: number;
  status: number;
}

export interface FiltrosPaquetes {
  tipo?: 'terapia' | 'rutina' | 'todos';
  status?: number;
  busqueda?: string;
  precio_min?: number;
  precio_max?: number;
}

export interface PaqueteResponse {
  success: boolean;
  message: string;
  data?: Paquete | Paquete[];
}

// Interface para el selector de rutinas/terapias
export interface SelectorRutinaTerapia {
  id: number;
  nombre: string;
  descripcion?: string;
  informacion_adicional: string; // Texto descriptivo adicional
  seleccionado: boolean;
}

export const TIPOS_PAQUETE = [
  { value: 'terapia', label: 'Terapia' },
  { value: 'rutina', label: 'Rutina' }
] as const;