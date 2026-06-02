// src/app/services/compra-paquetes.service.ts
// CORRECCIONES NECESARIAS

import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import {
  CompraPaquete,
  CompraPaqueteCompleta,
  DescuentoPaquete,
  FormularioCompraPaquete,
  ValidacionCompraPaquete,
  CalculoDescuento,
  PaqueteParaCompra,
  ContenidoPaqueteDetalle,
  ResumenCompra,
  FiltrosComprasPaquetes,
  EstadisticasComprasPaquetes,
  ApiResponse,
  RespuestaCompraPaquete,
  RespuestaValidacionCompra,
  MetodoPago,
  EstadoCompra
} from '../interfaces/compra-paquetes.interfaces';

@Injectable({
  providedIn: 'root'
})
export class CompraPaquetesService {

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // ===================================
  // MÉTODOS PARA OBTENER PAQUETES DISPONIBLES
  // ===================================

  async obtenerPaquetesParaCompra(): Promise<PaqueteParaCompra[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('paquetes')
        .select(`
          id,
          nombre,
          descripcion,
          tipo,
          precio,
          cantidad_sesiones,
          imagen_url,
          status
        `)
        .eq('status', 1)
        .order('tipo', { ascending: true })
        .order('precio', { ascending: true });

      if (error) throw error;

      const paquetesConDetalle = await Promise.all(
        (data || []).map(async (paquete) => {
          const contenido = await this.obtenerContenidoPaquete(paquete.id, paquete.tipo);
          const usuario = await this.authService.getCurrentUser();
          // ⚠️ CORREGIDO: Verificar que usuario.id existe
          const descuento = usuario?.id ? await this.calcularMejorDescuento(usuario.id, paquete.id) : null;

          return {
            ...paquete,
            precio_con_descuento: descuento ? descuento.precio_final : paquete.precio,
            ahorro: descuento ? (paquete.precio - descuento.precio_final) : 0,
            contenido_detalle: contenido,
            mejor_descuento: descuento
          } as PaqueteParaCompra;
        })
      );

      return paquetesConDetalle;
    } catch (error) {
      console.error('Error obteniendo paquetes para compra:', error);
      throw error;
    }
  }

  async obtenerPaqueteParaCompraPorId(paqueteId: number): Promise<PaqueteParaCompra | null> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('paquetes')
        .select(`
          id,
          nombre,
          descripcion,
          tipo,
          precio,
          cantidad_sesiones,
         
          imagen_url,
          status
        `)
        .eq('id', paqueteId)
        .eq('status', 1)
        .single();

      if (error) throw error;
      if (!data) return null;

      const contenido = await this.obtenerContenidoPaquete(data.id, data.tipo);
      const usuario = await this.authService.getCurrentUser();
      // ⚠️ CORREGIDO: Verificar que usuario.id existe
      const descuento = usuario?.id ? await this.calcularMejorDescuento(usuario.id, data.id) : null;

      return {
        ...data,
        precio_con_descuento: descuento ? descuento.precio_final : data.precio,
        ahorro: descuento ? (data.precio - descuento.precio_final) : 0,
        contenido_detalle: contenido,
        mejor_descuento: descuento
      } as PaqueteParaCompra;
    } catch (error) {
      console.error('Error obteniendo paquete por ID:', error);
      throw error;
    }
  }

  private async obtenerContenidoPaquete(paqueteId: number, tipo: string): Promise<ContenidoPaqueteDetalle[]> {
    try {
      if (tipo === 'rutina') {
        const { data, error } = await this.supabaseService.supabase
          .from('paquete_rutinas')
          .select(`
            orden_en_paquete,
            sesiones_asignadas,
            rutina_id,
            rutinas!inner (
              id,
              nombre,
              descripcion,
              duracion_estimada
            )
          `)
          .eq('paquete_id', paqueteId)
          .order('orden_en_paquete');

        if (error) throw error;

        // ⚠️ CORREGIDO: rutinas es un objeto, no un array
        return (data || []).map(item => {
          const rutina = Array.isArray(item.rutinas) ? item.rutinas[0] : item.rutinas;
          return {
            id: rutina?.id || item.rutina_id || 0,
            nombre: rutina?.nombre || '',
            tipo: 'rutina' as const,
            descripcion: rutina?.descripcion || '',
            duracion_estimada: rutina?.duracion_estimada || 0,
            sesiones_asignadas: item.sesiones_asignadas,
            orden_en_paquete: item.orden_en_paquete
          };
        });
      } else if (tipo === 'terapia') {
        const { data, error } = await this.supabaseService.supabase
          .from('paquete_terapias')
          .select(`
            orden_en_paquete,
            sesiones_asignadas,
            terapia_id,
            terapias!inner (
              id,
              nombre,
              descripcion,
              duracion_estimada
            )
          `)
          .eq('paquete_id', paqueteId)
          .order('orden_en_paquete');

        if (error) throw error;

        // ⚠️ CORREGIDO: terapias es un objeto, no un array
        return (data || []).map(item => {
          const terapia = Array.isArray(item.terapias) ? item.terapias[0] : item.terapias;
          return {
            id: terapia?.id || item.terapia_id || 0,
            nombre: terapia?.nombre || '',
            tipo: 'terapia' as const,
            descripcion: terapia?.descripcion || '',
            duracion_estimada: terapia?.duracion_estimada || 0,
            sesiones_asignadas: item.sesiones_asignadas,
            orden_en_paquete: item.orden_en_paquete
          };
        });
      }

      return [];
    } catch (error) {
      console.error('Error obteniendo contenido del paquete:', error);
      return [];
    }
  }

  // ===================================
  // MÉTODOS PARA DESCUENTOS
  // ===================================

  async calcularMejorDescuento(usuarioId: number, paqueteId: number): Promise<CalculoDescuento | null> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('calcular_descuento_paquete', {
          p_usuario_id: usuarioId,
          p_paquete_id: paqueteId
        });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      return data[0] as CalculoDescuento;
    } catch (error) {
      console.error('Error calculando descuento:', error);
      return null;
    }
  }

  async obtenerDescuentosDisponibles(usuarioId?: number): Promise<DescuentoPaquete[]> {
    try {
      let query = this.supabaseService.supabase
        .from('descuentos_paquetes')
        .select('*')
        .eq('activo', true)
        .eq('status', 1)
        .lte('fecha_inicio', new Date().toISOString().split('T')[0])
        .gte('fecha_fin', new Date().toISOString().split('T')[0]);

      if (usuarioId) {
        // Obtener perfil del usuario para filtros específicos
        const { data: profile } = await this.supabaseService.supabase
          .from('profiles')
          .select('id_perfil')
          .eq('id', usuarioId)
          .single();

        if (profile) {
          query = query.or(`aplicable_a.eq.todos,and(aplicable_a.eq.perfil_especifico,perfil_id.eq.${profile.id_perfil}),and(aplicable_a.eq.usuario_especifico,usuario_id.eq.${usuarioId})`);
        }
      } else {
        query = query.eq('aplicable_a', 'todos');
      }

      const { data, error } = await query.order('valor_descuento', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo descuentos:', error);
      return [];
    }
  }

  // ===================================
  // MÉTODOS PARA REALIZAR COMPRAS
  // ===================================

  async realizarCompraPaquete(formulario: FormularioCompraPaquete): Promise<RespuestaCompraPaquete> {
    try {
      const usuario = await this.authService.getCurrentUser();
      if (!usuario?.id) { // ⚠️ CORREGIDO: Verificar que id existe
        throw new Error('Usuario no autenticado');
      }

      // Obtener información del paquete
      const paquete = await this.obtenerPaqueteParaCompraPorId(formulario.paquete_id);
      if (!paquete) {
        throw new Error('Paquete no encontrado');
      }

      // Calcular precios con descuentos
      const descuento = await this.calcularMejorDescuento(usuario.id, formulario.paquete_id);
      const precioFinal = descuento ? descuento.precio_final : paquete.precio;
      const descuentoAplicado = descuento ? (paquete.precio - precioFinal) : 0;

      // Convertir comprobante a base64 si existe
      let comprobanteBase64 = '';
      let comprobanteNombre = '';
      let comprobanteTipo = '';

      if (formulario.comprobante) {
        comprobanteBase64 = await this.convertirArchivoABase64(formulario.comprobante);
        comprobanteNombre = formulario.comprobante.name;
        comprobanteTipo = formulario.comprobante.type;
      }

      // Crear registro de compra
      const compraPaquete: Partial<CompraPaquete> = {
        usuario_id: usuario.id,
        paquete_id: formulario.paquete_id,
        precio_paquete: paquete.precio,
        descuento_aplicado: descuentoAplicado,
        precio_final: precioFinal,
        metodo_pago: formulario.metodo_pago,
        comprobante_imagen: comprobanteBase64,
        comprobante_nombre: comprobanteNombre,
        comprobante_tipo: comprobanteTipo,
        numero_transaccion: formulario.numero_transaccion,
        banco: formulario.banco,
        fecha_pago: formulario.fecha_pago,
        hora_pago: formulario.hora_pago,
        estado_compra: 'pendiente',
        notas_usuario: formulario.notas_usuario
      };

      const { data, error } = await this.supabaseService.supabase
        .from('compras_paquetes')
        .insert(compraPaquete)
        .select()
        .single();

      if (error) throw error;

      // ⚠️ CORREGIDO: Actualizar contador de usos del descuento si aplica
      if (descuento?.descuento_id) {
        await this.supabaseService.supabase
          .rpc('increment_descuento_usos', { descuento_id: descuento.descuento_id });
      }

      return {
        compra_id: data.id,
        mensaje: 'Compra registrada exitosamente. Está pendiente de validación por un administrador.',
        estado: 'pendiente',
        requiere_validacion: true
      };
    } catch (error) {
      console.error('Error realizando compra:', error);
      throw error;
    }
  }

  private async convertirArchivoABase64(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remover el prefijo data:type;base64,
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsDataURL(archivo);
    });
  }

  // ===================================
  // MÉTODOS PARA GESTIÓN DE COMPRAS (ADMIN)
  // ===================================

  async obtenerComprasPendientes(filtros?: FiltrosComprasPaquetes): Promise<CompraPaqueteCompleta[]> {
    try {
      let query = this.supabaseService.supabase
        .from('v_compras_paquetes_completa')
        .select('*');

      // Aplicar filtros
      if (filtros?.estado_compra) {
        query = query.eq('estado_compra', filtros.estado_compra);
      } else {
        query = query.eq('estado_compra', 'pendiente');
      }

      if (filtros?.usuario_id) {
        query = query.eq('usuario_id', filtros.usuario_id);
      }

      if (filtros?.paquete_id) {
        query = query.eq('paquete_id', filtros.paquete_id);
      }

      if (filtros?.metodo_pago) {
        query = query.eq('metodo_pago', filtros.metodo_pago);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_compra', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_compra', filtros.fecha_hasta);
      }

      if (filtros?.busqueda) {
        query = query.or(`usuario_nombre.ilike.%${filtros.busqueda}%,paquete_nombre.ilike.%${filtros.busqueda}%,numero_transaccion.ilike.%${filtros.busqueda}%`);
      }

      const { data, error } = await query
        .order('fecha_compra', { ascending: false })
        .limit(filtros?.limit || 50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo compras pendientes:', error);
      throw error;
    }
  }

  async obtenerCompraPorId(compraId: number): Promise<CompraPaqueteCompleta | null> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('v_compras_paquetes_completa')
        .select('*')
        .eq('compra_id', compraId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo compra por ID:', error);
      return null;
    }
  }

  async validarCompraPaquete(validacion: ValidacionCompraPaquete): Promise<RespuestaValidacionCompra> {
    try {
      const usuario = await this.authService.getCurrentUser();
      if (!usuario?.id) { // ⚠️ CORREGIDO: Verificar que id existe
        throw new Error('Usuario no autenticado');
      }

      const compra = await this.obtenerCompraPorId(validacion.compra_id);
      if (!compra) {
        throw new Error('Compra no encontrada');
      }

      const estadoAnterior = compra.estado_compra;
      const estadoNuevo = validacion.accion === 'validar' ? 'validada' : 'rechazada';

      // Actualizar estado de la compra
      const { error } = await this.supabaseService.supabase
        .from('compras_paquetes')
        .update({
          estado_compra: estadoNuevo,
          validado_por: usuario.id,
          fecha_validacion: new Date().toISOString(),
          motivo_rechazo: validacion.motivo_rechazo,
          notas_admin: validacion.notas_admin
        })
        .eq('id', validacion.compra_id);

      if (error) throw error;

      let asignacionCompletada = false;
      let usuarioPaqueteId: number | undefined;

      // Si se validó, asignar automáticamente el paquete
      if (estadoNuevo === 'validada') {
        try {
          const resultadoAsignacion = await this.asignarPaqueteAutomaticamente(compra);
          if (resultadoAsignacion.success) {
            asignacionCompletada = true;
            usuarioPaqueteId = resultadoAsignacion.usuario_paquete_id;

            // Actualizar registro de compra con la asignación
            await this.supabaseService.supabase
              .from('compras_paquetes')
              .update({
                asignacion_completada: asignacionCompletada, // ⚠️ CORREGIDO: usar variable correcta
                usuario_paquete_id: usuarioPaqueteId,
                fecha_asignacion: new Date().toISOString()
              })
              .eq('id', validacion.compra_id);
          }
        } catch (asignacionError) {
          console.error('Error en asignación automática:', asignacionError);
          // La validación fue exitosa pero la asignación falló
          // Se puede manejar manualmente después
        }
      }

      return {
        compra_id: validacion.compra_id,
        estado_anterior: estadoAnterior as EstadoCompra,
        estado_nuevo: estadoNuevo as EstadoCompra,
        asignacion_completada: asignacionCompletada, // ⚠️ CORREGIDO: usar nombre correcto de variable
        usuario_paquete_id: usuarioPaqueteId,
        mensaje: estadoNuevo === 'validada' 
          ? (asignacionCompletada ? 'Compra validada y paquete asignado exitosamente' : 'Compra validada, pendiente asignación manual')
          : 'Compra rechazada'
      };
    } catch (error) {
      console.error('Error validando compra:', error);
      throw error;
    }
  }

  private async asignarPaqueteAutomaticamente(compra: CompraPaqueteCompleta): Promise<{success: boolean, usuario_paquete_id?: number}> {
    try {
      if (compra.paquete_tipo === 'rutina') {
        const { data, error } = await this.supabaseService.supabase
          .rpc('asignar_paquete_rutinas_completo', {
            p_usuario_id: compra.usuario_id,
            p_paquete_id: compra.paquete_id,
            p_precio_pagado: compra.precio_final,
            p_fecha_inicio: new Date().toISOString().split('T')[0],
            p_metodo_pago: compra.metodo_pago,
            p_asignado_por: compra.validado_por
          });

        if (error) throw error;
        
        return {
          success: data?.success || false,
          usuario_paquete_id: data?.usuario_paquete_id
        };
      } else if (compra.paquete_tipo === 'terapia') {
        const { data, error } = await this.supabaseService.supabase
          .rpc('asignar_paquete_terapias_completo', {
            p_usuario_id: compra.usuario_id,
            p_paquete_id: compra.paquete_id,
            p_precio_pagado: compra.precio_final,
            p_fecha_inicio: new Date().toISOString().split('T')[0],
            p_terapeuta_id: null,
            p_metodo_pago: compra.metodo_pago,
            p_asignado_por: compra.validado_por
          });

        if (error) throw error;
        
        return {
          success: data?.success || false,
          usuario_paquete_id: data?.usuario_paquete_id
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Error en asignación automática:', error);
      return { success: false };
    }
  }

  // ===================================
  // MÉTODOS PARA OBTENER COMPROBANTES
  // ===================================

  async obtenerComprobanteBase64(compraId: number): Promise<string | null> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('compras_paquetes')
        .select('comprobante_imagen')
        .eq('id', compraId)
        .single();

      if (error) throw error;
      return data?.comprobante_imagen || null;
    } catch (error) {
      console.error('Error obteniendo comprobante:', error);
      return null;
    }
  }

  // ===================================
  // MÉTODOS PARA ESTADÍSTICAS
  // ===================================

  async obtenerEstadisticasCompras(): Promise<EstadisticasComprasPaquetes> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('v_compras_paquetes_completa')
        .select('estado_compra, precio_final, metodo_pago, horas_desde_compra');

      if (error) throw error;

      const compras = data || [];
      
      const estadisticas: EstadisticasComprasPaquetes = {
        total_compras: compras.length,
        compras_pendientes: compras.filter(c => c.estado_compra === 'pendiente').length,
        compras_validadas: compras.filter(c => c.estado_compra === 'validada').length,
        compras_rechazadas: compras.filter(c => c.estado_compra === 'rechazada').length,
        monto_total_pendiente: compras
          .filter(c => c.estado_compra === 'pendiente')
          .reduce((sum, c) => sum + c.precio_final, 0),
        monto_total_validado: compras
          .filter(c => c.estado_compra === 'validada')
          .reduce((sum, c) => sum + c.precio_final, 0),
        promedio_tiempo_validacion: this.calcularPromedioTiempoValidacion(compras),
        metodo_pago_mas_usado: this.obtenerMetodoPagoMasUsado(compras)
      };

      return estadisticas;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  private calcularPromedioTiempoValidacion(compras: any[]): number {
    const comprasValidadas = compras.filter(c => c.estado_compra === 'validada' && c.horas_desde_compra);
    if (comprasValidadas.length === 0) return 0;
    
    const tiempoTotal = comprasValidadas.reduce((sum, c) => sum + c.horas_desde_compra, 0);
    return Math.round(tiempoTotal / comprasValidadas.length * 100) / 100;
  }

  private obtenerMetodoPagoMasUsado(compras: any[]): MetodoPago {
    const conteoMetodos: { [key: string]: number } = {};
    
    compras.forEach(compra => {
      conteoMetodos[compra.metodo_pago] = (conteoMetodos[compra.metodo_pago] || 0) + 1;
    });

    let metodoPagoMasUsado: MetodoPago = 'transferencia';
    let maxConteo = 0;

    Object.entries(conteoMetodos).forEach(([metodo, conteo]) => {
      if (conteo > maxConteo) {
        maxConteo = conteo;
        metodoPagoMasUsado = metodo as MetodoPago;
      }
    });

    return metodoPagoMasUsado;
  }

  // ===================================
  // MÉTODOS PARA HISTORIAL
  // ===================================

  async obtenerHistorialCompra(compraId: number): Promise<any[]> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('compras_paquetes_historial')
        .select(`
          *,
          profiles:cambio_realizado_por (
            full_name
          )
        `)
        .eq('compra_id', compraId)
        .order('fecha_cambio', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo historial de compra:', error);
      return [];
    }
  }

  // ===================================
  // MÉTODOS PARA MIS COMPRAS (USUARIO)
  // ===================================

  async obtenerMisCompras(usuarioId?: number): Promise<CompraPaqueteCompleta[]> {
    try {
      const usuario = usuarioId || (await this.authService.getCurrentUser())?.id;
      if (!usuario) {
        throw new Error('Usuario no identificado');
      }

      const { data, error } = await this.supabaseService.supabase
        .from('v_compras_paquetes_completa')
        .select('*')
        .eq('usuario_id', usuario)
        .order('fecha_compra', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo mis compras:', error);
      throw error;
    }
  }

  // ===================================
  // MÉTODOS AUXILIARES
  // ===================================

  async verificarPermisosValidacion(): Promise<boolean> {
    try {
      const usuario = await this.authService.getCurrentUser();
      if (!usuario?.id) return false; // ⚠️ CORREGIDO: Verificar que id existe

      // Verificar si el usuario es administrador (perfil ID 1)
      const { data, error } = await this.supabaseService.supabase
        .from('profiles')
        .select('id_perfil')
        .eq('id', usuario.id)
        .single();

      if (error) throw error;
      return data?.id_perfil === 1; // Solo administradores pueden validar
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  calcularResumenCompra(paquete: PaqueteParaCompra): ResumenCompra {
    const precioOriginal = paquete.precio;
    const descuento = paquete.mejor_descuento ? (precioOriginal - paquete.mejor_descuento.precio_final) : 0;
    const precioFinal = precioOriginal - descuento;
    const ahorroPorcentaje = precioOriginal > 0 ? Math.round((descuento / precioOriginal) * 100) : 0;

    return {
      paquete,
      descuento_aplicado: paquete.mejor_descuento,
      precio_original: precioOriginal,
      descuento,
      precio_final: precioFinal,
      ahorro_porcentaje: ahorroPorcentaje
    };
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(precio);
  }

  validarFormatoComprobante(archivo: File): { valido: boolean; error?: string } {
    const formatosPermitidos = ['.jpg', '.jpeg', '.png', '.pdf'];
    const tamañoMaximo = 5 * 1024 * 1024; // 5MB

    const extension = '.' + archivo.name.split('.').pop()?.toLowerCase();
    
    if (!formatosPermitidos.includes(extension)) {
      return {
        valido: false,
        error: `Formato no permitido. Formatos válidos: ${formatosPermitidos.join(', ')}`
      };
    }

    if (archivo.size > tamañoMaximo) {
      return {
        valido: false,
        error: 'El archivo excede el tamaño máximo de 5MB'
      };
    }

    return { valido: true };
  }
}