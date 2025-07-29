// src/app/components/paquetes/paquete-detalle/paquete-detalle.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaquetesService } from '../../services/paquetes.service';
import { Paquete } from '../../interfaces/paquetes.interfaces';

@Component({
  selector: 'app-paquete-detalle',
  standalone: false,
  templateUrl: './paquete-detalle.component.html',
  styleUrls: ['./paquete-detalle.component.css']
})
export class PaqueteDetalleComponent implements OnInit {

  // ================================
  // PROPIEDADES
  // ================================
  paquete: Paquete | null = null;
  cargando = false;
  error: string | null = null;
  paqueteId: number;

  // Estados del componente
  mostrarModalEliminar = false;
  mostrarModalActivar = false;
  procesandoAccion = false;

  // Datos calculados
  ahorroTotal = 0;
  preciosPorSesion = {
    base: 0,
    final: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paquetesService: PaquetesService
  ) {
    this.paqueteId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
  }

  ngOnInit(): void {
    if (this.paqueteId > 0) {
      this.cargarPaquete();
    } else {
      this.error = 'ID de paquete inválido';
    }
  }

  // ================================
  // CARGA DE DATOS
  // ================================

  async cargarPaquete(): Promise<void> {
    this.cargando = true;
    this.error = null;

    try {
      this.paquete = await this.paquetesService.obtenerPaquetePorId(this.paqueteId);
      
      if (!this.paquete) {
        this.error = 'Paquete no encontrado';
      } else {
        this.calcularDatosAdicionales();
      }
    } catch (error) {
      console.error('Error cargando paquete:', error);
      this.error = 'Error al cargar el paquete. Por favor, intenta de nuevo.';
    } finally {
      this.cargando = false;
    }
  }

  private calcularDatosAdicionales(): void {
    if (!this.paquete) return;

    // Calcular ahorro total
    this.ahorroTotal = this.paquete.precio - (this.paquete.precio_final || this.paquete.precio);

    // Calcular precios por sesión
    this.preciosPorSesion = {
      base: this.paquete.precio / this.paquete.cantidad_sesiones,
      final: (this.paquete.precio_final || this.paquete.precio) / this.paquete.cantidad_sesiones
    };
  }

  // ================================
  // NAVEGACIÓN
  // ================================

  irAEditar(): void {
    this.router.navigate(['/paquetes/editar', this.paqueteId]);
  }

  volver(): void {
    this.router.navigate(['/paquetes']);
  }

  irALista(): void {
    this.router.navigate(['/paquetes']);
  }

  // ================================
  // ACCIONES DEL PAQUETE
  // ================================

  confirmarEliminacion(): void {
    this.mostrarModalEliminar = true;
  }

  cancelarEliminacion(): void {
    this.mostrarModalEliminar = false;
  }

  async eliminarPaquete(): Promise<void> {
    if (!this.paquete) return;

    this.procesandoAccion = true;
    try {
      const response = await this.paquetesService.eliminarPaquete(this.paquete.id!);
      
      if (response.success) {
        this.mostrarMensajeExito('Paquete eliminado exitosamente');
        setTimeout(() => {
          this.volver();
        }, 1500);
      } else {
        this.mostrarMensajeError(response.message);
      }
    } catch (error) {
      console.error('Error eliminando paquete:', error);
      this.mostrarMensajeError('Error al eliminar el paquete');
    } finally {
      this.procesandoAccion = false;
      this.cancelarEliminacion();
    }
  }

  confirmarActivacion(): void {
    this.mostrarModalActivar = true;
  }

  cancelarActivacion(): void {
    this.mostrarModalActivar = false;
  }

  async activarPaquete(): Promise<void> {
    if (!this.paquete) return;

    this.procesandoAccion = true;
    try {
      const response = await this.paquetesService.activarPaquete(this.paquete.id!);
      
      if (response.success) {
        this.mostrarMensajeExito('Paquete activado exitosamente');
        await this.cargarPaquete(); // Recargar para mostrar el nuevo estado
      } else {
        this.mostrarMensajeError(response.message);
      }
    } catch (error) {
      console.error('Error activando paquete:', error);
      this.mostrarMensajeError('Error al activar el paquete');
    } finally {
      this.procesandoAccion = false;
      this.cancelarActivacion();
    }
  }

  async toggleStatus(): Promise<void> {
    if (!this.paquete) return;

    if (this.paquete.status === 1) {
      this.confirmarEliminacion();
    } else {
      this.confirmarActivacion();
    }
  }

  // ================================
  // UTILIDADES DE FORMATO
  // ================================

  formatearPrecio(precio: number): string {
    return this.paquetesService.formatearPrecio(precio);
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  formatearFechaCorta(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // ================================
  // CLASES CSS DINÁMICAS
  // ================================

  obtenerClaseStatus(status: number): string {
    return status === 1 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  }

  obtenerTextoStatus(status: number): string {
    return status === 1 ? 'Activo' : 'Inactivo';
  }

  obtenerIconoStatus(status: number): string {
    return status === 1 ? '✓' : '✗';
  }

  obtenerClaseTipo(tipo: string): string {
    return tipo === 'terapia' 
      ? 'bg-blue-100 text-blue-800 border-blue-200' 
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }

  obtenerIconoTipo(tipo: string): string {
    return tipo === 'terapia' ? '🏥' : '💪';
  }

  // ================================
  // GETTERS COMPUTADOS
  // ================================

  get tieneDescuento(): boolean {
    return (this.paquete?.descuento || 0) > 0;
  }

  get esPaqueteActivo(): boolean {
    return this.paquete?.status === 1;
  }

  get porcentajeAhorro(): number {
    if (!this.paquete || this.paquete.precio === 0) return 0;
    return (this.ahorroTotal / this.paquete.precio) * 100;
  }

  get informacionResumida(): any {
    if (!this.paquete) return null;

    return {
      sesiones: this.paquete.cantidad_sesiones,
      tipo: this.paquete.tipo,
      precio_base: this.paquete.precio,
      precio_final: this.paquete.precio_final || this.paquete.precio,
      descuento: this.paquete.descuento,
      precio_por_sesion: this.preciosPorSesion.final,
      ahorro_total: this.ahorroTotal,
      estado: this.paquete.status
    };
  }

  // ================================
  // ACCIONES ADICIONALES
  // ================================

  duplicarPaquete(): void {
    if (!this.paquete) return;

    // Navegar al formulario de creación con datos prellenados
    this.router.navigate(['/paquetes/crear'], {
      queryParams: {
        duplicar: this.paquete.id,
        nombre: `Copia de ${this.paquete.nombre}`,
        tipo: this.paquete.tipo,
        precio: this.paquete.precio,
        sesiones: this.paquete.cantidad_sesiones,
        descuento: this.paquete.descuento
      }
    });
  }

  imprimirPaquete(): void {
    window.print();
  }

  exportarPaquete(): void {
    if (!this.paquete) return;

    const datosExport = {
      ...this.paquete,
      precio_por_sesion: this.preciosPorSesion.final,
      ahorro_total: this.ahorroTotal,
      exportado_en: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datosExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `paquete_${this.paquete.id}_${this.paquete.nombre.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  compartirPaquete(): void {
    if (!this.paquete) return;

    if (navigator.share) {
      navigator.share({
        title: this.paquete.nombre,
        text: `${this.paquete.descripcion || 'Paquete de ' + this.paquete.tipo}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.mostrarMensajeExito('Enlace copiado al portapapeles');
      });
    }
  }

  // ================================
  // MENSAJES Y NOTIFICACIONES
  // ================================

  private mostrarMensajeExito(mensaje: string): void {
    // Implementar notificación de éxito
    console.log('Éxito:', mensaje);
    // Aquí puedes integrar una librería de notificaciones como ngx-toastr
  }

  private mostrarMensajeError(mensaje: string): void {
    // Implementar notificación de error
    console.error('Error:', mensaje);
    this.error = mensaje;
    // Aquí puedes integrar una librería de notificaciones como ngx-toastr
  }

  private mostrarMensajeInfo(mensaje: string): void {
    // Implementar notificación informativa
    console.info('Info:', mensaje);
  }

  // ================================
  // LIMPIAR ERRORES
  // ================================

  limpiarError(): void {
    this.error = null;
  }

  // ================================
  // LIFECYCLE HOOKS
  // ================================

  ngOnDestroy(): void {
    // Limpiar cualquier suscripción o timer si es necesario
    this.cancelarEliminacion();
    this.cancelarActivacion();
  }
}