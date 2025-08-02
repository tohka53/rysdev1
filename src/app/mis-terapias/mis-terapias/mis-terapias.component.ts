// src/app/mis-terapias/mis-terapias.component.ts - MODIFICADO CON CALENDARIO
import { Component, OnInit } from '@angular/core';
import { TerapiasService } from '../../services/terapias.service';
import { AuthService } from '../../services/auth.service';
import { 
  TerapiaAsignadaUsuario,
  EstadisticasTerapias
} from '../../interfaces/terapias.interfaces';

// Interfaces locales simplificadas
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

interface EstadisticasPersonalesTerapias {
  total_terapias_asignadas: number;
  terapias_vigentes: number;
  terapias_completadas: number;
  terapias_en_progreso: number;
  terapias_pendientes: number;
  terapias_vencidas: number;
  progreso_promedio: number;
  adherencia_promedio: number;
  sesiones_completadas_total: number;
}

// Tipo para las vistas disponibles
type VistaTerapias = 'tarjetas' | 'calendario';

@Component({
  selector: 'app-mis-terapias',
  standalone: false,
  templateUrl: './mis-terapias.component.html',
  styleUrls: ['./mis-terapias.component.css']
})
export class MisTerapiasComponent implements OnInit {
  // Control de vistas - CALENDARIO COMO VISTA ADICIONAL
  vistaActual: VistaTerapias = 'tarjetas'; // Vista por defecto: tarjetas
  
  // Datos principales
  misTerapias: SeguimientoTerapiaSimplificado[] = [];
  filteredTerapias: SeguimientoTerapiaSimplificado[] = [];
  estadisticasPersonales?: EstadisticasPersonalesTerapias;
  
  // Control de UI
  loading = false;
  error = '';
  showViewModal = false;
  selectedTerapia: any = null;
  selectedSeguimiento: SeguimientoTerapiaSimplificado | null = null;
  copySuccess = false;

  // Sistema de notificaciones
  mensaje: string = '';
  tipoMensaje: 'success' | 'error' | 'info' | 'warning' = 'info';
  mostrarMensaje = false;

  // Filtros simplificados
  searchTerm = '';
  estadoFilter = 'all'; // all, vigente, vencida, pendiente
  estadoIndividualFilter = 'all'; // all, pendiente, en_progreso, completada
  progresoFilter = 'all'; // all, sin_iniciar, en_progreso, completado

  constructor(
    private terapiasService: TerapiasService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadMisTerapias(),
      this.loadEstadisticasPersonales()
    ]);
  }

  // =====================================
  // CONTROL DE VISTAS
  // =====================================

  get mostrarVistaTarjetas(): boolean {
    return this.vistaActual === 'tarjetas';
  }

  get mostrarVistaCalendario(): boolean {
    return this.vistaActual === 'calendario';
  }

  onCambiarACalendario(): void {
    console.log('Cambiando a vista de calendario');
    this.vistaActual = 'calendario';
  }

  onVolverDeCalendario(): void {
    console.log('Volviendo de calendario a tarjetas');
    this.vistaActual = 'tarjetas';
  }

  onAbrirTerapiaDesdeCalendario(seguimiento: SeguimientoTerapiaSimplificado): void {
    console.log('Abriendo terapia desde calendario:', seguimiento.terapia_nombre);
    // Cambiar a vista de tarjetas y abrir el modal
    this.vistaActual = 'tarjetas';
    setTimeout(() => {
      this.openViewModal(seguimiento);
    }, 100);
  }

  // =====================================
  // CARGA DE DATOS (MANTENER ORIGINAL)
  // =====================================

  async loadMisTerapias(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      console.log('Cargando terapias asignadas al usuario...');
      
      // Obtener el usuario actual
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('No se pudo obtener el usuario actual');
      }

      console.log('Usuario actual:', currentUser.id);

      let seguimientos: TerapiaAsignadaUsuario[] = [];

      try {
        // Intentar usar el método general pero filtrar por usuario
        const todasLasTerapias = await this.terapiasService.getTerapiasAsignadasUsuarios();
        
        // Filtrar solo las terapias del usuario actual
        seguimientos = todasLasTerapias.filter(item => item.id_profile === currentUser.id);
        
        console.log('Terapias filtradas para el usuario:', seguimientos.length);
      } catch (serviceError) {
        console.warn('Error con el servicio principal, intentando método alternativo:', serviceError);
        
        // Método de respaldo: usar datos simulados o método alternativo
        seguimientos = await this.loadTerapiasAlternativo(currentUser.id);
      }
      
      // Transformar datos al formato simplificado
      this.misTerapias = seguimientos.map((item: TerapiaAsignadaUsuario) => {
        // Convertir fechas a strings si son Date objects
        const fechaInicioStr = this.convertirFechaAString(item.fecha_inicio_programada);
        const fechaFinStr = this.convertirFechaAString(item.fecha_fin_programada);
        
        // Calcular estado temporal y días restantes
        const { estado, diasRestantes } = this.calcularEstadoTemporal(
          fechaInicioStr,
          fechaFinStr
        );

        return {
          seguimiento_id: item.seguimiento_id,
          asignacion_id: item.asignacion_id,
          id_profile: item.id_profile,
          username: item.username || currentUser.username || '',
          full_name: item.full_name || currentUser.full_name || '',
          terapia_nombre: item.terapia_nombre,
          terapia_id: item.id_terapia || 0,
          terapia_descripcion: item.terapia_descripcion,
          terapia_tipo: item.terapia_tipo,
          terapia_nivel: item.terapia_nivel,
          duracion_estimada: item.duracion_estimada,
          progreso: item.progreso || 0,
          estado_individual: item.estado_individual || 'pendiente',
          fecha_inicio_real: this.convertirFechaAString(item.fecha_inicio_real),
          fecha_fin_real: this.convertirFechaAString(item.fecha_fin_real),
          fecha_inicio_programada: fechaInicioStr,
          fecha_fin_programada: fechaFinStr,
          notas_individuales: item.notas_individuales,
          estado_temporal: estado,
          dias_restantes: diasRestantes,
          sesiones_completadas: item.sesiones_completadas || 0,
          sesiones_programadas: item.sesiones_programadas || 0,
          adherencia_porcentaje: item.adherencia_porcentaje || 0,
          nivel_dolor_actual: item.nivel_dolor_actual || 0,
          nivel_funcionalidad_actual: item.nivel_funcionalidad_actual || 0
        };
      });
      
      this.filteredTerapias = [...this.misTerapias];
      this.applyFilters();
      
      console.log('Mis terapias cargadas:', this.misTerapias.length);
    } catch (error) {
      console.error('Error cargando mis terapias:', error);
      this.error = 'Error al cargar tus terapias asignadas';
      this.misTerapias = [];
      this.filteredTerapias = [];
    } finally {
      this.loading = false;
    }
  }

  // Método alternativo en caso de que el servicio principal falle
  private async loadTerapiasAlternativo(userId: number): Promise<TerapiaAsignadaUsuario[]> {
    try {
      console.log('Usando método alternativo para cargar terapias...');
      
      // Por ahora retornamos una lista vacía, pero aquí podrías:
      // 1. Hacer una consulta directa a Supabase
      // 2. Usar datos simulados para desarrollo
      // 3. Implementar otra lógica de respaldo
      
      return [];
    } catch (error) {
      console.error('Error en método alternativo:', error);
      return [];
    }
  }

  async loadEstadisticasPersonales(): Promise<void> {
    try {
      if (this.misTerapias.length === 0) return;

      const total = this.misTerapias.length;
      const vigentes = this.misTerapias.filter(t => t.estado_temporal === 'vigente').length;
      const completadas = this.misTerapias.filter(t => t.estado_individual === 'completada').length;
      const enProgreso = this.misTerapias.filter(t => t.estado_individual === 'en_progreso').length;
      const pendientes = this.misTerapias.filter(t => t.estado_individual === 'pendiente').length;
      const vencidas = this.misTerapias.filter(t => t.estado_temporal === 'vencida').length;
      
      const progresoTotal = this.misTerapias.reduce((sum, t) => sum + t.progreso, 0);
      const progresoPromedio = total > 0 ? Math.round(progresoTotal / total) : 0;
      
      const adherenciaTotal = this.misTerapias.reduce((sum, t) => sum + (t.adherencia_porcentaje || 0), 0);
      const adherenciaPromedio = total > 0 ? Math.round(adherenciaTotal / total) : 0;
      
      const sesionesCompletadas = this.misTerapias.reduce((sum, t) => sum + (t.sesiones_completadas || 0), 0);

      this.estadisticasPersonales = {
        total_terapias_asignadas: total,
        terapias_vigentes: vigentes,
        terapias_completadas: completadas,
        terapias_en_progreso: enProgreso,
        terapias_pendientes: pendientes,
        terapias_vencidas: vencidas,
        progreso_promedio: progresoPromedio,
        adherencia_promedio: adherenciaPromedio,
        sesiones_completadas_total: sesionesCompletadas
      };
    } catch (error) {
      console.error('Error calculando estadísticas personales:', error);
    }
  }

  applyFilters(): void {
    let filtered = [...this.misTerapias];

    // Filtro por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(terapia => 
        terapia.terapia_nombre.toLowerCase().includes(term) ||
        terapia.terapia_descripcion?.toLowerCase().includes(term) ||
        terapia.terapia_tipo.toLowerCase().includes(term)
      );
    }

    // Filtro por estado temporal
    if (this.estadoFilter !== 'all') {
      filtered = filtered.filter(terapia => terapia.estado_temporal === this.estadoFilter);
    }

    // Filtro por estado individual
    if (this.estadoIndividualFilter !== 'all') {
      filtered = filtered.filter(terapia => terapia.estado_individual === this.estadoIndividualFilter);
    }

    // Filtro por progreso
    if (this.progresoFilter !== 'all') {
      switch (this.progresoFilter) {
        case 'sin_iniciar':
          filtered = filtered.filter(terapia => terapia.progreso === 0);
          break;
        case 'en_progreso':
          filtered = filtered.filter(terapia => terapia.progreso > 0 && terapia.progreso < 100);
          break;
        case 'completado':
          filtered = filtered.filter(terapia => terapia.progreso === 100);
          break;
      }
    }

    this.filteredTerapias = filtered;
  }

  // =====================================
  // MODAL Y ACCIONES (MANTENER ORIGINAL)
  // =====================================

  // Modal para ver terapia completa
  async openViewModal(seguimiento: SeguimientoTerapiaSimplificado): Promise<void> {
    console.log('Abriendo modal para ver terapia:', seguimiento.terapia_nombre);
    
    this.selectedSeguimiento = seguimiento;
    
    // Intentar cargar la terapia completa desde el servicio
    try {
      // Buscar la terapia completa usando el ID
      const terapiaCompleta = await this.cargarTerapiaCompleta(seguimiento.terapia_id);
      
      if (terapiaCompleta) {
        this.selectedTerapia = terapiaCompleta;
      } else {
        // Si no se puede cargar, crear una terapia básica con la información disponible
        this.selectedTerapia = this.crearTerapiaBasica(seguimiento);
      }
    } catch (error) {
      console.error('Error cargando terapia completa:', error);
      // Usar la información básica disponible
      this.selectedTerapia = this.crearTerapiaBasica(seguimiento);
    }
    
    this.showViewModal = true;
  }

  private async cargarTerapiaCompleta(terapiaId: number): Promise<any> {
    try {
      console.log('Cargando terapia completa para ID:', terapiaId);
      
      // Cargar la terapia completa desde la base de datos
      const terapia = await this.terapiasService.getTerapiaById(terapiaId);
      
      if (terapia) {
        console.log('Terapia cargada desde BD:', terapia);
        return terapia;
      }
      
      return null;
    } catch (error) {
      console.error('Error al cargar terapia completa:', error);
      return null;
    }
  }

  private crearTerapiaBasica(seguimiento: SeguimientoTerapiaSimplificado): any {
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
          },
          { 
            nombre: 'Flexión anterior asistida', 
            descripcion: 'Elevación del brazo hacia adelante con ayuda',
            series: '2 series x 12 repeticiones',
            duracion: '1:30'
          }
        ];
      case 'ocupacional':
        return [
          { 
            nombre: 'Coordinación fina', 
            descripcion: 'Ejercicios de precisión con objetos pequeños',
            duracion: '15:00',
            observaciones: 'Aumentar dificultad gradualmente'
          },
          { 
            nombre: 'Actividades funcionales', 
            descripcion: 'Simulación de tareas cotidianas',
            duracion: '20:00',
            series: '3 repeticiones de cada actividad'
          },
          { 
            nombre: 'Adaptación del entorno', 
            descripcion: 'Práctica con ayudas técnicas',
            duracion: '10:00'
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
          },
          { 
            nombre: 'Expansión costal', 
            descripcion: 'Ejercicios para expandir la caja torácica',
            series: '3 series x 8 repeticiones',
            duracion: '3:00'
          },
          { 
            nombre: 'Aclaramiento de secreciones', 
            descripcion: 'Técnicas para movilizar mucosidad',
            duracion: '10:00',
            observaciones: 'Realizar después de nebulización si es necesario'
          }
        ];
      case 'neurologica':
        return [
          { 
            nombre: 'Control postural', 
            descripcion: 'Ejercicios de estabilización y equilibrio',
            duracion: '15:00',
            series: '3 series x 5 repeticiones'
          },
          { 
            nombre: 'Coordinación bilateral', 
            descripcion: 'Movimientos coordinados de ambos lados del cuerpo',
            series: '4 series x 10 repeticiones',
            duracion: '8:00'
          },
          { 
            nombre: 'Marcha funcional', 
            descripcion: 'Práctica de patrones de caminata',
            duracion: '20:00',
            observaciones: 'Con asistencia según necesidad'
          }
        ];
      default:
        return [
          { 
            nombre: 'Ejercicio terapéutico personalizado', 
            descripcion: 'Ejercicio adaptado según evaluación individual',
            duracion: '15:00',
            observaciones: 'Ajustar según tolerancia'
          },
          { 
            nombre: 'Técnicas de rehabilitación', 
            descripcion: 'Aplicación de métodos especializados',
            duracion: '20:00',
            series: '2-3 repeticiones según protocolo'
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

  closeViewModal(): void {
    console.log('Cerrando modal de vista');
    this.showViewModal = false;
    this.selectedTerapia = null;
    this.selectedSeguimiento = null;
    this.copySuccess = false;
  }

  // Actualizar progreso propio
  async actualizarMiProgreso(seguimiento: SeguimientoTerapiaSimplificado, nuevoProgreso: number): Promise<void> {
    try {
      const success = await this.terapiasService.actualizarProgresoTerapia(
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
      );

      if (success) {
        // Actualizar localmente
        seguimiento.progreso = nuevoProgreso;
        
        // Determinar nuevo estado basado en progreso
        seguimiento.estado_individual = this.determinarEstadoPorProgreso(nuevoProgreso);
        
        // Actualizar fechas si es necesario
        if (nuevoProgreso > 0 && !seguimiento.fecha_inicio_real) {
          seguimiento.fecha_inicio_real = new Date().toISOString().split('T')[0];
        }
        if (nuevoProgreso === 100) {
          seguimiento.fecha_fin_real = new Date().toISOString().split('T')[0];
        }

        // Recalcular estadísticas
        await this.loadEstadisticasPersonales();
        this.mostrarNotificacion('Progreso actualizado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error actualizando progreso:', error);
      this.error = 'Error al actualizar el progreso';
      this.mostrarNotificacion('Error al actualizar el progreso', 'error');
      setTimeout(() => this.error = '', 5000);
    }
  }

  // =====================================
  // MÉTODOS AUXILIARES (MANTENER ORIGINAL)
  // =====================================

  // Método auxiliar para convertir fechas
  private convertirFechaAString(fecha: string | Date | undefined): string {
    if (!fecha) return '';
    if (fecha instanceof Date) {
      return fecha.toISOString().split('T')[0];
    }
    return fecha;
  }

  // Calcular estado temporal
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

  // Formatear terapia para el modal - VERSIÓN MEJORADA
  getFormattedTerapia(terapia: any | null, seguimiento?: SeguimientoTerapiaSimplificado): string {
    console.log('getFormattedTerapia llamado con:', { terapia, seguimiento });
    
    if (!terapia && !seguimiento) {
      console.warn('No hay datos de terapia ni seguimiento');
      return 'No hay información disponible para mostrar.';
    }

    // Si no hay terapia pero sí seguimiento, crear una terapia básica
    if (!terapia && seguimiento) {
      terapia = this.crearTerapiaBasica(seguimiento);
    }

    let texto = `${terapia.nombre || seguimiento?.terapia_nombre || 'Terapia sin nombre'}\n`;
    texto += `${terapia.descripcion || seguimiento?.terapia_descripcion || 'Programa de rehabilitación personalizada'}\n`;
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

    // Agregar objetivo principal si existe
    if (terapia.objetivo_principal) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                      OBJETIVO PRINCIPAL\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${terapia.objetivo_principal}\n\n`;
    }

    // Procesar ejercicios de la base de datos (JSONB) o generar ejercicios básicos
    if (terapia.ejercicios && typeof terapia.ejercicios === 'object') {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                      PLAN DE EJERCICIOS\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const seccionesOrdenadas = ['calentamiento', 'fortalecimiento', 'equilibrio', 'coordinacion', 'estiramiento', 'respiracion'];
      
      seccionesOrdenadas.forEach(seccionKey => {
        const seccion = terapia.ejercicios[seccionKey];
        
        if (seccion && seccion.ejercicios && seccion.ejercicios.length > 0) {
          texto += `${seccionKey.toUpperCase()}\n`;
          texto += `${'─'.repeat(seccionKey.length)}\n`;
          
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
    } else {
      // Si no hay ejercicios en JSONB, usar ejercicios generados
      const ejerciciosGenerados = this.generarEjerciciosBasicos(seguimiento?.terapia_tipo || terapia.tipo || 'general');
      
      if (ejerciciosGenerados && ejerciciosGenerados.length > 0) {
        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `                      PLAN DE EJERCICIOS\n`;
        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        ejerciciosGenerados.forEach((ejercicio: any, index: number) => {
          texto += `${index + 1}. ${ejercicio.nombre}\n`;
          
          if (ejercicio.descripcion) {
            texto += `   ${ejercicio.descripcion}\n`;
          }
          
          if (ejercicio.series) {
            texto += `   ${ejercicio.series}\n`;
          }
          
          if (ejercicio.duracion) {
            texto += `   Duración: ${ejercicio.duracion}\n`;
          }
          
          if (ejercicio.observaciones) {
            texto += `   📝 ${ejercicio.observaciones}\n`;
          }
          
          texto += '\n';
        });
      } else {
        // Plan de tratamiento genérico
        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `                    PLAN DE TRATAMIENTO\n`;
        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        texto += `1. Evaluación inicial y establecimiento de objetivos\n`;
        texto += `2. Programa de ejercicios adaptado al nivel del paciente\n`;
        texto += `3. Progresión gradual según tolerancia y evolución\n`;
        texto += `4. Reevaluación periódica y ajustes del programa\n`;
        texto += `5. Educación del paciente y recomendaciones para el hogar\n\n`;
      }
    }

    // Agregar contraindicaciones si existen
    if (terapia.contraindicaciones) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                     CONTRAINDICACIONES\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${terapia.contraindicaciones}\n\n`;
    }

    // Agregar criterios de progresión
    if (terapia.criterios_progresion) {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `                   CRITERIOS DE PROGRESIÓN\n`;
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      texto += `${terapia.criterios_progresion}\n\n`;
    }

    // Agregar mis notas si existen
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
        
        if (seguimiento.nivel_dolor_actual !== undefined) {
          texto += `Nivel de dolor: ${seguimiento.nivel_dolor_actual}/10\n`;
        }
        if (seguimiento.nivel_funcionalidad_actual !== undefined) {
          texto += `Funcionalidad: ${seguimiento.nivel_funcionalidad_actual}%\n`;
        }
        texto += '\n';
      }
    }

    // Tags si existen
    if (terapia.tags && terapia.tags.length > 0) {
      texto += `Tags: ${terapia.tags.map((tag: string) => `#${tag}`).join(' ')}\n\n`;
    }

    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `Última actualización: ${this.formatDate(new Date().toISOString())}\n`;
    texto += `Generado por: rehabiMovement - Sistema de Rehabilitación\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    console.log('Texto generado:', texto.substring(0, 200) + '...');
    return texto;
  }

  getFileName(terapia: any | null): string {
    if (!terapia || !terapia.nombre) {
      return 'mi_terapia.txt';
    }
    return terapia.nombre.replace(/\s+/g, '_') + '_mi_terapia.txt';
  }

  // [TODOS LOS DEMÁS MÉTODOS ORIGINALES SE MANTIENEN IGUAL]

  // Exportar terapia
  safeExportTerapia(seguimiento: SeguimientoTerapiaSimplificado): void {
    const terapia = seguimiento.terapia_completa || this.selectedTerapia || {
      nombre: seguimiento.terapia_nombre,
      descripcion: seguimiento.terapia_descripcion,
      tipo: seguimiento.terapia_tipo,
      nivel: seguimiento.terapia_nivel,
      duracion_estimada: seguimiento.duracion_estimada
    };
    
    if (terapia) {
      this.exportarTerapia(terapia, seguimiento);
    } else {
      console.warn('No hay terapia disponible para exportar');
    }
  }

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
    
    console.log('Mi terapia exportada:', terapia.nombre);
    this.mostrarNotificacion('Terapia exportada correctamente', 'success');
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

  async refreshMisTerapias(): Promise<void> {
    await Promise.all([
      this.loadMisTerapias(),
      this.loadEstadisticasPersonales()
    ]);
    this.mostrarNotificacion('Terapias actualizadas', 'success');
  }

  // Sistema de notificaciones
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

  // Métodos de formateo
  formatDuracion(minutos?: number): string {
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
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

 
  // Métodos de estado y colores
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

  // TrackBy functions para optimización
  trackByTerapiaId(index: number, terapia: SeguimientoTerapiaSimplificado): any {
    return terapia.seguimiento_id || index;
  }
}