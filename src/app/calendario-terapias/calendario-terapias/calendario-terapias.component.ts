// src/app/calendario-terapias/calendario-terapias.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

// Interfaces específicas para el calendario de terapias
export interface DiaCalendarioTerapias {
  fecha: Date;
  esMesActual: boolean;
  terapias: TerapiaDelDia[];
}

export interface TerapiaDelDia {
  seguimiento: SeguimientoTerapiaSimplificado;
  tipoEvento: 'inicio' | 'fin';
  enRango: boolean;
}

// Interface simplificada que debe coincidir con mis-terapias
interface SeguimientoTerapiaSimplificado {
  seguimiento_id: number;
  asignacion_id: number;
  id_profile: number;
  username: string;
  full_name: string;
  terapia_nombre: string;
  terapia_id: number;
  terapia_descripcion?: string;
  terapia_tipo: string;
  terapia_nivel: string;
  duracion_estimada?: number;
  terapia_completa?: any;
  progreso: number;
  estado_individual: string;
  fecha_inicio_real?: string | Date;
  fecha_fin_real?: string | Date;
  fecha_inicio_programada: string | Date;
  fecha_fin_programada: string | Date;
  notas_individuales?: string;
  estado_temporal: string;
  dias_restantes: number;
  sesiones_completadas?: number;
  sesiones_programadas?: number;
  adherencia_porcentaje?: number;
  nivel_dolor_actual?: number;
  nivel_funcionalidad_actual?: number;
}

@Component({
  selector: 'app-calendario-terapias',
  standalone: false,
  templateUrl: './calendario-terapias.component.html',
  styleUrls: ['./calendario-terapias.component.css']
})
export class CalendarioTerapiasComponent implements OnInit {
  @Input() terapias: SeguimientoTerapiaSimplificado[] = [];
  @Output() volverAVista = new EventEmitter<void>();
  @Output() abrirTerapia = new EventEmitter<SeguimientoTerapiaSimplificado>();

  // Control del calendario
  fechaActual = new Date();
  mesActual = new Date();
  diasCalendario: DiaCalendarioTerapias[] = [];
  
  // Modal para ver terapia
  showViewModal = false;
  selectedTerapia: any = null;
  selectedSeguimiento: SeguimientoTerapiaSimplificado | null = null;
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
        terapias: this.getTerapiasDelDia(fecha)
      });
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
      const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), dia);
      this.diasCalendario.push({
        fecha: new Date(fecha),
        esMesActual: true,
        terapias: this.getTerapiasDelDia(fecha)
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
        terapias: this.getTerapiasDelDia(fecha)
      });
    }
  }

  // =====================================
  // MÉTODO CLAVE: DÍAS DE INICIO Y FIN
  // =====================================
  getTerapiasDelDia(fecha: Date): TerapiaDelDia[] {
    const terapiasDelDia: TerapiaDelDia[] = [];
    const fechaStr = this.formatDateForComparison(fecha);
    
    console.log(`🗓️ Verificando terapias para fecha: ${fechaStr}`);
    
    this.terapias.forEach(seguimiento => {
      const fechaInicio = new Date(seguimiento.fecha_inicio_programada);
      const fechaFin = new Date(seguimiento.fecha_fin_programada);
      const fechaInicioStr = this.formatDateForComparison(fechaInicio);
      const fechaFinStr = this.formatDateForComparison(fechaFin);
      
      console.log(`   🔍 Terapia: ${seguimiento.terapia_nombre}, Inicio: ${fechaInicioStr}, Fin: ${fechaFinStr}, Comparando con: ${fechaStr}`);
      
      // Agregar si es el día de inicio
      if (fechaInicioStr === fechaStr) {
        console.log(`   ✅ INICIO! Agregando terapia: ${seguimiento.terapia_nombre}`);
        terapiasDelDia.push({
          seguimiento,
          tipoEvento: 'inicio',
          enRango: true
        });
      }
      
      // Agregar si es el día de fin (solo si es diferente del inicio)
      if (fechaFinStr === fechaStr && fechaFinStr !== fechaInicioStr) {
        console.log(`   🏁 FIN! Agregando terapia: ${seguimiento.terapia_nombre}`);
        terapiasDelDia.push({
          seguimiento,
          tipoEvento: 'fin',
          enRango: true
        });
      }
    });
    
    console.log(`📊 Total terapias para ${fechaStr}: ${terapiasDelDia.length}`);
    return terapiasDelDia;
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

  onClickTerapia(terapiaDelDia: TerapiaDelDia): void {
    this.abrirModalTerapia(terapiaDelDia.seguimiento);
  }

  abrirModalTerapia(seguimiento: SeguimientoTerapiaSimplificado): void {
    this.selectedSeguimiento = seguimiento;
    this.selectedTerapia = seguimiento.terapia_completa || null;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedTerapia = null;
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
    switch (tipo) {
      case 'inicio': return 'border-green-500 bg-green-100 text-green-800';
      case 'fin': return 'border-red-500 bg-red-100 text-red-800';
      default: return 'border-gray-500 bg-gray-100 text-gray-800';
    }
  }

  getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'inicio': return '🚀';
      case 'fin': return '🏁';
      default: return '📋';
    }
  }

  getTipoTexto(tipo: string): string {
    switch (tipo) {
      case 'inicio': return 'Inicio';
      case 'fin': return 'Fin';
      default: return 'Evento';
    }
  }

  formatDate(dateInput: string | Date | undefined): string {
    if (!dateInput) return 'N/A';
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  formatDuracion(minutos?: number): string {
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  // Formatear terapia para el modal
  getFormattedTerapia(terapia: any | null, seguimiento?: SeguimientoTerapiaSimplificado): string {
    if (!terapia) return '';

    let texto = `${terapia.nombre || 'Terapia'}\n`;
    texto += `${terapia.descripcion || 'Programa de rehabilitación personalizada'}\n`;
    texto += `Tipo: ${terapia.tipo} | Nivel: ${terapia.nivel}\n`;
    if (terapia.area_especializacion) {
      texto += `Área: ${terapia.area_especializacion}\n`;
    }
    texto += `Duración estimada: ${this.formatDuracion(terapia.duracion_estimada)}\n\n`;
    
    // Agregar información de seguimiento si está disponible
    if (seguimiento) {
      texto += `MI PROGRESO:\n`;
      texto += `Estado: ${this.getEstadoIndividualText(seguimiento.estado_individual)} (${seguimiento.progreso}%)\n`;
      texto += `Período: ${this.formatDate(seguimiento.fecha_inicio_programada)} - ${this.formatDate(seguimiento.fecha_fin_programada)}\n`;
      
      if (seguimiento.estado_temporal === 'vigente' && seguimiento.dias_restantes !== undefined) {
        texto += `Días restantes: ${this.formatDiasRestantes(seguimiento.dias_restantes)}\n`;
      }
      
      if (seguimiento.fecha_inicio_real) {
        texto += `Iniciado: ${this.formatDate(seguimiento.fecha_inicio_real)}\n`;
      }
      
      if (seguimiento.sesiones_completadas !== undefined && seguimiento.sesiones_programadas !== undefined) {
        texto += `Sesiones completadas: ${seguimiento.sesiones_completadas} / ${seguimiento.sesiones_programadas}\n`;
      }
      
      if (seguimiento.adherencia_porcentaje !== undefined) {
        texto += `Adherencia: ${seguimiento.adherencia_porcentaje}%\n`;
      }
      texto += '\n';
    }

    // Agregar objetivo principal si existe
    if (terapia.objetivo_principal) {
      texto += `OBJETIVO PRINCIPAL:\n`;
      texto += `${terapia.objetivo_principal}\n\n`;
    }

    // Procesar ejercicios (misma lógica que en mis-terapias)
    if (terapia.ejercicios && typeof terapia.ejercicios === 'object') {
      texto += `PLAN DE EJERCICIOS:\n\n`;
      
      const seccionesOrdenadas = ['calentamiento', 'fortalecimiento', 'equilibrio', 'coordinacion', 'estiramiento', 'respiracion'];
      
      seccionesOrdenadas.forEach(seccionKey => {
        const seccion = terapia.ejercicios[seccionKey];
        
        if (seccion && seccion.ejercicios && seccion.ejercicios.length > 0) {
          texto += `${seccionKey.toUpperCase()}\n`;
          
          if (seccion.descripcion) {
            texto += `${seccion.descripcion}\n`;
          }
          
          const infoSeccion = [];
          if (seccion.tiempo_total) infoSeccion.push(`Tiempo: ${seccion.tiempo_total}`);
          if (seccion.objetivos && seccion.objetivos.length > 0) {
            infoSeccion.push(`Objetivos: ${seccion.objetivos.join(', ')}`);
          }
          
          if (infoSeccion.length > 0) {
            texto += `${infoSeccion.join(' | ')}\n`;
          }
          
          texto += '\n';
          
          seccion.ejercicios.forEach((ejercicio: any, index: number) => {
            texto += `${index + 1}. ${ejercicio.nombre}\n`;
            
            if (ejercicio.descripcion) {
              texto += `   ${ejercicio.descripcion}\n`;
            }
            
            const detalles = [];
            if (ejercicio.series) detalles.push(`${ejercicio.series} series`);
            if (ejercicio.repeticiones) detalles.push(`${ejercicio.repeticiones} reps`);
            if (ejercicio.duracion) detalles.push(`${ejercicio.duracion}`);
            if (ejercicio.resistencia) detalles.push(`Resistencia: ${ejercicio.resistencia}`);
            if (ejercicio.equipamiento && ejercicio.equipamiento.length > 0) {
              detalles.push(`Equipo: ${ejercicio.equipamiento.join(', ')}`);
            }
            
            if (detalles.length > 0) {
              texto += `   ${detalles.join(' | ')}\n`;
            }
            
            if (ejercicio.ejecucion) {
              texto += `   Ejecución: ${ejercicio.ejecucion}\n`;
            }
            
            if (ejercicio.precauciones) {
              texto += `   ⚠️  ${ejercicio.precauciones}\n`;
            }
            
            if (ejercicio.modificaciones) {
              if (ejercicio.modificaciones.principiante) {
                texto += `   💡 Principiante: ${ejercicio.modificaciones.principiante}\n`;
              }
              if (ejercicio.modificaciones.limitaciones) {
                texto += `   🔧 Limitaciones: ${ejercicio.modificaciones.limitaciones}\n`;
              }
            }
            
            texto += '\n';
          });
          
          texto += '\n';
        }
      });
    }

    // Mis notas si existen
    if (seguimiento?.notas_individuales) {
      texto += `MIS NOTAS PERSONALES:\n`;
      texto += `${seguimiento.notas_individuales}\n\n`;
    }

    texto += `Última actualización: ${this.formatDate(new Date().toISOString())}\n`;
    texto += `Generado por: rehabiMovement - Sistema de Rehabilitación\n`;

    return texto;
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

  // Copiar al portapapeles
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
    }
  }

  getFileName(): string {
    const nombre = this.selectedTerapia?.nombre || this.selectedSeguimiento?.terapia_nombre || 'terapia';
    return nombre.replace(/\s+/g, '_') + '_mi_terapia.txt';
  }

  // Crear terapia básica cuando no está disponible la completa
  crearTerapiaBasica(seguimiento?: SeguimientoTerapiaSimplificado): any {
    if (!seguimiento) {
      return {
        nombre: 'Terapia',
        descripcion: 'Programa de rehabilitación personalizada',
        tipo: 'general',
        nivel: 'básico',
        duracion_estimada: 30
      };
    }

    return {
      id: seguimiento.terapia_id,
      nombre: seguimiento.terapia_nombre,
      descripcion: seguimiento.terapia_descripcion || 'Terapia de rehabilitación personalizada',
      tipo: seguimiento.terapia_tipo,
      nivel: seguimiento.terapia_nivel,
      duracion_estimada: seguimiento.duracion_estimada,
      objetivos: this.generarObjetivosTerapia(seguimiento.terapia_tipo),
      ejercicios: this.generarEjerciciosBasicos(seguimiento.terapia_tipo),
      observaciones: seguimiento.notas_individuales || 'Sin observaciones adicionales',
      area_especializacion: this.obtenerAreaEspecializacion(seguimiento.terapia_tipo)
    };
  }

  private generarObjetivosTerapia(tipo: string): string {
    switch (tipo.toLowerCase()) {
      case 'fisica':
        return '• Mejorar la movilidad y flexibilidad\n• Fortalecer grupos musculares específicos\n• Reducir el dolor y la inflamación\n• Recuperar la función normal';
      case 'ocupacional':
        return '• Mejorar las actividades de la vida diaria\n• Desarrollar habilidades motoras finas\n• Adaptar el entorno a las necesidades\n• Incrementar la independencia funcional';
      case 'respiratoria':
        return '• Mejorar la capacidad pulmonar\n• Fortalecer músculos respiratorios\n• Optimizar técnicas de respiración\n• Reducir la disnea';
      case 'neurologica':
        return '• Mejorar el control motor\n• Estimular la neuroplasticidad\n• Desarrollar patrones de movimiento\n• Mejorar el equilibrio y coordinación';
      default:
        return '• Objetivos específicos según evaluación inicial\n• Mejora progresiva de la condición\n• Mantenimiento de logros alcanzados\n• Prevención de recaídas';
    }
  }

  private generarEjerciciosBasicos(tipo: string): any[] {
    switch (tipo.toLowerCase()) {
      case 'fisica':
        return [
          { 
            nombre: 'Pendular suave', 
            descripcion: 'Movimientos pendulares del brazo',
            series: '2 series x 10 repeticiones',
            duracion: '2:00'
          },
          { 
            nombre: 'Rotación externa con banda', 
            descripcion: 'Ejercicio con banda elástica para fortalecimiento',
            series: '3 series x 15 repeticiones',
            observaciones: 'No forzar el movimiento'
          }
        ];
      case 'respiratoria':
        return [
          { 
            nombre: 'Respiración diafragmática', 
            descripcion: 'Inspiraciones profundas usando el diafragma',
            series: '4 series x 10 respiraciones',
            duracion: '5:00',
            observaciones: 'Mantener ritmo lento y controlado'
          }
        ];
      default:
        return [
          { 
            nombre: 'Ejercicio terapéutico personalizado', 
            descripcion: 'Ejercicio adaptado según evaluación individual',
            duracion: '15:00',
            observaciones: 'Ajustar según tolerancia'
          }
        ];
    }
  }

  private obtenerAreaEspecializacion(tipo: string): string {
    switch (tipo.toLowerCase()) {
      case 'fisica': return 'Fisioterapia';
      case 'ocupacional': return 'Terapia Ocupacional';
      case 'respiratoria': return 'Fisioterapia Respiratoria';
      case 'neurologica': return 'Neurorehabilitación';
      default: return 'Rehabilitación General';
    }
  }

  // Exportar terapia desde el calendario
  exportarTerapia(terapia: any, seguimiento?: SeguimientoTerapiaSimplificado): void {
    console.log('Exportando terapia desde calendario:', { terapia, seguimiento });
    
    // Si no hay terapia, crear una básica
    if (!terapia && seguimiento) {
      terapia = this.crearTerapiaBasica(seguimiento);
    }
    
    if (!terapia) {
      console.warn('No hay terapia disponible para exportar');
      return;
    }
    
    const texto = this.getFormattedTerapia(terapia, seguimiento);
    if (!texto) {
      console.warn('No se pudo generar el contenido para exportar');
      return;
    }
    
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(terapia.nombre || seguimiento?.terapia_nombre || 'terapia').replace(/\s+/g, '_')}_mi_terapia.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Terapia exportada desde calendario:', terapia.nombre || seguimiento?.terapia_nombre);
  }

  // TrackBy functions para optimización
  trackByDate(index: number, dia: DiaCalendarioTerapias): string {
    return dia.fecha.toISOString().split('T')[0];
  }

  trackByTerapia(index: number, terapia: TerapiaDelDia): number {
    return terapia.seguimiento.seguimiento_id;
  }
}