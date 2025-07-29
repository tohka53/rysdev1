// src/app/components/paquetes/paquetes.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaquetesService } from '../../services/paquetes.service';
import { 
  Paquete, 
  FiltrosPaquetes, 
  TIPOS_PAQUETE 
} from '../../interfaces/paquetes.interfaces';

@Component({
  selector: 'app-paquetes',
  standalone: false,
  
  templateUrl: './paquetes.component.html',
  styleUrls: ['./paquetes.component.css']
})
export class PaquetesComponent implements OnInit {

  // ================================
  // PROPIEDADES
  // ================================
  paquetes: Paquete[] = [];
  paquetesFiltrados: Paquete[] = [];
  cargando = false;
  error: string | null = null;

  // Filtros
  filtros: FiltrosPaquetes = {
    tipo: 'todos',
    status: 1,
    busqueda: ''
  };

  // Opciones para selectores
  tiposPaquete = [
    { value: 'todos', label: 'Todos los tipos' },
    ...TIPOS_PAQUETE
  ];

  statusOptions = [
    { value: 1, label: 'Activos' },
    { value: 0, label: 'Inactivos' },
    { value: undefined, label: 'Todos' }
  ];

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;
  totalPaginas = 0;

  // Modal de confirmación
  mostrarModalEliminar = false;
  paqueteAEliminar: Paquete | null = null;
Math: any;

  constructor(
    private paquetesService: PaquetesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPaquetes();
  }

  // ================================
  // CARGA DE DATOS
  // ================================

  async cargarPaquetes(): Promise<void> {
    this.cargando = true;
    this.error = null;

    try {
      this.paquetes = await this.paquetesService.obtenerPaquetes(this.filtros);
      this.aplicarFiltrosYPaginacion();
    } catch (error) {
      console.error('Error cargando paquetes:', error);
      this.error = 'Error al cargar los paquetes. Por favor, intenta de nuevo.';
    } finally {
      this.cargando = false;
    }
  }

  // ================================
  // FILTROS Y BÚSQUEDA
  // ================================

  aplicarFiltrosYPaginacion(): void {
    let resultado = [...this.paquetes];

    // Aplicar filtro de búsqueda local adicional si es necesario
    if (this.filtros.busqueda) {
      const busqueda = this.filtros.busqueda.toLowerCase();
      resultado = resultado.filter(paquete => 
        paquete.nombre.toLowerCase().includes(busqueda) ||
        (paquete.descripcion && paquete.descripcion.toLowerCase().includes(busqueda))
      );
    }

    this.paquetesFiltrados = resultado;
    this.calcularPaginacion();
  }

  onFiltroChange(): void {
    this.paginaActual = 1;
    this.cargarPaquetes();
  }

  onBusquedaChange(): void {
    this.paginaActual = 1;
    this.aplicarFiltrosYPaginacion();
  }

  limpiarFiltros(): void {
    this.filtros = {
      tipo: 'todos',
      status: 1,
      busqueda: ''
    };
    this.cargarPaquetes();
  }

  // ================================
  // PAGINACIÓN
  // ================================

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.paquetesFiltrados.length / this.itemsPorPagina);
  }

  get paquetesPaginados(): Paquete[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.paquetesFiltrados.slice(inicio, fin);
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

  irACrear(): void {
    this.router.navigate(['/paquetes/crear']);
  }

  irAEditar(id: number): void {
    this.router.navigate(['/paquetes/editar', id]);
  }

  verDetalle(id: number): void {
    this.router.navigate(['/paquetes/detalle', id]);
  }

  // ================================
  // ACCIONES CRUD
  // ================================

  confirmarEliminacion(paquete: Paquete): void {
    this.paqueteAEliminar = paquete;
    this.mostrarModalEliminar = true;
  }

  cancelarEliminacion(): void {
    this.mostrarModalEliminar = false;
    this.paqueteAEliminar = null;
  }

  async eliminarPaquete(): Promise<void> {
    if (!this.paqueteAEliminar) return;

    this.cargando = true;
    try {
      const response = await this.paquetesService.eliminarPaquete(this.paqueteAEliminar.id!);
      
      if (response.success) {
        await this.cargarPaquetes();
        this.mostrarMensajeExito('Paquete eliminado exitosamente');
      } else {
        this.mostrarMensajeError(response.message);
      }
    } catch (error) {
      console.error('Error eliminando paquete:', error);
      this.mostrarMensajeError('Error al eliminar el paquete');
    } finally {
      this.cargando = false;
      this.cancelarEliminacion();
    }
  }

  async toggleStatus(paquete: Paquete): Promise<void> {
    this.cargando = true;
    try {
      const response = paquete.status === 1 
        ? await this.paquetesService.eliminarPaquete(paquete.id!)
        : await this.paquetesService.activarPaquete(paquete.id!);
      
      if (response.success) {
        await this.cargarPaquetes();
        const accion = paquete.status === 1 ? 'desactivado' : 'activado';
        this.mostrarMensajeExito(`Paquete ${accion} exitosamente`);
      } else {
        this.mostrarMensajeError(response.message);
      }
    } catch (error) {
      console.error('Error cambiando status:', error);
      this.mostrarMensajeError('Error al cambiar el estado del paquete');
    } finally {
      this.cargando = false;
    }
  }

  // ================================
  // UTILIDADES
  // ================================

  formatearPrecio(precio: number): string {
    return this.paquetesService.formatearPrecio(precio);
  }

  obtenerClaseStatus(status: number): string {
    return status === 1 ? 'badge badge-success' : 'badge badge-secondary';
  }

  obtenerTextoStatus(status: number): string {
    return status === 1 ? 'Activo' : 'Inactivo';
  }

  obtenerClaseTipo(tipo: string): string {
    return tipo === 'terapia' ? 'badge badge-info' : 'badge badge-warning';
  }

  private mostrarMensajeExito(mensaje: string): void {
    // Implementar notificación de éxito
    console.log('Éxito:', mensaje);
  }

  private mostrarMensajeError(mensaje: string): void {
    // Implementar notificación de error
    console.error('Error:', mensaje);
    this.error = mensaje;
  }
}