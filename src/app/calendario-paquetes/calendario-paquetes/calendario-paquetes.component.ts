// src/app/calendario-paquetes/calendario-paquetes/calendario-paquetes.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Servicios existentes de tu proyecto
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';

// Interfaces
export interface SesionPaqueteCalendario {
  sesion_id: number;
  usuario_paquete_id: number;
  usuario_id: number;
  usuario_nombre: string;
  username: string;
  fecha_programada: string;
  contenido_tipo: 'rutina' | 'terapia';
  contenido_id: number;
  contenido_nombre: string;
  estado: 'pendiente' | 'completada' | 'cancelada';
  terapeuta_nombre?: string;
  paquete_nombre: string;
  tipo_programa: string;
  origen: string;
  progreso?: number;
  calificacion?: number;
  comentarios?: string;
  puede_modificar?: boolean;
  expandido?: boolean;
  // Nuevas propiedades para los detalles
  rutina_detalles?: any;
  terapia_detalles?: any;
}

// Interfaces para la vista de calendario
export interface DiaCalendario {
  fecha: Date;
  esMesActual: boolean;
  esHoy: boolean;
  sesiones: SesionPaqueteCalendario[];
}

export interface DetalleContenido {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: 'rutina' | 'terapia';
  detalles: any;
}

export interface Usuario {
  id: number;
  nombre: string;
}

export interface Paquete {
  id: number;
  nombre: string;
  tipo: string;
}

export interface FiltrosCalendarioPaquetes {
  usuarioId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  tipo?: 'rutina' | 'terapia';
}

export interface EstadisticasCalendarioPaquetes {
  totalSesiones: number;
  sesionesCompletadas: number;
  sesionesPendientes: number;
  sesionesCanceladas: number;
  progresoPromedio: number;
  sesionesHoy: number;
  pendientes: number;
  completadas: number;
  canceladas: number;
}

// Tipos de vista
type VistaCalendario = 'lista' | 'calendario';

@Component({
  selector: 'app-calendario-paquetes',
  standalone: false,
  templateUrl: './calendario-paquetes.component.html',
  styleUrls: ['./calendario-paquetes.component.css']
})
export class CalendarioPaquetesComponent implements OnInit, OnDestroy {
  
  // ===============================================
  // PROPIEDADES DEL COMPONENTE
  // ===============================================
  
  // Control de vistas
  vistaActual: VistaCalendario = 'calendario'; // CAMBIO: por defecto calendario
  
  // Datos principales
  sesiones: SesionPaqueteCalendario[] = [];
  sesionesFiltradas: Map<string, SesionPaqueteCalendario[]> = new Map();
  usuarios: Usuario[] = [];
  paquetes: Paquete[] = [];
  
  // Control del calendario
  fechaActual = new Date();
  mesActual = new Date();
  diasCalendario: DiaCalendario[] = [];
  
  // Estados de la UI
  cargando: boolean = false;
  error: string = '';
  modalAbierto: boolean = false;
  modalDetalleAbierto: boolean = false;
  sesionSeleccionada: SesionPaqueteCalendario | null = null;
  detalleContenido: DetalleContenido | null = null;
  
  // Usuario actual
  currentUser: any = null;
  esAdmin: boolean = false;
  esSupervisor: boolean = false;
  puedeVerTodos: boolean = false;
  
  // Filtros
  filtros: FiltrosCalendarioPaquetes = {
    usuarioId: undefined,
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
    tipo: undefined
  };
  
  // Estadísticas
  estadisticas: EstadisticasCalendarioPaquetes = {
    totalSesiones: 0,
    sesionesCompletadas: 0,
    sesionesPendientes: 0,
    sesionesCanceladas: 0,
    progresoPromedio: 0,
    sesionesHoy: 0,
    pendientes: 0,
    completadas: 0,
    canceladas: 0
  };

  // Nombres de meses y días para el calendario
  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Suscripciones
  private subscriptions = new Subscription();

  // ===============================================
  // CONSTRUCTOR E INICIALIZACIÓN
  // ===============================================

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.esAdmin = this.currentUser?.id_perfil === 1;
    this.esSupervisor = this.currentUser?.id_perfil === 3;
    this.puedeVerTodos = this.esAdmin || this.esSupervisor;
  }

  async ngOnInit(): Promise<void> {
    console.log('🚀 Inicializando Calendario de Paquetes');
    console.log('👤 Usuario actual:', this.currentUser);
    console.log('🔑 Permisos:', { esAdmin: this.esAdmin, esSupervisor: this.esSupervisor });

    this.inicializarFechas();
    await this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private inicializarFechas(): void {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    const mas30Dias = new Date();
    mas30Dias.setDate(hoy.getDate() + 30);
    
    this.filtros.fechaDesde = this.formatearFechaInput(hace30Dias);
    this.filtros.fechaHasta = this.formatearFechaInput(mas30Dias);

    console.log('📅 Fechas inicializadas:', this.filtros.fechaDesde, 'a', this.filtros.fechaHasta);
  }

  // ===============================================
  // MÉTODOS DE CONTROL DE VISTAS
  // ===============================================
  
  cambiarVista(vista: VistaCalendario): void {
    console.log('Cambiando vista a:', vista);
    this.vistaActual = vista;
    if (vista === 'calendario') {
      this.generarCalendario();
    }
  }

  get mostrarVistaLista(): boolean {
    return this.vistaActual === 'lista';
  }

  get mostrarVistaCalendario(): boolean {
    return this.vistaActual === 'calendario';
  }

  // ===============================================
  // GENERACIÓN DEL CALENDARIO
  // ===============================================

  generarCalendario(): void {
    console.log('📅 Generando calendario para mes:', this.mesActual);
    this.diasCalendario = [];
    
    const primerDiaMes = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
    const ultimoDiaMes = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 0);
    const hoy = new Date();
    
    // Días antes del primer día del mes
    const diasAnteriores = primerDiaMes.getDay();
    for (let i = diasAnteriores - 1; i >= 0; i--) {
      const fecha = new Date(primerDiaMes);
      fecha.setDate(fecha.getDate() - (i + 1));
      this.diasCalendario.push({
        fecha: new Date(fecha),
        esMesActual: false,
        esHoy: this.esMismaFecha(fecha, hoy),
        sesiones: this.getSesionesDelDia(fecha)
      });
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
      const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), dia);
      this.diasCalendario.push({
        fecha: new Date(fecha),
        esMesActual: true,
        esHoy: this.esMismaFecha(fecha, hoy),
        sesiones: this.getSesionesDelDia(fecha)
      });
    }
    
    // Días después del último día del mes (para completar la última semana)
    const diasDespues = 42 - this.diasCalendario.length; // 6 semanas * 7 días = 42
    for (let i = 1; i <= diasDespues; i++) {
      const fecha = new Date(ultimoDiaMes);
      fecha.setDate(fecha.getDate() + i);
      this.diasCalendario.push({
        fecha: new Date(fecha),
        esMesActual: false,
        esHoy: this.esMismaFecha(fecha, hoy),
        sesiones: this.getSesionesDelDia(fecha)
      });
    }
    
    console.log('✅ Calendario generado con', this.diasCalendario.length, 'días');
  }

  private esMismaFecha(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getFullYear() === fecha2.getFullYear() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getDate() === fecha2.getDate();
  }

  private getSesionesDelDia(fecha: Date): SesionPaqueteCalendario[] {
    const fechaStr = this.formatearFechaInput(fecha);
    return this.sesiones.filter(sesion => sesion.fecha_programada === fechaStr);
  }

  // Navegación del calendario
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

  // ===============================================
  // CARGA DE DATOS - USANDO SUPABASE DIRECTAMENTE
  // ===============================================

  async cargarDatosIniciales(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      console.log('📊 Cargando datos iniciales...');
      
      await Promise.all([
        this.cargarUsuarios(),
        this.cargarPaquetes(),
        this.cargarCalendario()
      ]);

      this.calcularEstadisticas();
      if (this.vistaActual === 'calendario') {
        this.generarCalendario();
      }
      console.log('✅ Datos iniciales cargados exitosamente');
    } catch (error) {
      console.error('💥 Error cargando datos iniciales:', error);
      this.error = 'Error al cargar los datos del calendario. Por favor, inténtalo de nuevo.';
    } finally {
      this.cargando = false;
    }
  }

  async cargarUsuarios(): Promise<void> {
    try {
      if (!this.puedeVerTodos) {
        this.usuarios = [];
        console.log('👤 Usuario regular: no se cargan otros usuarios para filtros');
        return;
      }

      console.log('👥 Cargando usuarios para filtros (solo admin/supervisor)...');
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, full_name, username')
        .eq('status', 1)
        .order('full_name');

      if (error) throw error;

      this.usuarios = (data || []).map(user => ({
        id: user.id,
        nombre: user.full_name || user.username || `Usuario ${user.id}`
      }));

      console.log('✅ Usuarios cargados para admin/supervisor:', this.usuarios.length);
    } catch (error) {
      console.error('💥 Error cargando usuarios:', error);
      this.usuarios = [];
    }
  }

  async cargarPaquetes(): Promise<void> {
    try {
      console.log('📦 Cargando paquetes para filtros...');
      const { data, error } = await this.supabaseService.client
        .from('paquetes')
        .select('id, nombre, tipo')
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;

      this.paquetes = data || [];
      console.log('✅ Paquetes cargados:', this.paquetes.length);
    } catch (error) {
      console.error('💥 Error cargando paquetes:', error);
      this.paquetes = [];
    }
  }

  async cargarCalendario(): Promise<void> {
    try {
      console.log('🗓️ Cargando calendario con filtros:', this.filtros);
      await this.cargarCalendarioConVista();
    } catch (error) {
      console.error('💥 Error cargando calendario con vista, intentando método alternativo:', error);
      await this.cargarCalendarioFallback();
    }
  }

  private async cargarCalendarioConVista(): Promise<void> {
    let query = this.supabaseService.client
      .from('vista_calendario_paquetes_usuario')
      .select('*');

    console.log('🔒 Aplicando filtro de usuario actual:', this.currentUser.id);
    query = query.eq('usuario_id', this.currentUser.id);

    if (this.puedeVerTodos && this.filtros.usuarioId && this.filtros.usuarioId !== this.currentUser.id) {
      console.log('👨‍💼 Admin/Supervisor viendo usuario específico:', this.filtros.usuarioId);
      query = query.eq('usuario_id', this.filtros.usuarioId);
    }

    if (this.filtros.fechaDesde) {
      query = query.gte('fecha_programada', this.filtros.fechaDesde);
    }
    if (this.filtros.fechaHasta) {
      query = query.lte('fecha_programada', this.filtros.fechaHasta);
    }
    if (this.filtros.estado) {
      query = query.eq('estado', this.filtros.estado);
    }
    if (this.filtros.tipo) {
      query = query.eq('contenido_tipo', this.filtros.tipo);
    }

    query = query.order('fecha_programada', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    console.log('📊 Datos obtenidos para usuario:', this.currentUser.id, '- Total sesiones:', (data || []).length);
    this.procesarDatosSesiones(data || []);
  }

  private async cargarCalendarioFallback(): Promise<void> {
    console.log('🔄 Usando método de respaldo para cargar calendario');
    this.crearDatosEjemplo();
  }

  private procesarDatosSesiones(data: any[]): void {
    this.sesiones = data.map((s: any) => ({
      sesion_id: s.sesion_id,
      usuario_paquete_id: s.usuario_paquete_id,
      usuario_id: s.usuario_id,
      usuario_nombre: s.usuario_nombre,
      username: s.username || s.usuario_nombre,
      fecha_programada: s.fecha_programada,
      contenido_tipo: s.contenido_tipo,
      contenido_id: s.contenido_id,
      contenido_nombre: this.obtenerNombreContenido(s.contenido_tipo, s.contenido_id),
      estado: s.estado,
      terapeuta_nombre: s.terapeuta_nombre,
      paquete_nombre: s.paquete_nombre,
      tipo_programa: s.tipo_programa || 'paquete',
      origen: 'paquete',
      progreso: s.progreso || 0,
      calificacion: s.calificacion,
      comentarios: s.comentarios,
      puede_modificar: this.puedeModificarSesion(s.usuario_id),
      expandido: false
    }));

    this.aplicarFiltrosLocales();
    
    console.log('✅ Calendario cargado:', {
      totalSesiones: this.sesiones.length,
      sesionesAgrupadas: this.sesionesFiltradas.size
    });
  }

  private crearDatosEjemplo(): void {
    console.log('📝 Creando datos de ejemplo para demostración');
    
    const fechaBase = new Date();
    this.sesiones = [
      {
        sesion_id: 1,
        usuario_paquete_id: 1,
        usuario_id: this.currentUser.id,
        usuario_nombre: this.currentUser.full_name || 'Usuario Actual',
        username: this.currentUser.username,
        fecha_programada: this.formatearFechaInput(fechaBase),
        contenido_tipo: 'terapia' as const,
        contenido_id: 1,
        contenido_nombre: 'Terapia Respiratoria Básica',
        estado: 'pendiente' as const,
        terapeuta_nombre: 'Dr. García',
        paquete_nombre: 'Paquete Rehabilitación Integral',
        tipo_programa: 'paquete',
        origen: 'paquete',
        progreso: 0,
        puede_modificar: true,
        expandido: false
      },
      {
        sesion_id: 2,
        usuario_paquete_id: 1,
        usuario_id: this.currentUser.id,
        usuario_nombre: this.currentUser.full_name || 'Usuario Actual',
        username: this.currentUser.username,
        fecha_programada: this.formatearFechaInput(new Date(fechaBase.getTime() + 86400000)),
        contenido_tipo: 'rutina' as const,
        contenido_id: 1,
        contenido_nombre: 'CrossFit - Día Completo',
        estado: 'completada' as const,
        terapeuta_nombre: 'Dr. García',
        paquete_nombre: 'Paquete Rehabilitación Integral',
        tipo_programa: 'paquete',
        origen: 'paquete',
        progreso: 100,
        puede_modificar: true,
        expandido: false
      }
    ];

    this.aplicarFiltrosLocales();
  }

  // ===============================================
  // NUEVO: CARGAR DETALLES DE RUTINA/TERAPIA
  // ===============================================

  async cargarDetalleContenido(sesion: SesionPaqueteCalendario): Promise<void> {
    console.log('📋 Cargando detalles del contenido:', sesion.contenido_tipo, sesion.contenido_id);
    this.cargando = true;

    try {
      if (sesion.contenido_tipo === 'rutina') {
        await this.cargarDetalleRutina(sesion);
      } else if (sesion.contenido_tipo === 'terapia') {
        await this.cargarDetalleTerapia(sesion);
      }
    } catch (error) {
      console.error('💥 Error cargando detalles:', error);
      this.error = 'Error al cargar los detalles del contenido';
    } finally {
      this.cargando = false;
    }
  }

  private async cargarDetalleRutina(sesion: SesionPaqueteCalendario): Promise<void> {
    try {
      console.log('🏃‍♂️ Cargando rutina completa desde BD:', sesion.contenido_id);
      
      // Cargar rutina completa
      const { data: rutina, error: rutinaError } = await this.supabaseService.client
        .from('rutinas')
        .select('*')
        .eq('id', sesion.contenido_id)
        .eq('status', 1)
        .single();

      if (rutinaError) throw rutinaError;

      console.log('✅ Rutina cargada desde BD:', rutina);

      this.detalleContenido = {
        id: rutina.id,
        nombre: rutina.nombre,
        descripcion: rutina.descripcion,
        tipo: 'rutina',
        detalles: rutina
      };

      // Guardar detalles en la sesión para uso posterior
      sesion.rutina_detalles = rutina;

      console.log('🎯 Abriendo modal de rutina:', rutina.nombre);
      this.modalDetalleAbierto = true;

    } catch (error) {
      console.error('💥 Error cargando rutina:', error);
      // Fallback: crear rutina básica si no se puede cargar desde BD
      this.crearRutinaBasica(sesion);
    }
  }

  private async cargarDetalleTerapia(sesion: SesionPaqueteCalendario): Promise<void> {
    try {
      console.log('🏥 Cargando terapia completa desde BD:', sesion.contenido_id);
      
      // Cargar terapia completa
      const { data: terapia, error: terapiaError } = await this.supabaseService.client
        .from('terapias')
        .select('*')
        .eq('id', sesion.contenido_id)
        .eq('status', 1)
        .single();

      if (terapiaError) throw terapiaError;

      console.log('✅ Terapia cargada desde BD:', terapia);

      this.detalleContenido = {
        id: terapia.id,
        nombre: terapia.nombre,
        descripcion: terapia.descripcion,
        tipo: 'terapia',
        detalles: terapia
      };

      // Guardar detalles en la sesión para uso posterior
      sesion.terapia_detalles = terapia;

      console.log('🎯 Abriendo modal de terapia:', terapia.nombre);
      this.modalDetalleAbierto = true;

    } catch (error) {
      console.error('💥 Error cargando terapia:', error);
      // Fallback: crear terapia básica si no se puede cargar desde BD
      this.crearTerapiaBasica(sesion);
    }
  }

  private crearRutinaBasica(sesion: SesionPaqueteCalendario): void {
    console.log('📝 Creando rutina básica para fallback');
    
    this.detalleContenido = {
      id: sesion.contenido_id,
      nombre: sesion.contenido_nombre,
      descripcion: 'Rutina de entrenamiento',
      tipo: 'rutina',
      detalles: {
        id: sesion.contenido_id,
        nombre: sesion.contenido_nombre,
        descripcion: 'Rutina de entrenamiento personalizada',
        nivel: 'intermedio',
        duracion_estimada: 60,
        tipo: 'entrenamiento',
        warm_up: null,
        met_con: null,
        strength: null,
        core: null,
        extra: null
      }
    };

    this.modalDetalleAbierto = true;
  }

  private crearTerapiaBasica(sesion: SesionPaqueteCalendario): void {
    console.log('📝 Creando terapia básica para fallback');
    
    this.detalleContenido = {
      id: sesion.contenido_id,
      nombre: sesion.contenido_nombre,
      descripcion: 'Terapia de rehabilitación',
      tipo: 'terapia',
      detalles: {
        id: sesion.contenido_id,
        nombre: sesion.contenido_nombre,
        descripcion: 'Terapia de rehabilitación personalizada',
        tipo: 'fisica',
        nivel: 'intermedio',
        duracion_estimada: 45,
        area_especializacion: 'Rehabilitación General',
        ejercicios: null
      }
    };

    this.modalDetalleAbierto = true;
  }

  // ===============================================
  // MÉTODOS EXISTENTES ADAPTADOS
  // ===============================================

  private obtenerNombreContenido(tipo: string, id: number): string {
    return tipo === 'terapia' ? `Terapia ${id}` : `Rutina ${id}`;
  }

  private puedeModificarSesion(sesionUserId: number): boolean {
    if ([1, 3].includes(this.currentUser.id_perfil)) {
      return true;
    }
    return this.currentUser.id === sesionUserId;
  }

  private calcularEstadisticas(): void {
    const hoy = new Date().toISOString().split('T')[0];
    
    const completadas = this.sesiones.filter(s => s.estado === 'completada').length;
    const pendientes = this.sesiones.filter(s => s.estado === 'pendiente').length;
    const canceladas = this.sesiones.filter(s => s.estado === 'cancelada').length;
    
    this.estadisticas = {
      totalSesiones: this.sesiones.length,
      sesionesCompletadas: completadas,
      sesionesPendientes: pendientes,
      sesionesCanceladas: canceladas,
      progresoPromedio: this.calcularProgresoPromedio(),
      sesionesHoy: this.sesiones.filter(s => s.fecha_programada === hoy).length,
      pendientes: pendientes,
      completadas: completadas,
      canceladas: canceladas
    };
  }

  private calcularProgresoPromedio(): number {
    const sesionesConProgreso = this.sesiones.filter(s => s.progreso !== undefined && s.progreso > 0);
    if (sesionesConProgreso.length === 0) return 0;
    
    const sumaProgreso = sesionesConProgreso.reduce((sum, s) => sum + (s.progreso || 0), 0);
    return Math.round(sumaProgreso / sesionesConProgreso.length);
  }

  // ===============================================
  // FILTROS Y BÚSQUEDA
  // ===============================================

  async aplicarFiltros(): Promise<void> {
    console.log('🔍 Aplicando filtros:', this.filtros);
    
    if (!this.puedeVerTodos && this.filtros.usuarioId) {
      console.log('⚠️ Usuario regular intentando filtrar por otro usuario - resetando filtro');
      this.filtros.usuarioId = undefined;
    }
    
    this.cargando = true;
    
    try {
      await this.cargarCalendario();
      this.calcularEstadisticas();
      if (this.vistaActual === 'calendario') {
        this.generarCalendario();
      }
    } catch (error) {
      console.error('💥 Error aplicando filtros:', error);
    } finally {
      this.cargando = false;
    }
  }

  private aplicarFiltrosLocales(): void {
    this.agruparSesionesPorFecha([...this.sesiones]);
  }

  private agruparSesionesPorFecha(sesiones: SesionPaqueteCalendario[]): void {
    this.sesionesFiltradas.clear();
    
    sesiones.forEach(sesion => {
      const fecha = sesion.fecha_programada;
      if (!this.sesionesFiltradas.has(fecha)) {
        this.sesionesFiltradas.set(fecha, []);
      }
      this.sesionesFiltradas.get(fecha)!.push(sesion);
    });

    this.sesionesFiltradas.forEach(sesionesDelDia => {
      sesionesDelDia.sort((a, b) => {
        const ordenEstado = { 'pendiente': 0, 'completada': 1, 'cancelada': 2 };
        if (a.estado !== b.estado) {
          return (ordenEstado[a.estado] || 3) - (ordenEstado[b.estado] || 3);
        }
        return a.contenido_nombre.localeCompare(b.contenido_nombre);
      });
    });
  }

  limpiarFiltros(): void {
    console.log('🧹 Limpiando filtros');
    this.filtros = {
      usuarioId: undefined,
      estado: '',
      fechaDesde: '',
      fechaHasta: '',
      tipo: undefined
    };
    this.inicializarFechas();
    this.aplicarFiltros();
  }

  // ===============================================
  // GESTIÓN DE SESIONES
  // ===============================================

  async completarSesion(sesion: SesionPaqueteCalendario): Promise<void> {
    if (!sesion.puede_modificar) {
      alert('No tienes permisos para modificar esta sesión');
      return;
    }

    try {
      console.log('✅ Completando sesión:', sesion.sesion_id);
      
      const { error } = await this.supabaseService.client
        .from('paquete_seguimiento')
        .update({ 
          estado: 'completada',
          progreso: 100,
          fecha_completada: new Date().toISOString(),
          comentarios: `Sesión completada el ${new Date().toLocaleDateString()}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', sesion.sesion_id);

      if (error) throw error;
      
      sesion.estado = 'completada';
      sesion.progreso = 100;
      
      this.calcularEstadisticas();
      if (this.vistaActual === 'calendario') {
        this.generarCalendario();
      }
      
      console.log('✅ Sesión completada exitosamente');
      
    } catch (error) {
      console.error('💥 Error completando sesión:', error);
      alert('Error al completar la sesión. Por favor, inténtalo de nuevo.');
    }
  }

  async cancelarSesion(sesion: SesionPaqueteCalendario): Promise<void> {
    if (!sesion.puede_modificar) {
      alert('No tienes permisos para modificar esta sesión');
      return;
    }

    const motivo = prompt('¿Por qué deseas cancelar esta sesión? (opcional)');
    if (motivo === null) return;

    try {
      console.log('❌ Cancelando sesión:', sesion.sesion_id);
      
      const updateData: any = {
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      };

      if (motivo) updateData.comentarios = motivo;

      const { error } = await this.supabaseService.client
        .from('paquete_seguimiento')
        .update(updateData)
        .eq('id', sesion.sesion_id);

      if (error) throw error;
      
      sesion.estado = 'cancelada';
      if (motivo) sesion.comentarios = motivo;
      
      this.calcularEstadisticas();
      if (this.vistaActual === 'calendario') {
        this.generarCalendario();
      }
      
      console.log('✅ Sesión cancelada exitosamente');
      
    } catch (error) {
      console.error('💥 Error cancelando sesión:', error);
      alert('Error al cancelar la sesión. Por favor, inténtalo de nuevo.');
    }
  }

  // ===============================================
  // MODAL Y DETALLES
  // ===============================================

  verDetalles(sesion: SesionPaqueteCalendario): void {
    console.log('👁️ Mostrando detalles de sesión:', sesion.sesion_id);
    this.sesionSeleccionada = sesion;
    this.modalAbierto = true;
  }

  // NUEVO: Ver detalles completos del contenido
  async verDetallesCompletos(sesion: SesionPaqueteCalendario): Promise<void> {
    console.log('📋 Cargando detalles completos:', sesion.contenido_tipo, sesion.contenido_id);
    await this.cargarDetalleContenido(sesion);
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.sesionSeleccionada = null;
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto = false;
    this.detalleContenido = null;
  }

  // ===============================================
  // NUEVOS MÉTODOS PARA FORMATEO DE CONTENIDO
  // ===============================================

  getFormattedContent(): string {
    if (!this.detalleContenido) return '';
    
    if (this.detalleContenido.tipo === 'rutina') {
      return this.formatRutinaContent(this.detalleContenido.detalles);
    } else if (this.detalleContenido.tipo === 'terapia') {
      return this.formatTerapiaContent(this.detalleContenido.detalles);
    }
    
    return 'Contenido no disponible';
  }

  private formatRutinaContent(rutina: any): string {
    let content = `${rutina.nombre}\n`;
    content += `${rutina.descripcion || ''}\n`;
    content += `Nivel: ${rutina.nivel} | Duración: ${rutina.duracion_estimada || 0}m 0m\n\n`;
    
    if (rutina.objetivo_principal) {
      content += `Objetivo: ${rutina.objetivo_principal}\n`;
      content += `Área: ${rutina.area_enfoque || 'General'}\n\n`;
    }

    // Procesar secciones
    if (rutina.rutina_secciones && rutina.rutina_secciones.length > 0) {
      rutina.rutina_secciones.forEach((seccion: any) => {
        content += `${seccion.seccion_nombre.toUpperCase()}\n`;
        
        if (seccion.instrucciones) {
          content += `${seccion.instrucciones}\n`;
        }
        
        if (seccion.rutina_ejercicios && seccion.rutina_ejercicios.length > 0) {
          seccion.rutina_ejercicios.forEach((ejercicioRutina: any, index: number) => {
            content += `${index + 1}. ${ejercicioRutina.ejercicios?.nombre || 'Ejercicio sin nombre'}\n`;
            
            // Especificaciones
            const specs = [];
            if (ejercicioRutina.sets) specs.push(`${ejercicioRutina.sets} series`);
            if (ejercicioRutina.reps) specs.push(`${ejercicioRutina.reps} repeticiones`);
            if (ejercicioRutina.tiempo) specs.push(`${ejercicioRutina.tiempo}`);
            if (ejercicioRutina.peso) specs.push(`Peso: ${ejercicioRutina.peso}`);
            
            if (specs.length > 0) {
              content += `   ${specs.join(' x ')}\n`;
            }
            
            if (ejercicioRutina.tiempo) {
              content += `   Duración: ${ejercicioRutina.tiempo}\n`;
            }
            
            if (ejercicioRutina.notas) {
              content += `   ⚠️  ${ejercicioRutina.notas}\n`;
            }
            
            content += '\n';
          });
        }
        
        content += '\n';
      });
    }

    // Criterios de progresión
    if (rutina.criterios_progresion) {
      content += `CRITERIOS DE PROGRESIÓN\n`;
      content += `${rutina.criterios_progresion}\n\n`;
    }

    return content;
  }

  private formatTerapiaContent(terapia: any): string {
    let content = `${terapia.nombre}\n`;
    content += `${terapia.descripcion || ''}\n`;
    content += `Nivel: ${terapia.nivel} | Duración: ${terapia.duracion_estimada || 0}h 0m\n\n`;
    
    if (terapia.objetivo_principal) {
      content += `Objetivo: ${terapia.objetivo_principal}\n`;
      content += `Área: ${terapia.area_enfoque || terapia.tipo}\n\n`;
    }

    // Procesar secciones de terapia
    if (terapia.terapia_secciones && terapia.terapia_secciones.length > 0) {
      terapia.terapia_secciones.forEach((seccion: any) => {
        content += `${seccion.seccion_nombre.toUpperCase()}\n`;
        
        if (seccion.instrucciones) {
          content += `${seccion.instrucciones}\n`;
        }
        
        if (seccion.terapia_ejercicios && seccion.terapia_ejercicios.length > 0) {
          seccion.terapia_ejercicios.forEach((ejercicioTerapia: any, index: number) => {
            content += `${index + 1}. ${ejercicioTerapia.ejercicios?.nombre || 'Ejercicio sin nombre'}\n`;
            
            // Especificaciones
            const specs = [];
            if (ejercicioTerapia.repeticiones) specs.push(`${ejercicioTerapia.repeticiones} repeticiones`);
            if (ejercicioTerapia.duracion) specs.push(`${ejercicioTerapia.duracion}`);
            if (ejercicioTerapia.intensidad) specs.push(`Intensidad: ${ejercicioTerapia.intensidad}`);
            
            if (specs.length > 0) {
              content += `   ${specs.join(' | ')}\n`;
            }
            
            if (ejercicioTerapia.notas) {
              content += `   ⚠️  ${ejercicioTerapia.notas}\n`;
            }
            
            if (ejercicioTerapia.ejercicios?.instrucciones) {
              content += `   📝 ${ejercicioTerapia.ejercicios.instrucciones}\n`;
            }
            
            content += '\n';
          });
        }
        
        content += '\n';
      });
    }

    // Procesar ejercicios JSONB si existen (formato alternativo)
    if (terapia.ejercicios && typeof terapia.ejercicios === 'object') {
      content += `PLAN DE EJERCICIOS\n`;
      content += `══════════════════\n\n`;
      
      const seccionesOrdenadas = ['respiracion', 'calentamiento', 'fortalecimiento', 'equilibrio', 'coordinacion', 'estiramiento', 'flexibilidad', 'movilidad', 'resistencia'];
      
      seccionesOrdenadas.forEach(seccionKey => {
        const seccion = terapia.ejercicios[seccionKey];
        
        if (seccion && seccion.ejercicios && Array.isArray(seccion.ejercicios) && seccion.ejercicios.length > 0) {
          content += `${seccionKey.toUpperCase()}\n`;
          
          if (seccion.descripcion) {
            content += `${seccion.descripcion}\n`;
          }
          
          seccion.ejercicios.forEach((ejercicio: any, index: number) => {
            content += `${index + 1}. ${ejercicio.nombre || 'Ejercicio sin nombre'}\n`;
            
            if (ejercicio.descripcion) {
              content += `   ${ejercicio.descripcion}\n`;
            }
            
            const detalles = [];
            if (ejercicio.series) detalles.push(`${ejercicio.series} series`);
            if (ejercicio.repeticiones) detalles.push(`${ejercicio.repeticiones} reps`);
            if (ejercicio.duracion) detalles.push(`${ejercicio.duracion}`);
            
            if (detalles.length > 0) {
              content += `   ${detalles.join(' | ')}\n`;
            }
            
            if (ejercicio.ejecucion) {
              content += `   Ejecución: ${ejercicio.ejecucion}\n`;
            }
            
            if (ejercicio.precauciones) {
              content += `   ⚠️  ${ejercicio.precauciones}\n`;
            }
            
            content += '\n';
          });
          
          content += '\n';
        }
      });
    }

    // Criterios de progresión
    if (terapia.criterios_progresion) {
      content += `CRITERIOS DE PROGRESIÓN\n`;
      content += `${terapia.criterios_progresion}\n`;
    }

    return content;
  }

  getFileName(): string {
    if (!this.detalleContenido) return 'contenido.txt';
    
    const nombre = this.detalleContenido.nombre.replace(/\s+/g, '_').toLowerCase();
    return `${nombre}.txt`;
  }

  // ===============================================
  // MÉTODOS PARA COPIAR Y DESCARGAR
  // ===============================================

  private copySuccess = false;

  async copyToClipboard(): Promise<void> {
    const content = this.getFormattedContent();
    
    try {
      await navigator.clipboard.writeText(content);
      this.copySuccess = true;
      console.log('Contenido copiado al portapapeles');
      
      setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      this.fallbackCopyTextToClipboard(content);
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

  downloadContent(): void {
    const content = this.getFormattedContent();
    const fileName = this.getFileName();
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Contenido descargado:', fileName);
  }

  verRegistro(sesion: SesionPaqueteCalendario): void {
    console.log('📋 Navegando a registro de sesión:', sesion.sesion_id);
    this.router.navigate(['/paquetes/sesion', sesion.sesion_id]);
  }

  // ===============================================
  // MÉTODOS DE UTILIDAD PARA EL TEMPLATE
  // ===============================================

  ordenarPorFecha = (a: any, b: any): number => {
    return new Date(a.key).getTime() - new Date(b.key).getTime();
  };

  formatearFechaGrupo(fecha: string): string {
    const fechaObj = new Date(fecha + 'T00:00:00');
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    
    const fechaNormalizada = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate());
    const hoyNormalizada = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const mananaNormalizada = new Date(manana.getFullYear(), manana.getMonth(), manana.getDate());
    const ayerNormalizada = new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate());
    
    if (fechaNormalizada.getTime() === hoyNormalizada.getTime()) {
      return '🗓️ Hoy - ' + this.formatearFecha(fecha);
    } else if (fechaNormalizada.getTime() === mananaNormalizada.getTime()) {
      return '⏭️ Mañana - ' + this.formatearFecha(fecha);
    } else if (fechaNormalizada.getTime() === ayerNormalizada.getTime()) {
      return '⏮️ Ayer - ' + this.formatearFecha(fecha);
    } else {
      return this.formatearFecha(fecha);
    }
  }

  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatearFechaCorta(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  }

  formatearFechaInput(fecha: Date): string {
    return fecha.toISOString().split('T')[0];
  }

  getNombreMes(): string {
    return this.meses[this.mesActual.getMonth()];
  }

  getAnio(): number {
    return this.mesActual.getFullYear();
  }

  // ===============================================
  // MÉTODOS PARA ESTILOS Y CLASES CSS
  // ===============================================

  getEstadoClasses(estado: string): string {
    switch (estado) {
      case 'completada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'completada':
        return '✅ Completada';
      case 'cancelada':
        return '❌ Cancelada';
      case 'pendiente':
        return '⏳ Pendiente';
      default:
        return estado;
    }
  }

  getColorByEstado(estado: string): string {
    switch (estado) {
      case 'completada':
        return 'bg-green-500';
      case 'cancelada':
        return 'bg-red-500';
      case 'pendiente':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  getAvatarClasses(sesion: SesionPaqueteCalendario): string {
    switch (sesion.estado) {
      case 'completada':
        return 'bg-green-600 text-white';
      case 'cancelada':
        return 'bg-red-600 text-white';
      case 'pendiente':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }

  getTipoClasses(tipo: string): string {
    switch (tipo) {
      case 'terapia':
        return 'bg-purple-100 text-purple-800';
      case 'rutina':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getTipoIcon(tipo: string): string {
    switch (tipo) {
      case 'terapia':
        return '🏥';
      case 'rutina':
        return '💪';
      default:
        return '📋';
    }
  }

  getClasesDiaCalendario(dia: DiaCalendario): string {
    let clases = 'relative p-2 h-32 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors';
    
    if (!dia.esMesActual) {
      clases += ' bg-gray-50 text-gray-400';
    }
    
    if (dia.esHoy) {
      clases += ' bg-blue-50 border-blue-300';
    }
    
    return clases;
  }

  getIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .map(palabra => palabra.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getPorcentajeProgreso(completadas: number, total: number): number {
    return total > 0 ? Math.round((completadas / total) * 100) : 0;
  }

  // ===============================================
  // NAVEGACIÓN Y ACCIONES ADICIONALES
  // ===============================================

  navegarAPaquetes(): void {
    this.router.navigate(['/paquetes']);
  }

  navegarAAsignaciones(): void {
    if (this.puedeVerTodos) {
      this.router.navigate(['/paquetes/asignaciones']);
    }
  }

  async actualizarDatos(): Promise<void> {
    console.log('🔄 Actualizando datos del calendario...');
    await this.cargarDatosIniciales();
  }

  toggleExpandir(sesion: SesionPaqueteCalendario): void {
    sesion.expandido = !sesion.expandido;
  }

  // ===============================================
  // MÉTODOS PARA DEBUGGING
  // ===============================================

  verificarFiltroUsuario(): void {
    console.log('🔍 Estado actual del filtro de usuario:');
    console.log('- Usuario actual:', this.currentUser.id, '-', this.currentUser.full_name);
    console.log('- Es admin/supervisor:', this.puedeVerTodos);
    console.log('- Filtro aplicado:', this.filtros.usuarioId);
    console.log('- Total sesiones cargadas:', this.sesiones.length);
    console.log('- Sesiones por usuario:', this.sesiones.reduce((acc: any, sesion) => {
      acc[sesion.usuario_id] = (acc[sesion.usuario_id] || 0) + 1;
      return acc;
    }, {}));
  }

  // ===============================================
  // MÉTODOS ADICIONALES PARA EL TEMPLATE
  // ===============================================

  trackBySesionId(index: number, sesion: SesionPaqueteCalendario): number {
    return sesion.sesion_id;
  }
}