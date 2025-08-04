// src/app/calendario-terapias/calendario-terapias/calendario-terapias.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TerapiasService } from '../../services/terapias.service';

// Interfaces locales para el componente
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

export interface DiaCalendario {
  fecha: Date;
  esMesActual: boolean;
  terapias: TerapiaDelDia[];
}

export interface TerapiaDelDia {
  seguimiento: SeguimientoTerapiaSimplificado;
  tipoEvento: 'inicio';
  enRango: boolean;
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
  @Output() abrirTerapia = new EventEmitter<SeguimientoTerapiaSimplificado>(); // Para mantener compatibilidad

  // Control del calendario
  fechaActual = new Date();
  mesActual = new Date();
  diasCalendario: DiaCalendario[] = [];
  
  // Modal propio para ver terapia completa
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

  constructor(private terapiasService: TerapiasService) {}

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
  // MÉTODO CLAVE: SOLO DÍA DE INICIO
  // =====================================
  getTerapiasDelDia(fecha: Date): TerapiaDelDia[] {
    const terapiasDelDia: TerapiaDelDia[] = [];
    const fechaStr = this.formatDateForComparison(fecha);
    
    console.log(`🗓️ Verificando terapias para fecha: ${fechaStr}`);
    
    this.terapias.forEach(seguimiento => {
      const fechaInicio = new Date(seguimiento.fecha_inicio_programada);
      const fechaInicioStr = this.formatDateForComparison(fechaInicio);
      
      console.log(`   🔍 Terapia: ${seguimiento.terapia_nombre}, Inicio: ${fechaInicioStr}, Comparando con: ${fechaStr}`);
      
      // SOLO agregar si es exactamente el día de inicio
      if (fechaInicioStr === fechaStr) {
        console.log(`   ✅ COINCIDENCIA! Agregando terapia: ${seguimiento.terapia_nombre}`);
        terapiasDelDia.push({
          seguimiento,
          tipoEvento: 'inicio',
          enRango: true
        });
      } else {
        console.log(`   ❌ No coincide. Saltando terapia.`);
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

  // MÉTODO CORREGIDO: Abrir modal propio del calendario
  onClickTerapia(terapiaDelDia: TerapiaDelDia): void {
    console.log('Click en terapia desde calendario:', terapiaDelDia.seguimiento.terapia_nombre);
    
    // Abrir modal propio del calendario
    this.abrirModalTerapia(terapiaDelDia.seguimiento);
  }

  async abrirModalTerapia(seguimiento: SeguimientoTerapiaSimplificado): Promise<void> {
    console.log('Abriendo modal del calendario para:', seguimiento.terapia_nombre);
    
    this.selectedSeguimiento = seguimiento;
    
    // CARGAR TERAPIA COMPLETA DESDE LA BASE DE DATOS - IGUAL QUE EN MIS-TERAPIAS
    try {
      console.log('🔍 Cargando terapia completa desde BD para ID:', seguimiento.terapia_id);
      const terapiaCompleta = await this.terapiasService.getTerapiaById(seguimiento.terapia_id);
      
      if (terapiaCompleta) {
        console.log('✅ Terapia completa cargada desde BD:', terapiaCompleta);
        this.selectedTerapia = terapiaCompleta;
      } else {
        console.warn('⚠️ No se encontró terapia en BD, usando información básica');
        this.selectedTerapia = this.crearTerapiaBasica(seguimiento);
      }
    } catch (error) {
      console.error('❌ Error cargando terapia completa desde BD:', error);
      this.selectedTerapia = this.crearTerapiaBasica(seguimiento);
    }
    
    this.showViewModal = true;
  }

  closeViewModal(): void {
    console.log('Cerrando modal del calendario');
    this.showViewModal = false;
    this.selectedTerapia = null;
    this.selectedSeguimiento = null;
    this.copySuccess = false;
  }

  // =====================================
  // MÉTODOS DE UTILIDAD COMPLETOS
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

  formatDate(dateString: string | Date | undefined): string {
    if (!dateString) return 'N/A';
    try {
      let fechaObj: Date;
      if (dateString instanceof Date) {
        fechaObj = dateString;
      } else {
        fechaObj = new Date(dateString);
      }
      
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
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

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

  // =====================================
  // FORMATEO DE TERAPIA PARA MODAL
  // =====================================

  // Formatear terapia para el modal - SOLO DATOS REALES DE BD
  getFormattedTerapia(terapia: any | null, seguimiento?: SeguimientoTerapiaSimplificado): string {
    console.log('🖨️ Formateando terapia desde calendario:', { terapia, seguimiento });
    
    if (!terapia && !seguimiento) {
      console.warn('No hay datos de terapia ni seguimiento');
      return 'No hay información disponible para mostrar.';
    }

    // Si no hay terapia pero sí seguimiento, usar información básica
    if (!terapia && seguimiento) {
      terapia = this.crearTerapiaBasica(seguimiento);
    }

    let texto = `${terapia.nombre || seguimiento?.terapia_nombre || 'Terapia sin nombre'}\n`;
    texto += `${terapia.descripcion || seguimiento?.terapia_descripcion || 'Información detallada disponible con el terapeuta'}\n`;
    texto += `Tipo: ${terapia.tipo || seguimiento?.terapia_tipo || 'No especificado'} | Nivel: ${terapia.nivel || seguimiento?.terapia_nivel || 'No especificado'}\n`;
    
    if (terapia.area_especializacion) {
      texto += `Área: ${terapia.area_especializacion}\n`;
    }
    
    texto += `Duración estimada: ${this.formatDuracion(terapia.duracion_estimada || seguimiento?.duracion_estimada)}\n\n`;
    
    // Agregar información de seguimiento si está disponible
    if (seguimiento) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                          MI PROGRESO\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
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

    // Solo mostrar información adicional si existe en BD
    if (terapia.objetivo_principal) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                      OBJETIVO PRINCIPAL\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${terapia.objetivo_principal}\n\n`;
    }

    // Procesar ejercicios SOLO si existen en la BD
    if (terapia.ejercicios && typeof terapia.ejercicios === 'object' && Object.keys(terapia.ejercicios).length > 0) {
      console.log('📋 Procesando ejercicios desde BD:', terapia.ejercicios);
      
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                      PLAN DE EJERCICIOS\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      // Buscar secciones conocidas en el JSONB
      const seccionesOrdenadas = ['calentamiento', 'fortalecimiento', 'equilibrio', 'coordinacion', 'estiramiento', 'respiracion', 'flexibilidad', 'movilidad', 'resistencia'];
      
      let seccionesEncontradas = 0;
      
      seccionesOrdenadas.forEach(seccionKey => {
        const seccion = terapia.ejercicios[seccionKey];
        
        if (seccion && seccion.ejercicios && Array.isArray(seccion.ejercicios) && seccion.ejercicios.length > 0) {
          seccionesEncontradas++;
          
          texto += `${seccionKey.toUpperCase()}\n`;
          texto += `${'─'.repeat(seccionKey.length)}\n`;
          
          if (seccion.descripcion) {
            texto += `${seccion.descripcion}\n`;
          }
          
          const infoSeccion = [];
          if (seccion.tiempo_total) infoSeccion.push(`Tiempo: ${seccion.tiempo_total}`);
          if (seccion.objetivos && Array.isArray(seccion.objetivos) && seccion.objetivos.length > 0) {
            infoSeccion.push(`Objetivos: ${seccion.objetivos.join(', ')}`);
          }
          
          if (infoSeccion.length > 0) {
            texto += `${infoSeccion.join(' | ')}\n`;
          }
          
          texto += '\n';
          
          seccion.ejercicios.forEach((ejercicio: any, index: number) => {
            texto += `${index + 1}. ${ejercicio.nombre || 'Ejercicio sin nombre'}\n`;
            
            if (ejercicio.descripcion) {
              texto += `   ${ejercicio.descripcion}\n`;
            }
            
            const detalles = [];
            if (ejercicio.series) detalles.push(`${ejercicio.series} series`);
            if (ejercicio.repeticiones) detalles.push(`${ejercicio.repeticiones} reps`);
            if (ejercicio.duracion) detalles.push(`${ejercicio.duracion}`);
            if (ejercicio.resistencia) detalles.push(`Resistencia: ${ejercicio.resistencia}`);
            if (ejercicio.equipamiento && Array.isArray(ejercicio.equipamiento) && ejercicio.equipamiento.length > 0) {
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
            
            if (ejercicio.observaciones) {
              texto += `   📝 ${ejercicio.observaciones}\n`;
            }
            
            texto += '\n';
          });
          
          texto += '\n';
        }
      });
      
      // Si no se encontraron secciones organizadas, buscar ejercicios directos
      if (seccionesEncontradas === 0) {
        console.log('🔍 No se encontraron secciones organizadas, buscando ejercicios directos...');
        
        // Verificar si hay ejercicios directamente en el objeto
        if (Array.isArray(terapia.ejercicios)) {
          texto += `EJERCICIOS\n`;
          texto += `─────────\n\n`;
          
          terapia.ejercicios.forEach((ejercicio: any, index: number) => {
            texto += `${index + 1}. ${ejercicio.nombre || 'Ejercicio sin nombre'}\n`;
            
            if (ejercicio.descripcion) {
              texto += `   ${ejercicio.descripcion}\n`;
            }
            
            const detalles = [];
            if (ejercicio.series) detalles.push(`${ejercicio.series} series`);
            if (ejercicio.repeticiones) detalles.push(`${ejercicio.repeticiones} reps`);
            if (ejercicio.duracion) detalles.push(`${ejercicio.duracion}`);
            
            if (detalles.length > 0) {
              texto += `   ${detalles.join(' | ')}\n`;
            }
            
            if (ejercicio.observaciones) {
              texto += `   📝 ${ejercicio.observaciones}\n`;
            }
            
            texto += '\n';
          });
        } else {
          console.log('⚠️ Estructura de ejercicios no reconocida:', typeof terapia.ejercicios);
          texto += `INFORMACIÓN DE EJERCICIOS\n`;
          texto += `────────────────────────\n\n`;
          texto += `Los ejercicios están disponibles en la base de datos.\n`;
          texto += `Consulte con su terapeuta para obtener el plan de ejercicios detallado.\n\n`;
        }
      }
    } else {
      console.log('ℹ️ No hay ejercicios en BD o estructura vacía');
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                    PLAN DE EJERCICIOS\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `El plan de ejercicios detallado está disponible con su terapeuta.\n`;
      texto += `Consulte directamente para obtener las instrucciones específicas.\n\n`;
    }

    // Agregar contraindicaciones SOLO si existen en BD
    if (terapia.contraindicaciones) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                     CONTRAINDICACIONES\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${terapia.contraindicaciones}\n\n`;
    }

    // Agregar criterios de progresión SOLO si existen en BD
    if (terapia.criterios_progresion) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                   CRITERIOS DE PROGRESIÓN\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${terapia.criterios_progresion}\n\n`;
    }

    // Agregar recomendaciones SOLO si existen en BD
    if (terapia.recomendaciones) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                      RECOMENDACIONES\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${terapia.recomendaciones}\n\n`;
    }

    // Agregar observaciones SOLO si existen en BD (y no son el mensaje por defecto)
    if (terapia.observaciones && 
        terapia.observaciones !== 'Para información detallada de ejercicios y contraindicaciones, consulte con su terapeuta') {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                      OBSERVACIONES\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${terapia.observaciones}\n\n`;
    }

    // Agregar mis notas personales si existen
    if (seguimiento?.notas_individuales) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                   MIS NOTAS PERSONALES\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${seguimiento.notas_individuales}\n\n`;
    }

    // Información adicional de seguimiento
    if (seguimiento) {
      if (seguimiento.nivel_dolor_actual !== undefined || seguimiento.nivel_funcionalidad_actual !== undefined) {
        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `                     EVALUACIÓN ACTUAL\n`;
        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (seguimiento.nivel_dolor_actual !== undefined && seguimiento.nivel_dolor_actual > 0) {
          texto += `Nivel de dolor: ${seguimiento.nivel_dolor_actual}/10\n`;
        }
        if (seguimiento.nivel_funcionalidad_actual !== undefined && seguimiento.nivel_funcionalidad_actual > 0) {
          texto += `Funcionalidad: ${seguimiento.nivel_funcionalidad_actual}%\n`;
        }
        texto += '\n';
      }
    }

    // Tags si existen
    if (terapia.tags && Array.isArray(terapia.tags) && terapia.tags.length > 0) {
      texto += `Tags: ${terapia.tags.map((tag: string) => `#${tag}`).join(' ')}\n\n`;
    }

    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `Última actualización: ${this.formatDate(new Date().toISOString())}\n`;
    texto += `Generado por: rehabiMovement - Sistema de Rehabilitación\n`;
    texto += `ID de Terapia: ${terapia.id || seguimiento?.terapia_id || 'N/A'}\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    console.log('✅ Texto generado con datos reales de BD');
    return texto;
  }

  private crearTerapiaBasica(seguimiento: SeguimientoTerapiaSimplificado): any {
    return {
      id: seguimiento.terapia_id,
      nombre: seguimiento.terapia_nombre,
      descripcion: seguimiento.terapia_descripcion || 'Información detallada disponible con el terapeuta',
      tipo: seguimiento.terapia_tipo,
      nivel: seguimiento.terapia_nivel,
      duracion_estimada: seguimiento.duracion_estimada,
      area_especializacion: this.obtenerAreaEspecializacion(seguimiento.terapia_tipo),
      // NO generar ejercicios falsos - esperar datos reales de BD
      ejercicios: null,
      objetivo_principal: null,
      contraindicaciones: null,
      criterios_progresion: null,
      recomendaciones: null,
      observaciones: 'Para información detallada de ejercicios y contraindicaciones, consulte con su terapeuta'
    };
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

  getFileName(terapia: any | null): string {
    if (!terapia || !terapia.nombre) {
      return 'mi_terapia.txt';
    }
    return terapia.nombre.replace(/\s+/g, '_') + '_mi_terapia.txt';
  }

  // =====================================
  // FUNCIONES DE PORTAPAPELES
  // =====================================

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

  // =====================================
  // FUNCIONES DE OPTIMIZACIÓN
  // =====================================

  // TrackBy functions para optimización
  trackByDate(index: number, dia: DiaCalendario): string {
    return dia.fecha.toISOString();
  }

  trackByTerapia(index: number, terapia: TerapiaDelDia): any {
    return terapia.seguimiento.seguimiento_id || index;
  }

  // =====================================
  // FUNCIONES ADICIONALES DE UTILIDAD
  // =====================================

  // Obtener colores según el estado temporal para usar en el HTML
  getColorTerapia(seguimiento: SeguimientoTerapiaSimplificado): string {
    switch (seguimiento.estado_temporal) {
      case 'vigente':
        return 'bg-green-500 border-green-600';
      case 'pendiente':
        return 'bg-blue-500 border-blue-600';
      case 'vencida':
        return 'bg-red-500 border-red-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  }

  getColorTextoTerapia(seguimiento: SeguimientoTerapiaSimplificado): string {
    switch (seguimiento.estado_temporal) {
      case 'vigente':
        return 'text-green-700';
      case 'pendiente':
        return 'text-blue-700';
      case 'vencida':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  }

  getIconoEstado(seguimiento: SeguimientoTerapiaSimplificado): string {
    switch (seguimiento.estado_individual) {
      case 'completada':
        return '✓';
      case 'en_progreso':
        return '⏳';
      case 'pendiente':
        return '○';
      case 'abandonada':
        return '✗';
      default:
        return '○';
    }
  }

  formatearProgreso(progreso: number): string {
    return `${progreso}%`;
  }

  getTipoTerapiaCorto(tipo: string): string {
    switch (tipo.toLowerCase()) {
      case 'fisica':
        return 'FIS';
      case 'ocupacional':
        return 'OCP';
      case 'respiratoria':
        return 'RSP';
      case 'neurologica':
        return 'NEU';
      default:
        return tipo.substring(0, 3).toUpperCase();
    }
  }

  getDiasRestantesTexto(diasRestantes: number): string {
    if (diasRestantes < 0) {
      return `Vencida hace ${Math.abs(diasRestantes)} días`;
    } else if (diasRestantes === 0) {
      return 'Vence hoy';
    } else if (diasRestantes === 1) {
      return 'Vence mañana';
    } else {
      return `${diasRestantes} días restantes`;
    }
  }

  // =====================================
  // FUNCIONES DE EXPORTACIÓN
  // =====================================

  exportarTerapia(terapia: any, seguimiento?: SeguimientoTerapiaSimplificado): void {
    if (!terapia) {
      console.warn('No hay terapia para exportar');
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
    link.download = `${terapia.nombre.replace(/\s+/g, '_')}_mi_terapia.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Mi terapia exportada desde calendario:', terapia.nombre);
    this.mostrarNotificacionExito('Terapia exportada correctamente');
  }

  // Función para mostrar notificación de éxito (simple)
  private mostrarNotificacionExito(mensaje: string): void {
    // Mostrar brevemente el indicador de éxito
    this.copySuccess = true;
    setTimeout(() => {
      this.copySuccess = false;
    }, 2000);
  }

  // =====================================
  // FUNCIONES DE COMPATIBILIDAD HTML
  // =====================================

  // Función para usar en el HTML cuando necesite el color por estado
  getEstadoColorClass(estado: string): string {
    return this.getColorByEstado(estado);
  }

  // Función para usar en el HTML para colores de texto
  getEstadoTextColorClass(estado: string): string {
    switch (estado) {
      case 'vigente': return 'text-green-600';
      case 'pendiente': return 'text-blue-600';
      case 'vencida': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Función para determinar si una fecha está seleccionada (para futuras funcionalidades)
  esFechaSeleccionada(fecha: Date): boolean {
    return false; // Por ahora siempre false, se puede implementar selección de fechas
  }

  // Función para formatear fecha de manera legible
  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // =====================================
  // FUNCIONES DE DEBUG Y DESARROLLO
  // =====================================

  // Función para debug - mostrar información de terapias en consola
  debugTerapias(): void {
    console.log('🔍 DEBUG: Información del calendario de terapias');
    console.log('Total de terapias:', this.terapias.length);
    console.log('Mes actual:', this.meses[this.mesActual.getMonth()], this.mesActual.getFullYear());
    console.log('Días con terapias:', this.diasCalendario.filter(d => d.terapias.length > 0).length);
    
    this.terapias.forEach((terapia, index) => {
      console.log(`Terapia ${index + 1}:`, {
        nombre: terapia.terapia_nombre,
        tipo: terapia.terapia_tipo,
        estado: terapia.estado_temporal,
        progreso: terapia.progreso,
        inicio: terapia.fecha_inicio_programada,
        fin: terapia.fecha_fin_programada
      });
    });
  }

  // Función para verificar si hay terapias en un rango de fechas
  hayTerapiasEnRango(fechaInicio: Date, fechaFin: Date): boolean {
    return this.terapias.some(terapia => {
      const inicioTerapia = new Date(terapia.fecha_inicio_programada);
      const finTerapia = new Date(terapia.fecha_fin_programada);
      
      return (inicioTerapia >= fechaInicio && inicioTerapia <= fechaFin) ||
             (finTerapia >= fechaInicio && finTerapia <= fechaFin) ||
             (inicioTerapia <= fechaInicio && finTerapia >= fechaFin);
    });
  }
}