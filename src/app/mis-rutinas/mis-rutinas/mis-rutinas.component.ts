// src/app/mis-rutinas/mis-rutinas/mis-rutinas.component.ts - CORREGIDO
import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { SimpleRutinasService } from '../../services/simple-rutinas.service';
import { 
  Rutina, 
  SeccionRutina, 
  SeccionInfo,
  SeccionConEjercicios
} from '../../interfaces/rutinas.interfaces';
import { 
  SeguimientoDetalladoExtendido,
  EstadisticasPersonales,
  FiltrosMisRutinas
} from '../../interfaces/mis-rutinas.interfaces';

// Tipo para las vistas disponibles
type VistaRutinas = 'tarjetas' | 'calendario';

@Component({
  selector: 'app-mis-rutinas',
  standalone: false,
  templateUrl: './mis-rutinas.component.html',
  styleUrls: ['./mis-rutinas.component.css']
})
export class MisRutinasComponent implements OnInit {
  // Control de vistas - CALENDARIO COMO VISTA PREDETERMINADA
  vistaActual: VistaRutinas = 'calendario'; // ← CAMBIO AQUÍ: de 'tarjetas' a 'calendario'
  
  // Datos principales
  misRutinas: SeguimientoDetalladoExtendido[] = [];
  filteredRutinas: SeguimientoDetalladoExtendido[] = [];
  estadisticasPersonales?: EstadisticasPersonales;
  
  // Control de UI
  loading = false;
  error = '';
  showViewModal = false;
  selectedRutina: Rutina | null = null;
  selectedSeguimiento: SeguimientoDetalladoExtendido | null = null;
  copySuccess = false;

  // Filtros
  searchTerm = '';
  estadoFilter = 'all'; // all, vigente, vencida, pendiente
  estadoIndividualFilter = 'all'; // all, pendiente, en_progreso, completada
  progresoFilter = 'all'; // all, sin_iniciar, en_progreso, completado

  // Secciones disponibles para mostrar rutinas
  seccionesDisponibles: SeccionInfo[] = [
    { key: 'warm_up', nombre: 'Warm Up', descripcion: 'Calentamiento' },
    { key: 'met_con', nombre: 'Met-Con', descripcion: 'Metabolic Conditioning' },
    { key: 'strength', nombre: 'Strength', descripcion: 'Entrenamiento de Fuerza' },
    { key: 'core', nombre: 'Core', descripcion: 'Trabajo de Core' },
    { key: 'extra', nombre: 'Extra', descripcion: 'Trabajo Adicional' }
  ];

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private simpleRutinasService: SimpleRutinasService
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadMisRutinas(),
      this.loadEstadisticasPersonales()
    ]);
  }

  // =====================================
  // MÉTODOS DE CONTROL DE VISTAS
  // =====================================
  
  cambiarVista(vista: VistaRutinas): void {
    console.log('Cambiando vista a:', vista);
    this.vistaActual = vista;
  }

  get mostrarVistaTarjetas(): boolean {
    return this.vistaActual === 'tarjetas';
  }

  get mostrarVistaCalendario(): boolean {
    return this.vistaActual === 'calendario';
  }

  onVolverDeCalendario(): void {
    this.cambiarVista('tarjetas');
  }

  // Método para manejar la apertura de rutina desde el calendario
  onAbrirRutinaDesdeCalendario(seguimiento: SeguimientoDetalladoExtendido): void {
    this.openViewModal(seguimiento);
  }

  // =====================================
  // MÉTODOS EXISTENTES
  // =====================================

  async loadMisRutinas(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      console.log('Cargando rutinas asignadas al usuario...');
      
      // Usar el servicio simplificado
      const seguimientos = await this.simpleRutinasService.getRutinasUsuarioSimple();
      
      // Transformar datos al formato esperado
      this.misRutinas = seguimientos.map((item: any) => {
        const asignacion = item.rutina_asignaciones_masivas;
        const rutina = item.rutinas;
        
        // Calcular estado temporal
        const { estado, diasRestantes } = this.simpleRutinasService.calcularEstadoTemporal(
          asignacion.fecha_inicio,
          asignacion.fecha_fin
        );

        return {
          seguimiento_id: item.id,
          asignacion_id: item.id_asignacion_masiva,
          id_profile: item.id_profile,
          username: this.authService.getCurrentUser()?.username || '',
          full_name: this.authService.getCurrentUser()?.full_name || '',
          rutina_nombre: rutina.nombre,
          rutina_id: rutina.id,
          rutina_descripcion: rutina.descripcion,
          rutina_tipo: rutina.tipo,
          rutina_nivel: rutina.nivel,
          rutina_duracion: rutina.duracion_estimada,
          rutina_tags: rutina.tags,
          rutina_completa: rutina,
          progreso: item.progreso,
          estado_individual: item.estado_individual,
          fecha_inicio_real: item.fecha_inicio_real,
          fecha_fin_real: item.fecha_fin_real,
          fecha_inicio_programada: asignacion.fecha_inicio,
          fecha_fin_programada: asignacion.fecha_fin,
          notas_individuales: item.notas_individuales,
          estado_temporal: estado,
          dias_restantes: diasRestantes
        };
      });
      
      this.filteredRutinas = [...this.misRutinas];
      this.applyFilters();
      
      console.log('Mis rutinas cargadas:', this.misRutinas.length);
    } catch (error) {
      console.error('Error cargando mis rutinas:', error);
      this.error = 'Error al cargar tus rutinas asignadas';
      this.misRutinas = [];
      this.filteredRutinas = [];
    } finally {
      this.loading = false;
    }
  }

  async loadEstadisticasPersonales(): Promise<void> {
    try {
      if (this.misRutinas.length === 0) return;

      const total = this.misRutinas.length;
      const vigentes = this.misRutinas.filter(r => r.estado_temporal === 'vigente').length;
      const completadas = this.misRutinas.filter(r => r.estado_individual === 'completada').length;
      const enProgreso = this.misRutinas.filter(r => r.estado_individual === 'en_progreso').length;
      const pendientes = this.misRutinas.filter(r => r.estado_individual === 'pendiente').length;
      const vencidas = this.misRutinas.filter(r => r.estado_temporal === 'vencida').length;
      
      const progresoTotal = this.misRutinas.reduce((sum, r) => sum + r.progreso, 0);
      const progresoPromedio = total > 0 ? Math.round(progresoTotal / total) : 0;

      this.estadisticasPersonales = {
        total_rutinas_asignadas: total,
        rutinas_vigentes: vigentes,
        rutinas_completadas: completadas,
        rutinas_en_progreso: enProgreso,
        rutinas_pendientes: pendientes,
        rutinas_vencidas: vencidas,
        progreso_promedio: progresoPromedio,
        racha_actual: 0, // TODO: Implementar cálculo de racha
        mejor_racha: 0   // TODO: Implementar cálculo de mejor racha
      };
    } catch (error) {
      console.error('Error calculando estadísticas personales:', error);
    }
  }

  applyFilters(): void {
    let filtered = [...this.misRutinas];

    // Filtro por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(rutina => 
        rutina.rutina_nombre.toLowerCase().includes(term) ||
        rutina.rutina_descripcion?.toLowerCase().includes(term) ||
        rutina.rutina_tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Filtro por estado temporal
    if (this.estadoFilter !== 'all') {
      filtered = filtered.filter(rutina => rutina.estado_temporal === this.estadoFilter);
    }

    // Filtro por estado individual
    if (this.estadoIndividualFilter !== 'all') {
      filtered = filtered.filter(rutina => rutina.estado_individual === this.estadoIndividualFilter);
    }

    // Filtro por progreso
    if (this.progresoFilter !== 'all') {
      switch (this.progresoFilter) {
        case 'sin_iniciar':
          filtered = filtered.filter(rutina => rutina.progreso === 0);
          break;
        case 'en_progreso':
          filtered = filtered.filter(rutina => rutina.progreso > 0 && rutina.progreso < 100);
          break;
        case 'completado':
          filtered = filtered.filter(rutina => rutina.progreso === 100);
          break;
      }
    }

    this.filteredRutinas = filtered;
  }

  // Modal para ver rutina completa
  async openViewModal(seguimiento: SeguimientoDetalladoExtendido): Promise<void> {
    console.log('Abriendo modal para ver rutina:', seguimiento.rutina_nombre);
    
    this.selectedSeguimiento = seguimiento;
    
    // Si tenemos la rutina completa guardada, usarla
    if (seguimiento.rutina_completa) {
      this.selectedRutina = seguimiento.rutina_completa;
    } else {
      // Si no, cargar la rutina completa
      try {
        const { data: rutina, error } = await this.supabaseService.client
          .from('rutinas')
          .select('*')
          .eq('id', seguimiento.rutina_id)
          .single();

        if (error) throw error;
        this.selectedRutina = rutina;
      } catch (error) {
        console.error('Error cargando rutina completa:', error);
        this.error = 'Error al cargar los detalles de la rutina';
        return;
      }
    }
    
    this.showViewModal = true;
  }

  closeViewModal(): void {
    console.log('Cerrando modal de vista');
    this.showViewModal = false;
    this.selectedRutina = null;
    this.selectedSeguimiento = null;
    this.copySuccess = false;
  }

  // Actualizar progreso propio
  async actualizarMiProgreso(seguimiento: SeguimientoDetalladoExtendido, nuevoProgreso: number): Promise<void> {
    try {
      const success = await this.simpleRutinasService.actualizarProgresoSimple(
        seguimiento.seguimiento_id,
        nuevoProgreso
      );

      if (success) {
        // Actualizar localmente
        seguimiento.progreso = nuevoProgreso;
        
        // Determinar nuevo estado basado en progreso
        if (nuevoProgreso === 0) {
          seguimiento.estado_individual = 'pendiente';
        } else if (nuevoProgreso < 100) {
          seguimiento.estado_individual = 'en_progreso';
          if (!seguimiento.fecha_inicio_real) {
            seguimiento.fecha_inicio_real = new Date().toISOString().split('T')[0];
          }
        } else {
          seguimiento.estado_individual = 'completada';
          seguimiento.fecha_fin_real = new Date().toISOString().split('T')[0];
        }

        // Recalcular estadísticas
        await this.loadEstadisticasPersonales();
      }
    } catch (error) {
      console.error('Error actualizando progreso:', error);
      this.error = 'Error al actualizar el progreso';
      setTimeout(() => this.error = '', 5000);
    }
  }

  // Métodos de utilidad para mostrar rutinas (similares al componente rutinas)
  getSeccionData(rutina: Rutina, seccionKey: string): SeccionRutina | undefined {
    return rutina[seccionKey] as SeccionRutina | undefined;
  }

  getSeccionesConEjercicios(rutina: Rutina): SeccionConEjercicios[] {
    const secciones: SeccionConEjercicios[] = [];
    
    this.seccionesDisponibles.forEach(s => {
      const seccionData = this.getSeccionData(rutina, s.key);
      if (seccionData && seccionData.ejercicios && seccionData.ejercicios.length > 0) {
        secciones.push({
          key: s.key,
          nombre: s.nombre,
          seccion: seccionData
        });
      }
    });
    
    return secciones;
  }

  formatDuracion(minutos?: number): string {
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

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

// REEMPLAZA COMPLETAMENTE el método getFormattedRutina con este código:
getFormattedRutina(rutina: Rutina | null, seguimiento?: SeguimientoDetalladoExtendido): string {
  console.log('🎨 Formateando rutina con NUEVO FORMATO:', rutina?.nombre); // Debug
  
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

  // Iconos para cada sección - CORREGIDO CON TIPADO ADECUADO
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
    const seccionInfo = this.seccionesDisponibles.find(s => s.key === sectionKey);
    const seccionData = this.getSeccionData(rutina, sectionKey);
    
    if (seccionData && seccionData.ejercicios && seccionData.ejercicios.length > 0 && seccionInfo) {
      seccionesEncontradas++;
      
      console.log(`📋 Procesando sección: ${seccionInfo.nombre}`); // Debug
      
      // Header de sección con icono
      const icono = iconosSecciones[sectionKey] || '📋';
      texto += '┌' + '─'.repeat(76) + '┐\n';
      texto += '│ ' + `${icono} ${seccionInfo.nombre.toUpperCase()}`.padEnd(75) + '│\n';
      texto += '└' + '─'.repeat(76) + '┘\n';
      
      // Descripción de la sección si existe
      if (seccionData.descripcion) {
        texto += `📝 ${seccionData.descripcion}\n`;
      }
      
      // Información adicional de la sección con iconos - CORREGIDAS LAS PROPIEDADES
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
    console.log('⚠️ No se encontraron secciones con ejercicios'); // Debug
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

  console.log('✅ Nuevo formato aplicado exitosamente!'); // Debug
  return texto;
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

  safeExportRutina(seguimiento: SeguimientoDetalladoExtendido): void {
    const rutina = seguimiento.rutina_completa || this.selectedRutina;
    if (rutina) {
      this.exportarRutina(rutina, seguimiento);
    } else {
      console.warn('No hay rutina disponible para exportar');
    }
  }

  safeCopyToClipboard(seguimiento: SeguimientoDetalladoExtendido): void {
    const rutina = seguimiento.rutina_completa || this.selectedRutina;
    if (rutina) {
      const texto = this.getFormattedRutina(rutina, seguimiento);
      this.copyToClipboard(texto);
    } else {
      console.warn('No hay rutina disponible para copiar');
    }
  }

  // Exportar rutina - CORREGIDA PARA MANEJAR TIPOS NULL
  exportarRutina(rutina: Rutina | null, seguimiento?: SeguimientoDetalladoExtendido): void {
    if (!rutina) {
      console.warn('No hay rutina para exportar');
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
    link.download = `${rutina.nombre.replace(/\s+/g, '_')}_mi_rutina.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Mi rutina exportada:', rutina.nombre);
  }

  // Métodos de filtrado y utilidad
  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.estadoFilter = 'all';
    this.estadoIndividualFilter = 'all';
    this.progresoFilter = 'all';
    this.applyFilters();
  }

  async refreshMisRutinas(): Promise<void> {
    await Promise.all([
      this.loadMisRutinas(),
      this.loadEstadisticasPersonales()
    ]);
  }

  // Métodos de utilidad para colores y estados
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

  // Método mejorado para generar nombres de archivo descriptivos para rutinas
getFileName(rutina: Rutina | null): string {
  if (!rutina || !rutina.nombre) {
    return 'mi_rutina_rehabimovement.txt';
  }
  
  // Limpiar nombre para usar como filename
  const nombreLimpio = rutina.nombre
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales excepto guiones y espacios
    .replace(/\s+/g, '_')     // Reemplazar espacios con guiones bajos
    .substring(0, 30);        // Limitar longitud
  
  const tipo = rutina.tipo ? `_${rutina.tipo}` : '';
  const nivel = rutina.nivel ? `_${rutina.nivel}` : '';
  const fecha = new Date().toISOString().split('T')[0];
  
  return `${nombreLimpio}${tipo}${nivel}_${fecha}_rehabimovement.txt`;
}

  // TrackBy functions para optimización
  trackByRutinaId(index: number, rutina: SeguimientoDetalladoExtendido): any {
    return rutina.seguimiento_id || index;
  }
}