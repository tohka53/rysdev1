// src/app/components/validacion-compras/validacion-compras.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompraPaquetesService } from '../../services/compra-paquetes.service';
import { AuthService } from '../../services/auth.service';
import {
  CompraPaqueteCompleta,
  ValidacionCompraPaquete,
  FiltrosComprasPaquetes,
  EstadisticasComprasPaquetes,
  ESTADOS_COMPRA,
  METODOS_PAGO
} from '../../interfaces/compra-paquetes.interfaces';

@Component({
  selector: 'app-validacion-compras',
  standalone: false,
  templateUrl: './validacion-compras.component.html',
  styleUrls: ['./validacion-compras.component.css']
})
export class ValidacionComprasComponent implements OnInit {

  // ===================================
  // PROPIEDADES
  // ===================================

  // Estado de carga y datos
  cargando = false;
  error: string | null = null;
  comprasPendientes: CompraPaqueteCompleta[] = [];
  comprasFiltradas: CompraPaqueteCompleta[] = [];
  estadisticas: EstadisticasComprasPaquetes | null = null;

  // Filtros
  filtros: FiltrosComprasPaquetes = {
    estado_compra: 'pendiente',
    page: 1,
    limit: 20
  };

  // Opciones para filtros
  estadosCompra = ESTADOS_COMPRA;
  metodosPago = METODOS_PAGO;

  // Modal de validación
  mostrarModalValidacion = false;
  compraSeleccionada: CompraPaqueteCompleta | null = null;
  formularioValidacion!: FormGroup;
  procesandoValidacion = false;

  // Modal de comprobante
  mostrarModalComprobante = false;
  comprobanteActual: string | null = null;
  comprobanteNombre: string = '';

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;
  totalItems = 0;
  totalPaginas = 0;

  // Permisos
  puedeValidar = false;

  constructor(
    private compraPaquetesService: CompraPaquetesService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.verificarPermisos();
    this.cargarComprasPendientes();
    this.cargarEstadisticas();
  }

  // ===================================
  // INICIALIZACIÓN
  // ===================================

  private inicializarFormulario(): void {
    this.formularioValidacion = this.formBuilder.group({
      accion: ['validar', Validators.required],
      motivo_rechazo: [''],
      notas_admin: ['']
    });

    // Validador condicional para motivo de rechazo
    this.formularioValidacion.get('accion')?.valueChanges.subscribe(accion => {
      const motivoControl = this.formularioValidacion.get('motivo_rechazo');
      if (accion === 'rechazar') {
        motivoControl?.setValidators([Validators.required]);
      } else {
        motivoControl?.clearValidators();
      }
      motivoControl?.updateValueAndValidity();
    });
  }

  private async verificarPermisos(): Promise<void> {
    try {
      this.puedeValidar = await this.compraPaquetesService.verificarPermisosValidacion();
      if (!this.puedeValidar) {
        this.error = 'No tienes permisos para validar compras';
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
      this.error = 'Error verificando permisos';
    }
  }

  // ===================================
  // CARGA DE DATOS
  // ===================================

  async cargarComprasPendientes(): Promise<void> {
    if (!this.puedeValidar) return;

    this.cargando = true;
    this.error = null;

    try {
      this.comprasPendientes = await this.compraPaquetesService.obtenerComprasPendientes(this.filtros);
      this.aplicarFiltrosLocales();
      this.calcularPaginacion();
    } catch (error) {
      console.error('Error cargando compras:', error);
      this.error = 'Error al cargar las compras pendientes';
    } finally {
      this.cargando = false;
    }
  }

  async cargarEstadisticas(): Promise<void> {
    try {
      this.estadisticas = await this.compraPaquetesService.obtenerEstadisticasCompras();
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  private aplicarFiltrosLocales(): void {
    this.comprasFiltradas = [...this.comprasPendientes];
    this.totalItems = this.comprasFiltradas.length;
  }

  private calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.totalItems / this.itemsPorPagina);
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.comprasFiltradas = this.comprasFiltradas.slice(inicio, fin);
  }

  // ===================================
  // FILTROS Y PAGINACIÓN
  // ===================================

  async aplicarFiltros(): Promise<void> {
    this.paginaActual = 1;
    await this.cargarComprasPendientes();
  }

  async limpiarFiltros(): Promise<void> {
    this.filtros = {
      estado_compra: 'pendiente',
      page: 1,
      limit: 20
    };
    this.paginaActual = 1;
    await this.cargarComprasPendientes();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.calcularPaginacion();
    }
  }

  // ===================================
  // VALIDACIÓN DE COMPRAS
  // ===================================

  abrirModalValidacion(compra: CompraPaqueteCompleta): void {
    this.compraSeleccionada = compra;
    this.formularioValidacion.reset({
      accion: 'validar',
      motivo_rechazo: '',
      notas_admin: ''
    });
    this.mostrarModalValidacion = true;
  }

  cerrarModalValidacion(): void {
    this.mostrarModalValidacion = false;
    this.compraSeleccionada = null;
    this.formularioValidacion.reset();
    this.error = null;
  }

  async procesarValidacion(): Promise<void> {
    if (!this.formularioValidacion.valid || !this.compraSeleccionada) {
      this.marcarErroresFormulario();
      return;
    }

    this.procesandoValidacion = true;
    this.error = null;

    try {
      const formValues = this.formularioValidacion.value;
      const validacion: ValidacionCompraPaquete = {
        compra_id: this.compraSeleccionada.compra_id,
        accion: formValues.accion,
        motivo_rechazo: formValues.motivo_rechazo,
        notas_admin: formValues.notas_admin
      };

      const resultado = await this.compraPaquetesService.validarCompraPaquete(validacion);
      
      this.mostrarMensajeExito(resultado.mensaje);
      this.cerrarModalValidacion();
      
      // Recargar datos
      await this.cargarComprasPendientes();
      await this.cargarEstadisticas();

    } catch (error) {
      console.error('Error procesando validación:', error);
      this.error = 'Error al procesar la validación. Intenta nuevamente.';
    } finally {
      this.procesandoValidacion = false;
    }
  }

  private marcarErroresFormulario(): void {
    Object.keys(this.formularioValidacion.controls).forEach(key => {
      const control = this.formularioValidacion.get(key);
      if (control && control.invalid) {
        control.markAsTouched();
      }
    });
  }

  private mostrarMensajeExito(mensaje: string): void {
    alert(mensaje); // Temporal - reemplazar con servicio de notificaciones
  }

  // ===================================
  // VISUALIZACIÓN DE COMPROBANTES
  // ===================================

  async verComprobante(compra: CompraPaqueteCompleta): Promise<void> {
    if (!compra.tiene_comprobante) return;

    try {
      const comprobanteBase64 = await this.compraPaquetesService.obtenerComprobanteBase64(compra.compra_id);
      if (comprobanteBase64) {
        // Determinar el tipo MIME basado en la extensión
        const tipoMime = this.obtenerTipoMime(compra.comprobante_tipo || '');
        this.comprobanteActual = `data:${tipoMime};base64,${comprobanteBase64}`;
        this.comprobanteNombre = compra.comprobante_nombre || 'Comprobante';
        this.mostrarModalComprobante = true;
      } else {
        this.error = 'No se pudo cargar el comprobante';
      }
    } catch (error) {
      console.error('Error cargando comprobante:', error);
      this.error = 'Error al cargar el comprobante';
    }
  }

  cerrarModalComprobante(): void {
    this.mostrarModalComprobante = false;
    this.comprobanteActual = null;
    this.comprobanteNombre = '';
  }

  descargarComprobante(): void {
    if (!this.comprobanteActual) return;

    const link = document.createElement('a');
    link.href = this.comprobanteActual;
    link.download = this.comprobanteNombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private obtenerTipoMime(tipoArchivo: string): string {
    const tipos: { [key: string]: string } = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png',
      'application/pdf': 'application/pdf'
    };
    return tipos[tipoArchivo] || 'application/octet-stream';
  }

  // ===================================
  // MÉTODOS AUXILIARES
  // ===================================

  formatearPrecio(precio: number): string {
    return this.compraPaquetesService.formatearPrecio(precio);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'pendiente': 'badge bg-warning',
      'validada': 'badge bg-success',
      'rechazada': 'badge bg-danger',
      'cancelada': 'badge bg-secondary'
    };
    return clases[estado] || 'badge bg-secondary';
  }

  obtenerClaseMetodoPago(metodo: string): string {
    const clases: { [key: string]: string } = {
      'transferencia': 'text-primary',
      'deposito': 'text-info',
      'tarjeta_credito': 'text-success',
      'tarjeta_debito': 'text-warning'
    };
    return clases[metodo] || 'text-muted';
  }

  obtenerIconoMetodoPago(metodo: string): string {
    const iconos: { [key: string]: string } = {
      'transferencia': 'fas fa-university',
      'deposito': 'fas fa-piggy-bank',
      'tarjeta_credito': 'fas fa-credit-card',
      'tarjeta_debito': 'fas fa-credit-card'
    };
    return iconos[metodo] || 'fas fa-credit-card';
  }

  obtenerLabelMetodoPago(metodo: string): string {
    const metodoPago = this.metodosPago.find(m => m.value === metodo);
    return metodoPago?.label || metodo;
  }

  calcularTiempoTranscurrido(horas: number): string {
    if (horas < 1) {
      const minutos = Math.round(horas * 60);
      return `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    } else if (horas < 24) {
      const horasRedondeadas = Math.round(horas);
      return `${horasRedondeadas} hora${horasRedondeadas !== 1 ? 's' : ''}`;
    } else {
      const dias = Math.round(horas / 24);
      return `${dias} día${dias !== 1 ? 's' : ''}`;
    }
  }

  // ===================================
  // GETTERS PARA TEMPLATE
  // ===================================

  get accionSeleccionada(): string {
    return this.formularioValidacion.get('accion')?.value || 'validar';
  }

  get requiereMotivoRechazo(): boolean {
    return this.accionSeleccionada === 'rechazar';
  }

  get accionInvalida(): boolean {
    const control = this.formularioValidacion.get('accion');
    return !!(control && control.invalid && control.touched);
  }

  get motivoRechazoInvalido(): boolean {
    const control = this.formularioValidacion.get('motivo_rechazo');
    return !!(control && control.invalid && control.touched);
  }

  get paginasArray(): number[] {
    const paginas: number[] = [];
    for (let i = 1; i <= this.totalPaginas; i++) {
      paginas.push(i);
    }
    return paginas;
  }
}