// src/app/compra-paquetes/compra-paquetes/compra-paquetes.component.ts
// CORRECCIONES NECESARIAS

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompraPaquetesService } from '../../services/compra-paquetes.service';
import { AuthService } from '../../services/auth.service';
import {
  PaqueteParaCompra,
  FormularioCompraPaquete,
  ResumenCompra,
  METODOS_PAGO,
  BANCOS_DISPONIBLES
} from '../../interfaces/compra-paquetes.interfaces';

@Component({
  selector: 'app-compra-paquetes',
  standalone: false,
  templateUrl: './compra-paquetes.component.html',
  styleUrls: ['./compra-paquetes.component.css']
})
export class CompraPaquetesComponent implements OnInit {

  // ===================================
  // PROPIEDADES
  // ===================================

  // Estado de carga y datos
  cargando = false;
  error: string | null = null;
  paquetesDisponibles: PaqueteParaCompra[] = [];
  paquetesFiltrados: PaqueteParaCompra[] = [];

  // Filtros y búsqueda
  filtroTipo = 'todos';
  busqueda = '';
  tiposDisponibles: string[] = [];

  // Modal de compra
  mostrarModalCompra = false;
  paqueteSeleccionado: PaqueteParaCompra | null = null;
  resumenCompra: ResumenCompra | null = null;

  // Formulario de compra
  formularioCompra!: FormGroup;
  enviandoCompra = false;

  // Configuración
  metodosPago = METODOS_PAGO;
  bancosDisponibles = BANCOS_DISPONIBLES;
  formatosPermitidos = ['.jpg', '.jpeg', '.png', '.pdf'];
  tamanoMaximo = 5; // ⚠️ CORREGIDO: cambié tamañoMaximo por tamanoMaximo
  fechaMaxima = new Date().toISOString().split('T')[0]; // ⚠️ AGREGADO: propiedad para fecha máxima

  // Vista
  vistaActual: 'tarjetas' | 'lista' = 'tarjetas';

  constructor(
    private compraPaquetesService: CompraPaquetesService,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarPaquetesDisponibles();
  }

  // ===================================
  // INICIALIZACIÓN
  // ===================================

  private inicializarFormulario(): void {
    this.formularioCompra = this.formBuilder.group({
      metodo_pago: ['', Validators.required],
      numero_transaccion: [''],
      banco: [''],
      fecha_pago: [this.fechaMaxima, Validators.required], // ⚠️ CORREGIDO: usar propiedad
      hora_pago: [''],
      comprobante: [null],
      notas_usuario: [''],
      acepta_terminos: [false, Validators.requiredTrue]
    });

    // Validadores condicionales según método de pago
    this.formularioCompra.get('metodo_pago')?.valueChanges.subscribe(metodo => {
      this.actualizarValidadoresSegunMetodo(metodo);
    });
  }

  private actualizarValidadoresSegunMetodo(metodo: string): void {
    const numeroTransaccionControl = this.formularioCompra.get('numero_transaccion');
    const bancoControl = this.formularioCompra.get('banco');
    const comprobanteControl = this.formularioCompra.get('comprobante');

    // Limpiar validadores
    numeroTransaccionControl?.clearValidators();
    bancoControl?.clearValidators();
    comprobanteControl?.clearValidators();

    // Aplicar validadores según método
    if (metodo === 'transferencia' || metodo === 'deposito') {
      numeroTransaccionControl?.setValidators([Validators.required]);
      bancoControl?.setValidators([Validators.required]);
      comprobanteControl?.setValidators([Validators.required]);
    } else if (metodo === 'tarjeta_credito' || metodo === 'tarjeta_debito') {
      numeroTransaccionControl?.setValidators([Validators.required]);
      comprobanteControl?.setValidators([Validators.required]);
    }

    // Actualizar estado de validación
    numeroTransaccionControl?.updateValueAndValidity();
    bancoControl?.updateValueAndValidity();
    comprobanteControl?.updateValueAndValidity();
  }

  // ===================================
  // CARGA DE DATOS
  // ===================================

  async cargarPaquetesDisponibles(): Promise<void> {
    this.cargando = true;
    this.error = null;

    try {
      this.paquetesDisponibles = await this.compraPaquetesService.obtenerPaquetesParaCompra();
      this.extraerTiposDisponibles();
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error cargando paquetes:', error);
      this.error = 'Error al cargar los paquetes disponibles. Intenta nuevamente.';
    } finally {
      this.cargando = false;
    }
  }

  private extraerTiposDisponibles(): void {
    const tipos = [...new Set(this.paquetesDisponibles.map(p => p.tipo))];
    this.tiposDisponibles = tipos.sort();
  }

  // ===================================
  // FILTROS Y BÚSQUEDA
  // ===================================

  aplicarFiltros(): void {
    let paquetesFiltrados = [...this.paquetesDisponibles];

    // Filtro por tipo
    if (this.filtroTipo !== 'todos') {
      paquetesFiltrados = paquetesFiltrados.filter(p => p.tipo === this.filtroTipo);
    }

    // Filtro por búsqueda
    if (this.busqueda.trim()) {
      const termino = this.busqueda.toLowerCase().trim();
      paquetesFiltrados = paquetesFiltrados.filter(p =>
        p.nombre.toLowerCase().includes(termino) ||
        p.descripcion?.toLowerCase().includes(termino) ||
        p.tipo.toLowerCase().includes(termino)
      );
    }

    this.paquetesFiltrados = paquetesFiltrados;
  }

  onFiltroTipoChange(): void {
    this.aplicarFiltros();
  }

  onBusquedaChange(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtroTipo = 'todos';
    this.busqueda = '';
    this.aplicarFiltros();
  }

  // ===================================
  // GESTIÓN DE COMPRA
  // ===================================

  abrirModalCompra(paquete: PaqueteParaCompra): void {
    this.paqueteSeleccionado = paquete;
    this.resumenCompra = this.compraPaquetesService.calcularResumenCompra(paquete);
    this.resetearFormulario();
    this.mostrarModalCompra = true;
  }

  cerrarModalCompra(): void {
    this.mostrarModalCompra = false;
    this.paqueteSeleccionado = null;
    this.resumenCompra = null;
    this.resetearFormulario();
  }

  private resetearFormulario(): void {
    this.formularioCompra.reset({
      fecha_pago: this.fechaMaxima, // ⚠️ CORREGIDO: usar propiedad
      acepta_terminos: false
    });
    this.actualizarValidadoresSegunMetodo('');
  }

  async realizarCompra(): Promise<void> {
    if (!this.formularioCompra.valid || !this.paqueteSeleccionado) {
      this.marcarErroresFormulario();
      return;
    }

    this.enviandoCompra = true;
    this.error = null;

    try {
      const formValues = this.formularioCompra.value;
      const formularioCompra: FormularioCompraPaquete = {
        paquete_id: this.paqueteSeleccionado.id,
        metodo_pago: formValues.metodo_pago,
        numero_transaccion: formValues.numero_transaccion,
        banco: formValues.banco,
        fecha_pago: formValues.fecha_pago,
        hora_pago: formValues.hora_pago,
        comprobante: formValues.comprobante,
        notas_usuario: formValues.notas_usuario,
        acepta_terminos: formValues.acepta_terminos
      };

      const resultado = await this.compraPaquetesService.realizarCompraPaquete(formularioCompra);

      // Mostrar mensaje de éxito
      this.mostrarMensajeExito(resultado.mensaje);
      this.cerrarModalCompra();

      // Opcional: redirigir a mis compras
      setTimeout(() => {
        this.router.navigate(['/mis-compras']);
      }, 2000);

    } catch (error) {
      console.error('Error realizando compra:', error);
      this.error = 'Error al procesar la compra. Verifica los datos e intenta nuevamente.';
    } finally {
      this.enviandoCompra = false;
    }
  }

  private marcarErroresFormulario(): void {
    Object.keys(this.formularioCompra.controls).forEach(key => {
      const control = this.formularioCompra.get(key);
      if (control && control.invalid) {
        control.markAsTouched();
      }
    });
  }

  private mostrarMensajeExito(mensaje: string): void {
    // Implementar notificación de éxito
    alert(mensaje); // Temporal - reemplazar con un servicio de notificaciones
  }

  // ===================================
  // GESTIÓN DE ARCHIVOS
  // ===================================

  onArchivoSeleccionado(event: any): void {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const validacion = this.compraPaquetesService.validarFormatoComprobante(archivo);
    if (!validacion.valido) {
      this.error = validacion.error || 'Archivo no válido';
      event.target.value = ''; // Limpiar input
      this.formularioCompra.patchValue({ comprobante: null });
      return;
    }

    this.formularioCompra.patchValue({ comprobante: archivo });
    this.error = null;
  }

  obtenerNombreArchivo(): string {
    const archivo = this.formularioCompra.get('comprobante')?.value;
    return archivo ? archivo.name : '';
  }

  eliminarArchivo(): void {
    this.formularioCompra.patchValue({ comprobante: null });
    // Limpiar input file
    const inputFile = document.getElementById('comprobante') as HTMLInputElement;
    if (inputFile) {
      inputFile.value = '';
    }
  }

  // ===================================
  // MÉTODOS AUXILIARES
  // ===================================

  formatearPrecio(precio: number): string {
    return this.compraPaquetesService.formatearPrecio(precio);
  }

  obtenerIconoMetodoPago(metodo: string): string {
    const metodoPago = this.metodosPago.find(m => m.value === metodo);
    return metodoPago?.icono || 'fa-credit-card';
  }

  obtenerLabelMetodoPago(metodo: string): string {
    const metodoPago = this.metodosPago.find(m => m.value === metodo);
    return metodoPago?.label || metodo;
  }

  calcularPorcentajeDescuento(paquete: PaqueteParaCompra): number {
    if (!paquete.mejor_descuento) return 0;
    return Math.round(((paquete.precio - paquete.mejor_descuento.precio_final) / paquete.precio) * 100);
  }

  obtenerClaseEstadoPaquete(paquete: PaqueteParaCompra): string {
    if (paquete.mejor_descuento) {
      return 'border-success';
    }
    return '';
  }

  cambiarVista(vista: 'tarjetas' | 'lista'): void {
    this.vistaActual = vista;
  }

  // ===================================
  // GETTERS PARA TEMPLATE
  // ===================================

  get metodoPagoSeleccionado(): string {
    return this.formularioCompra.get('metodo_pago')?.value || '';
  }

  get requiereNumeroTransaccion(): boolean {
    const metodo = this.metodoPagoSeleccionado;
    return ['transferencia', 'deposito', 'tarjeta_credito', 'tarjeta_debito'].includes(metodo);
  }

  get requiereBanco(): boolean {
    const metodo = this.metodoPagoSeleccionado;
    return ['transferencia', 'deposito'].includes(metodo);
  }

  get requiereComprobante(): boolean {
    const metodo = this.metodoPagoSeleccionado;
    return ['transferencia', 'deposito', 'tarjeta_credito', 'tarjeta_debito'].includes(metodo);
  }

  // Validación de campos específicos
  get metodoPagoInvalido(): boolean { // ⚠️ CORREGIDO: era metodoePagoInvalido
    const control = this.formularioCompra.get('metodo_pago');
    return !!(control && control.invalid && control.touched);
  }

  get numeroTransaccionInvalido(): boolean {
    const control = this.formularioCompra.get('numero_transaccion');
    return !!(control && control.invalid && control.touched);
  }

  get bancoInvalido(): boolean {
    const control = this.formularioCompra.get('banco');
    return !!(control && control.invalid && control.touched);
  }

  get fechaPagoInvalida(): boolean {
    const control = this.formularioCompra.get('fecha_pago');
    return !!(control && control.invalid && control.touched);
  }

  get comprobanteInvalido(): boolean {
    const control = this.formularioCompra.get('comprobante');
    return !!(control && control.invalid && control.touched);
  }

  get terminosInvalidos(): boolean {
    const control = this.formularioCompra.get('acepta_terminos');
    return !!(control && control.invalid && control.touched);
  }
}