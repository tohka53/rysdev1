// src/app/calendario-rutinas/calendario-rutinas/calendario-rutinas.component.ts - SOLO DÍA DE INICIO
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SeguimientoDetalladoExtendido } from '../../interfaces/mis-rutinas.interfaces';
import { Rutina } from '../../interfaces/rutinas.interfaces';

export interface DiaCalendario {
  fecha: Date;
  esMesActual: boolean;
  rutinas: RutinaDelDia[];
}

export interface RutinaDelDia {
  seguimiento: SeguimientoDetalladoExtendido;
  tipoEvento: 'inicio';
  enRango: boolean;
}

@Component({
  selector: 'app-calendario-rutinas',
  standalone: false,
  templateUrl: './calendario-rutinas.component.html',
  styleUrls: ['./calendario-rutinas.component.css']
})
export class CalendarioRutinasComponent implements OnInit {
  @Input() rutinas: SeguimientoDetalladoExtendido[] = [];
  @Output() volverAVista = new EventEmitter<void>();
  @Output() abrirRutina = new EventEmitter<SeguimientoDetalladoExtendido>();

  // Control del calendario
  fechaActual = new Date();
  mesActual = new Date();
  diasCalendario: DiaCalendario[] = [];
  
  // Modal para ver rutina
  showViewModal = false;
  selectedRutina: Rutina | null = null;
  selectedSeguimiento: SeguimientoDetalladoExtendido | null = null;
  copySuccess = false;

  // Nombres de meses y días
  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  constructor() {}

  ngOnInit(): void {
    this.generarCalendario();
  }

  ngOnChanges(): void {
    this.generarCalendario();
  }

  // =====================================
  // GENERACIÓN DEL CALENDARIO
  // =====================================

  generarCalendario(): void {
    this.diasCalendario = [];
    
    const primerDiaMes = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
    const ultimoDiaMes = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 0);
    
    // Días antes del primer día del mes
    const diasAnteriores = primerDiaMes.getDay();
    for (let i = diasAnteriores - 1; i >= 0; i--) {
      const fecha = new Date(primerDiaMes);
      fecha.setDate(fecha.getDate() - (i + 1));
      this.diasCalendario.push({
        fecha: new Date(fecha),
        esMesActual: false,
        rutinas: this.getRutinasDelDia(fecha)
      });
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
      const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), dia);
      this.diasCalendario.push({
        fecha: new Date(fecha),
        esMesActual: true,
        rutinas: this.getRutinasDelDia(fecha)
      });
    }
    
    // Días después del último día del mes para completar 42 celdas (6 semanas)
    const celdasRestantes = 42 - this.diasCalendario.length;
    for (let i = 1; i <= celdasRestantes; i++) {
      const fecha = new Date(ultimoDiaMes);
      fecha.setDate(fecha.getDate() + i);
      this.diasCalendario.push({
        fecha: new Date(fecha),
        esMesActual: false,
        rutinas: this.getRutinasDelDia(fecha)
      });
    }
  }

  // =====================================
  // MÉTODO CLAVE: SOLO DÍA DE INICIO
  // =====================================
  getRutinasDelDia(fecha: Date): RutinaDelDia[] {
    const rutinasDelDia: RutinaDelDia[] = [];
    const fechaStr = this.formatDateForComparison(fecha);
    
    console.log(`🗓️ Verificando rutinas para fecha: ${fechaStr}`);
    
    this.rutinas.forEach(seguimiento => {
      const fechaInicio = new Date(seguimiento.fecha_inicio_programada);
      const fechaInicioStr = this.formatDateForComparison(fechaInicio);
      
      console.log(`   🔍 Rutina: ${seguimiento.rutina_nombre}, Inicio: ${fechaInicioStr}, Comparando con: ${fechaStr}`);
      
      // SOLO agregar si es exactamente el día de inicio
      if (fechaInicioStr === fechaStr) {
        console.log(`   ✅ COINCIDENCIA! Agregando rutina: ${seguimiento.rutina_nombre}`);
        rutinasDelDia.push({
          seguimiento,
          tipoEvento: 'inicio',
          enRango: true
        });
      } else {
        console.log(`   ❌ No coincide. Saltando rutina.`);
      }
    });
    
    console.log(`📊 Total rutinas para ${fechaStr}: ${rutinasDelDia.length}`);
    return rutinasDelDia;
  }

  formatDateForComparison(date: Date): string {
    // Asegurar que la fecha esté en formato YYYY-MM-DD para comparación consistente
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // =====================================
  // NAVEGACIÓN DEL CALENDARIO
  // =====================================

  mesAnterior(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.generarCalendario();
  }

  mesSiguiente(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.generarCalendario();
  }

  irAHoy(): void {
    this.mesActual = new Date();
    this.generarCalendario();
  }

  // =====================================
  // EVENTOS Y ACCIONES
  // =====================================

  onVolverAVista(): void {
    this.volverAVista.emit();
  }

  onClickRutina(rutinaDelDia: RutinaDelDia): void {
    this.abrirModalRutina(rutinaDelDia.seguimiento);
  }

  abrirModalRutina(seguimiento: SeguimientoDetalladoExtendido): void {
    this.selectedSeguimiento = seguimiento;
    this.selectedRutina = seguimiento.rutina_completa || null;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedRutina = null;
    this.selectedSeguimiento = null;
    this.copySuccess = false;
  }

  // =====================================
  // MÉTODOS DE UTILIDAD
  // =====================================

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  }

  getColorByEstado(estado: string): string {
    switch (estado) {
      case 'vigente': return 'bg-green-500';
      case 'pendiente': return 'bg-blue-500';
      case 'vencida': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  getColorByTipo(tipo: string): string {
    // Solo tenemos tipo 'inicio' ahora
    return 'border-green-500 bg-green-100';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  // Formatear rutina para el modal - VERSIÓN COMPLETA IGUAL QUE MIS-RUTINAS
  getFormattedRutina(rutina: Rutina | null, seguimiento?: SeguimientoDetalladoExtendido): string {
    if (!rutina) return '';

    let texto = `${rutina.nombre}\n`;
    texto += `${rutina.descripcion || 'Rutina de entrenamiento'}\n`;
    texto += `Nivel: ${rutina.nivel} | Duración: ${this.formatDuracion(rutina.duracion_estimada)}\n`;
    
    if (seguimiento) {
      texto += `Progreso: ${seguimiento.progreso}% | Estado: ${seguimiento.estado_individual}\n`;
      texto += `Período: ${this.formatDate(seguimiento.fecha_inicio_programada)} - ${this.formatDate(seguimiento.fecha_fin_programada)}\n`;
      if (seguimiento.estado_temporal === 'vigente') {
        texto += `Días restantes: ${seguimiento.dias_restantes}\n`;
      }
    }
    texto += '\n';

    // Secciones disponibles (igual que mis-rutinas)
    const seccionesDisponibles = [
      { key: 'warm_up', nombre: 'Warm Up', descripcion: 'Calentamiento' },
      { key: 'met_con', nombre: 'Met-Con', descripcion: 'Metabolic Conditioning' },
      { key: 'strength', nombre: 'Strength', descripcion: 'Entrenamiento de Fuerza' },
      { key: 'core', nombre: 'Core', descripcion: 'Trabajo de Core' },
      { key: 'extra', nombre: 'Extra', descripcion: 'Trabajo Adicional' }
    ];

    // Procesar cada sección
    const ordenSecciones = ['warm_up', 'met_con', 'strength', 'core', 'extra'];
    
    ordenSecciones.forEach(sectionKey => {
      const seccionInfo = seccionesDisponibles.find(s => s.key === sectionKey);
      const seccionData = rutina[sectionKey] as any;
      
      if (seccionData && seccionData.ejercicios && seccionData.ejercicios.length > 0 && seccionInfo) {
        texto += `${seccionInfo.nombre.toUpperCase()}\n`;
        
        if (seccionData.descripcion) {
          texto += `${seccionData.descripcion}\n`;
        }
        
        const infoAdicional = [];
        if (seccionData.tiempo_total) infoAdicional.push(`Tiempo: ${seccionData.tiempo_total}`);
        if (seccionData.series) infoAdicional.push(`Series: ${seccionData.series}`);
        if (seccionData.time_cap) infoAdicional.push(`Time Cap: ${seccionData.time_cap}`);
        
        if (infoAdicional.length > 0) {
          texto += `${infoAdicional.join(' | ')}\n`;
        }
        
        seccionData.ejercicios.forEach((ejercicio: any) => {
          let lineaEjercicio = ejercicio.nombre;
          
          const detalles = [];
          if (ejercicio.repeticiones) detalles.push(`${ejercicio.repeticiones} reps`);
          if (ejercicio.series) detalles.push(`x ${ejercicio.series}`);
          if (ejercicio.duracion) detalles.push(`${ejercicio.duracion}`);
          if (ejercicio.distancia) detalles.push(`${ejercicio.distancia}`);
          if (ejercicio.peso) detalles.push(`${ejercicio.peso}`);
          
          if (detalles.length > 0) {
            lineaEjercicio += ` - ${detalles.join(' ')}`;
          }
          
          if (ejercicio.rpe) {
            lineaEjercicio += ` (RPE ${ejercicio.rpe})`;
          }
          
          if (ejercicio.observaciones) {
            lineaEjercicio += ` - ${ejercicio.observaciones}`;
          }
          
          texto += `${lineaEjercicio}\n`;
        });
        
        texto += '\n';
      }
    });

    if (rutina.tags && rutina.tags.length > 0) {
      texto += `Tags: ${rutina.tags.map(tag => `#${tag}`).join(' ')}\n`;
    }

    return texto;
  }

  formatDuracion(minutos?: number): string {
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copySuccess = true;
      setTimeout(() => this.copySuccess = false, 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  }

  exportarRutina(rutina: Rutina, seguimiento?: SeguimientoDetalladoExtendido): void {
    const texto = this.getFormattedRutina(rutina, seguimiento);
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rutina.nombre.replace(/\s+/g, '_')}_calendario.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getFileName(): string {
    if (!this.selectedRutina || !this.selectedRutina.nombre) {
      return 'rutina_calendario.txt';
    }
    return this.selectedRutina.nombre.replace(/\s+/g, '_') + '_calendario.txt';
  }

  // TrackBy functions para optimización
  trackByDate(index: number, dia: DiaCalendario): any {
    return dia.fecha.getTime();
  }

  trackByRutina(index: number, rutina: RutinaDelDia): any {
    return rutina.seguimiento.seguimiento_id;
  }
}