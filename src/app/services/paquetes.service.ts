// src/app/services/paquetes.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { 
  Paquete, 
  PaqueteFormData, 
  PaqueteResponse, 
  FiltrosPaquetes
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
      if (filtros?.tipo && filtros.tipo !== 'todos') {
        query = query.eq('tipo', filtros.tipo);
      }

      if (filtros?.status !== undefined) {
        query = query.eq('status', filtros.status);
      }

      if (filtros?.busqueda) {
        query = query.or(`nombre.ilike.%${filtros.busqueda}%,descripcion.ilike.%${filtros.busqueda}%`);
      }

      if (filtros?.precio_min) {
        query = query.gte('precio_final', filtros.precio_min);
      }

      if (filtros?.precio_max) {
        query = query.lte('precio_final', filtros.precio_max);
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
        .select(`
          *,
          paquete_rutinas:paquete_rutinas(rutina_id),
          paquete_terapias:paquete_terapias(terapia_id)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error obteniendo paquete:', error);
        throw error;
      }

      if (data) {
        // Agregar arrays de selecciones
        data.rutinas_seleccionadas = data.paquete_rutinas?.map((pr: any) => pr.rutina_id) || [];
        data.terapias_seleccionadas = data.paquete_terapias?.map((pt: any) => pt.terapia_id) || [];
      }

      return data;
    } catch (error) {
      console.error('Error en obtenerPaquetePorId:', error);
      throw error;
    }
  }

  async crearPaquete(paqueteData: PaqueteFormData): Promise<PaqueteResponse> {
    try {
      // Separar las selecciones del resto de datos
      const { rutinas_seleccionadas, terapias_seleccionadas, ...paqueteInfo } = paqueteData;

      // Crear el paquete
      const { data: paquete, error: paqueteError } = await this.supabaseService.client
        .from('paquetes')
        .insert([paqueteInfo])
        .select()
        .single();

      if (paqueteError) {
        console.error('Error creando paquete:', paqueteError);
        throw paqueteError;
      }

      // Guardar relaciones con rutinas o terapias
      if (paqueteData.tipo === 'rutina' && rutinas_seleccionadas && rutinas_seleccionadas.length > 0) {
        await this.guardarRelacionesRutinas(paquete.id, rutinas_seleccionadas);
      } else if (paqueteData.tipo === 'terapia' && terapias_seleccionadas && terapias_seleccionadas.length > 0) {
        await this.guardarRelacionesTerapias(paquete.id, terapias_seleccionadas);
      }

      return {
        success: true,
        message: 'Paquete creado exitosamente',
        data: paquete
      };
    } catch (error) {
      console.error('Error en crearPaquete:', error);
      return {
        success: false,
        message: 'Error al crear el paquete'
      };
    }
  }

  async actualizarPaquete(id: number, paqueteData: PaqueteFormData): Promise<PaqueteResponse> {
    try {
      // Separar las selecciones del resto de datos
      const { rutinas_seleccionadas, terapias_seleccionadas, ...paqueteInfo } = paqueteData;

      // Actualizar el paquete
      const { data: paquete, error: paqueteError } = await this.supabaseService.client
        .from('paquetes')
        .update(paqueteInfo)
        .eq('id', id)
        .select()
        .single();

      if (paqueteError) {
        console.error('Error actualizando paquete:', paqueteError);
        throw paqueteError;
      }

      // Limpiar relaciones existentes
      await this.limpiarRelacionesExistentes(id);

      // Guardar nuevas relaciones
      if (paqueteData.tipo === 'rutina' && rutinas_seleccionadas && rutinas_seleccionadas.length > 0) {
        await this.guardarRelacionesRutinas(id, rutinas_seleccionadas);
      } else if (paqueteData.tipo === 'terapia' && terapias_seleccionadas && terapias_seleccionadas.length > 0) {
        await this.guardarRelacionesTerapias(id, terapias_seleccionadas);
      }

      return {
        success: true,
        message: 'Paquete actualizado exitosamente',
        data: paquete
      };
    } catch (error) {
      console.error('Error en actualizarPaquete:', error);
      return {
        success: false,
        message: 'Error al actualizar el paquete'
      };
    }
  }

  async eliminarPaquete(id: number): Promise<PaqueteResponse> {
    try {
      // Eliminar relaciones primero
      await this.limpiarRelacionesExistentes(id);

      // Eliminar paquete (soft delete)
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .update({ status: 0 })
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
        data
      };
    } catch (error) {
      console.error('Error en eliminarPaquete:', error);
      return {
        success: false,
        message: 'Error al eliminar el paquete'
      };
    }
  }

  // ================================
  // MÉTODOS ESPECÍFICOS PARA ACTIVAR/DESACTIVAR
  // ================================

  async cambiarEstadoPaquete(id: number, nuevoEstado: number): Promise<PaqueteResponse> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .update({ status: nuevoEstado })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error cambiando estado del paquete:', error);
        throw error;
      }

      return {
        success: true,
        message: `Paquete ${nuevoEstado === 1 ? 'activado' : 'desactivado'} exitosamente`,
        data
      };
    } catch (error) {
      console.error('Error en cambiarEstadoPaquete:', error);
      return {
        success: false,
        message: 'Error al cambiar el estado del paquete'
      };
    }
  }

  async activarPaquete(id: number): Promise<PaqueteResponse> {
    return this.cambiarEstadoPaquete(id, 1);
  }

  async desactivarPaquete(id: number): Promise<PaqueteResponse> {
    return this.cambiarEstadoPaquete(id, 0);
  }

  // Método adicional para activar con datos específicos si es necesario en otros componentes
  async activarPaqueteConDatos(id: number, datos?: any): Promise<PaqueteResponse> {
    if (datos) {
      // Si se proporcionan datos adicionales, actualizarlos también
      return this.actualizarPaquete(id, datos);
    } else {
      // Solo cambiar el estado
      return this.activarPaquete(id);
    }
  }

  // ================================
  // MANEJO DE RELACIONES
  // ================================

  private async guardarRelacionesRutinas(paqueteId: number, rutinasIds: number[]): Promise<void> {
    const relaciones = rutinasIds.map(rutinaId => ({
      paquete_id: paqueteId,
      rutina_id: rutinaId
    }));

    const { error } = await this.supabaseService.client
      .from('paquete_rutinas')
      .insert(relaciones);

    if (error) {
      console.error('Error guardando relaciones con rutinas:', error);
      throw error;
    }
  }

  private async guardarRelacionesTerapias(paqueteId: number, terapiasIds: number[]): Promise<void> {
    const relaciones = terapiasIds.map(terapiaId => ({
      paquete_id: paqueteId,
      terapia_id: terapiaId
    }));

    const { error } = await this.supabaseService.client
      .from('paquete_terapias')
      .insert(relaciones);

    if (error) {
      console.error('Error guardando relaciones con terapias:', error);
      throw error;
    }
  }

  private async limpiarRelacionesExistentes(paqueteId: number): Promise<void> {
    // Eliminar relaciones con rutinas
    await this.supabaseService.client
      .from('paquete_rutinas')
      .delete()
      .eq('paquete_id', paqueteId);

    // Eliminar relaciones con terapias
    await this.supabaseService.client
      .from('paquete_terapias')
      .delete()
      .eq('paquete_id', paqueteId);
  }

  // ================================
  // MÉTODOS DE UTILIDAD
  // ================================

  async obtenerEstadisticasPaquetes(): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('obtener_estadisticas_paquetes');

      if (error) {
        console.error('Error obteniendo estadísticas:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en obtenerEstadisticasPaquetes:', error);
      return {
        total_paquetes: 0,
        paquetes_activos: 0,
        paquetes_terapia: 0,
        paquetes_rutina: 0,
        promedio_precio: 0,
        total_ventas: 0
      };
    }
  }

  async duplicarPaquete(id: number): Promise<PaqueteResponse> {
    try {
      const paqueteOriginal = await this.obtenerPaquetePorId(id);
      if (!paqueteOriginal) {
        throw new Error('Paquete no encontrado');
      }

      const nuevoPaquete: PaqueteFormData = {
        nombre: `Copia de ${paqueteOriginal.nombre}`,
        descripcion: paqueteOriginal.descripcion,
        precio: paqueteOriginal.precio,
        cantidad_sesiones: paqueteOriginal.cantidad_sesiones,
        tipo: paqueteOriginal.tipo,
        descuento: paqueteOriginal.descuento,
        rutinas_seleccionadas: paqueteOriginal.rutinas_seleccionadas,
        terapias_seleccionadas: paqueteOriginal.terapias_seleccionadas
      };

      return await this.crearPaquete(nuevoPaquete);
    } catch (error) {
      console.error('Error en duplicarPaquete:', error);
      return {
        success: false,
        message: 'Error al duplicar el paquete'
      };
    }
  }

  // ================================
  // VALIDACIONES
  // ================================

  validarPaquete(paqueteData: PaqueteFormData): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validaciones básicas
    if (!paqueteData.nombre || paqueteData.nombre.trim().length === 0) {
      errores.push('El nombre es requerido');
    }

    if (paqueteData.nombre && paqueteData.nombre.length > 255) {
      errores.push('El nombre no puede exceder 255 caracteres');
    }

    if (!paqueteData.precio || paqueteData.precio <= 0) {
      errores.push('El precio debe ser mayor a 0');
    }

    if (!paqueteData.cantidad_sesiones || paqueteData.cantidad_sesiones < 1 || paqueteData.cantidad_sesiones > 25) {
      errores.push('La cantidad de sesiones debe estar entre 1 y 25');
    }

    if (!paqueteData.tipo || !['terapia', 'rutina'].includes(paqueteData.tipo)) {
      errores.push('Debe seleccionar un tipo válido (terapia o rutina)');
    }

    if (paqueteData.descuento < 0 || paqueteData.descuento > 100) {
      errores.push('El descuento debe estar entre 0 y 100%');
    }

    // Validaciones de selecciones
    if (paqueteData.tipo === 'rutina') {
      if (!paqueteData.rutinas_seleccionadas || paqueteData.rutinas_seleccionadas.length === 0) {
        errores.push('Debe seleccionar al menos una rutina');
      } else if (paqueteData.rutinas_seleccionadas.length > paqueteData.cantidad_sesiones) {
        errores.push('No puede seleccionar más rutinas que la cantidad de sesiones');
      }
    } else if (paqueteData.tipo === 'terapia') {
      if (!paqueteData.terapias_seleccionadas || paqueteData.terapias_seleccionadas.length === 0) {
        errores.push('Debe seleccionar al menos una terapia');
      } else if (paqueteData.terapias_seleccionadas.length > paqueteData.cantidad_sesiones) {
        errores.push('No puede seleccionar más terapias que la cantidad de sesiones');
      }
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  // ================================
  // BÚSQUEDA Y FILTRADO
  // ================================

  async buscarPaquetes(termino: string): Promise<Paquete[]> {
    try {
      if (!termino || termino.trim().length === 0) {
        return await this.obtenerPaquetes();
      }

      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .select('*')
        .or(`nombre.ilike.%${termino}%,descripcion.ilike.%${termino}%`)
        .eq('status', 1)
        .order('nombre');

      if (error) {
        console.error('Error buscando paquetes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en buscarPaquetes:', error);
      throw error;
    }
  }

  async obtenerPaquetesPorTipo(tipo: 'terapia' | 'rutina'): Promise<Paquete[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .select('*')
        .eq('tipo', tipo)
        .eq('status', 1)
        .order('nombre');

      if (error) {
        console.error('Error obteniendo paquetes por tipo:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerPaquetesPorTipo:', error);
      throw error;
    }
  }

  // ================================
  // MÉTODOS DE FORMATO
  // ================================

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(precio);
  }

  calcularPrecioFinal(precio: number, descuento: number): number {
    return precio - (precio * descuento / 100);
  }

  calcularPrecioPorSesion(precioTotal: number, cantidadSesiones: number): number {
    return cantidadSesiones > 0 ? precioTotal / cantidadSesiones : 0;
  }

  obtenerResumenPaquete(paquete: Paquete): any {
    const precioFinal = this.calcularPrecioFinal(paquete.precio, paquete.descuento);
    const precioPorSesion = this.calcularPrecioPorSesion(precioFinal, paquete.cantidad_sesiones);

    return {
      id: paquete.id,
      nombre: paquete.nombre,
      tipo: paquete.tipo,
      cantidadSesiones: paquete.cantidad_sesiones,
      precioBase: paquete.precio,
      descuento: paquete.descuento,
      precioFinal: precioFinal,
      precioPorSesion: precioPorSesion,
      ahorroTotal: paquete.precio - precioFinal,
      status: paquete.status,
      fechaCreacion: paquete.fecha_creacion
    };
  }
}