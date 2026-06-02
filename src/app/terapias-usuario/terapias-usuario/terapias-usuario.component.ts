// src/app/terapias-usuario/terapias-usuario.component.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { Profile } from '../../interfaces/user.interfaces';
import { Terapia } from '../../interfaces/terapias.interfaces';

export interface AsignacionMasivaTerapia {
  id?: number;
  id_terapia: number;
  usuarios_asignados: number[];
  asignado_por: number;
  terapeuta_responsable?: number;
  fecha_inicio: string;
  fecha_fin: string;
  sesiones_por_semana?: number;
  duracion_sesion?: number;
  tipo_asignacion?: string;
  estado?: string;
  notas?: string;
  objetivos_grupales?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

export interface SeguimientoIndividualTerapia {
  id?: number;
  id_asignacion_masiva: number;
  id_profile: number;
  id_terapia: number;
  progreso: number;
  estado_individual: string;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  sesiones_completadas?: number;
  sesiones_programadas?: number;
  notas_individuales?: string;
  adherencia_porcentaje?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AsignacionCompletaTerapia {
  asignacion_id: number;
  terapia_nombre: string;
  terapia_descripcion?: string;
  terapia_tipo?: string;
  area_especializacion?: string;
  fecha_inicio_programada: string;
  fecha_fin_programada: string;
  usuarios_count: number;
  estado_asignacion: string;
  asignado_por_nombre: string;
  terapeuta_nombre?: string;
  fecha_asignacion: string;
  notas_asignacion?: string;
  sesiones_por_semana?: number;
  duracion_sesion?: number;
  tipo_asignacion?: string;
}

@Component({
  selector: 'app-terapias-usuario',
  standalone: false,
  templateUrl: './terapias-usuario.component.html',
  styleUrls: ['./terapias-usuario.component.css']
})
export class TerapiasUsuarioComponent implements OnInit {
  // Datos principales
  terapias: Terapia[] = [];
  usuarios: Profile[] = [];
  terapeutas: Profile[] = [];
  asignaciones: AsignacionCompletaTerapia[] = [];
  
  // Control de UI
  loading = false;
  error = '';
  showAsignarModal = false;
  showVerModal = false;
  selectedAsignacion: AsignacionCompletaTerapia | null = null;
  seguimientoDetalle: any[] = [];

  // Formulario de asignación
  asignacionForm = {
    id_terapia: 0,
    usuarios_seleccionados: [] as number[],
    terapeuta_responsable: undefined as number | undefined,
    fecha_inicio: '',
    fecha_fin: '',
    sesiones_por_semana: 3,
    duracion_sesion: 60,
    tipo_asignacion: 'individual',
    notas: '',
    objetivos_grupales: ''
  };

  // Filtros y búsqueda
  searchTerm = '';
  estadoFilter = 'all';
  terapiaFilter = 'all';
  tipoFilter = 'all';
Math: any;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadTerapias(),
        this.loadUsuarios(),
        this.loadTerapeutas(),
        this.loadAsignaciones()
      ]);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      this.error = 'Error al cargar los datos';
    } finally {
      this.loading = false;
    }
  }

  async loadTerapias(): Promise<void> {
    try {
      const data = await this.supabaseService.getData('terapias');
      this.terapias = data?.filter(t => t.status === 1) || [];
    } catch (error) {
      console.error('Error cargando terapias:', error);
    }
  }

  async loadUsuarios(): Promise<void> {
    try {
      const data = await this.supabaseService.getData('profiles');
      this.usuarios = data?.filter(u => u.status === 1 && (u.id_perfil === 1 || u.id_perfil === 2)) || [];
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  }

  async loadTerapeutas(): Promise<void> {
    try {
      const data = await this.supabaseService.getData('profiles');
      this.terapeutas = data?.filter(t => t.status === 1 && (t.id_perfil === 2 || t.id_perfil === 3)) || [];
    } catch (error) {
      console.error('Error cargando terapeutas:', error);
    }
  }

  async loadAsignaciones(): Promise<void> {
    try {
      // Obtener asignaciones masivas con información expandida
      const { data, error } = await this.supabaseService.client
        .from('terapia_asignaciones_masivas')
        .select(`
          id,
          id_terapia,
          usuarios_asignados,
          fecha_inicio,
          fecha_fin,
          sesiones_por_semana,
          duracion_sesion,
          tipo_asignacion,
          estado,
          notas,
          objetivos_grupales,
          terapeuta_responsable,
          created_at,
          terapias(nombre, descripcion, tipo, area_especializacion),
          profiles!terapia_asignaciones_masivas_asignado_por_fkey(full_name),
          terapeuta:profiles!terapia_asignaciones_masivas_terapeuta_responsable_fkey(full_name)
        `)
        .eq('status', 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.asignaciones = (data || []).map((item: any) => ({
        asignacion_id: item.id,
        terapia_nombre: item.terapias?.nombre || 'Terapia no encontrada',
        terapia_descripcion: item.terapias?.descripcion || '',
        terapia_tipo: item.terapias?.tipo || '',
        area_especializacion: item.terapias?.area_especializacion || '',
        fecha_inicio_programada: item.fecha_inicio,
        fecha_fin_programada: item.fecha_fin,
        usuarios_count: item.usuarios_asignados?.length || 0,
        estado_asignacion: item.estado,
        asignado_por_nombre: item.profiles?.full_name || 'Usuario no encontrado',
        terapeuta_nombre: item.terapeuta?.full_name || null,
        fecha_asignacion: item.created_at,
        notas_asignacion: item.notas,
        sesiones_por_semana: item.sesiones_por_semana,
        duracion_sesion: item.duracion_sesion,
        tipo_asignacion: item.tipo_asignacion
      }));

    } catch (error) {
      console.error('Error cargando asignaciones:', error);
      // En caso de error, usar método alternativo
      await this.loadAsignacionesAlternativo();
    }
  }

  async loadAsignacionesAlternativo(): Promise<void> {
    try {
      // Método alternativo: obtener datos por separado
      const [asignacionesData, terapiasData, usuariosData] = await Promise.all([
        this.supabaseService.getData('terapia_asignaciones_masivas'),
        this.supabaseService.getData('terapias'),
        this.supabaseService.getData('profiles')
      ]);

      const asignacionesFiltradas = asignacionesData?.filter(a => a.status === 1) || [];

      this.asignaciones = asignacionesFiltradas.map((item: any) => {
        const terapia = terapiasData?.find(t => t.id === item.id_terapia);
        const asignador = usuariosData?.find(u => u.id === item.asignado_por);
        const terapeuta = usuariosData?.find(u => u.id === item.terapeuta_responsable);

        return {
          asignacion_id: item.id,
          terapia_nombre: terapia?.nombre || 'Terapia no encontrada',
          terapia_descripcion: terapia?.descripcion || '',
          terapia_tipo: terapia?.tipo || '',
          area_especializacion: terapia?.area_especializacion || '',
          fecha_inicio_programada: item.fecha_inicio,
          fecha_fin_programada: item.fecha_fin,
          usuarios_count: item.usuarios_asignados?.length || 0,
          estado_asignacion: item.estado,
          asignado_por_nombre: asignador?.full_name || 'Usuario no encontrado',
          terapeuta_nombre: terapeuta?.full_name || null,
          fecha_asignacion: item.created_at,
          notas_asignacion: item.notas,
          sesiones_por_semana: item.sesiones_por_semana,
          duracion_sesion: item.duracion_sesion,
          tipo_asignacion: item.tipo_asignacion
        };
      });

    } catch (error) {
      console.error('Error en método alternativo:', error);
      this.asignaciones = [];
    }
  }

  openAsignarModal(): void {
    this.asignacionForm = {
      id_terapia: 0,
      usuarios_seleccionados: [],
      terapeuta_responsable: undefined,
      fecha_inicio: this.getTomorrowDate(),
      fecha_fin: this.getNextWeekDate(),
      sesiones_por_semana: 3,
      duracion_sesion: 60,
      tipo_asignacion: 'individual',
      notas: '',
      objetivos_grupales: ''
    };
    this.error = '';
    this.showAsignarModal = true;
  }

  closeAsignarModal(): void {
    this.showAsignarModal = false;
    this.error = '';
  }

  async openVerModal(asignacion: AsignacionCompletaTerapia): Promise<void> {
    this.selectedAsignacion = asignacion;
    await this.loadSeguimientoDetalle(asignacion.asignacion_id);
    this.showVerModal = true;
  }

  closeVerModal(): void {
    this.showVerModal = false;
    this.selectedAsignacion = null;
    this.seguimientoDetalle = [];
  }

  async loadSeguimientoDetalle(asignacionId: number): Promise<void> {
    try {
      // Primero intentar con la vista si existe
      const { data: viaVista, error: errorVista } = await this.supabaseService.client
        .from('v_terapias_asignadas_usuarios')
        .select('*')
        .eq('asignacion_id', asignacionId)
        .order('full_name');

      if (!errorVista && viaVista) {
        this.seguimientoDetalle = viaVista;
        return;
      }

      // Método alternativo: consulta manual
      const { data: seguimientos, error: errorSeguimientos } = await this.supabaseService.client
        .from('terapia_seguimiento_individual')
        .select(`
          id,
          id_asignacion_masiva,
          id_profile,
          progreso,
          estado_individual,
          fecha_inicio_real,
          fecha_fin_real,
          sesiones_completadas,
          sesiones_programadas,
          notas_individuales,
          adherencia_porcentaje,
          profiles(username, full_name)
        `)
        .eq('id_asignacion_masiva', asignacionId);

      if (errorSeguimientos) throw errorSeguimientos;

      this.seguimientoDetalle = (seguimientos || []).map((item: any) => ({
        seguimiento_id: item.id,
        asignacion_id: item.id_asignacion_masiva,
        id_profile: item.id_profile,
        username: item.profiles?.username || 'N/A',
        full_name: item.profiles?.full_name || 'Usuario no encontrado',
        progreso: item.progreso,
        estado_individual: item.estado_individual,
        fecha_inicio_real: item.fecha_inicio_real,
        fecha_fin_real: item.fecha_fin_real,
        sesiones_completadas: item.sesiones_completadas || 0,
        sesiones_programadas: item.sesiones_programadas || 0,
        notas_individuales: item.notas_individuales,
        adherencia_porcentaje: item.adherencia_porcentaje || 0
      }));

    } catch (error) {
      console.error('Error cargando seguimiento detalle:', error);
      this.seguimientoDetalle = [];
    }
  }

  // Toggle selección de usuario
  toggleUsuario(userId: number): void {
    const index = this.asignacionForm.usuarios_seleccionados.indexOf(userId);
    if (index > -1) {
      this.asignacionForm.usuarios_seleccionados.splice(index, 1);
    } else {
      this.asignacionForm.usuarios_seleccionados.push(userId);
    }
  }

  isUsuarioSelected(userId: number): boolean {
    return this.asignacionForm.usuarios_seleccionados.includes(userId);
  }

  selectAllUsuarios(): void {
    this.asignacionForm.usuarios_seleccionados = this.usuarios.map(u => u.id!);
  }

  clearAllUsuarios(): void {
    this.asignacionForm.usuarios_seleccionados = [];
  }

  async asignarTerapia(): Promise<void> {
    try {
      this.error = '';

      // Validaciones
      if (!this.asignacionForm.id_terapia) {
        this.error = 'Debe seleccionar una terapia';
        return;
      }

      if (this.asignacionForm.usuarios_seleccionados.length === 0) {
        this.error = 'Debe seleccionar al menos un usuario';
        return;
      }

      if (!this.asignacionForm.fecha_inicio || !this.asignacionForm.fecha_fin) {
        this.error = 'Debe especificar fechas de inicio y fin';
        return;
      }

      if (new Date(this.asignacionForm.fecha_fin) <= new Date(this.asignacionForm.fecha_inicio)) {
        this.error = 'La fecha de fin debe ser posterior a la fecha de inicio';
        return;
      }

      this.loading = true;

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Intentar primero con la función RPC
      let asignacionId: number;

      try {
        const { data, error } = await this.supabaseService.client
          .rpc('asignar_terapia_a_usuarios', {
            p_id_terapia: this.asignacionForm.id_terapia,
            p_usuarios_ids: this.asignacionForm.usuarios_seleccionados,
            p_asignado_por: currentUser.id,
            p_fecha_inicio: this.asignacionForm.fecha_inicio,
            p_fecha_fin: this.asignacionForm.fecha_fin,
            p_terapeuta_responsable: this.asignacionForm.terapeuta_responsable || null,
            p_sesiones_por_semana: this.asignacionForm.sesiones_por_semana,
            p_duracion_sesion: this.asignacionForm.duracion_sesion,
            p_tipo_asignacion: this.asignacionForm.tipo_asignacion,
            p_notas: this.asignacionForm.notas || null,
            p_objetivos_grupales: this.asignacionForm.objetivos_grupales || null
          });

        if (error) throw error;
        asignacionId = data;

      } catch (rpcError) {
        console.log('Función RPC no disponible, usando método manual');
        
        // Método alternativo: crear registros manualmente
        const asignacionData = {
          id_terapia: this.asignacionForm.id_terapia,
          usuarios_asignados: this.asignacionForm.usuarios_seleccionados,
          asignado_por: currentUser.id,
          terapeuta_responsable: this.asignacionForm.terapeuta_responsable || null,
          fecha_inicio: this.asignacionForm.fecha_inicio,
          fecha_fin: this.asignacionForm.fecha_fin,
          sesiones_por_semana: this.asignacionForm.sesiones_por_semana,
          duracion_sesion: this.asignacionForm.duracion_sesion,
          tipo_asignacion: this.asignacionForm.tipo_asignacion,
          notas: this.asignacionForm.notas || null,
          objetivos_grupales: this.asignacionForm.objetivos_grupales || null,
          estado: 'activa'
        };

        const { data: asignacion, error: asignacionError } = await this.supabaseService.client
          .from('terapia_asignaciones_masivas')
          .insert(asignacionData)
          .select()
          .single();

        if (asignacionError) throw asignacionError;
        asignacionId = asignacion.id;

        // Crear registros de seguimiento individual
        const seguimientosData = this.asignacionForm.usuarios_seleccionados.map(userId => ({
          id_asignacion_masiva: asignacionId,
          id_profile: userId,
          id_terapia: this.asignacionForm.id_terapia,
          progreso: 0,
          estado_individual: 'pendiente',
          sesiones_completadas: 0,
          sesiones_programadas: this.calcularSesionesProgramadas(),
          adherencia_porcentaje: 0
        }));

        const { error: seguimientoError } = await this.supabaseService.client
          .from('terapia_seguimiento_individual')
          .insert(seguimientosData);

        if (seguimientoError) throw seguimientoError;
      }

      console.log('Terapia asignada exitosamente, ID:', asignacionId);

      // Recargar datos y cerrar modal
      await this.loadAsignaciones();
      this.closeAsignarModal();

      // Mostrar mensaje de éxito
      alert(`Terapia asignada exitosamente a ${this.asignacionForm.usuarios_seleccionados.length} usuarios`);

    } catch (error) {
      console.error('Error asignando terapia:', error);
      this.error = error instanceof Error ? error.message : 'Error al asignar la terapia';
    } finally {
      this.loading = false;
    }
  }

  private calcularSesionesProgramadas(): number {
    const fechaInicio = new Date(this.asignacionForm.fecha_inicio);
    const fechaFin = new Date(this.asignacionForm.fecha_fin);
    const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const semanas = Math.ceil(diffDays / 7);
    return semanas * this.asignacionForm.sesiones_por_semana;
  }

  async cancelarAsignacion(asignacionId: number): Promise<void> {
    const confirmar = confirm('¿Está seguro de cancelar esta asignación? Esta acción afectará a todos los usuarios asignados.');
    
    if (confirmar) {
      try {
        const { error } = await this.supabaseService.client
          .from('terapia_asignaciones_masivas')
          .update({ 
            estado: 'cancelada',
            updated_at: new Date().toISOString()
          })
          .eq('id', asignacionId);

        if (error) throw error;

        await this.loadAsignaciones();
        alert('Asignación cancelada exitosamente');
      } catch (error) {
        console.error('Error cancelando asignación:', error);
        alert('Error al cancelar la asignación');
      }
    }
  }

  async actualizarProgreso(seguimientoId: number, event: any): Promise<void> {
    try {
      const nuevoProgreso = parseInt(event.target?.value || event) || 0;
      
      if (nuevoProgreso < 0 || nuevoProgreso > 100) {
        alert('El progreso debe estar entre 0 y 100');
        return;
      }

      // Método directo si no existe la función RPC
      const updateData: any = {
        progreso: nuevoProgreso,
        updated_at: new Date().toISOString()
      };

      // Determinar estado basado en progreso
      if (nuevoProgreso === 0) {
        updateData.estado_individual = 'pendiente';
      } else if (nuevoProgreso < 100) {
        updateData.estado_individual = 'en_progreso';
        // Si no tiene fecha de inicio, agregarla
        const seguimiento = this.seguimientoDetalle.find(s => s.seguimiento_id === seguimientoId);
        if (seguimiento && !seguimiento.fecha_inicio_real) {
          updateData.fecha_inicio_real = new Date().toISOString().split('T')[0];
        }
      } else {
        updateData.estado_individual = 'completada';
        updateData.fecha_fin_real = new Date().toISOString().split('T')[0];
      }

      const { error } = await this.supabaseService.client
        .from('terapia_seguimiento_individual')
        .update(updateData)
        .eq('id', seguimientoId);

      if (error) throw error;

      // Recargar seguimiento detalle
      if (this.selectedAsignacion) {
        await this.loadSeguimientoDetalle(this.selectedAsignacion.asignacion_id);
      }

    } catch (error) {
      console.error('Error actualizando progreso:', error);
      alert('Error al actualizar el progreso');
    }
  }

  // Método para editar notas individuales
  async editarNotasIndividuales(seguimiento: any): Promise<void> {
    const nuevasNotas = prompt('Ingrese las notas para este usuario:', seguimiento.notas_individuales || '');
    
    if (nuevasNotas !== null) {
      try {
        const { error } = await this.supabaseService.client
          .from('terapia_seguimiento_individual')
          .update({ 
            notas_individuales: nuevasNotas,
            updated_at: new Date().toISOString()
          })
          .eq('id', seguimiento.seguimiento_id);

        if (error) throw error;

        // Recargar seguimiento detalle
        if (this.selectedAsignacion) {
          await this.loadSeguimientoDetalle(this.selectedAsignacion.asignacion_id);
        }

      } catch (error) {
        console.error('Error actualizando notas:', error);
        alert('Error al actualizar las notas');
      }
    }
  }

  // Método para obtener estadísticas del progreso
  getEstadisticasProgreso(): any {
    if (!this.seguimientoDetalle || this.seguimientoDetalle.length === 0) {
      return {
        pendientes: 0,
        enProgreso: 0,
        completadas: 0,
        promedioProgreso: 0,
        promedioAdherencia: 0
      };
    }

    const pendientes = this.seguimientoDetalle.filter(s => s.estado_individual === 'pendiente').length;
    const enProgreso = this.seguimientoDetalle.filter(s => s.estado_individual === 'en_progreso').length;
    const completadas = this.seguimientoDetalle.filter(s => s.estado_individual === 'completada').length;
    
    const totalProgreso = this.seguimientoDetalle.reduce((sum, s) => sum + (s.progreso || 0), 0);
    const promedioProgreso = Math.round(totalProgreso / this.seguimientoDetalle.length);

    const totalAdherencia = this.seguimientoDetalle.reduce((sum, s) => sum + (s.adherencia_porcentaje || 0), 0);
    const promedioAdherencia = Math.round(totalAdherencia / this.seguimientoDetalle.length);

    return {
      pendientes,
      enProgreso,
      completadas,
      promedioProgreso,
      promedioAdherencia
    };
  }

  // Métodos de utilidad
  getTerapiaNombre(terapiaId: number): string {
    const terapia = this.terapias.find(t => t.id === terapiaId);
    return terapia?.nombre || 'Terapia no encontrada';
  }

  getUserName(userId: number): string {
    const user = this.usuarios.find(u => u.id === userId);
    return user?.full_name || user?.username || 'Usuario no encontrado';
  }

  getTerapeutaNombre(terapeutaId?: number): string {
    if (!terapeutaId) return 'Sin asignar';
    const terapeuta = this.terapeutas.find(t => t.id === terapeutaId);
    return terapeuta?.full_name || 'Terapeuta no encontrado';
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'activa': return 'green';
      case 'completada': return 'blue';
      case 'pausada': return 'yellow';
      case 'cancelada': return 'red';
      default: return 'gray';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'activa': return 'fas fa-play-circle';
      case 'completada': return 'fas fa-check-circle';
      case 'pausada': return 'fas fa-pause-circle';
      case 'cancelada': return 'fas fa-times-circle';
      default: return 'fas fa-circle';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatDuracion(minutos?: number): string {
    if (!minutos) return 'Sin especificar';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  getNextWeekDate(): string {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  // Filtros
  get filteredAsignaciones(): AsignacionCompletaTerapia[] {
    let filtered = [...this.asignaciones];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.terapia_nombre.toLowerCase().includes(term) ||
        a.asignado_por_nombre.toLowerCase().includes(term) ||
        a.terapeuta_nombre?.toLowerCase().includes(term) ||
        a.area_especializacion?.toLowerCase().includes(term)
      );
    }

    if (this.estadoFilter !== 'all') {
      filtered = filtered.filter(a => a.estado_asignacion === this.estadoFilter);
    }

    if (this.terapiaFilter !== 'all') {
      filtered = filtered.filter(a => a.terapia_nombre === this.terapiaFilter);
    }

    if (this.tipoFilter !== 'all') {
      filtered = filtered.filter(a => a.tipo_asignacion === this.tipoFilter);
    }

    return filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.estadoFilter = 'all';
    this.terapiaFilter = 'all';
    this.tipoFilter = 'all';
  }

  async refreshData(): Promise<void> {
    await this.loadAsignaciones();
  }

  // Verificar permisos
  canAssignTerapias(): boolean {
    return this.authService.isAdmin() || this.authService.hasProfile(3); // Admin o Supervisor
  }

  trackByAsignacionId(index: number, item: AsignacionCompletaTerapia): any {
    return item.asignacion_id;
  }

  trackByUserId(index: number, item: Profile): any {
    return item.id;
  }

  trackByTerapiaId(index: number, item: Terapia): any {
    return item.id;
  }
}