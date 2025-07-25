// src/app/mis-terapias/mis-terapias.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { 
  TerapiaAsignadaUsuario as SeguimientoTerapiaDetallado, 
  EstadisticasTerapias as EstadisticasTerapiasPersonales
} from '../../interfaces/terapias.interfaces';

// Interfaces locales para este componente
interface FiltrosMisTerapias {
  busqueda?: string;
  estado_temporal?: 'all' | 'vigente' | 'pendiente' | 'vencida';
  estado_individual?: 'all' | 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
  tipo_terapia?: 'all' | 'fisica' | 'ocupacional' | 'respiratoria' | 'neurologica';
  nivel?: 'all' | 'principiante' | 'intermedio' | 'avanzado';
}

interface FormularioProgresoTerapia {
  progreso: number;
  estado: string;
  notas: string;
  sesiones_completadas?: number;
  adherencia_porcentaje?: number;
  nivel_dolor_actual?: number;
  nivel_funcionalidad_actual?: number;
}

import { TerapiasService } from '../../services/terapias.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mis-terapias',
  standalone: false,
  templateUrl: './mis-terapias.component.html',
  styleUrls: ['./mis-terapias.component.css']
})
export class MisTerapiasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Datos principales
  terapias: SeguimientoTerapiaDetallado[] = [];
  terapiasFiltradas: SeguimientoTerapiaDetallado[] = [];
  estadisticasPersonales?: EstadisticasTerapiasPersonales;
  
  // Control de UI
  loading = false;
  updating = false;
  error = '';
  showViewModal = false;
  showProgresoModal = false;
  selectedViewTerapia: SeguimientoTerapiaDetallado | null = null;
  selectedProgresoTerapia: SeguimientoTerapiaDetallado | null = null;
  copySuccess = false;

  // Sistema de notificaciones
  mensaje: string = '';
  tipoMensaje: 'success' | 'error' | 'info' | 'warning' = 'info';
  mostrarMensaje = false;

  // Filtros
  filtros: FiltrosMisTerapias = {
    busqueda: '',
    estado_temporal: 'all',
    estado_individual: 'all',
    tipo_terapia: 'all',
    nivel: 'all'
  };

  // Formulario de progreso
  progresoForm: FormularioProgresoTerapia = {
    progreso: 0,
    estado: 'pendiente',
    notas: '',
    sesiones_completadas: 0,
    adherencia_porcentaje: 0,
    nivel_dolor_actual: 0,
    nivel_funcionalidad_actual: 0
  };

  constructor(
    private terapiasService: TerapiasService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.cargarMisTerapias(),
      this.cargarEstadisticasPersonales()
    ]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== CARGA DE DATOS =====
  async cargarMisTerapias(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      console.log('Cargando terapias asignadas al usuario...');
      
      // Usar el servicio existente
      this.terapias = await this.terapiasService.getTerapiasAsignadasUsuarios();
      
      // Transformar y calcular estados si es necesario
      this.terapias = this.terapias.map(terapia => {
        // Calcular estado temporal y días restantes si no vienen calculados
        const { estado, diasRestantes } = this.calcularEstadoTemporal(
          terapia.fecha_inicio_programada instanceof Date ? terapia.fecha_inicio_programada.toISOString() : terapia.fecha_inicio_programada,
          terapia.fecha_fin_programada instanceof Date ? terapia.fecha_fin_programada.toISOString() : terapia.fecha_fin_programada
        );
        
        return {
          ...terapia,
          estado_temporal: terapia.estado_temporal || estado,
          dias_restantes: terapia.dias_restantes !== undefined ? terapia.dias_restantes : diasRestantes
        };
      });
      
      this.terapiasFiltradas = [...this.terapias];
      this.aplicarFiltros();
      
      console.log('Mis terapias cargadas:', this.terapias.length);
    } catch (error) {
      console.error('Error cargando mis terapias:', error);
      this.error = 'Error al cargar tus terapias asignadas';
      this.terapias = [];
      this.terapiasFiltradas = [];
    } finally {
      this.loading = false;
    }
  }

  async cargarEstadisticasPersonales(): Promise<void> {
    try {
      if (this.terapias.length === 0) return;

      const total = this.terapias.length;
      const vigentes = this.terapias.filter(t => t.estado_temporal === 'vigente').length;
      const completadas = this.terapias.filter(t => t.estado_individual === 'completada').length;
      const enProgreso = this.terapias.filter(t => t.estado_individual === 'en_progreso').length;
      const pendientes = this.terapias.filter(t => t.estado_individual === 'pendiente').length;
      const vencidas = this.terapias.filter(t => t.estado_temporal === 'vencida').length;
      
      const progresoTotal = this.terapias.reduce((sum, t) => sum + t.progreso, 0);
      const progresoPromedio = total > 0 ? Math.round(progresoTotal / total) : 0;

      this.estadisticasPersonales = {
        total_asignaciones: total,
        asignaciones_activas: vigentes,
        asignaciones_grupales: 0,
        asignaciones_individuales: total,
        usuarios_con_terapias: 1,
        terapias_mas_asignadas: 0,
        promedio_progreso: progresoPromedio,
        promedio_adherencia: 0,
        sesiones_totales_completadas: 0,
        sesiones_totales_programadas: 0
      };
    } catch (error) {
      console.error('Error calculando estadísticas personales:', error);
    }
  }

  // ===== GESTIÓN DE MODALES =====
  async openViewModal(seguimiento: SeguimientoTerapiaDetallado): Promise<void> {
    console.log('Abriendo modal para ver terapia:', seguimiento.terapia_nombre);
    
    this.selectedViewTerapia = seguimiento;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    console.log('Cerrando modal de vista');
    this.showViewModal = false;
    this.selectedViewTerapia = null;
    this.copySuccess = false;
  }

  openProgresoModal(seguimiento: SeguimientoTerapiaDetallado): void {
    console.log('Abriendo modal de progreso para:', seguimiento.terapia_nombre);
    
    this.selectedProgresoTerapia = seguimiento;
    this.progresoForm = {
      progreso: seguimiento.progreso || 0,
      estado: seguimiento.estado_individual || 'pendiente',
      notas: seguimiento.notas_individuales || '',
      sesiones_completadas: seguimiento.sesiones_completadas || 0,
      adherencia_porcentaje: seguimiento.adherencia_porcentaje || 0,
      nivel_dolor_actual: seguimiento.nivel_dolor_actual || 0,
      nivel_funcionalidad_actual: seguimiento.nivel_funcionalidad_actual || 0
    };
    
    this.showProgresoModal = true;
  }

  closeProgresoModal(): void {
    console.log('Cerrando modal de progreso');
    this.showProgresoModal = false;
    this.selectedProgresoTerapia = null;
    this.resetProgresoForm();
  }

  resetProgresoForm(): void {
    this.progresoForm = {
      progreso: 0,
      estado: 'pendiente',
      notas: '',
      sesiones_completadas: 0,
      adherencia_porcentaje: 0,
      nivel_dolor_actual: 0,
      nivel_funcionalidad_actual: 0
    };
  }

  // ===== ACTUALIZACIÓN DE PROGRESO =====
  actualizarMiProgreso(seguimiento: SeguimientoTerapiaDetallado, nuevoProgreso: number): Promise<void> {
    return this.terapiasService.actualizarProgresoTerapia(
      seguimiento.seguimiento_id,
      {
        progreso: nuevoProgreso,
        estado_individual: this.determinarEstadoPorProgreso(nuevoProgreso),
        sesiones_completadas: seguimiento.sesiones_completadas || 0,
        adherencia_porcentaje: seguimiento.adherencia_porcentaje || 0,
        nivel_dolor_actual: seguimiento.nivel_dolor_actual || 0,
        nivel_funcionalidad_actual: seguimiento.nivel_funcionalidad_actual || 0,
        notas_individuales: seguimiento.notas_individuales || ''
      }
    ).then(success => {
      if (success) {
        // Actualizar localmente
        seguimiento.progreso = nuevoProgreso;
        seguimiento.estado_individual = this.determinarEstadoPorProgreso(nuevoProgreso);
        
        // Actualizar fechas si es necesario
        if (nuevoProgreso > 0 && !seguimiento.fecha_inicio_real) {
          seguimiento.fecha_inicio_real = new Date().toISOString().split('T')[0] as any;
        }
        if (nuevoProgreso === 100) {
          seguimiento.estado_individual = 'completada';
          seguimiento.fecha_fin_real = new Date().toISOString().split('T')[0] as any;
        }

        // Recalcular estadísticas
        this.cargarEstadisticasPersonales();
        this.mostrarNotificacion('Progreso actualizado correctamente', 'success');
      }
    }).catch(error => {
      console.error('Error actualizando progreso:', error);
      this.error = 'Error al actualizar el progreso';
      setTimeout(() => this.error = '', 5000);
    });
  }

  async actualizarProgreso(): Promise<void> {
    if (!this.selectedProgresoTerapia) {
      this.mostrarNotificacion('No hay terapia seleccionada', 'error');
      return;
    }

    try {
      this.updating = true;

      const success = await this.terapiasService.actualizarProgresoTerapia(
        this.selectedProgresoTerapia.seguimiento_id,
        {
          progreso: this.progresoForm.progreso,
          estado_individual: this.progresoForm.estado,
          sesiones_completadas: this.progresoForm.sesiones_completadas || 0,
          adherencia_porcentaje: this.progresoForm.adherencia_porcentaje || 0,
          nivel_dolor_actual: this.progresoForm.nivel_dolor_actual || 0,
          nivel_funcionalidad_actual: this.progresoForm.nivel_funcionalidad_actual || 0,
          notas_individuales: this.progresoForm.notas
        }
      );

      if (success) {
        this.mostrarNotificacion('Progreso actualizado correctamente', 'success');
        
        // Actualizar el seguimiento local
        const index = this.terapias.findIndex(t => 
          t.seguimiento_id === this.selectedProgresoTerapia!.seguimiento_id
        );
        
        if (index !== -1) {
          this.terapias[index] = {
            ...this.terapias[index],
            progreso: this.progresoForm.progreso,
            estado_individual: this.progresoForm.estado,
            notas_individuales: this.progresoForm.notas,
            sesiones_completadas: this.progresoForm.sesiones_completadas || 0,
            adherencia_porcentaje: this.progresoForm.adherencia_porcentaje || 0,
            nivel_dolor_actual: this.progresoForm.nivel_dolor_actual || 0,
            nivel_funcionalidad_actual: this.progresoForm.nivel_funcionalidad_actual || 0
          };
        }

        this.aplicarFiltros();
        this.cargarEstadisticasPersonales();
        this.closeProgresoModal();
        
      } else {
        this.mostrarNotificacion('Error al actualizar el progreso', 'error');
      }

    } catch (error) {
      console.error('Error actualizando progreso:', error);
      this.mostrarNotificacion('Error al actualizar el progreso', 'error');
    } finally {
      this.updating = false;
    }
  }

  // ===== FILTROS =====
  aplicarFiltros(): void {
    let resultado = [...this.terapias];

    // Filtro por búsqueda
    if (this.filtros.busqueda?.trim()) {
      const busqueda = this.filtros.busqueda.toLowerCase().trim();
      resultado = resultado.filter(t => 
        t.terapia_nombre.toLowerCase().includes(busqueda) ||
        (t.terapia_descripcion && t.terapia_descripcion.toLowerCase().includes(busqueda))
      );
    }

    // Filtro por estado temporal
    if (this.filtros.estado_temporal && this.filtros.estado_temporal !== 'all') {
      resultado = resultado.filter(t => t.estado_temporal === this.filtros.estado_temporal);
    }

    // Filtro por estado individual
    if (this.filtros.estado_individual && this.filtros.estado_individual !== 'all') {
      resultado = resultado.filter(t => t.estado_individual === this.filtros.estado_individual);
    }

    // Filtro por tipo de terapia
    if (this.filtros.tipo_terapia && this.filtros.tipo_terapia !== 'all') {
      resultado = resultado.filter(t => t.terapia_tipo === this.filtros.tipo_terapia);
    }

    // Filtro por nivel
    if (this.filtros.nivel && this.filtros.nivel !== 'all') {
      resultado = resultado.filter(t => t.terapia_nivel === this.filtros.nivel);
    }

    this.terapiasFiltradas = resultado;
  }

  hayFiltrosActivos(): boolean {
    return !!(
      this.filtros.busqueda?.trim() ||
      (this.filtros.estado_temporal && this.filtros.estado_temporal !== 'all') ||
      (this.filtros.estado_individual && this.filtros.estado_individual !== 'all') ||
      (this.filtros.tipo_terapia && this.filtros.tipo_terapia !== 'all') ||
      (this.filtros.nivel && this.filtros.nivel !== 'all')
    );
  }

  limpiarFiltros(): void {
    this.filtros = {
      busqueda: '',
      estado_temporal: 'all',
      estado_individual: 'all',
      tipo_terapia: 'all',
      nivel: 'all'
    };
    this.aplicarFiltros();
  }

  // ===== EXPORTAR Y COPIAR =====
  getFormattedTerapia(terapia: SeguimientoTerapiaDetallado | null): string {
    if (!terapia) return '';

    let texto = `${terapia.terapia_nombre || 'Terapia sin nombre'}\n`;
    texto += `${terapia.terapia_descripcion || 'Terapia de rehabilitación'}\n`;
    texto += `Tipo: ${terapia.terapia_tipo || 'N/A'} | Nivel: ${terapia.terapia_nivel || 'N/A'}\n`;
    texto += `Duración estimada: ${this.formatDuracion(terapia.duracion_estimada)}\n`;
    
    // Agregar información de seguimiento
    texto += `Progreso: ${terapia.progreso || 0}% | Estado: ${this.getEstadoIndividualText(terapia.estado_individual)}\n`;
    
    // Formatear fechas correctamente
    const fechaInicio = this.formatFecha(terapia.fecha_inicio_programada);
    const fechaFin = this.formatFecha(terapia.fecha_fin_programada);
    texto += `Período: ${fechaInicio} - ${fechaFin}\n`;
    
    if (terapia.estado_temporal === 'vigente' && terapia.dias_restantes !== undefined) {
      texto += `Días restantes: ${this.formatDiasRestantes(terapia.dias_restantes)}\n`;
    }
    
    if (terapia.notas_individuales) {
      texto += `\nMis notas:\n${terapia.notas_individuales}\n`;
    }

    if (terapia.fecha_inicio_real) {
      texto += `\nFecha de inicio real: ${this.formatFecha(terapia.fecha_inicio_real)}\n`;
    }
    
    if (terapia.fecha_fin_real) {
      texto += `Fecha de finalización: ${this.formatFecha(terapia.fecha_fin_real)}\n`;
    }

    // Agregar información adicional si está disponible
    if (terapia.sesiones_completadas !== undefined && terapia.sesiones_programadas !== undefined) {
      texto += `\nSesiones: ${terapia.sesiones_completadas} / ${terapia.sesiones_programadas} completadas\n`;
    }
    
    if (terapia.adherencia_porcentaje !== undefined) {
      texto += `Adherencia: ${terapia.adherencia_porcentaje}%\n`;
    }

    texto += `\nÚltima actualización: ${this.formatFecha(new Date())}\n`;

    return texto;
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copySuccess = true;
      console.log('Texto copiado al portapapeles');
      
      setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      this.fallbackCopyTextToClipboard(text);
    }
  }

  private fallbackCopyTextToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.copySuccess = true;
        setTimeout(() => {
          this.copySuccess = false;
        }, 2000);
      }
    } catch (err) {
      console.error('Fallback: Error al copiar al portapapeles:', err);
    }

    document.body.removeChild(textArea);
  }

  safeExportTerapia(seguimiento: SeguimientoTerapiaDetallado): void {
    if (seguimiento) {
      this.exportarTerapia(seguimiento);
    } else {
      console.warn('No hay terapia disponible para exportar');
    }
  }

  exportarTerapia(terapia: SeguimientoTerapiaDetallado): void {
    if (!terapia) {
      console.warn('No hay terapia para exportar');
      return;
    }

    const texto = this.getFormattedTerapia(terapia);
    if (!texto) {
      console.warn('No se pudo generar el contenido para exportar');
      return;
    }
    
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${terapia.terapia_nombre.replace(/\s+/g, '_')}_mi_terapia.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Mi terapia exportada:', terapia.terapia_nombre);
  }

  // ===== MÉTODOS DE UTILIDAD =====
  async refrescarTerapias(): Promise<void> {
    await Promise.all([
      this.cargarMisTerapias(),
      this.cargarEstadisticasPersonales()
    ]);
    this.mostrarNotificacion('Terapias actualizadas', 'success');
  }

  // ===== SISTEMA DE NOTIFICACIONES =====
  mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    this.mensaje = mensaje;
    this.tipoMensaje = tipo;
    this.mostrarMensaje = true;
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      this.mostrarMensaje = false;
    }, 3000);
  }

  cerrarNotificacion(): void {
    this.mostrarMensaje = false;
  }

  // ===== MÉTODOS DE FORMATEO =====
  formatFecha(fecha: string | Date | undefined): string {
    if (!fecha) return 'N/A';
    try {
      let fechaObj: Date;
      if (fecha instanceof Date) {
        fechaObj = fecha;
      } else {
        fechaObj = new Date(fecha);
      }
      
      // Verificar si la fecha es válida
      if (isNaN(fechaObj.getTime())) {
        return 'Fecha inválida';
      }
      
      return fechaObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  formatDuracion(minutos?: number): string {
    if (!minutos || minutos === 0) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  formatDiasRestantes(dias: number | undefined): string {
    if (dias === undefined || dias === null) return 'No disponible';
    
    if (dias < 0) {
      return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`;
    } else if (dias === 0) {
      return 'Vence hoy';
    } else if (dias === 1) {
      return 'Vence mañana';
    } else {
      return `${dias} días restantes`;
    }
  }

  getFileName(terapia: SeguimientoTerapiaDetallado | null): string {
    if (!terapia || !terapia.terapia_nombre) {
      return 'mi_terapia.txt';
    }
    return terapia.terapia_nombre.replace(/\s+/g, '_') + '_mi_terapia.txt';
  }

  // ===== MÉTODOS DE ESTADO Y CLASES CSS =====
  getEstadoTemporalText(estado: string): string {
    switch (estado) {
      case 'vigente': return 'Vigente';
      case 'pendiente': return 'Pendiente';
      case 'vencida': return 'Vencida';
      default: return 'Desconocido';
    }
  }

  getEstadoIndividualText(estado: string | undefined): string {
    if (!estado) return 'Desconocido';
    
    switch (estado) {
      case 'completada': return 'Completada';
      case 'en_progreso': return 'En Progreso';
      case 'pendiente': return 'Sin Iniciar';
      case 'abandonada': return 'Abandonada';
      default: return 'Desconocido';
    }
  }

  getEstadoTemporalColor(estado: string): string {
    switch (estado) {
      case 'vigente': return 'green';
      case 'pendiente': return 'blue';
      case 'vencida': return 'red';
      default: return 'gray';
    }
  }

  getEstadoIndividualColor(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'gray';
      case 'en_progreso': return 'yellow';
      case 'completada': return 'green';
      case 'abandonada': return 'red';
      default: return 'gray';
    }
  }

  getProgresoColor(progreso: number): string {
    if (progreso === 0) return 'gray';
    if (progreso < 30) return 'red';
    if (progreso < 70) return 'yellow';
    return 'green';
  }

  // ===== MÉTODOS DE CÁLCULO =====
  calcularEstadoTemporal(fechaInicio: string, fechaFin: string): { estado: string, diasRestantes: number } {
    const hoy = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Normalizar fechas para comparación (solo fecha, sin hora)
    hoy.setHours(0, 0, 0, 0);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    
    const diasRestantes = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    let estado: string;
    if (hoy < inicio) {
      estado = 'pendiente';
    } else if (hoy <= fin) {
      estado = 'vigente';
    } else {
      estado = 'vencida';
    }
    
    return { estado, diasRestantes };
  }

  determinarEstadoPorProgreso(progreso: number): string {
    if (progreso === 0) return 'pendiente';
    if (progreso === 100) return 'completada';
    return 'en_progreso';
  }

  // ===== VALIDACIONES =====
  esFormularioValido(): boolean {
    return this.progresoForm.progreso >= 0 && 
           this.progresoForm.progreso <= 100 && 
           this.progresoForm.estado !== '';
  }

  puedeActualizarProgreso(seguimiento: SeguimientoTerapiaDetallado): boolean {
    return seguimiento.estado_individual !== 'completada' && 
           seguimiento.estado_individual !== 'abandonada' &&
           seguimiento.estado_temporal !== 'vencida';
  }

  // ===== TRACKBY FUNCTIONS =====
  trackByTerapiaId(index: number, terapia: SeguimientoTerapiaDetallado): any {
    return terapia.seguimiento_id || index;
  }

  // ===== MÉTODOS ADICIONALES PARA COHERENCIA CON MIS-RUTINAS =====
  getTotalEjercicios(terapia: SeguimientoTerapiaDetallado): number {
    // Si las terapias tienen ejercicios, implementar lógica similar
    return 0;
  }

  calcularAdherencia(): number {
    if (this.terapias.length === 0) return 0;
    
    const terapiasConProgreso = this.terapias.filter(t => t.progreso > 0);
    return Math.round((terapiasConProgreso.length / this.terapias.length) * 100);
  }

  programarRecordatorio(seguimiento: SeguimientoTerapiaDetallado): void {
    this.mostrarNotificacion('Función de recordatorios en desarrollo', 'info');
  }

  contactarTerapeuta(seguimiento: SeguimientoTerapiaDetallado): void {
    this.mostrarNotificacion('Función de contacto en desarrollo', 'info');
  }

  exportarProgreso(): void {
    this.mostrarNotificacion('Función de exportación en desarrollo', 'info');
  }
}