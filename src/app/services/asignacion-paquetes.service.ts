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
  paquete?: any;
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
    console.log('📋 Usuarios:', data);

    // Mapear a la interface Usuario
    const usuarios = (data || []).map(user => ({
      id: user.id,
      nombre: user.full_name || user.username || 'Usuario sin nombre',
      email: user.username || `usuario${user.id}@example.com`, // username parece ser el email
      telefono: undefined, // No está en la estructura actual
      fecha_nacimiento: undefined, // No está en la estructura actual  
      estado: user.status
    }));

    return usuarios;

  } catch (error) {
    console.error('💥 Error en obtenerUsuarios:', error);
    throw error;
  }
}

async buscarUsuarios(termino: string): Promise<Usuario[]> {
  try {
    console.log('🔍 Buscando usuarios con término:', termino);
    
    if (!termino || termino.trim().length === 0) {
      return await this.obtenerUsuarios();
    }

    const terminoLimpio = termino.trim();
    
    // Usar la estructura real de la tabla
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('id, username, full_name, created_at, status')
      .eq('status', 1)
      .or(`full_name.ilike.%${terminoLimpio}%,username.ilike.%${terminoLimpio}%`)
      .order('full_name')
      .limit(50);

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
      estado: user.status
    }));

    return usuarios;

  } catch (error) {
    console.error('💥 Error en buscarUsuarios:', error);
    throw error;
  }
}

async verificarTablaUsuarios(): Promise<void> {
  try {
    console.log('🔍 Verificando tabla profiles...');
    
    // Contar registros totales
    const { count, error: errorCount } = await this.supabaseService.client
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (errorCount) {
      console.error('❌ Error contando registros:', errorCount);
      return;
    }

    console.log(`📊 Total de registros en profiles: ${count}`);

    // Obtener muestra de registros
    const { data: muestra, error: errorMuestra } = await this.supabaseService.client
      .from('profiles')
      .select('id, username, full_name, status')
      .limit(3);

    if (errorMuestra) {
      console.error('❌ Error obteniendo muestra:', errorMuestra);
      return;
    }

    console.log('📋 Estructura confirmada de profiles:');
    if (muestra && muestra.length > 0) {
      console.log('✅ Columnas disponibles:', Object.keys(muestra[0]));
      console.log('📄 Ejemplos de usuarios:');
      muestra.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}, Username: ${user.username}, Full Name: ${user.full_name}, Status: ${user.status}`);
      });
    }

    // Contar usuarios activos
    const { count: activos, error: errorActivos } = await this.supabaseService.client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 1);

    if (!errorActivos) {
      console.log(`👥 Usuarios activos (status=1): ${activos}`);
    }

  } catch (error) {
    console.error('💥 Error verificando tabla usuarios:', error);
  }
}

  async obtenerTerapeutas(): Promise<Usuario[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, nombre, email')
        .eq('status', 1)
        .eq('rol', 'terapeuta') // Ajusta según tu estructura de roles
        .order('nombre');

      if (error) {
        console.error('Error obteniendo terapeutas:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerTerapeutas:', error);
      return []; // Devolver array vacío si no hay tabla de roles
    }
  }

  // ===============================================
  // ASIGNACIÓN DE PAQUETES
  // ===============================================

  async asignarPaqueteAUsuario(asignacion: AsignacionPaquete): Promise<AsignacionResponse> {
    try {
      // Validar datos de entrada
      if (!asignacion.usuario_id || !asignacion.paquete_id) {
        return {
          success: false,
          message: 'Usuario y paquete son requeridos'
        };
      }

      // Llamar a la función SQL que creamos
      const { data, error } = await this.supabaseService.client
        .rpc('asignar_paquete_a_usuario', {
          p_usuario_id: asignacion.usuario_id,
          p_paquete_id: asignacion.paquete_id,
          p_fecha_inicio: asignacion.fecha_inicio,
          p_precio_pagado: asignacion.precio_pagado,
          p_terapeuta_id: asignacion.terapeuta_asignado || null,
          p_metodo_pago: asignacion.metodo_pago || null
        });

      if (error) {
        console.error('Error asignando paquete:', error);
        return {
          success: false,
          message: error.message || 'Error al asignar el paquete',
          error: error
        };
      }

      // Actualizar notas administrativas si se proporcionaron
      if (asignacion.notas_administrativas && data) {
        await this.actualizarNotasAsignacion(data, asignacion.notas_administrativas);
      }

      return {
        success: true,
        message: 'Paquete asignado exitosamente',
        data: data
      };
    } catch (error) {
      console.error('Error en asignarPaqueteAUsuario:', error);
      return {
        success: false,
        message: 'Error interno al asignar el paquete',
        error: error
      };
    }
  }

  private async actualizarNotasAsignacion(usuarioPaqueteId: number, notas: string): Promise<void> {
    await this.supabaseService.client
      .from('usuario_paquetes')
      .update({ notas_administrativas: notas })
      .eq('id', usuarioPaqueteId);
  }

  // ===============================================
  // CONSULTA DE ASIGNACIONES
  // ===============================================

  async obtenerAsignaciones(filtros?: FiltrosAsignaciones): Promise<UsuarioPaquete[]> {
    try {
      let query = this.supabaseService.client
        .from('usuario_paquetes')
        .select(`
          *,
          usuario:profiles!usuario_paquetes_usuario_id_fkey (
            id, nombre, email, telefono
          ),
          paquete:paquetes!usuario_paquetes_paquete_id_fkey (
            id, nombre, tipo, cantidad_sesiones, precio, precio_final
          ),
          terapeuta:profiles!usuario_paquetes_terapeuta_asignado_fkey (
            id, nombre, email
          )
        `);

      // Aplicar filtros
      if (filtros) {
        if (filtros.usuario_id) {
          query = query.eq('usuario_id', filtros.usuario_id);
        }
        if (filtros.paquete_id) {
          query = query.eq('paquete_id', filtros.paquete_id);
        }
        if (filtros.estado) {
          query = query.eq('estado', filtros.estado);
        }
        if (filtros.terapeuta_id) {
          query = query.eq('terapeuta_asignado', filtros.terapeuta_id);
        }
        if (filtros.fecha_inicio) {
          query = query.gte('fecha_inicio', filtros.fecha_inicio);
        }
        if (filtros.fecha_fin) {
          query = query.lte('fecha_fin', filtros.fecha_fin);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo asignaciones:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerAsignaciones:', error);
      throw error;
    }
  }

  async obtenerAsignacionesPorUsuario(usuarioId: number): Promise<UsuarioPaquete[]> {
    return await this.obtenerAsignaciones({ usuario_id: usuarioId });
  }

  async obtenerAsignacionesPorPaquete(paqueteId: number): Promise<UsuarioPaquete[]> {
    return await this.obtenerAsignaciones({ paquete_id: paqueteId });
  }

  // ===============================================
  // SEGUIMIENTO DE PROGRESO
  // ===============================================

  async obtenerSeguimientoPaquete(usuarioPaqueteId: number): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('paquete_seguimiento')
        .select(`
          *,
          rutina:rutinas (id, nombre, descripcion),
          terapia:terapias (id, nombre, descripcion)
        `)
        .eq('usuario_paquete_id', usuarioPaqueteId)
        .order('fecha_programada');

      if (error) {
        console.error('Error obteniendo seguimiento:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerSeguimientoPaquete:', error);
      throw error;
    }
  }

  async actualizarEstadoAsignacion(usuarioPaqueteId: number, nuevoEstado: string): Promise<AsignacionResponse> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('usuario_paquetes')
        .update({ estado: nuevoEstado })
        .eq('id', usuarioPaqueteId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando estado:', error);
        return {
          success: false,
          message: 'Error al actualizar el estado',
          error: error
        };
      }

      return {
        success: true,
        message: 'Estado actualizado exitosamente',
        data: data
      };
    } catch (error) {
      console.error('Error en actualizarEstadoAsignacion:', error);
      return {
        success: false,
        message: 'Error interno al actualizar el estado',
        error: error
      };
    }
  }

  // ===============================================
  // ESTADÍSTICAS Y REPORTES
  // ===============================================

  async obtenerEstadisticasAsignaciones(): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('usuario_paquetes')
        .select('estado')
        .then(({ data, error }) => {
          if (error) throw error;

          const stats = {
            total: data?.length || 0,
            activos: data?.filter(a => a.estado === 'activo').length || 0,
            completados: data?.filter(a => a.estado === 'completado').length || 0,
            pausados: data?.filter(a => a.estado === 'pausado').length || 0,
            cancelados: data?.filter(a => a.estado === 'cancelado').length || 0
          };

          return { data: stats, error: null };
        });

      if (error) {
        console.error('Error obteniendo estadísticas:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en obtenerEstadisticasAsignaciones:', error);
      return {
        total: 0,
        activos: 0,
        completados: 0,
        pausados: 0,
        cancelados: 0
      };
    }
  }

  // ===============================================
  // VALIDACIONES
  // ===============================================

  async validarAsignacion(usuarioId: number, paqueteId: number): Promise<{
    esValida: boolean;
    mensaje: string;
    paquetesActivos?: UsuarioPaquete[];
  }> {
    try {
      // Verificar si el usuario ya tiene paquetes activos del mismo tipo
      const paquetesActivos = await this.obtenerAsignaciones({
        usuario_id: usuarioId,
        estado: 'activo'
      });

      // Obtener información del paquete que se quiere asignar
      const { data: paquete, error: paqueteError } = await this.supabaseService.client
        .from('paquetes')
        .select('tipo, nombre')
        .eq('id', paqueteId)
        .single();

      if (paqueteError) {
        return {
          esValida: false,
          mensaje: 'Paquete no encontrado'
        };
      }

      // Verificar conflictos por tipo
      const conflictos = paquetesActivos.filter(asignacion => 
        asignacion.paquete?.tipo === paquete.tipo
      );

      if (conflictos.length > 0) {
        return {
          esValida: false,
          mensaje: `El usuario ya tiene un paquete de ${paquete.tipo} activo`,
          paquetesActivos: conflictos
        };
      }

      return {
        esValida: true,
        mensaje: 'La asignación es válida'
      };
    } catch (error) {
      console.error('Error en validarAsignacion:', error);
      return {
        esValida: false,
        mensaje: 'Error al validar la asignación'
      };
    }
  }

  // ===============================================
  // UTILIDADES
  // ===============================================

  calcularPrecioFinal(precioBase: number, descuento: number): number {
    return precioBase - (precioBase * descuento / 100);
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