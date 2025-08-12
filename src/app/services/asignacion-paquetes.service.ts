// src/app/services/asignacion-paquetes.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  estado?: string;
}

export interface Paquete {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad_sesiones: number;
  tipo: 'terapia' | 'rutina';
  descuento: number;
  precio_final?: number;
  status: number;
}

export interface AsignacionPaquete {
  usuario_id: number;
  paquete_id: number;
  fecha_inicio: string;
  precio_pagado: number;
  descuento_aplicado?: number;
  terapeuta_asignado?: number;
  metodo_pago?: string;
  notas_administrativas?: string;
}

export interface UsuarioPaquete {
  id: number;
  usuario_id: number;
  paquete_id: number;
  fecha_compra: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  sesiones_utilizadas: number;
  sesiones_totales: number;
  precio_pagado: number;
  descuento_aplicado: number;
  metodo_pago?: string;
  notas_administrativas?: string;
  terapeuta_asignado?: number;
  // Datos relacionados
  usuario?: Usuario;
  paquete?: Paquete;
  terapeuta?: Usuario;
}

export interface AsignacionResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

export interface FiltrosAsignaciones {
  usuario_id?: number;
  paquete_id?: number;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  terapeuta_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AsignacionPaquetesService {

  constructor(private supabaseService: SupabaseService) { }

  // ===============================================
  // GESTIÓN DE USUARIOS
  // ===============================================

  async obtenerUsuarios(): Promise<Usuario[]> {
    try {
      console.log('🔍 Iniciando carga de usuarios...');
      
      // Usar la estructura real de la tabla profiles
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, created_at, status')
        .eq('status', 1)
        .order('full_name');

      if (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        throw error;
      }

      console.log('✅ Usuarios cargados:', data?.length || 0);

      // Mapear a la interface Usuario
      const usuarios = (data || []).map(user => ({
        id: user.id,
        nombre: user.full_name || user.username || 'Usuario sin nombre',
        email: user.username || `usuario${user.id}@example.com`,
        telefono: undefined,
        fecha_nacimiento: undefined,
        estado: user.status === 1 ? 'activo' : 'inactivo'
      }));

      return usuarios;

    } catch (error) {
      console.error('❌ Error en obtenerUsuarios:', error);
      throw new Error('No se pudieron cargar los usuarios');
    }
  }

  // ===============================================
  // GESTIÓN DE TERAPEUTAS
  // ===============================================

  async obtenerTerapeutas(): Promise<Usuario[]> {
    try {
      console.log('🔍 Iniciando carga de terapeutas...');
      
      // Obtener usuarios con perfil de terapeuta (ajusta el id_perfil según tu sistema)
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, created_at, status, id_perfil')
        .eq('status', 1)
        .in('id_perfil', [1, 3]) // Administradores y Supervisores pueden ser terapeutas
        .order('full_name');

      if (error) {
        console.error('❌ Error obteniendo terapeutas:', error);
        throw error;
      }

      console.log('✅ Terapeutas cargados:', data?.length || 0);

      // Mapear a la interface Usuario
      const terapeutas = (data || []).map(user => ({
        id: user.id,
        nombre: user.full_name || user.username || 'Terapeuta sin nombre',
        email: user.username || `terapeuta${user.id}@example.com`,
        telefono: undefined,
        fecha_nacimiento: undefined,
        estado: user.status === 1 ? 'activo' : 'inactivo'
      }));

      return terapeutas;

    } catch (error) {
      console.error('❌ Error en obtenerTerapeutas:', error);
      throw new Error('No se pudieron cargar los terapeutas');
    }
  }

  async buscarUsuarios(termino: string): Promise<Usuario[]> {
    try {
      console.log('🔍 Buscando usuarios con término:', termino);
      
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, created_at, status')
        .eq('status', 1)
        .or(`full_name.ilike.%${termino}%,username.ilike.%${termino}%`)
        .order('full_name')
        .limit(50); // Limitar resultados

      if (error) {
        console.error('❌ Error buscando usuarios:', error);
        throw error;
      }

      console.log('✅ Usuarios encontrados:', data?.length || 0);

      // Mapear a la interface Usuario
      const usuarios = (data || []).map(user => ({
        id: user.id,
        nombre: user.full_name || user.username || 'Usuario sin nombre',
        email: user.username || `usuario${user.id}@example.com`,
        telefono: undefined,
        fecha_nacimiento: undefined,
        estado: user.status === 1 ? 'activo' : 'inactivo'
      }));

      return usuarios;

    } catch (error) {
      console.error('❌ Error en buscarUsuarios:', error);
      throw new Error('No se pudieron buscar los usuarios');
    }
  }

  async obtenerPaquetes(): Promise<Paquete[]> {
    try {
      console.log('🔍 Iniciando carga de paquetes...');
      
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .select('*')
        .eq('status', 1)
        .order('nombre');

      if (error) {
        console.error('❌ Error obteniendo paquetes:', error);
        throw error;
      }

      console.log('✅ Paquetes cargados:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Error en obtenerPaquetes:', error);
      throw new Error('No se pudieron cargar los paquetes');
    }
  }

  // ===============================================
  // GESTIÓN DE ASIGNACIONES
  // ===============================================

  async obtenerAsignaciones(filtros: FiltrosAsignaciones = {}): Promise<UsuarioPaquete[]> {
    try {
      console.log('🔍 Iniciando carga de asignaciones con filtros:', filtros);

      let query = this.supabaseService.client
        .from('usuario_paquetes')
        .select(`
          *,
          usuario:profiles!usuario_paquetes_usuario_id_fkey(id, username, full_name),
          paquete:paquetes!usuario_paquetes_paquete_id_fkey(id, nombre, tipo, precio, cantidad_sesiones),
          terapeuta:profiles!usuario_paquetes_terapeuta_asignado_fkey(id, username, full_name)
        `);

      // Aplicar filtros
      if (filtros.usuario_id) {
        query = query.eq('usuario_id', filtros.usuario_id);
      }

      if (filtros.paquete_id) {
        query = query.eq('paquete_id', filtros.paquete_id);
      }

      if (filtros.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros.fecha_inicio) {
        query = query.gte('fecha_inicio', filtros.fecha_inicio);
      }

      if (filtros.fecha_fin) {
        query = query.lte('fecha_fin', filtros.fecha_fin);
      }

      if (filtros.terapeuta_id) {
        query = query.eq('terapeuta_asignado', filtros.terapeuta_id);
      }

      // Ordenar por fecha más reciente
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error obteniendo asignaciones:', error);
        throw error;
      }

      console.log('✅ Asignaciones cargadas:', data?.length || 0);

      // Mapear los datos
      const asignaciones = (data || []).map(item => ({
        ...item,
        usuario: item.usuario ? {
          id: item.usuario.id,
          nombre: item.usuario.full_name || item.usuario.username || 'Sin nombre',
          email: item.usuario.username || 'Sin email'
        } : undefined,
        paquete: item.paquete ? {
          ...item.paquete
        } : undefined,
        terapeuta: item.terapeuta ? {
          id: item.terapeuta.id,
          nombre: item.terapeuta.full_name || item.terapeuta.username || 'Sin nombre',
          email: item.terapeuta.username || 'Sin email'
        } : undefined
      }));

      return asignaciones;

    } catch (error) {
      console.error('❌ Error en obtenerAsignaciones:', error);
      throw new Error('No se pudieron cargar las asignaciones');
    }
  }

  async obtenerEstadisticasAsignaciones(): Promise<any> {
    try {
      console.log('🔍 Obteniendo estadísticas de asignaciones...');

      const { data, error } = await this.supabaseService.client
        .from('usuario_paquetes')
        .select('estado');

      if (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
      }

      const estadisticas = {
        total: data?.length || 0,
        activos: data?.filter(item => item.estado === 'activo').length || 0,
        completados: data?.filter(item => item.estado === 'completado').length || 0,
        pausados: data?.filter(item => item.estado === 'pausado').length || 0,
        cancelados: data?.filter(item => item.estado === 'cancelado').length || 0
      };

      console.log('✅ Estadísticas calculadas:', estadisticas);
      return estadisticas;

    } catch (error) {
      console.error('❌ Error en obtenerEstadisticasAsignaciones:', error);
      return {
        total: 0,
        activos: 0,
        completados: 0,
        pausados: 0,
        cancelados: 0
      };
    }
  }

  async crearAsignacion(asignacion: AsignacionPaquete): Promise<AsignacionResponse> {
    try {
      console.log('🔄 Creando nueva asignación:', asignacion);

      // Obtener información del paquete
      const { data: paquete, error: paqueteError } = await this.supabaseService.client
        .from('paquetes')
        .select('cantidad_sesiones, precio, duracion_dias')
        .eq('id', asignacion.paquete_id)
        .single();

      if (paqueteError || !paquete) {
        throw new Error('Paquete no encontrado');
      }

      // Calcular fecha fin
      const fechaInicio = new Date(asignacion.fecha_inicio);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + (paquete.duracion_dias || 30));

      // Crear la asignación
      const { data, error } = await this.supabaseService.client
        .from('usuario_paquetes')
        .insert([{
          usuario_id: asignacion.usuario_id,
          paquete_id: asignacion.paquete_id,
          fecha_inicio: asignacion.fecha_inicio,
          fecha_fin: fechaFin.toISOString().split('T')[0],
          sesiones_totales: paquete.cantidad_sesiones,
          precio_pagado: asignacion.precio_pagado,
          descuento_aplicado: asignacion.descuento_aplicado || 0,
          terapeuta_asignado: asignacion.terapeuta_asignado,
          metodo_pago: asignacion.metodo_pago,
          notas_administrativas: asignacion.notas_administrativas,
          estado: 'activo'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando asignación:', error);
        throw error;
      }

      console.log('✅ Asignación creada exitosamente:', data);

      return {
        success: true,
        message: 'Asignación creada exitosamente',
        data: data
      };

    } catch (error) {
      console.error('❌ Error en crearAsignacion:', error);
      return {
        success: false,
        message: 'Error al crear la asignación',
        error: error
      };
    }
  }

  async actualizarEstadoAsignacion(asignacionId: number, nuevoEstado: string): Promise<AsignacionResponse> {
    try {
      console.log('🔄 Actualizando estado de asignación:', asignacionId, 'a', nuevoEstado);

      const { data, error } = await this.supabaseService.client
        .from('usuario_paquetes')
        .update({ 
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', asignacionId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando estado:', error);
        throw error;
      }

      console.log('✅ Estado actualizado exitosamente:', data);

      return {
        success: true,
        message: `Estado cambiado a ${nuevoEstado} exitosamente`,
        data: data
      };

    } catch (error) {
      console.error('❌ Error en actualizarEstadoAsignacion:', error);
      return {
        success: false,
        message: 'Error al actualizar el estado',
        error: error
      };
    }
  }

  async asignarPaqueteAUsuario(asignacion: AsignacionPaquete): Promise<AsignacionResponse> {
    try {
      console.log('🔄 Asignando paquete a usuario:', asignacion);

      // Intentar usar la función de base de datos primero
      try {
        const { data, error } = await this.supabaseService.client
          .rpc('asignar_paquete_a_usuario', {
            p_usuario_id: asignacion.usuario_id,
            p_paquete_id: asignacion.paquete_id,
            p_fecha_inicio: asignacion.fecha_inicio,
            p_precio_pagado: asignacion.precio_pagado,
            p_terapeuta_id: asignacion.terapeuta_asignado,
            p_metodo_pago: asignacion.metodo_pago
          });

        if (error) throw error;

        console.log('✅ Asignación creada con función RPC:', data);
        return {
          success: true,
          message: 'Paquete asignado exitosamente',
          data: data
        };

      } catch (rpcError) {
        console.log('⚠️ Función RPC no disponible, usando método manual');
        return await this.crearAsignacion(asignacion);
      }

    } catch (error) {
      console.error('❌ Error en asignarPaqueteAUsuario:', error);
      return {
        success: false,
        message: 'Error al asignar el paquete',
        error: error
      };
    }
  }

  // ===============================================
  // UTILIDADES Y CÁLCULOS
  // ===============================================

  calcularPrecioFinal(precioBase: number, descuento: number): number {
    if (precioBase <= 0 || descuento < 0 || descuento > 100) {
      return precioBase;
    }
    
    const descuentoDecimal = descuento / 100;
    const precioFinal = precioBase - (precioBase * descuentoDecimal);
    
    // Redondear a 2 decimales
    return Math.round(precioFinal * 100) / 100;
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(precio);
  }

  calcularDiasRestantes(fechaFin: string): number {
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  obtenerEstadoTexto(estado: string): string {
    const estados: { [key: string]: string } = {
      'activo': 'Activo',
      'pausado': 'Pausado',
      'completado': 'Completado',
      'cancelado': 'Cancelado'
    };
    return estados[estado] || estado;
  }

  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'activo': 'bg-green-100 text-green-800',
      'pausado': 'bg-yellow-100 text-yellow-800',
      'completado': 'bg-blue-100 text-blue-800',
      'cancelado': 'bg-red-100 text-red-800'
    };
    return clases[estado] || 'bg-gray-100 text-gray-800';
  }
}