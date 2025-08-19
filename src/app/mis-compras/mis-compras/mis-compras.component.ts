// src/app/components/mis-compras/mis-compras.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompraPaquetesService } from '../../services/compra-paquetes.service';
import { AuthService } from '../../services/auth.service';
import {
  CompraPaqueteCompleta,
  ESTADOS_COMPRA,
  METODOS_PAGO
} from '../../interfaces/compra-paquetes.interfaces';

@Component({
  selector: 'app-mis-compras',
  standalone: false,
  templateUrl: './mis-compras.component.html',
  styleUrls: ['./mis-compras.component.css']
})
export class MisComprasComponent implements OnInit {

  // ===================================
  // PROPIEDADES
  // ===================================

  // Estado de carga y datos
  cargando = false;
  error: string | null = null;
  misCompras: CompraPaqueteCompleta[] = [];
  comprasFiltradas: CompraPaqueteCompleta[] = [];

  // Filtros
  filtroEstado = 'todos';
  filtroMetodo = 'todos';
  busqueda = '';

  // Opciones para filtros
  estadosCompra = [
    { value: 'todos', label: 'Todos los estados' },
    ...ESTADOS_COMPRA
  ];
  
  metodosPago = [
    { value: 'todos', label: 'Todos los métodos' },
    ...METODOS_PAGO
  ];

  // Modal de comprobante
  mostrarModalComprobante = false;
  comprobanteActual: string | null = null;
  comprobanteNombre: string = '';

  // Estadísticas personales
  estadisticasPersonales = {
    total: 0,
    pendientes: 0,
    validadas: 0,
    rechazadas: 0,
    montoTotal: 0,
    montoValidado: 0
  };

  constructor(
    private compraPaquetesService: CompraPaquetesService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarMisCompras();
  }

  // ===================================
  // CARGA DE DATOS
  // ===================================

  async cargarMisCompras(): Promise<void> {
    this.cargando = true;
    this.error = null;

    try {
      this.misCompras = await this.compraPaquetesService.obtenerMisCompras();
      this.calcularEstadisticasPersonales();
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error cargando mis compras:', error);
      this.error = 'Error al cargar tus compras. Intenta nuevamente.';
    } finally {
      this.cargando = false;
    }
  }

  private calcularEstadisticasPersonales(): void {
    this.estadisticasPersonales = {
      total: this.misCompras.length,
      pendientes: this.misCompras.filter(c => c.estado_compra === 'pendiente').length,
      validadas: this.misCompras.filter(c => c.estado_compra === 'validada').length,
      rechazadas: this.misCompras.filter(c => c.estado_compra === 'rechazada').length,
      montoTotal: this.misCompras.reduce((sum, c) => sum + c.precio_final, 0),
      montoValidado: this.misCompras
        .filter(c => c.estado_compra === 'validada')
        .reduce((sum, c) => sum + c.precio_final, 0)
    };
  }

  // ===================================
  // FILTROS Y BÚSQUEDA
  // ===================================

  aplicarFiltros(): void {
    let comprasFiltradas = [...this.misCompras];

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      comprasFiltradas = comprasFiltradas.filter(c => c.estado_compra === this.filtroEstado);
    }

    // Filtro por método de pago
    if (this.filtroMetodo !== 'todos') {
      comprasFiltradas = comprasFiltradas.filter(c => c.metodo_pago === this.filtroMetodo);
    }

    // Filtro por búsqueda
    if (this.busqueda.trim()) {
      const termino = this.busqueda.toLowerCase().trim();
      comprasFiltradas = comprasFiltradas.filter(c =>
        c.paquete_nombre.toLowerCase().includes(termino) ||
        c.numero_transaccion?.toLowerCase().includes(termino) ||
        c.compra_id.toString().includes(termino)
      );
    }

    this.comprasFiltradas = comprasFiltradas.sort((a, b) => 
      new Date(b.fecha_compra).getTime() - new Date(a.fecha_compra).getTime()
    );
  }

  onFiltroEstadoChange(): void {
    this.aplicarFiltros();
  }

  onFiltroMetodoChange(): void {
    this.aplicarFiltros();
  }

  onBusquedaChange(): void {
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroMetodo = 'todos';
    this.busqueda = '';
    this.aplicarFiltros();
  }

  // ===================================
  // VISUALIZACIÓN DE COMPROBANTES
  // ===================================

  async verComprobante(compra: CompraPaqueteCompleta): Promise<void> {
    if (!compra.tiene_comprobante) return;

    try {
      const comprobanteBase64 = await this.compraPaquetesService.obtenerComprobanteBase64(compra.compra_id);
      if (comprobanteBase64) {
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
  // NAVEGACIÓN Y ACCIONES
  // ===================================

  irAComprarPaquetes(): void {
    this.router.navigate(['/compra-paquetes']);
  }

  verDetalleCompra(compra: CompraPaqueteCompleta): void {
    // Implementar vista de detalle si es necesario
    console.log('Ver detalle de compra:', compra);
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

  formatearFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'pendiente': 'badge bg-warning text-dark',
      'validada': 'badge bg-success',
      'rechazada': 'badge bg-danger',
      'cancelada': 'badge bg-secondary'
    };
    return clases[estado] || 'badge bg-secondary';
  }

  obtenerIconoEstado(estado: string): string {
    const iconos: { [key: string]: string } = {
      'pendiente': 'fas fa-clock',
      'validada': 'fas fa-check-circle',
      'rechazada': 'fas fa-times-circle',
      'cancelada': 'fas fa-ban'
    };
    return iconos[estado] || 'fas fa-question-circle';
  }

  obtenerColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'pendiente': 'text-warning',
      'validada': 'text-success',
      'rechazada': 'text-danger',
      'cancelada': 'text-secondary'
    };
    return colores[estado] || 'text-muted';
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

  obtenerMensajeEstado(compra: CompraPaqueteCompleta): string {
    switch (compra.estado_compra) {
      case 'pendiente':
        return 'Tu compra está siendo revisada por un administrador';
      case 'validada':
        return compra.asignacion_completada 
          ? 'Compra validada y paquete asignado' 
          : 'Compra validada, pendiente de asignación';
      case 'rechazada':
        return compra.motivo_rechazo || 'Compra rechazada';
      case 'cancelada':
        return 'Compra cancelada';
      default:
        return compra.estado_descripcion;
    }
  }

  mostrarBotonVerComprobante(compra: CompraPaqueteCompleta): boolean {
    return compra.tiene_comprobante;
  }

  mostrarBotonIrAPaquetes(compra: CompraPaqueteCompleta): boolean {
    return compra.estado_compra === 'validada' && compra.asignacion_completada;
  }

  irAPaquetesAsignados(): void {
    this.router.navigate(['/calendario-paquetes']);
  }

  // ===================================
  // GETTERS PARA TEMPLATE
  // ===================================

  get tieneCompras(): boolean {
    return this.misCompras.length > 0;
  }

  get tieneComprasFiltradas(): boolean {
    return this.comprasFiltradas.length > 0;
  }

  get porcentajeValidadas(): number {
    if (this.estadisticasPersonales.total === 0) return 0;
    return Math.round((this.estadisticasPersonales.validadas / this.estadisticasPersonales.total) * 100);
  }
}