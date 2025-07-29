// src/app/services/paquetes.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { 
  Paquete, 
  PaqueteFormData, 
  FiltrosPaquetes, 
  PaqueteResponse 
} from '../interfaces/paquetes.interfaces';

@Injectable({
  providedIn: 'root'
})
export class PaquetesService {

  constructor(private supabaseService: SupabaseService) {}

  // ================================
  // OPERACIONES CRUD
  // ================================

  async obtenerPaquetes(filtros?: FiltrosPaquetes): Promise<Paquete[]> {
    try {
      let query = this.supabaseService.client
        .from('paquetes')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      // Aplicar filtros
      if (filtros) {
        if (filtros.tipo && filtros.tipo !== 'todos') {
          query = query.eq('tipo', filtros.tipo);
        }
        
        if (filtros.status !== undefined) {
          query = query.eq('status', filtros.status);
        }

        if (filtros.busqueda) {
          query = query.or(`nombre.ilike.%${filtros.busqueda}%,descripcion.ilike.%${filtros.busqueda}%`);
        }

        if (filtros.precio_min !== undefined) {
          query = query.gte('precio', filtros.precio_min);
        }

        if (filtros.precio_max !== undefined) {
          query = query.lte('precio', filtros.precio_max);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error obteniendo paquetes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerPaquetes:', error);
      throw error;
    }
  }

  async obtenerPaquetePorId(id: number): Promise<Paquete | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error obteniendo paquete:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en obtenerPaquetePorId:', error);
      throw error;
    }
  }

  async crearPaquete(paqueteData: PaqueteFormData): Promise<PaqueteResponse> {
    try {
      // Validaciones
      const validacionResult = this.validarDatosPaquete(paqueteData);
      if (!validacionResult.esValido) {
        return {
          success: false,
          message: validacionResult.mensaje
        };
      }

      // Preparar datos para inserción
      const datosInsercion = {
        ...paqueteData,
        status: 1,
        fecha_actualizacion: new Date().toISOString()
      };

      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .insert(datosInsercion)
        .select()
        .single();

      if (error) {
        console.error('Error creando paquete:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Paquete creado exitosamente',
        data: data
      };
    } catch (error) {
      console.error('Error en crearPaquete:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al crear el paquete'
      };
    }
  }

  async actualizarPaquete(id: number, paqueteData: Partial<PaqueteFormData>): Promise<PaqueteResponse> {
    try {
      // Validaciones si se proporcionan datos completos
      if (this.esDatoCompleto(paqueteData)) {
        const validacionResult = this.validarDatosPaquete(paqueteData as PaqueteFormData);
        if (!validacionResult.esValido) {
          return {
            success: false,
            message: validacionResult.mensaje
          };
        }
      }

      // Agregar fecha de actualización
      const datosActualizacion = {
        ...paqueteData,
        fecha_actualizacion: new Date().toISOString()
      };

      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .update(datosActualizacion)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando paquete:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Paquete actualizado exitosamente',
        data: data
      };
    } catch (error) {
      console.error('Error en actualizarPaquete:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar el paquete'
      };
    }
  }

  async eliminarPaquete(id: number): Promise<PaqueteResponse> {
    try {
      // Eliminación lógica (cambiar status a 0)
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .update({ 
          status: 0,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error eliminando paquete:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Paquete eliminado exitosamente',
        data: data
      };
    } catch (error) {
      console.error('Error en eliminarPaquete:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al eliminar el paquete'
      };
    }
  }

  async activarPaquete(id: number): Promise<PaqueteResponse> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .update({ 
          status: 1,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error activando paquete:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Paquete activado exitosamente',
        data: data
      };
    } catch (error) {
      console.error('Error en activarPaquete:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al activar el paquete'
      };
    }
  }

  // ================================
  // MÉTODOS DE UTILIDAD
  // ================================

  async obtenerPaquetesPorTipo(tipo: 'terapia' | 'rutina'): Promise<Paquete[]> {
    return this.obtenerPaquetes({ tipo, status: 1 });
  }

  async obtenerPaquetesActivos(): Promise<Paquete[]> {
    return this.obtenerPaquetes({ status: 1 });
  }

  async buscarPaquetes(busqueda: string): Promise<Paquete[]> {
    return this.obtenerPaquetes({ busqueda, status: 1 });
  }

  // ================================
  // VALIDACIONES
  // ================================

  private validarDatosPaquete(datos: PaqueteFormData): { esValido: boolean; mensaje: string } {
    if (!datos.nombre || datos.nombre.trim().length === 0) {
      return { esValido: false, mensaje: 'El nombre es obligatorio' };
    }

    if (datos.nombre.length > 255) {
      return { esValido: false, mensaje: 'El nombre no puede exceder 255 caracteres' };
    }

    if (datos.precio <= 0) {
      return { esValido: false, mensaje: 'El precio debe ser mayor a 0' };
    }

    if (datos.cantidad_sesiones <= 0) {
      return { esValido: false, mensaje: 'La cantidad de sesiones debe ser mayor a 0' };
    }

    if (!['terapia', 'rutina'].includes(datos.tipo)) {
      return { esValido: false, mensaje: 'El tipo debe ser "terapia" o "rutina"' };
    }

    if (datos.descuento < 0 || datos.descuento > 100) {
      return { esValido: false, mensaje: 'El descuento debe estar entre 0 y 100%' };
    }

    return { esValido: true, mensaje: '' };
  }

  private esDatoCompleto(datos: Partial<PaqueteFormData>): datos is PaqueteFormData {
    return !!(datos.nombre && datos.precio && datos.cantidad_sesiones && datos.tipo && datos.descuento !== undefined);
  }

  // ================================
  // CÁLCULOS
  // ================================

  calcularPrecioFinal(precio: number, descuento: number): number {
    return precio - (precio * descuento / 100);
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(precio);
  }
}