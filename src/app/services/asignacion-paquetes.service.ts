// src/app/services/asignacion-paquetes.service.ts - VERSIÓN CORREGIDA FINAL
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
  terapeuta_asignado?: number | null;
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

  async obtenerTerapeutas(): Promise<Usuario[]> {
    try {
      console.log('🔍 Iniciando carga de terapeutas...');
      
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, created_at, status, id_perfil')
        .eq('status', 1)
        .in('id_perfil', [1, 3]) // Administradores y Supervisores
        .order('full_name');

      if (error) {
        console.error('❌ Error obteniendo terapeutas:', error);
        // Si falla, devolver todos los usuarios activos como posibles terapeutas
        return this.obtenerUsuarios();
      }

      console.log('✅ Terapeutas cargados:', data?.length || 0);

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
      // Como fallback, devolver usuarios regulares
      return this.obtenerUsuarios();
    }
  }

  async buscarUsuarios(termino: string): Promise<Usuario[]> {
    try {
      console.log('🔍 Buscando usuarios con término:', termino);
      
      if (!termino || termino.trim().length === 0) {
        return await this.obtenerUsuarios();
      }

      const terminoLimpio = termino.trim();
      
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
  // GESTIÓN DE ASIGNACIONES - MÉTODO PRINCIPAL CORREGIDO
  // ===============================================

  async asignarPaqueteAUsuario(asignacion: AsignacionPaquete): Promise<AsignacionResponse> {
    try {
      console.log('🚀 Iniciando asignación de paquete:', asignacion);

      // VALIDACIONES PREVIAS
      if (!asignacion.usuario_id || !asignacion.paquete_id) {
        return {
          success: false,
          message: 'Usuario y paquete son requeridos'
        };
      }

      if (!asignacion.fecha_inicio) {
        return {
          success: false,
          message: 'Fecha de inicio es requerida'
        };
      }

      if (asignacion.precio_pagado <= 0) {
        return {
          success: false,
          message: 'El precio debe ser mayor a cero'
        };
      }

      // VERIFICAR QUE EL PAQUETE EXISTE Y ESTÁ ACTIVO
      const { data: paquete, error: paqueteError } = await this.supabaseService.client
        .from('paquetes')
        .select('*')
        .eq('id', asignacion.paquete_id)
        .eq('status', 1)
        .single();

      if (paqueteError || !paquete) {
        console.error('❌ Paquete no encontrado:', paqueteError);
        return {
          success: false,
          message: 'Paquete no encontrado o inactivo'
        };
      }

      // VERIFICAR QUE EL USUARIO EXISTE
      const { data: usuario, error: usuarioError } = await this.supabaseService.client
        .from('profiles')
        .select('id, full_name, username')
        .eq('id', asignacion.usuario_id)
        .eq('status', 1)
        .single();

      if (usuarioError || !usuario) {
        console.error('❌ Usuario no encontrado:', usuarioError);
        return {
          success: false,
          message: 'Usuario no encontrado o inactivo'
        };
      }

      // VERIFICAR QUE NO EXISTE UNA ASIGNACIÓN ACTIVA DEL MISMO PAQUETE
      const { data: existeAsignacion } = await this.supabaseService.client
        .from('usuario_paquetes')
        .select('id')
        .eq('usuario_id', asignacion.usuario_id)
        .eq('paquete_id', asignacion.paquete_id)
        .eq('estado', 'activo')
        .maybeSingle();

      if (existeAsignacion) {
        return {
          success: false,
          message: 'El usuario ya tiene este paquete asignado y activo'
        };
      }

      // MÉTODO 1: INTENTAR CON FUNCIÓN SQL (si existe)
      try {
        console.log('🔧 Intentando con función SQL asignar_paquete_terapias_completo...');
        
        const { data: funcionResult, error: funcionError } = await this.supabaseService.client
          .rpc('asignar_paquete_terapias_completo', {
            p_usuario_id: asignacion.usuario_id,
            p_paquete_id: asignacion.paquete_id,
            p_precio_pagado: asignacion.precio_pagado,
            p_fecha_inicio: asignacion.fecha_inicio,
            p_terapeuta_id: asignacion.terapeuta_asignado,
            p_metodo_pago: asignacion.metodo_pago || 'efectivo',
            p_asignado_por: 1
          });

        if (!funcionError && funcionResult?.success) {
          console.log('✅ Asignación exitosa con función SQL:', funcionResult);
          return {
            success: true,
            message: funcionResult.mensaje || 'Paquete asignado exitosamente usando función SQL',
            data: funcionResult
          };
        } else {
          console.log('⚠️ Función SQL falló o no disponible, usando método manual:', funcionError);
        }
      } catch (funcionException) {
        console.log('⚠️ Función SQL no disponible, usando método manual');
      }

      // MÉTODO 2: INSERCIÓN MANUAL CORREGIDA
      console.log('🔧 Usando método manual de inserción...');

      // Calcular fechas
      const fechaInicio = new Date(asignacion.fecha_inicio);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + 3); // 3 meses por defecto

      const fechaCompra = new Date();

      // Preparar datos para inserción
      const datosInsercion = {
        usuario_id: asignacion.usuario_id,
        paquete_id: asignacion.paquete_id,
        fecha_inicio: asignacion.fecha_inicio,
        fecha_fin: fechaFin.toISOString().split('T')[0],
        fecha_compra: fechaCompra.toISOString().split('T')[0],
        precio_pagado: Number(asignacion.precio_pagado),
        descuento_aplicado: Number(asignacion.descuento_aplicado || 0),
        metodo_pago: asignacion.metodo_pago || 'efectivo',
        notas_administrativas: asignacion.notas_administrativas || '',
        terapeuta_asignado: asignacion.terapeuta_asignado || null,
        estado: 'activo',
        sesiones_totales: paquete.cantidad_sesiones || 1,
        sesiones_utilizadas: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📤 Datos a insertar:', datosInsercion);

      // INSERTAR EN usuario_paquetes
      const { data: nuevaAsignacion, error: insertError } = await this.supabaseService.client
        .from('usuario_paquetes')
        .insert([datosInsercion])
        .select(`
          *,
          paquete:paquetes!usuario_paquetes_paquete_id_fkey(nombre, tipo)
        `)
        .single();

      if (insertError) {
        console.error('❌ Error insertando asignación:', insertError);
        
        // Proporcionar mensajes de error más específicos
        let mensajeError = 'Error al asignar paquete';
        
        if (insertError.code === '23505') {
          mensajeError = 'Ya existe una asignación duplicada';
        } else if (insertError.code === '23503') {
          mensajeError = 'Referencias inválidas (usuario o paquete no existen)';
        } else if (insertError.code === '23514') {
          mensajeError = 'Datos inválidos (verificar restricciones)';
        } else if (insertError.message.includes('permission')) {
          mensajeError = 'Permisos insuficientes para crear asignación';
        } else if (insertError.message.includes('column')) {
          mensajeError = 'Error de estructura de base de datos';
        }

        return {
          success: false,
          message: `${mensajeError}: ${insertError.message}`,
          error: insertError
        };
      }

      console.log('✅ Asignación creada exitosamente:', nuevaAsignacion);

      // CREAR SEGUIMIENTO INICIAL (opcional)
      try {
        await this.crearSeguimientoInicial(nuevaAsignacion.id, asignacion, paquete);
      } catch (seguimientoError) {
        console.log('⚠️ No se pudo crear seguimiento automático:', seguimientoError);
        // No fallar por esto, solo loggearlo
      }

      return {
        success: true,
        message: `Paquete "${paquete.nombre}" asignado exitosamente a ${usuario.full_name || usuario.username}`,
        data: nuevaAsignacion
      };

    } catch (error) {
      console.error('❌ Error general en asignarPaqueteAUsuario:', error);
      return {
        success: false,
        message: 'Error interno al procesar la asignación',
        error: error
      };
    }
  }

  // ===============================================
  // MÉTODOS DE SEGUIMIENTO
  // ===============================================

  private async crearSeguimientoInicial(usuarioPaqueteId: number, asignacion: AsignacionPaquete, paquete: any): Promise<void> {
    try {
      console.log('📅 Creando seguimiento inicial...');

      // Intentar crear seguimiento si existe la tabla paquete_seguimiento
      const fechaInicio = new Date(asignacion.fecha_inicio);

      // Crear registros básicos de seguimiento
      for (let i = 1; i <= (paquete.cantidad_sesiones || 1); i++) {
        const fechaSesion = new Date(fechaInicio);
        fechaSesion.setDate(fechaSesion.getDate() + (i * 2)); // Cada 2 días

        await this.supabaseService.client
          .from('paquete_seguimiento')
          .insert({
            usuario_paquete_id: usuarioPaqueteId,
            contenido_id: paquete.id,
            contenido_tipo: paquete.tipo,
            fecha_programada: fechaSesion.toISOString().split('T')[0],
            terapeuta_id: asignacion.terapeuta_asignado,
            estado: 'pendiente',
            created_at: new Date().toISOString()
          });
      }

      console.log('✅ Seguimiento inicial creado');

    } catch (error) {
      console.log('⚠️ No se pudo crear seguimiento automático (normal si la tabla no existe):', error);
      // No lanzar error, es opcional
    }
  }

  // ===============================================
  // OTROS MÉTODOS EXISTENTES (mantener los que ya tienes)
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

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error obteniendo asignaciones:', error);
        throw error;
      }

      console.log('✅ Asignaciones cargadas:', data?.length || 0);

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

  async crearAsignacion(asignacion: AsignacionPaquete): Promise<AsignacionResponse> {
    // Usar el método principal corregido
    return this.asignarPaqueteAUsuario(asignacion);
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

  // ===============================================
  // UTILIDADES Y CÁLCULOS
  // ===============================================

  calcularPrecioFinal(precioBase: number, descuento: number): number {
    if (precioBase <= 0 || descuento < 0 || descuento > 100) {
      return precioBase;
    }
    
    const descuentoDecimal = descuento / 100;
    const precioFinal = precioBase - (precioBase * descuentoDecimal);
    
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

  // ===============================================
  // MÉTODO DE DEBUG
  // ===============================================

  async debugServicio(): Promise<void> {
    console.log('=== DEBUG AsignacionPaquetesService ===');
    
    try {
      // Verificar conexión a Supabase
      const { count: totalUsuarios, error: errorUsuarios } = await this.supabaseService.client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 1);
      
      console.log('✅ Conexión Supabase:', !errorUsuarios);
      console.log('👥 Total usuarios activos:', totalUsuarios);
      
      // Verificar tabla paquetes
      const { count: totalPaquetes, error: errorPaquetes } = await this.supabaseService.client
        .from('paquetes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 1);
        
      console.log('📦 Total paquetes activos:', totalPaquetes);
      
      // Verificar tabla usuario_paquetes
      const { count: totalAsignaciones, error: errorAsignaciones } = await this.supabaseService.client
        .from('usuario_paquetes')
        .select('*', { count: 'exact', head: true });
        
      console.log('📋 Total asignaciones:', totalAsignaciones);
      console.log('❌ Errores encontrados:', { errorUsuarios, errorPaquetes, errorAsignaciones });
      
    } catch (error) {
      console.error('❌ Error en debug:', error);
    }
    
    console.log('==========================================');
  }
}