// src/app/calendario-rutinas/calendario-rutinas/calendario-rutinas.component.ts - CORREGIDO COMPLETO
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SeguimientoDetalladoExtendido } from '../../interfaces/mis-rutinas.interfaces';
import { 
  Rutina, 
  SeccionRutina, 
  SeccionInfo
} from '../../interfaces/rutinas.interfaces';

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

  // AGREGADO: Secciones disponibles para mostrar rutinas
  seccionesDisponibles: SeccionInfo[] = [
    { key: 'warm_up', nombre: 'Warm Up', descripcion: 'Calentamiento' },
    { key: 'met_con', nombre: 'Met-Con', descripcion: 'Metabolic Conditioning' },
    { key: 'strength', nombre: 'Strength', descripcion: 'Entrenamiento de Fuerza' },
    { key: 'core', nombre: 'Core', descripcion: 'Trabajo de Core' },
    { key: 'extra', nombre: 'Extra', descripcion: 'Trabajo Adicional' }
  ];

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
  // FIX (bug "rutina se repite todos los días"):
  // Antes pasábamos `fecha_inicio_programada` por `new Date(...)`, lo que en
  // strings tipo "2026-04-27" parsea como medianoche UTC y luego getDate()
  // usa zona local, desfasando el día en GMT-6. Aquí comparamos strings
  // directamente: la celda y la fecha de inicio siempre en formato YYYY-MM-DD.
  // Sólo aparece la rutina el día EXACTO de inicio, nunca a lo largo del rango.
  getRutinasDelDia(fecha: Date): RutinaDelDia[] {
    const rutinasDelDia: RutinaDelDia[] = [];
    const fechaStr = this.formatDateForComparison(fecha);

    this.rutinas.forEach(seguimiento => {
      const fechaInicioStr = this.normalizarFechaProgramada(seguimiento.fecha_inicio_programada);

      // SOLO agregar si es exactamente el día de inicio
      if (fechaInicioStr && fechaInicioStr === fechaStr) {
        rutinasDelDia.push({
          seguimiento,
          tipoEvento: 'inicio',
          enRango: true
        });
      }
    });

    return rutinasDelDia;
  }

  // Toma la fecha tal como viene de Supabase ("2026-04-27" o "2026-04-27T00:00:00+00:00")
  // y devuelve los primeros 10 caracteres (YYYY-MM-DD) sin pasar por Date()
  // para evitar el shift por zona horaria.
  private normalizarFechaProgramada(valor: string | null | undefined): string {
    if (!valor) return '';
    return String(valor).substring(0, 10);
  }

  formatDateForComparison(date: Date): string {
    // Asegurar que la fecha esté en formato YYYY-MM-DD para comparación consistente.
    // Usa componentes LOCALES (mismo huso que muestra la celda del calendario)
    // — clave para que comparen contra el normalizarFechaProgramada de arriba.
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
  // MÉTODOS DE UTILIDAD AGREGADOS
  // =====================================

  // AGREGADO: Método para obtener datos de sección
  getSeccionData(rutina: Rutina, seccionKey: string): SeccionRutina | undefined {
    return rutina[seccionKey] as SeccionRutina | undefined;
  }

  // AGREGADO: Método para obtener total de ejercicios
  getTotalEjercicios(rutina: Rutina): number {
    let total = 0;
    this.seccionesDisponibles.forEach(s => {
      const seccionData = this.getSeccionData(rutina, s.key);
      if (seccionData && seccionData.ejercicios) {
        total += seccionData.ejercicios.length;
      }
    });
    return total;
  }

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

  formatDuracion(minutos?: number): string {
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  getFileName(): string {
    if (!this.selectedRutina || !this.selectedRutina.nombre) {
      return 'rutina_calendario_rehabimovement.txt';
    }
    
    // Limpiar nombre para usar como filename
    const nombreLimpio = this.selectedRutina.nombre
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    
    const fecha = new Date().toISOString().split('T')[0];
    return `${nombreLimpio}_calendario_${fecha}_rehabimovement.txt`;
  }

  // =====================================
  // MÉTODO PRINCIPAL: getFormattedRutina MEJORADO
  // =====================================
  getFormattedRutina(rutina: Rutina | null, seguimiento?: SeguimientoDetalladoExtendido): string {
    console.log('🎨 Formateando rutina CALENDARIO con NUEVO FORMATO:', rutina?.nombre);
    
    if (!rutina) return '';

    let texto = '';
    
    // =====================================
    // HEADER PRINCIPAL CON DISEÑO MEJORADO
    // =====================================
    texto += '╔' + '═'.repeat(78) + '╗\n';
    texto += '║' + `🏋️  ${rutina.nombre.toUpperCase()}`.padEnd(78) + '║\n';
    texto += '╚' + '═'.repeat(78) + '╝\n';
    
    texto += `${rutina.descripcion || 'Rutina de entrenamiento completa'}\n\n`;
    
    // Información básica con iconos
    const nivelText = `Nivel: ${rutina.nivel.toUpperCase()}`;
    const duracionText = `Duración: ${this.formatDuracion(rutina.duracion_estimada)}`;
    const tipoText = `Tipo: ${rutina.tipo.toUpperCase()}`;
    
    texto += `🎯 ${nivelText} | ⏱️  ${duracionText} | 📋 ${tipoText}\n\n`;
    
    // =====================================
    // SECCIÓN DE MI PROGRESO (si hay seguimiento)
    // =====================================
    if (seguimiento) {
      texto += '┌' + '─'.repeat(78) + '┐\n';
      texto += '│' + `📊 MI PROGRESO`.padEnd(78) + '│\n';
      texto += '└' + '─'.repeat(78) + '┘\n';
      
      // Barra de progreso visual
      const progreso = seguimiento.progreso || 0;
      const barLength = 40;
      const filledLength = Math.round((progreso / 100) * barLength);
      const emptyLength = barLength - filledLength;
      const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
      
      texto += `Estado: ${seguimiento.estado_individual.toUpperCase()} (${progreso}%)\n`;
      texto += `Progreso: [${progressBar}] ${progreso}%\n`;
      texto += `Período: ${this.formatDate(seguimiento.fecha_inicio_programada)} → ${this.formatDate(seguimiento.fecha_fin_programada)}\n`;
      
      if (seguimiento.estado_temporal === 'vigente') {
        const diasIcon = seguimiento.dias_restantes > 7 ? '🟢' : seguimiento.dias_restantes > 0 ? '🟡' : '🔴';
        texto += `${diasIcon} Días restantes: ${seguimiento.dias_restantes}\n`;
      }
      
      if (seguimiento.fecha_inicio_real) {
        texto += `✅ Iniciado: ${this.formatDate(seguimiento.fecha_inicio_real)}\n`;
      }
      
      if (seguimiento.fecha_fin_real) {
        texto += `🎉 Completado: ${this.formatDate(seguimiento.fecha_fin_real)}\n`;
      }
      
      texto += '\n';
    }

    // =====================================
    // PLAN DE ENTRENAMIENTO CON FORMATO MEJORADO
    // =====================================
    texto += '╔' + '═'.repeat(78) + '╗\n';
    texto += '║' + `💪 PLAN DE ENTRENAMIENTO`.padEnd(78) + '║\n';
    texto += '╚' + '═'.repeat(78) + '╝\n\n';

    // Iconos para cada sección
    const iconosSecciones: { [key: string]: string } = {
      'warm_up': '🔥',
      'met_con': '💨',
      'strength': '🏋️',
      'core': '🎯',
      'extra': '✨'
    };

    // Procesar cada sección con formato mejorado
    const ordenSecciones = ['warm_up', 'met_con', 'strength', 'core', 'extra'];
    
    let seccionesEncontradas = 0;
    
    ordenSecciones.forEach((sectionKey, index) => {
      const seccionInfo = this.seccionesDisponibles.find((s: any) => s.key === sectionKey);
      const seccionData = this.getSeccionData(rutina, sectionKey);
      
      if (seccionData && seccionData.ejercicios && seccionData.ejercicios.length > 0 && seccionInfo) {
        seccionesEncontradas++;
        
        console.log(`📋 Procesando sección CALENDARIO: ${seccionInfo.nombre}`);
        
        // Header de sección con icono
        const icono = iconosSecciones[sectionKey] || '📋';
        texto += '┌' + '─'.repeat(76) + '┐\n';
        texto += '│ ' + `${icono} ${seccionInfo.nombre.toUpperCase()}`.padEnd(75) + '│\n';
        texto += '└' + '─'.repeat(76) + '┘\n';
        
        // Descripción de la sección si existe
        if (seccionData.descripcion) {
          texto += `📝 ${seccionData.descripcion}\n`;
        }
        
        // Información adicional de la sección con iconos
        const infoAdicional = [];
        if (seccionData.tiempo_total) infoAdicional.push(`⏱️  Tiempo: ${seccionData.tiempo_total}`);
        if (seccionData.series) infoAdicional.push(`🔄 Series: ${seccionData.series}`);
        if (seccionData.time_cap) infoAdicional.push(`⏰ Time Cap: ${seccionData.time_cap}`);
        
        // Usar propiedades que existen en SeccionRutina o acceder de forma segura
        const seccionAny = seccionData as any;
        if (seccionAny.rest_between_exercises) infoAdicional.push(`⏸️  Descanso: ${seccionAny.rest_between_exercises}`);
        if (seccionAny.rest_between_sets) infoAdicional.push(`💤 Descanso series: ${seccionAny.rest_between_sets}`);
        
        if (infoAdicional.length > 0) {
          texto += `${infoAdicional.join(' | ')}\n`;
        }
        
        texto += '─'.repeat(78) + '\n';
        
        // EJERCICIOS CON NUMERACIÓN Y FORMATO MEJORADO
        seccionData.ejercicios.forEach((ejercicio: any, ejercicioIndex: number) => {
          texto += `${(ejercicioIndex + 1).toString().padStart(2, '0')}. 🔹 ${ejercicio.nombre || 'Ejercicio'}\n`;
          
          // Detalles del ejercicio con iconos
          const detalles = [];
          if (ejercicio.repeticiones) detalles.push(`🔢 ${ejercicio.repeticiones} reps`);
          if (ejercicio.series) detalles.push(`🔄 ${ejercicio.series} series`);
          if (ejercicio.peso) detalles.push(`⚖️  ${ejercicio.peso}`);
          if (ejercicio.distancia) detalles.push(`📏 ${ejercicio.distancia}`);
          if (ejercicio.tiempo) detalles.push(`⏱️  ${ejercicio.tiempo}`);
          if (ejercicio.duracion) detalles.push(`⏳ ${ejercicio.duracion}`);
          
          if (detalles.length > 0) {
            texto += `    └─ ${detalles.join(' • ')}\n`;
          }
          
          // RPE si existe
          if (ejercicio.rpe) {
            texto += `    💪 RPE: ${ejercicio.rpe}/10\n`;
          }
          
          // Descanso si existe
          if (ejercicio.descanso) {
            texto += `    ⏸️  Descanso: ${ejercicio.descanso}\n`;
          }
          
          // Observaciones si existen
          if (ejercicio.observaciones) {
            texto += `    📝 ${ejercicio.observaciones}\n`;
          }
          
          // Notas adicionales si existen
          if (ejercicio.notas) {
            texto += `    💡 ${ejercicio.notas}\n`;
          }
          
          // Espaciado entre ejercicios
          if (ejercicioIndex < seccionData.ejercicios.length - 1) {
            texto += '\n';
          }
        });
        
        // Separador entre secciones
        if (index < ordenSecciones.length - 1 && seccionesEncontradas > 0) {
          texto += '\n' + '═'.repeat(78) + '\n\n';
        }
      }
    });

    // Si no se encontraron secciones con ejercicios
    if (seccionesEncontradas === 0) {
      console.log('⚠️ No se encontraron secciones con ejercicios en CALENDARIO');
      texto += `┌${'─'.repeat(76)}┐\n`;
      texto += `│ ℹ️  RUTINA EN DESARROLLO${' '.repeat(51)}│\n`;
      texto += `└${'─'.repeat(76)}┘\n`;
      texto += `Esta rutina está siendo desarrollada.\n`;
      texto += `Los ejercicios serán agregados próximamente.\n\n`;
    }

    // =====================================
    // MIS NOTAS PERSONALES
    // =====================================
    if (seguimiento?.notas_individuales) {
      texto += '┌' + '─'.repeat(78) + '┐\n';
      texto += '│' + `📝 MIS NOTAS PERSONALES`.padEnd(78) + '│\n';
      texto += '└' + '─'.repeat(78) + '┘\n';
      texto += `${seguimiento.notas_individuales}\n\n`;
    }

    // =====================================
    // TAGS DE LA RUTINA
    // =====================================
    if (rutina.tags && rutina.tags.length > 0) {
      texto += `🏷️  Tags: ${rutina.tags.map((tag: string) => `#${tag}`).join(' ')}\n\n`;
    }

    // =====================================
    // FOOTER CON RESUMEN E INFORMACIÓN DEL SISTEMA
    // =====================================
    texto += '╔' + '═'.repeat(78) + '╗\n';
    texto += '║' + `📱 rehabiMovement - Sistema de Entrenamiento`.padEnd(78) + '║\n';
    texto += '╠' + '═'.repeat(78) + '╣\n';
    
    // Resumen de la rutina
    const totalEjercicios = this.getTotalEjercicios(rutina);
    texto += '║' + `📈 RESUMEN: ${totalEjercicios} ejercicios total`.padEnd(78) + '║\n';
    
    if (rutina.duracion_estimada) {
      texto += '║' + `⏱️  Duración estimada: ${this.formatDuracion(rutina.duracion_estimada)}`.padEnd(78) + '║\n';
    }
    
    texto += '║' + `📅 Generado: ${this.formatDate(new Date().toISOString())}`.padEnd(78) + '║\n';
    texto += '║' + `🆔 ID Rutina: ${rutina.id || 'N/A'}`.padEnd(78) + '║\n';
    
    if (seguimiento) {
      texto += '║' + `👤 Atleta: ${seguimiento.full_name || seguimiento.username || 'N/A'}`.padEnd(78) + '║\n';
    }
    
    texto += '╚' + '═'.repeat(78) + '╝\n';

    console.log('✅ Nuevo formato CALENDARIO aplicado exitosamente!');
    return texto;
  }

  // =====================================
  // MÉTODOS PARA COPIAR Y EXPORTAR
  // =====================================

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copySuccess = true;
      console.log('Texto copiado al portapapeles desde calendario');
      
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

  exportarRutina(rutina: Rutina, seguimiento?: SeguimientoDetalladoExtendido): void {
    if (!rutina) {
      console.warn('No hay rutina para exportar desde calendario');
      return;
    }
    
    const texto = this.getFormattedRutina(rutina, seguimiento);
    if (!texto) {
      console.warn('No se pudo generar el contenido para exportar');
      return;
    }

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.getFileName();
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Rutina exportada desde calendario:', rutina.nombre);
  }

  // =====================================
  // TRACKBY FUNCTIONS PARA OPTIMIZACIÓN
  // =====================================

  trackByDate(index: number, dia: DiaCalendario): any {
    return dia.fecha.getTime();
  }

  trackByRutina(index: number, rutina: RutinaDelDia): any {
    return rutina.seguimiento.seguimiento_id;
  }
}