// src/app/components/paquetes/asignar-paquete/asignar-paquete.component.ts - CORREGIDO
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  AsignacionPaquetesService, 
  Usuario, 
  AsignacionPaquete 
} from '../../services/asignacion-paquetes.service';
import { PaquetesService } from '../../services/paquetes.service';
import { Paquete } from '../../interfaces/paquetes.interfaces';

// Interface para formulario con selección múltiple
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
  paquetes: Paquete[] = [];
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
  paqueteSeleccionado: Paquete | null = null;
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

  ngOnInit(): void {
    this.inicializarDatos();
    this.verificarParametrosURL();
  }

  // ================================
  // INICIALIZACIÓN
  // ================================

  private async inicializarDatos(): Promise<void> {
    this.cargando = true;
    try {
      await Promise.all([
        this.cargarPaquetes(),
        this.cargarTerapeutas(),
        this.cargarUsuarios() // Cargar usuarios inicialmente
      ]);
    } catch (error) {
      console.error('Error inicializando datos:', error);
      this.mostrarError('Error al cargar los datos iniciales');
    } finally {
      this.cargando = false;
    }
  }

  private verificarParametrosURL(): void {
    // Verificar si se pasó un paquete específico por parámetro
    const paqueteId = this.route.snapshot.queryParams['paquete_id'];

    if (paqueteId) {
      this.asignacionForm.paquete_id = parseInt(paqueteId);
      this.onPaqueteSeleccionado(this.asignacionForm.paquete_id);
    }
  }

  // ================================
  // CARGA DE DATOS
  // ================================

  private async cargarPaquetes(): Promise<void> {
    try {
      this.paquetes = await this.paquetesService.obtenerPaquetes({ status: 1 });
    } catch (error) {
      console.error('Error cargando paquetes:', error);
      this.paquetes = [];
    }
  }

  private async cargarTerapeutas(): Promise<void> {
    try {
      this.terapeutas = await this.asignacionService.obtenerTerapeutas();
    } catch (error) {
      console.error('Error cargando terapeutas:', error);
      this.terapeutas = [];
    }
  }

  private async cargarUsuarios(): Promise<void> {
  try {
    console.log('🚀 Iniciando carga inicial de usuarios...');
    
    // Verificar tabla primero (opcional, para depuración)
    await this.asignacionService.verificarTablaUsuarios();
    
    this.usuarios = await this.asignacionService.obtenerUsuarios();
    
    console.log('✅ Usuarios cargados en componente:', this.usuarios.length);
    
    if (this.usuarios.length === 0) {
      console.warn('⚠️ No se encontraron usuarios activos');
      this.mostrarError('No se encontraron usuarios activos en el sistema');
    }
    
  } catch (error) {
    console.error('💥 Error cargando usuarios en componente:', error);
    this.usuarios = [];
    this.mostrarError('Error al cargar la lista de usuarios. Verifique su conexión.');
  }
}

  async buscarUsuarios(): Promise<void> {
    if (this.terminoBusquedaUsuarios.length < 2) {
      await this.cargarUsuarios(); // Cargar todos si hay menos de 2 caracteres
      return;
    }

    this.buscandoUsuarios = true;
    try {
      this.usuarios = await this.asignacionService.buscarUsuarios(this.terminoBusquedaUsuarios);
    } catch (error) {
      console.error('Error buscando usuarios:', error);
      this.usuarios = [];
    } finally {
      this.buscandoUsuarios = false;
    }
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
      // Deseleccionar
      this.asignacionForm.usuarios_seleccionados.splice(index, 1);
    } else {
      // Seleccionar
      this.asignacionForm.usuarios_seleccionados.push(usuarioId);
    }

    console.log('Usuarios seleccionados:', this.asignacionForm.usuarios_seleccionados);
  }

  selectAllUsuarios(): void {
    this.asignacionForm.usuarios_seleccionados = this.usuarios.map(u => u.id);
  }

  clearAllUsuarios(): void {
    this.asignacionForm.usuarios_seleccionados = [];
  }

  trackByUserId(index: number, usuario: Usuario): number {
    return usuario.id;
  }

  // ================================
  // EVENTOS DEL FORMULARIO
  // ================================

  onPaqueteSeleccionado(paqueteId: number): void {
    this.paqueteSeleccionado = this.paquetes.find(p => p.id === paqueteId) || null;
    
    if (this.paqueteSeleccionado) {
      // Establecer precio base
      this.asignacionForm.precio_pagado = this.paqueteSeleccionado.precio_final || this.paqueteSeleccionado.precio;
      this.asignacionForm.descuento_aplicado = this.paqueteSeleccionado.descuento || 0;
      
      this.calcularPrecioFinal();
    }
  }

  onDescuentoChange(): void {
    this.calcularPrecioFinal();
  }

  private calcularPrecioFinal(): void {
    if (!this.paqueteSeleccionado) return;

    const precioBase = this.paqueteSeleccionado.precio;
    const descuento = this.asignacionForm.descuento_aplicado || 0;
    
    this.precioFinal = this.asignacionService.calcularPrecioFinal(precioBase, descuento);
    this.descuentoAplicado = precioBase - this.precioFinal;

    // Actualizar el precio a pagar
    this.asignacionForm.precio_pagado = this.precioFinal;
  }

  // ================================
  // ENVÍO DEL FORMULARIO
  // ================================

  async onSubmit(): Promise<void> {
    // Validaciones
    if (!this.asignacionForm.paquete_id) {
      this.mostrarError('Debe seleccionar un paquete');
      return;
    }

    if (this.asignacionForm.usuarios_seleccionados.length === 0) {
      this.mostrarError('Debe seleccionar al menos un usuario');
      return;
    }

    if (!this.asignacionForm.fecha_inicio) {
      this.mostrarError('Debe especificar la fecha de inicio');
      return;
    }

    this.cargando = true;
    this.limpiarMensajes();

    try {
      const resultados: string[] = [];
      let exitosCount = 0;
      let erroresCount = 0;

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

          const resultado = await this.asignacionService.asignarPaqueteAUsuario(datosAsignacion);

          if (resultado.success) {
            exitosCount++;
            resultados.push(`✅ ${usuario?.nombre || `Usuario ${usuarioId}`}: Asignado exitosamente`);
          } else {
            erroresCount++;
            resultados.push(`❌ ${usuario?.nombre || `Usuario ${usuarioId}`}: ${resultado.message}`);
          }
        } catch (error) {
          erroresCount++;
          resultados.push(`❌ ${usuario?.nombre || `Usuario ${usuarioId}`}: Error interno`);
        }
      }

      // Mostrar resumen
      const mensaje = `
        Proceso completado:
        • Exitosos: ${exitosCount}
        • Con errores: ${erroresCount}
        
        Detalles:
        ${resultados.join('\n')}
      `;

      if (exitosCount > 0) {
        this.mostrarExito(mensaje);
        
        if (erroresCount === 0) {
          // Si todo fue exitoso, redirigir después de un momento
          setTimeout(() => {
            this.router.navigate(['/paquetes/asignaciones']);
          }, 3000);
        }
      } else {
        this.mostrarError(mensaje);
      }

    } catch (error) {
      console.error('Error en proceso de asignación:', error);
      this.mostrarError('Error interno al procesar las asignaciones');
    } finally {
      this.cargando = false;
    }
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
  // MENSAJES
  // ================================

  private mostrarError(mensaje: string): void {
    this.error = mensaje;
    this.exito = null;
  }

  private mostrarExito(mensaje: string): void {
    this.exito = mensaje;
    this.error = null;
  }

  private limpiarMensajes(): void {
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
    if (!this.paqueteSeleccionado || this.asignacionForm.usuarios_seleccionados.length === 0) return null;

    return {
      paquete: this.paqueteSeleccionado.nombre,
      tipo: this.paqueteSeleccionado.tipo,
      sesiones: this.paqueteSeleccionado.cantidad_sesiones,
      usuarios_count: this.asignacionForm.usuarios_seleccionados.length,
      usuarios_nombres: this.usuariosSeleccionadosNombres,
      precio_base: this.paqueteSeleccionado.precio,
      descuento: this.asignacionForm.descuento_aplicado || 0,
      precio_final: this.precioFinal,
      precio_total: this.precioFinal * this.asignacionForm.usuarios_seleccionados.length,
      ahorro_por_usuario: this.descuentoAplicado,
      ahorro_total: this.descuentoAplicado * this.asignacionForm.usuarios_seleccionados.length,
      fecha_inicio: this.asignacionForm.fecha_inicio
    };
  }

  get mostrarResumen(): boolean {
    return !!(this.paqueteSeleccionado && this.asignacionForm.usuarios_seleccionados.length > 0);
  }
}