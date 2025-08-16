// ===============================================
// ARCHIVO COMPLETO: asignar-paquete.component.ts
// src/app/asignar-paquete/asignar-paquete/asignar-paquete.component.ts
// ===============================================

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  AsignacionPaquetesService, 
  Usuario, 
  AsignacionPaquete 
} from '../../services/asignacion-paquetes.service';
import { PaquetesService } from '../../services/paquetes.service';
// CORREGIDO: Importar Paquete con alias para evitar conflictos
import { Paquete as PaqueteInterface } from '../../interfaces/paquetes.interfaces';

// Interface local para el formulario
interface AsignacionForm {
  paquete_id: number | null;
  usuarios_seleccionados: number[];
  fecha_inicio: string;
  precio_pagado: number;
  descuento_aplicado: number;
  terapeuta_asignado: number | null;
  metodo_pago: string;
  notas_administrativas: string;
}

// Interface Paquete local que acepta ambos formatos
interface PaqueteLocal {
  id: number; // Sin undefined
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad_sesiones: number;
  tipo: 'terapia' | 'rutina';
  descuento: number;
  precio_final?: number;
  status: number;
}

@Component({
  selector: 'app-asignar-paquete',
  standalone: false,
  templateUrl: './asignar-paquete.component.html',
  styleUrls: ['./asignar-paquete.component.css']
})
export class AsignarPaqueteComponent implements OnInit {

  // ================================
  // PROPIEDADES
  // ================================
  cargando = false;
  buscandoUsuarios = false;
  error: string | null = null;
  exito: string | null = null;

  // Datos para selecciones
  usuarios: Usuario[] = [];
  paquetes: PaqueteLocal[] = [];
  terapeutas: Usuario[] = [];

  // Formulario
  asignacionForm: AsignacionForm = {
    paquete_id: null,
    usuarios_seleccionados: [],
    fecha_inicio: this.obtenerFechaHoy(),
    precio_pagado: 0,
    descuento_aplicado: 0,
    terapeuta_asignado: null,
    metodo_pago: 'efectivo',
    notas_administrativas: ''
  };

  // Búsqueda de usuarios
  terminoBusquedaUsuarios = '';
  
  // Datos calculados
  paqueteSeleccionado: PaqueteLocal | null = null;
  precioFinal = 0;
  descuentoAplicado = 0;

  // Opciones de método de pago
  metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'tarjeta', label: 'Tarjeta de Crédito' },
    { value: 'transferencia', label: 'Transferencia Bancaria' },
    { value: 'deposito', label: 'Depósito Bancario' },
    { value: 'otro', label: 'Otro' }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private asignacionService: AsignacionPaquetesService,
    private paquetesService: PaquetesService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.inicializarDatos();
  }

  // ================================
  // INICIALIZACIÓN
  // ================================

  private async inicializarDatos(): Promise<void> {
    this.cargando = true;
    try {
      console.log('🚀 Inicializando datos del componente...');
      
      await Promise.all([
        this.cargarPaquetes(),
        this.cargarTerapeutas(),
        this.cargarUsuarios()
      ]);
      
      // Verificar parámetros URL después de cargar los datos
      this.verificarParametrosURL();
      
      console.log('✅ Inicialización completada');
      
    } catch (error) {
      console.error('❌ Error inicializando datos:', error);
      this.mostrarError('Error al cargar los datos iniciales');
    } finally {
      this.cargando = false;
    }
  }

  private verificarParametrosURL(): void {
    const paqueteId = this.route.snapshot.queryParams['paquete_id'];
    console.log('🔗 Verificando parámetros URL, paquete_id:', paqueteId);

    if (paqueteId) {
      const paqueteIdNum = parseInt(paqueteId);
      const paqueteEncontrado = this.paquetes.find(p => p.id === paqueteIdNum);
      
      if (paqueteEncontrado) {
        this.asignacionForm.paquete_id = paqueteIdNum;
        this.onPaqueteSeleccionado(paqueteIdNum);
        console.log('✅ Paquete preseleccionado:', paqueteEncontrado.nombre);
      } else {
        console.warn('⚠️ Paquete ID no encontrado en lista');
      }
    }
  }

  // ================================
  // CARGA DE DATOS
  // ================================

  private async cargarPaquetes(): Promise<void> {
    try {
      console.log('📦 Cargando paquetes...');
      
      if (this.paquetesService && typeof this.paquetesService.obtenerPaquetes === 'function') {
        // Convertir PaqueteInterface[] a PaqueteLocal[]
        const paquetesFromService = await this.paquetesService.obtenerPaquetes({ status: 1 });
        this.paquetes = this.convertirPaquetes(paquetesFromService);
      } else {
        // Fallback: cargar directamente
        console.log('⚠️ PaquetesService no disponible, usando fallback');
        this.paquetes = await this.cargarPaquetesDirecto();
      }
      
      console.log('✅ Paquetes cargados:', this.paquetes.length);
    } catch (error) {
      console.error('❌ Error cargando paquetes:', error);
      this.paquetes = [];
      this.mostrarError('Error al cargar la lista de paquetes');
    }
  }

  // Método para convertir PaqueteInterface a PaqueteLocal
  private convertirPaquetes(paquetes: PaqueteInterface[]): PaqueteLocal[] {
    return paquetes
      .filter(p => p.id !== undefined) // Filtrar los que no tienen ID
      .map(p => ({
        id: p.id!, // Usar ! porque ya filtramos los undefined
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        cantidad_sesiones: p.cantidad_sesiones,
        tipo: p.tipo,
        descuento: p.descuento,
        precio_final: p.precio_final,
        status: p.status
      }));
  }

  private async cargarPaquetesDirecto(): Promise<PaqueteLocal[]> {
    try {
      // Acceder a supabaseService a través del asignacionService
      const supabaseClient = (this.asignacionService as any).supabaseService?.client;
      
      if (!supabaseClient) {
        throw new Error('Cliente de Supabase no disponible');
      }

      const { data, error } = await supabaseClient
        .from('paquetes')
        .select('*')
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;
      
      // Convertir a PaqueteLocal asegurando que id no sea undefined
      return (data || [])
        .filter((p: any) => p.id != null)
        .map((p: any) => ({
          id: p.id,
          nombre: p.nombre || 'Sin nombre',
          descripcion: p.descripcion,
          precio: p.precio || 0,
          cantidad_sesiones: p.cantidad_sesiones || 1,
          tipo: p.tipo || 'rutina',
          descuento: p.descuento || 0,
          precio_final: p.precio_final,
          status: p.status || 1
        }));
    } catch (error) {
      console.error('Error cargando paquetes directamente:', error);
      return [];
    }
  }

  private async cargarTerapeutas(): Promise<void> {
    try {
      console.log('👨‍⚕️ Cargando terapeutas...');
      this.terapeutas = await this.asignacionService.obtenerTerapeutas();
      console.log('✅ Terapeutas cargados:', this.terapeutas.length);
    } catch (error) {
      console.error('❌ Error cargando terapeutas:', error);
      this.terapeutas = [];
    }
  }

  // Cambiar a public para uso en template
  async cargarUsuarios(): Promise<void> {
    try {
      console.log('👥 Cargando usuarios...');
      this.usuarios = await this.asignacionService.obtenerUsuarios();
      console.log('✅ Usuarios cargados:', this.usuarios.length);
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      this.usuarios = [];
      this.mostrarError('Error al cargar la lista de usuarios');
    }
  }

  async buscarUsuarios(): Promise<void> {
    if (this.terminoBusquedaUsuarios.length < 2) {
      await this.cargarUsuarios();
      return;
    }

    this.buscandoUsuarios = true;
    try {
      console.log('🔍 Buscando usuarios:', this.terminoBusquedaUsuarios);
      this.usuarios = await this.asignacionService.buscarUsuarios(this.terminoBusquedaUsuarios);
      console.log('✅ Usuarios encontrados:', this.usuarios.length);
    } catch (error) {
      console.error('❌ Error buscando usuarios:', error);
      this.usuarios = [];
    } finally {
      this.buscandoUsuarios = false;
    }
  }

  // Método para limpiar búsqueda (público para template)
  async limpiarBusqueda(): Promise<void> {
    this.terminoBusquedaUsuarios = '';
    await this.cargarUsuarios();
  }

  // ================================
  // SELECCIÓN DE USUARIOS
  // ================================

  isUsuarioSelected(usuarioId: number): boolean {
    return this.asignacionForm.usuarios_seleccionados.includes(usuarioId);
  }

  toggleUsuario(usuarioId: number): void {
    const index = this.asignacionForm.usuarios_seleccionados.indexOf(usuarioId);
    
    if (index > -1) {
      this.asignacionForm.usuarios_seleccionados.splice(index, 1);
      console.log('➖ Usuario deseleccionado:', usuarioId);
    } else {
      this.asignacionForm.usuarios_seleccionados.push(usuarioId);
      console.log('➕ Usuario seleccionado:', usuarioId);
    }

    console.log('👥 Total usuarios seleccionados:', this.asignacionForm.usuarios_seleccionados.length);
  }

  selectAllUsuarios(): void {
    this.asignacionForm.usuarios_seleccionados = this.usuarios.map(u => u.id);
    console.log('✅ Todos los usuarios seleccionados');
  }

  clearAllUsuarios(): void {
    this.asignacionForm.usuarios_seleccionados = [];
    console.log('🗑️ Selección de usuarios limpiada');
  }

  trackByUserId(index: number, usuario: Usuario): number {
    return usuario.id;
  }

  // ================================
  // EVENTOS DEL FORMULARIO
  // ================================

  onPaqueteSeleccionado(paqueteId: number): void {
    console.log('📦 Paquete seleccionado ID:', paqueteId);
    
    this.paqueteSeleccionado = this.paquetes.find(p => p.id === paqueteId) || null;
    
    if (this.paqueteSeleccionado) {
      console.log('✅ Paquete encontrado:', this.paqueteSeleccionado.nombre);
      
      // Establecer descuento del paquete
      this.asignacionForm.descuento_aplicado = this.paqueteSeleccionado.descuento || 0;
      
      // Calcular precio final
      this.calcularPrecioFinal();
      
      console.log('💰 Configuración de precios:');
      console.log('- Precio base:', this.paqueteSeleccionado.precio);
      console.log('- Descuento:', this.asignacionForm.descuento_aplicado, '%');
      console.log('- Precio final:', this.precioFinal);
    } else {
      console.warn('⚠️ Paquete no encontrado para ID:', paqueteId);
    }
  }

  onDescuentoChange(): void {
    console.log('💸 Descuento cambiado a:', this.asignacionForm.descuento_aplicado);
    this.calcularPrecioFinal();
  }

  private calcularPrecioFinal(): void {
    if (!this.paqueteSeleccionado) return;

    const precioBase = this.paqueteSeleccionado.precio;
    const descuento = this.asignacionForm.descuento_aplicado || 0;
    
    this.precioFinal = this.asignacionService.calcularPrecioFinal(precioBase, descuento);
    this.descuentoAplicado = precioBase - this.precioFinal;
    this.asignacionForm.precio_pagado = this.precioFinal;

    console.log('🧮 Cálculo de precio actualizado:');
    console.log('- Precio base:', precioBase);
    console.log('- Descuento:', descuento, '%');
    console.log('- Precio final:', this.precioFinal);
    console.log('- Ahorro:', this.descuentoAplicado);
  }

  // ================================
  // ENVÍO DEL FORMULARIO
  // ================================

  async onSubmit(): Promise<void> {
    console.log('🚀 Iniciando proceso de asignación...');
    
    // Validaciones
    if (!this.validarFormulario()) {
      return;
    }

    this.cargando = true;
    this.limpiarMensajes();

    try {
      const resultados: string[] = [];
      let exitosCount = 0;
      let erroresCount = 0;

      console.log('📋 Procesando asignaciones para', this.asignacionForm.usuarios_seleccionados.length, 'usuarios');

      // Asignar paquete a cada usuario seleccionado
      for (const usuarioId of this.asignacionForm.usuarios_seleccionados) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        
        try {
          const datosAsignacion: AsignacionPaquete = {
            usuario_id: usuarioId,
            paquete_id: this.asignacionForm.paquete_id!,
            fecha_inicio: this.asignacionForm.fecha_inicio,
            precio_pagado: this.asignacionForm.precio_pagado,
            descuento_aplicado: this.asignacionForm.descuento_aplicado,
            metodo_pago: this.asignacionForm.metodo_pago,
            notas_administrativas: this.asignacionForm.notas_administrativas
          };

          if (this.asignacionForm.terapeuta_asignado) {
            datosAsignacion.terapeuta_asignado = this.asignacionForm.terapeuta_asignado;
          }

          console.log('👤 Procesando usuario:', usuario?.nombre, datosAsignacion);

          const resultado = await this.asignacionService.asignarPaqueteAUsuario(datosAsignacion);

          if (resultado.success) {
            exitosCount++;
            resultados.push(`✅ ${usuario?.nombre || `Usuario ${usuarioId}`}: Asignado exitosamente`);
            console.log('✅ Asignación exitosa para usuario', usuarioId);
          } else {
            erroresCount++;
            resultados.push(`❌ ${usuario?.nombre || `Usuario ${usuarioId}`}: ${resultado.message}`);
            console.error('❌ Error en asignación para usuario', usuarioId, resultado.message);
          }
        } catch (error) {
          erroresCount++;
          resultados.push(`❌ ${usuario?.nombre || `Usuario ${usuarioId}`}: Error interno`);
          console.error('❌ Error procesando usuario', usuarioId, error);
        }
      }

      // Mostrar resumen de resultados
      this.mostrarResumenResultados(exitosCount, erroresCount, resultados);

    } catch (error) {
      console.error('❌ Error en proceso de asignación:', error);
      this.mostrarError('Error interno al procesar las asignaciones');
    } finally {
      this.cargando = false;
    }
  }

  private validarFormulario(): boolean {
    console.log('🔍 Validando formulario...');

    if (!this.asignacionForm.paquete_id) {
      this.mostrarError('Debe seleccionar un paquete');
      return false;
    }

    if (this.asignacionForm.usuarios_seleccionados.length === 0) {
      this.mostrarError('Debe seleccionar al menos un usuario');
      return false;
    }

    if (!this.asignacionForm.fecha_inicio) {
      this.mostrarError('Debe especificar la fecha de inicio');
      return false;
    }

    if (this.asignacionForm.precio_pagado <= 0) {
      this.mostrarError('El precio debe ser mayor a cero');
      return false;
    }

    console.log('✅ Formulario válido');
    return true;
  }

  private mostrarResumenResultados(exitosos: number, errores: number, detalles: string[]): void {
    const mensaje = `
Proceso completado:
• Asignaciones exitosas: ${exitosos}
• Con errores: ${errores}

Detalles:
${detalles.join('\n')}
    `;

    if (exitosos > 0) {
      this.mostrarExito(mensaje);
      
      // Si todo fue exitoso, redirigir después de un momento
      if (errores === 0) {
        setTimeout(() => {
          this.router.navigate(['/paquetes/asignaciones']);
        }, 3000);
      }
    } else {
      this.mostrarError(mensaje);
    }
  }

  // ================================
  // MÉTODOS DE RECARGA
  // ================================

  async reintentarCargaUsuarios(): Promise<void> {
    console.log('🔄 Reintentando carga de usuarios...');
    this.buscandoUsuarios = true;
    this.limpiarMensajes();
    
    try {
      this.usuarios = await this.asignacionService.obtenerUsuarios();
      console.log('✅ Usuarios recargados:', this.usuarios.length);
      
      if (this.usuarios.length === 0) {
        this.mostrarError('No se encontraron usuarios activos en el sistema');
      } else {
        this.mostrarExito(`Se cargaron ${this.usuarios.length} usuarios correctamente`);
        setTimeout(() => this.limpiarMensajes(), 3000);
      }
    } catch (error) {
      console.error('❌ Error en reintento:', error);
      this.mostrarError('Error al cargar usuarios. Verifica tu conexión.');
    } finally {
      this.buscandoUsuarios = false;
    }
  }

  async refrescarTodosLosDatos(): Promise<void> {
    console.log('🔄 Refrescando todos los datos...');
    this.cargando = true;
    this.limpiarMensajes();
    
    try {
      await Promise.all([
        this.cargarPaquetes(),
        this.cargarTerapeutas(),
        this.cargarUsuarios()
      ]);
      this.mostrarExito('Datos actualizados correctamente');
      setTimeout(() => this.limpiarMensajes(), 3000);
    } catch (error) {
      console.error('❌ Error refrescando datos:', error);
      this.mostrarError('Error al actualizar los datos');
    } finally {
      this.cargando = false;
    }
  }

  // ================================
  // NAVEGACIÓN
  // ================================

  volver(): void {
    this.router.navigate(['/paquetes']);
  }

  irAAsignaciones(): void {
    this.router.navigate(['/paquetes/asignaciones']);
  }

  // ================================
  // UTILIDADES
  // ================================

  private obtenerFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatearPrecio(precio: number): string {
    return this.asignacionService.formatearPrecio(precio);
  }

  private mostrarError(mensaje: string): void {
    this.error = mensaje;
    this.exito = null;
    console.error('🚨 Error:', mensaje);
  }

  private mostrarExito(mensaje: string): void {
    this.exito = mensaje;
    this.error = null;
    console.log('✅ Éxito:', mensaje);
  }

  // Cambiar a public para uso en template
  limpiarMensajes(): void {
    this.error = null;
    this.exito = null;
  }

  // ================================
  // GETTERS PARA EL TEMPLATE
  // ================================

  get usuariosSeleccionadosNombres(): string[] {
    return this.asignacionForm.usuarios_seleccionados.map(id => {
      const usuario = this.usuarios.find(u => u.id === id);
      return usuario?.nombre || `Usuario ${id}`;
    });
  }

  get resumenAsignacion(): any {
    if (!this.paqueteSeleccionado || this.asignacionForm.usuarios_seleccionados.length === 0) {
      return null;
    }

    const usuariosCount = this.asignacionForm.usuarios_seleccionados.length;
    const precioTotal = this.precioFinal * usuariosCount;
    const ahorroTotal = this.descuentoAplicado * usuariosCount;

    return {
      paquete: this.paqueteSeleccionado.nombre,
      tipo: this.paqueteSeleccionado.tipo,
      sesiones: this.paqueteSeleccionado.cantidad_sesiones,
      usuarios_count: usuariosCount,
      usuarios_nombres: this.usuariosSeleccionadosNombres,
      precio_base: this.paqueteSeleccionado.precio,
      descuento: this.asignacionForm.descuento_aplicado || 0,
      precio_final: this.precioFinal,
      precio_total: precioTotal,
      ahorro_por_usuario: this.descuentoAplicado,
      ahorro_total: ahorroTotal,
      fecha_inicio: this.asignacionForm.fecha_inicio
    };
  }

  get mostrarResumen(): boolean {
    const condiciones = {
      tieneUsuarios: this.asignacionForm.usuarios_seleccionados.length > 0,
      tienePaquete: !!this.paqueteSeleccionado,
      tieneFecha: !!this.asignacionForm.fecha_inicio,
      tienePrecio: this.asignacionForm.precio_pagado > 0
    };
    
    const resultado = Object.values(condiciones).every(Boolean);
    
    console.log('🎯 Validación mostrarResumen:', {
      ...condiciones,
      resultado
    });
    
    return resultado;
  }

  // ================================
  // DEBUGGING
  // ================================

  debugFormulario(): void {
    console.log('🐛 DEBUG - Estado del formulario:');
    console.log('- Paquete seleccionado:', this.paqueteSeleccionado?.nombre);
    console.log('- Usuarios seleccionados:', this.asignacionForm.usuarios_seleccionados.length);
    console.log('- Formulario completo:', this.asignacionForm);
    console.log('- Mostrar resumen:', this.mostrarResumen);
    console.log('- Resumen:', this.resumenAsignacion);
  }

  // Debug completo de la asignación
  async debugAsignacionCompleta(): Promise<void> {
    console.log('🐛 DEBUGGING COMPLETO DE ASIGNACIÓN');
    console.log('=====================================');
    
    // 1. Estado del formulario
    console.log('📋 Estado del formulario:');
    console.log('- Paquete ID:', this.asignacionForm.paquete_id);
    console.log('- Usuarios seleccionados:', this.asignacionForm.usuarios_seleccionados);
    console.log('- Fecha inicio:', this.asignacionForm.fecha_inicio);
    console.log('- Precio:', this.asignacionForm.precio_pagado);
    console.log('- Formulario completo:', this.asignacionForm);
    
    // 2. Datos del paquete
    console.log('📦 Datos del paquete seleccionado:');
    console.log('- Paquete:', this.paqueteSeleccionado);
    
    // 3. Usuarios disponibles
    console.log('👥 Usuarios disponibles:');
    console.log('- Total usuarios cargados:', this.usuarios.length);
    console.log('- Usuarios:', this.usuarios.slice(0, 3)); // Solo primeros 3 para no saturar
    
    // 4. Validar cada usuario seleccionado
    console.log('🔍 Validando usuarios seleccionados:');
    for (const usuarioId of this.asignacionForm.usuarios_seleccionados) {
      const usuario = this.usuarios.find(u => u.id === usuarioId);
      console.log(`- Usuario ${usuarioId}: ${usuario ? usuario.nombre : 'NO ENCONTRADO'}`);
    }
    
    // 5. Probar una asignación individual
    if (this.asignacionForm.paquete_id && this.asignacionForm.usuarios_seleccionados.length > 0) {
      console.log('🧪 Probando asignación individual...');
      
      const datosTest: AsignacionPaquete = {
        usuario_id: this.asignacionForm.usuarios_seleccionados[0],
        paquete_id: this.asignacionForm.paquete_id,
        fecha_inicio: this.asignacionForm.fecha_inicio,
        precio_pagado: this.asignacionForm.precio_pagado,
        descuento_aplicado: this.asignacionForm.descuento_aplicado,
        metodo_pago: this.asignacionForm.metodo_pago,
        notas_administrativas: this.asignacionForm.notas_administrativas
      };
      
      if (this.asignacionForm.terapeuta_asignado) {
        datosTest.terapeuta_asignado = this.asignacionForm.terapeuta_asignado;
      }
      
      console.log('📤 Datos de prueba:', datosTest);
      
      try {
        const resultado = await this.asignacionService.asignarPaqueteAUsuario(datosTest);
        console.log('📥 Resultado de prueba:', resultado);
        
        if (resultado.success) {
          this.mostrarExito(`Prueba exitosa: ${resultado.message}`);
        } else {
          this.mostrarError(`Prueba falló: ${resultado.message}`);
        }
      } catch (error) {
        console.error('💥 Error en prueba:', error);
        this.mostrarError(`Error en prueba: ${error}`);
      }
    }
    
    console.log('=====================================');
  }
}