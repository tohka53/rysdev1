// src/app/interfaces/paquetes.interfaces.ts

export interface Paquete {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad_sesiones: number;
  tipo: 'terapia' | 'rutina';
  descuento: number;
  precio_final?: number; // Campo calculado automáticamente por la DB
  status: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface PaqueteFormData {
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad_sesiones: number;
  tipo: 'terapia' | 'rutina';
  descuento: number;
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

export const TIPOS_PAQUETE = [
  { value: 'terapia', label: 'Terapia' },
  { value: 'rutina', label: 'Rutina' }
] as const;