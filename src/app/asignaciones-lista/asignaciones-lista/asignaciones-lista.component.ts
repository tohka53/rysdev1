// src/app/components/paquetes/asignaciones-lista/asignaciones-lista.component.ts
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  AsignacionPaquetesService, 
  UsuarioPaquete,
  FiltrosAsignaciones 
} from '../../services/asignacion-paquetes.service';

@Component({
  selector: 'app-asignaciones-lista',
  standalone: false,
  templateUrl: './asignaciones-lista.component.html',
  styleUrls: ['./asignaciones-lista.component.css']
})
export class AsignacionesListaComponent implements OnInit, AfterViewInit {

  // ================================
  // PROPIEDADES
  // ================================
  asignaciones: UsuarioPaquete[] = [];
  asignacionesFiltradas: UsuarioPaquete[] = [];
  cargando = false;
  error: string | null = null;

  // Filtros
  filtros: FiltrosAsignaciones = {};
  terminoBusqueda = '';

  // Opciones para filtros
  estadosDisponibles = [
    { value: '', label: 'Todos los estados' },
    { value: 'activo', label: 'Activos' },
    { value: 'pausado', label: 'Pausados' },
    { value: 'completado', label: 'Completados' },
    { value: 'cancelado', label: 'Cancelados' }
  ];

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;
  totalPaginas = 0;

  // Estadísticas
  estadisticas = {
    total: 0,
    activos: 0,
    completados: 0,
    pausados: 0,
    cancelados: 0
  };

  constructor(
    private asignacionService: AsignacionPaquetesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.verificarParametrosURL();
    this.cargarAsignaciones();
    this.cargarEstadisticas();
  }

  // ================================
  // INICIALIZACIÓN
  // ================================

  private verificarParametrosURL(): void {
    // Verificar si se pasó un filtro específico por parámetro
    const paqueteId = this.route.snapshot.queryParams['paquete_id'];
    const usuarioId = this.route.snapshot.queryParams['usuario_id'];
    const estado = this.route.snapshot.queryParams['estado'];

    if (paqueteId) {
      this.filtros.paquete_id = parseInt(paqueteId);
    }

    if (usuarioId) {
      this.filtros.usuario_id = parseInt(usuarioId);
    }

    if (estado) {
      this.filtros.estado = estado;
    }
  }

  // ================================
  // CARGA DE DATOS
  // ================================

  async cargarAsignaciones(): Promise<void> {
    this.cargando = true;
    this.error = null;

    try {
      this.asignaciones = await this.asignacionService.obtenerAsignaciones(this.filtros);
      this.aplicarFiltrosYPaginacion();
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
      this.error = 'Error al cargar las asignaciones. Por favor, intenta de nuevo.';
    } finally {
      this.cargando = false;
    }
  }

  private async cargarEstadisticas(): Promise<void> {
    try {
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  // ================================
  // FILTROS Y BÚSQUEDA
  // ================================

  aplicarFiltrosYPaginacion(): void {
    let resultado = [...this.asignaciones];

    // Aplicar filtro de búsqueda local
    if (this.terminoBusqueda) {
      const busqueda = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(asignacion => 
        asignacion.usuario?.nombre.toLowerCase().includes(busqueda) ||
        asignacion.usuario?.email.toLowerCase().includes(busqueda) ||
        asignacion.paquete?.nombre.toLowerCase().includes(busqueda)
      );
    }

    this.asignacionesFiltradas = resultado;
    this.calcularPaginacion();
  }

  onFiltroChange(): void {
    this.paginaActual = 1;
    this.cargarAsignaciones();
  }

  onBusquedaChange(): void {
    this.paginaActual = 1;
    this.aplicarFiltrosYPaginacion();
  }

  limpiarFiltros(): void {
    this.filtros = {};
    this.terminoBusqueda = '';
    this.cargarAsignaciones();
  }

  // ================================
  // PAGINACIÓN
  // ================================

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.asignacionesFiltradas.length / this.itemsPorPagina);
  }

  get asignacionesPaginadas(): UsuarioPaquete[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.asignacionesFiltradas.slice(inicio, fin);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  get paginasArray(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  // ================================
  // NAVEGACIÓN
  // ================================

  verDetalle(asignacionId: number): void {
    this.router.navigate(['/paquetes/asignaciones/detalle', asignacionId]);
  }

  verSeguimiento(asignacionId: number): void {
    this.router.navigate(['/paquetes/seguimiento', asignacionId]);
  }

  nuevaAsignacion(): void {
    this.router.navigate(['/paquetes/asignar']);
  }

  // ================================
  // ACCIONES
  // ================================

  async cambiarEstado(asignacion: UsuarioPaquete, nuevoEstado: string): Promise<void> {
    this.cargando = true;
    try {
      const response = await this.asignacionService.actualizarEstadoAsignacion(
        asignacion.id,
        nuevoEstado
      );

      if (response.success) {
        this.mostrarMensajeExito(`Estado cambiado a ${nuevoEstado} exitosamente`);
        await this.cargarAsignaciones();
        await this.cargarEstadisticas();
      } else {
        this.mostrarMensajeError(response.message);
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
      this.mostrarMensajeError('Error al cambiar el estado');
    } finally {
      this.cargando = false;
    }
  }

  // ================================
  // UTILIDADES
  // ================================

  formatearPrecio(precio: number): string {
    return this.asignacionService.formatearPrecio(precio);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT');
  }

  calcularProgreso(asignacion: UsuarioPaquete): number {
    if (asignacion.sesiones_totales === 0) return 0;
    return Math.round((asignacion.sesiones_utilizadas / asignacion.sesiones_totales) * 100);
  }

  calcularDiasRestantes(fechaFin: string): number {
    return this.asignacionService.calcularDiasRestantes(fechaFin);
  }

  obtenerTextoEstado(estado: string): string {
    return this.asignacionService.obtenerEstadoTexto(estado);
  }

  obtenerClaseEstado(estado: string): string {
    return this.asignacionService.obtenerClaseEstado(estado);
  }

  obtenerClaseProgreso(progreso: number): string {
    if (progreso >= 80) return 'bg-green-500';
    if (progreso >= 50) return 'bg-yellow-500';
    if (progreso >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  }

  obtenerIconoTipo(tipo: string): string {
    return tipo === 'terapia' ? '🏥' : '💪';
  }

  // ================================
  // EXPORTACIÓN
  // ================================

  exportarAsignaciones(): void {
    const datosExport = this.asignacionesFiltradas.map(asignacion => ({
      usuario: asignacion.usuario?.nombre,
      email: asignacion.usuario?.email,
      paquete: asignacion.paquete?.nombre,
      tipo: asignacion.paquete?.tipo,
      estado: asignacion.estado,
      fecha_inicio: asignacion.fecha_inicio,
      fecha_fin: asignacion.fecha_fin,
      sesiones_utilizadas: asignacion.sesiones_utilizadas,
      sesiones_totales: asignacion.sesiones_totales,
      progreso: this.calcularProgreso(asignacion) + '%',
      precio_pagado: asignacion.precio_pagado,
      terapeuta: asignacion.terapeuta?.nombre || 'Sin asignar'
    }));

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datosExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `asignaciones_paquetes_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    this.mostrarMensajeExito('Asignaciones exportadas exitosamente');
  }

  // ================================
  // CONTROL DEL MENÚ DE ESTADOS
  // ================================
  mostrandoMenuEstado: number | null = null;

  toggleEstadoMenu(asignacionId: number): void {
    this.mostrandoMenuEstado = this.mostrandoMenuEstado === asignacionId ? null : asignacionId;
  }

  // Cerrar menú al hacer clic fuera
  ngAfterViewInit(): void {
    document.addEventListener('click', (event) => {
      if (this.mostrandoMenuEstado !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          this.mostrandoMenuEstado = null;
        }
      }
    });
  }

  // Exponer Math para usar en el template
  Math = Math;

  // ================================
  // MENSAJES Y NOTIFICACIONES
  // ================================

  private mostrarMensajeExito(mensaje: string): void {
    console.log('Éxito:', mensaje);
    // Aquí puedes implementar un sistema de notificaciones como SweetAlert, Toastr, etc.
  }

  private mostrarMensajeError(mensaje: string): void {
    console.error('Error:', mensaje);
    this.error = mensaje;
    // Aquí puedes implementar un sistema de notificaciones como SweetAlert, Toastr, etc.
  }

  limpiarError(): void {
    this.error = null;
  }
}