// src/app/rutinas-usuarios/rutinas-usuarios.component.ts
import { Component, OnInit } from '@angular/core';
import { RutinasService } from '../../services/rutinas.service';
import { AuthService } from '../../services/auth.service';
import { 
  RutinaAsignadaVista, 
  AsignacionMasivaRequest, 
  ActualizarProgresoRequest,
  Rutina,
  EstadisticasRutinas,
  RespuestaOperacionMasiva
} from '../../interfaces/rutina-profile.interfaces';

@Component({
  selector: 'app-rutinas-usuario',
  templateUrl: './rutinas-usuario.component.html',
  styleUrls: ['./rutinas-usuario.component.css']
})
export class RutinasUsuarioComponent implements OnInit {
  
  // Datos principales
  rutinasAsignadas: RutinaAsignadaVista[] = [];
  rutinasDisponibles: Rutina[] = [];
  usuariosDisponibles: any[] = [];
  estadisticas: EstadisticasRutinas | null = null;
  
  // Estados de la UI
  loading = false;
  error = '';
  successMessage = '';
  
  // Modales
  showAsignacionModal = false;
  showProgresoModal = false;
  showDetalleModal = false;
  
  // Formularios
  asignacionForm: AsignacionMasivaRequest = {
    id_rutina: 0,
    usuarios_ids: [],
    asignado_por: 0,
    fecha_inicio: '',
    fecha_fin: '',
    notas: ''
  };
  
  progresoForm: ActualizarProgresoRequest = {
    seguimiento_id: 0,
    progreso: 0,
    estado: 'pendiente',
    notas: ''
  };
  
  selectedAsignacion: RutinaAsignadaVista | null = null;
  
  // Filtros
  filtroEstado = 'todos';
  filtroTipo = 'todos';
  filtroUsuario = 'todos';
  terminoBusqueda = '';
  
  // Paginación
  paginaActual = 1;
  elementosPorPagina = 10;
  totalPaginas = 0;
  
  // Selección múltiple
  seleccionados: Set<number> = new Set();
  mostrarOpcionesMasivas = false;

  constructor(
    private rutinasService: RutinasService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('RutinasUsuariosComponent inicializado');
    
    // Establecer usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.asignacionForm.asignado_por = currentUser.id;
    }
    
    await this.cargarDatosIniciales();
  }

  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.cargarRutinasAsignadas(),
        this.cargarRutinasDisponibles(),
        this.cargarUsuariosDisponibles(),
        this.cargarEstadisticas()
      ]);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      this.error = 'Error al cargar los datos del sistema';
    } finally {
      this.loading = false;
    }
  }

  async cargarRutinasAsignadas(): Promise<void> {
    try {
      this.rutinasAsignadas = await this.rutinasService.getRutinasAsignadasExpandidas();
      this.calcularPaginacion();
      console.log('Rutinas asignadas cargadas:', this.rutinasAsignadas.length);
    } catch (error) {
      console.error('Error cargando rutinas asignadas:', error);
      throw error;
    }
  }

  async cargarRutinasDisponibles(): Promise<void> {
    try {
      this.rutinasDisponibles = await this.rutinasService.getRutinas();
      console.log('Rutinas disponibles cargadas:', this.rutinasDisponibles.length);
    } catch (error) {
      console.error('Error cargando rutinas disponibles:', error);
      throw error;
    }
  }

  async cargarUsuariosDisponibles(): Promise<void> {
    try {
      this.usuariosDisponibles = await this.rutinasService.getUsuariosDisponibles();
      console.log('Usuarios disponibles cargados:', this.usuariosDisponibles.length);
    } catch (error) {
      console.error('Error cargando usuarios disponibles:', error);
      throw error;
    }
  }

  async cargarEstadisticas(): Promise<void> {
    try {
      this.estadisticas = await this.rutinasService.getEstadisticasRutinas();
      console.log('Estadísticas cargadas:', this.estadisticas);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      throw error;
    }
  }

  // ================================
  // ASIGNACIÓN MASIVA
  // ================================

  abrirModalAsignacion(): void {
    this.resetFormularioAsignacion();
    this.showAsignacionModal = true;
  }

  cerrarModalAsignacion(): void {
    this.showAsignacionModal = false;
    this.resetFormularioAsignacion();
  }

  resetFormularioAsignacion(): void {
    const currentUser = this.authService.getCurrentUser();
    this.asignacionForm = {
      id_rutina: 0,
      usuarios_ids: [],
      asignado_por: currentUser?.id || 0,
      fecha_inicio: this.formatearFechaParaInput(new Date()),
      fecha_fin: this.formatearFechaParaInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      notas: ''
    };
    this.error = '';
    this.successMessage = '';
  }

  toggleUsuarioSeleccionado(userId: number): void {
    const index = this.asignacionForm.usuarios_ids.indexOf(userId);
    if (index > -1) {
      this.asignacionForm.usuarios_ids.splice(index, 1);
    } else {
      this.asignacionForm.usuarios_ids.push(userId);
    }
  }

  isUsuarioSeleccionado(userId: number): boolean {
    return this.asignacionForm.usuarios_ids.includes(userId);
  }

  async confirmarAsignacion(): Promise<void> {
    try {
      this.error = '';
      this.successMessage = '';

      // Validaciones
      if (!this.asignacionForm.id_rutina) {
        this.error = 'Debe seleccionar una rutina';
        return;
      }

      if (this.asignacionForm.usuarios_ids.length === 0) {
        this.error = 'Debe seleccionar al menos un usuario';
        return;
      }

      if (!this.asignacionForm.fecha_inicio || !this.asignacionForm.fecha_fin) {
        this.error = 'Las fechas de inicio y fin son requeridas';
        return;
      }

      if (new Date(this.asignacionForm.fecha_fin) <= new Date(this.asignacionForm.fecha_inicio)) {
        this.error = 'La fecha de fin debe ser posterior a la fecha de inicio';
        return;
      }

      this.loading = true;
      
      const asignacionId = await this.rutinasService.asignarRutinaMasiva(this.asignacionForm);
      
      this.successMessage = `Rutina asignada exitosamente a ${this.asignacionForm.usuarios_ids.length} usuarios`;
      
      // Actualizar datos
      await this.cargarDatosIniciales();
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        this.cerrarModalAsignacion();
      }, 1500);
      
    } catch (error) {
      console.error('Error en asignación masiva:', error);
      this.error = 'Error al asignar la rutina. Intente nuevamente.';
    } finally {
      this.loading = false;
    }
  }

  // ================================
  // GESTIÓN DE PROGRESO
  // ================================

  abrirModalProgreso(asignacion: RutinaAsignadaVista): void {
    this.selectedAsignacion = asignacion;
    this.progresoForm = {
      seguimiento_id: asignacion.seguimiento_id,
      progreso: asignacion.progreso,
      //estado: asignacion.estado_individual,
      notas: asignacion.notas_individuales || ''
    };
    this.showProgresoModal = true;
  }

  cerrarModalProgreso(): void {
    this.showProgresoModal = false;
    this.selectedAsignacion = null;
    this.error = '';
    this.successMessage = '';
  }

  async actualizarProgreso(): Promise<void> {
    try {
      this.error = '';
      this.loading = true;

      await this.rutinasService.actualizarProgresoUsuario(
        this.progresoForm.seguimiento_id,
        this.progresoForm.progreso,
        this.progresoForm.estado,
        this.progresoForm.notas
      );

      this.successMessage = 'Progreso actualizado exitosamente';
      await this.cargarDatosIniciales();
      
      setTimeout(() => {
        this.cerrarModalProgreso();
      }, 1000);

    } catch (error) {
      console.error('Error actualizando progreso:', error);
      this.error = 'Error al actualizar el progreso';
    } finally {
      this.loading = false;
    }
  }

  async abandonarRutina(asignacion: RutinaAsignadaVista): Promise<void> {
    const motivo = prompt('Motivo del abandono (opcional):');
    if (motivo !== null) { // null significa que canceló
      try {
        await this.rutinasService.abandonarRutina(asignacion.seguimiento_id, motivo);
        this.successMessage = 'Rutina marcada como abandonada';
        await this.cargarDatosIniciales();
      } catch (error) {
        console.error('Error abandonando rutina:', error);
        this.error = 'Error al abandonar la rutina';
      }
    }
  }

  // ================================
  // FILTROS Y BÚSQUEDA
  // ================================

  aplicarFiltros(): void {
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroTipo = 'todos';
    this.filtroUsuario = 'todos';
    this.terminoBusqueda = '';
    this.aplicarFiltros();
  }

  getRutinasFiltradas(): RutinaAsignadaVista[] {
    let rutinas = [...this.rutinasAsignadas];

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      rutinas = rutinas.filter(r => r.estado_individual === this.filtroEstado);
    }

    // Filtro por tipo
    if (this.filtroTipo !== 'todos') {
      rutinas = rutinas.filter(r => r.rutina_tipo === this.filtroTipo);
    }

    // Filtro por usuario
    if (this.filtroUsuario !== 'todos') {
      rutinas = rutinas.filter(r => r.id_profile.toString() === this.filtroUsuario);
    }

    // Búsqueda por texto
    if (this.terminoBusqueda) {
      const termino = this.terminoBusqueda.toLowerCase();
      rutinas = rutinas.filter(r => 
        r.rutina_nombre.toLowerCase().includes(termino) ||
        r.full_name.toLowerCase().includes(termino) ||
        r.username.toLowerCase().includes(termino)
      );
    }

    return rutinas;
  }

  getRutinasPaginadas(): RutinaAsignadaVista[] {
    const rutinas = this.getRutinasFiltradas();
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return rutinas.slice(inicio, fin);
  }

  calcularPaginacion(): void {
    const totalRutinas = this.getRutinasFiltradas().length;
    this.totalPaginas = Math.ceil(totalRutinas / this.elementosPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  // ================================
  // SELECCIÓN MÚLTIPLE
  // ================================

  toggleSeleccion(seguimientoId: number): void {
    if (this.seleccionados.has(seguimientoId)) {
      this.seleccionados.delete(seguimientoId);
    } else {
      this.seleccionados.add(seguimientoId);
    }
    this.mostrarOpcionesMasivas = this.seleccionados.size > 0;
  }

  seleccionarTodos(): void {
    const rutinas = this.getRutinasPaginadas();
    rutinas.forEach(r => this.seleccionados.add(r.seguimiento_id));
    this.mostrarOpcionesMasivas = this.seleccionados.size > 0;
  }

  limpiarSeleccion(): void {
    this.seleccionados.clear();
    this.mostrarOpcionesMasivas = false;
  }

  async actualizarProgresoMasivo(): Promise<void> {
    const progreso = prompt('Ingrese el progreso a aplicar (0-100):');
    if (progreso !== null) {
      const progresoNumerico = parseInt(progreso);
      if (progresoNumerico >= 0 && progresoNumerico <= 100) {
        try {
          const ids = Array.from(this.seleccionados);
          const resultado = await this.rutinasService.actualizarProgresoMasivo(ids, progresoNumerico);
          this.successMessage = `Progreso actualizado: ${resultado.exitosas} exitosas, ${resultado.fallidas} fallidas`;
          this.limpiarSeleccion();
          await this.cargarDatosIniciales();
        } catch (error) {
          this.error = 'Error en actualización masiva';
        }
      } else {
        this.error = 'El progreso debe ser un número entre 0 y 100';
      }
    }
  }

  // ================================
  // UTILIDADES
  // ================================

  formatearFecha(fecha: string): string {
    return this.rutinasService.formatearFecha(fecha);
  }

  formatearFechaParaInput(fecha: Date): string {
    return fecha.toISOString().split('T')[0];
  }

  getColorEstado(estado: string): string {
    return this.rutinasService.getColorEstado(estado);
  }

  getIconoEstado(estado: string): string {
    return this.rutinasService.getIconoEstado(estado);
  }

  getColorEstadoTemporal(estadoTemporal: string): string {
    return this.rutinasService.getColorEstadoTemporal(estadoTemporal);
  }

  calcularDiasRestantes(fechaFin: string): number {
    return this.rutinasService.calcularDiasRestantes(fechaFin);
  }

  async refrescarDatos(): Promise<void> {
    await this.cargarDatosIniciales();
  }

  // ================================
  // PERMISOS
  // ================================

  puedeAsignarRutinas(): boolean {
    return this.authService.isAdmin() || this.authService.hasProfile(3); // Admin o Supervisor
  }

  puedeEditarProgreso(): boolean {
    return this.authService.isAdmin() || this.authService.hasProfile(3); // Admin o Supervisor
  }

  puedeVerEstadisticas(): boolean {
    return this.authService.isAuthenticated();
  }

  // ================================
  // TRACKBY FUNCTIONS
  // ================================

  trackByAsignacionId(index: number, item: RutinaAsignadaVista): number {
    return item.seguimiento_id;
  }

  trackByUsuarioId(index: number, item: any): number {
    return item.id;
  }

  trackByRutinaId(index: number, item: Rutina): number {
    return item.id || index;
  }

  // ================================
  // EXPORTACIÓN
  // ================================

  async exportarReporte(): Promise<void> {
    try {
      const reporte = await this.rutinasService.exportarReporteCompleto(this.rutinasAsignadas);
      
      const blob = new Blob([reporte], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_rutinas_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exportando reporte:', error);
      this.error = 'Error al exportar el reporte';
    }
  }

  async exportarCSV(): Promise<void> {
    try {
      const datosExportacion = this.rutinasService.prepararDatosParaExportacion(this.rutinasAsignadas);
      const csv = this.rutinasService.convertirACSV(datosExportacion);
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rutinas_asignadas_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exportando CSV:', error);
      this.error = 'Error al exportar el CSV';
    }
  }

  // ================================
  // GETTERS PARA ESTADÍSTICAS
  // ================================

  get porcentajeCompletadas(): number {
    if (!this.estadisticas || this.estadisticas.total_asignaciones === 0) return 0;
    return Math.round((this.estadisticas.completadas / this.estadisticas.total_asignaciones) * 100);
  }

  get porcentajeEnProgreso(): number {
    if (!this.estadisticas || this.estadisticas.total_asignaciones === 0) return 0;
    return Math.round((this.estadisticas.en_progreso / this.estadisticas.total_asignaciones) * 100);
  }

  get progresoPromedio(): number {
    return this.estadisticas?.promedio_progreso || 0;
  }

  get totalAsignaciones(): number {
    return this.estadisticas?.total_asignaciones || 0;
  }

  get rutinasVigentes(): number {
    return this.estadisticas?.vigentes || 0;
  }

  get rutinasVencidas(): number {
    return this.estadisticas?.vencidas || 0;
  }
}