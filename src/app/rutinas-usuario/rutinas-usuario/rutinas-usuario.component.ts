// src/app/rutinas-usuario/rutinas-usuario.component.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { Profile } from '../../interfaces/user.interfaces';
import { Rutina } from '../../interfaces/rutinas.interfaces';

export interface AsignacionMasiva {
  id?: number;
  id_rutina: number;
  usuarios_asignados: number[];
  asignado_por: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado?: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

export interface SeguimientoIndividual {
  id?: number;
  id_asignacion_masiva: number;
  id_profile: number;
  id_rutina: number;
  progreso: number;
  estado_individual: string;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  notas_individuales?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AsignacionCompleta {
  asignacion_id: number;
  rutina_nombre: string;
  rutina_descripcion?: string;
  fecha_inicio_programada: string;
  fecha_fin_programada: string;
  usuarios_count: number;
  estado_asignacion: string;
  asignado_por_nombre: string;
  fecha_asignacion: string;
  notas_asignacion?: string;
}

@Component({
  selector: 'app-rutinas-usuario',
  standalone: false,
  templateUrl: './rutinas-usuario.component.html',
  styleUrls: ['./rutinas-usuario.component.css']
})
export class RutinasUsuarioComponent implements OnInit {
  // Datos principales
  rutinas: Rutina[] = [];
  usuarios: Profile[] = [];
  asignaciones: AsignacionCompleta[] = [];
  
  // Control de UI
  loading = false;
  error = '';
  showAsignarModal = false;
  showVerModal = false;
  selectedAsignacion: AsignacionCompleta | null = null;
  seguimientoDetalle: any[] = [];

  // Formulario de asignación
  asignacionForm = {
    id_rutina: 0,
    usuarios_seleccionados: [] as number[],
    fecha_inicio: '',
    fecha_fin: '',
    notas: ''
  };

  // Filtros y búsqueda
  searchTerm = '';
  estadoFilter = 'all';
  rutinaFilter = 'all';

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
        this.loadRutinas(),
        this.loadUsuarios(),
        this.loadAsignaciones()
      ]);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      this.error = 'Error al cargar los datos';
    } finally {
      this.loading = false;
    }
  }

  async loadRutinas(): Promise<void> {
    try {
      const data = await this.supabaseService.getData('rutinas');
      this.rutinas = data?.filter(r => r.status === 1) || [];
    } catch (error) {
      console.error('Error cargando rutinas:', error);
    }
  }

  async loadUsuarios(): Promise<void> {
    try {
      const data = await this.supabaseService.getData('profiles');
      this.usuarios = data?.filter(u => u.status === 1) || [];
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  }

  async loadAsignaciones(): Promise<void> {
    try {
      // Obtener asignaciones masivas con información expandida
      const { data, error } = await this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .select(`
          id,
          id_rutina,
          usuarios_asignados,
          fecha_inicio,
          fecha_fin,
          estado,
          notas,
          created_at,
          rutinas(nombre, descripcion),
          profiles!rutina_asignaciones_masivas_asignado_por_fkey(full_name)
        `)
        .eq('status', 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.asignaciones = (data || []).map((item: any) => ({
        asignacion_id: item.id,
        rutina_nombre: item.rutinas?.nombre || 'Rutina no encontrada',
        rutina_descripcion: item.rutinas?.descripcion || '',
        fecha_inicio_programada: item.fecha_inicio,
        fecha_fin_programada: item.fecha_fin,
        usuarios_count: item.usuarios_asignados?.length || 0,
        estado_asignacion: item.estado,
        asignado_por_nombre: item.profiles?.full_name || 'Usuario no encontrado',
        fecha_asignacion: item.created_at,
        notas_asignacion: item.notas
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
      const [asignacionesData, rutinasData, usuariosData] = await Promise.all([
        this.supabaseService.getData('rutina_asignaciones_masivas'),
        this.supabaseService.getData('rutinas'),
        this.supabaseService.getData('profiles')
      ]);

      const asignacionesFiltradas = asignacionesData?.filter(a => a.status === 1) || [];

      this.asignaciones = asignacionesFiltradas.map((item: any) => {
        const rutina = rutinasData?.find(r => r.id === item.id_rutina);
        const asignador = usuariosData?.find(u => u.id === item.asignado_por);

        return {
          asignacion_id: item.id,
          rutina_nombre: rutina?.nombre || 'Rutina no encontrada',
          rutina_descripcion: rutina?.descripcion || '',
          fecha_inicio_programada: item.fecha_inicio,
          fecha_fin_programada: item.fecha_fin,
          usuarios_count: item.usuarios_asignados?.length || 0,
          estado_asignacion: item.estado,
          asignado_por_nombre: asignador?.full_name || 'Usuario no encontrado',
          fecha_asignacion: item.created_at,
          notas_asignacion: item.notas
        };
      });

    } catch (error) {
      console.error('Error en método alternativo:', error);
      this.asignaciones = [];
    }
  }

  openAsignarModal(): void {
    this.asignacionForm = {
      id_rutina: 0,
      usuarios_seleccionados: [],
      fecha_inicio: this.getTomorrowDate(),
      fecha_fin: this.getNextWeekDate(),
      notas: ''
    };
    this.error = '';
    this.showAsignarModal = true;
  }

  closeAsignarModal(): void {
    this.showAsignarModal = false;
    this.error = '';
  }

  async openVerModal(asignacion: AsignacionCompleta): Promise<void> {
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
        .from('v_rutinas_asignadas_usuarios')
        .select('*')
        .eq('asignacion_id', asignacionId)
        .order('full_name');

      if (!errorVista && viaVista) {
        this.seguimientoDetalle = viaVista;
        return;
      }

      // Método alternativo: consulta manual
      const { data: seguimientos, error: errorSeguimientos } = await this.supabaseService.client
        .from('rutina_seguimiento_individual')
        .select(`
          id,
          id_asignacion_masiva,
          id_profile,
          progreso,
          estado_individual,
          fecha_inicio_real,
          fecha_fin_real,
          notas_individuales,
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
        notas_individuales: item.notas_individuales
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

  async asignarRutina(): Promise<void> {
    try {
      this.error = '';

      // Validaciones
      if (!this.asignacionForm.id_rutina) {
        this.error = 'Debe seleccionar una rutina';
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
          .rpc('asignar_rutina_a_usuarios', {
            p_id_rutina: this.asignacionForm.id_rutina,
            p_usuarios_ids: this.asignacionForm.usuarios_seleccionados,
            p_asignado_por: currentUser.id,
            p_fecha_inicio: this.asignacionForm.fecha_inicio,
            p_fecha_fin: this.asignacionForm.fecha_fin,
            p_notas: this.asignacionForm.notas || null
          });

        if (error) throw error;
        asignacionId = data;

      } catch (rpcError) {
        console.log('Función RPC no disponible, usando método manual');
        
        // Método alternativo: crear registros manualmente
        const asignacionData = {
          id_rutina: this.asignacionForm.id_rutina,
          usuarios_asignados: this.asignacionForm.usuarios_seleccionados,
          asignado_por: currentUser.id,
          fecha_inicio: this.asignacionForm.fecha_inicio,
          fecha_fin: this.asignacionForm.fecha_fin,
          notas: this.asignacionForm.notas || null,
          estado: 'activa'
        };

        const { data: asignacion, error: asignacionError } = await this.supabaseService.client
          .from('rutina_asignaciones_masivas')
          .insert(asignacionData)
          .select()
          .single();

        if (asignacionError) throw asignacionError;
        asignacionId = asignacion.id;

        // Crear registros de seguimiento individual
        const seguimientosData = this.asignacionForm.usuarios_seleccionados.map(userId => ({
          id_asignacion_masiva: asignacionId,
          id_profile: userId,
          id_rutina: this.asignacionForm.id_rutina,
          progreso: 0,
          estado_individual: 'pendiente'
        }));

        const { error: seguimientoError } = await this.supabaseService.client
          .from('rutina_seguimiento_individual')
          .insert(seguimientosData);

        if (seguimientoError) throw seguimientoError;
      }

      console.log('Rutina asignada exitosamente, ID:', asignacionId);

      // Recargar datos y cerrar modal
      await this.loadAsignaciones();
      this.closeAsignarModal();

      // Mostrar mensaje de éxito
      alert(`Rutina asignada exitosamente a ${this.asignacionForm.usuarios_seleccionados.length} usuarios`);

    } catch (error) {
      console.error('Error asignando rutina:', error);
      this.error = error instanceof Error ? error.message : 'Error al asignar la rutina';
    } finally {
      this.loading = false;
    }
  }

  async cancelarAsignacion(asignacionId: number): Promise<void> {
    const confirmar = confirm('¿Está seguro de cancelar esta asignación? Esta acción afectará a todos los usuarios asignados.');
    
    if (confirmar) {
      try {
        const { error } = await this.supabaseService.client
          .from('rutina_asignaciones_masivas')
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
        .from('rutina_seguimiento_individual')
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

// Agregar estos métodos al final de la clase RutinasUsuarioComponent

  // Método para editar notas individuales
  async editarNotasIndividuales(seguimiento: any): Promise<void> {
    const nuevasNotas = prompt('Ingrese las notas para este usuario:', seguimiento.notas_individuales || '');
    
    if (nuevasNotas !== null) {
      try {
        const { error } = await this.supabaseService.client
          .from('rutina_seguimiento_individual')
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
        promedioProgreso: 0
      };
    }

    const pendientes = this.seguimientoDetalle.filter(s => s.estado_individual === 'pendiente').length;
    const enProgreso = this.seguimientoDetalle.filter(s => s.estado_individual === 'en_progreso').length;
    const completadas = this.seguimientoDetalle.filter(s => s.estado_individual === 'completada').length;
    
    const totalProgreso = this.seguimientoDetalle.reduce((sum, s) => sum + (s.progreso || 0), 0);
    const promedioProgreso = Math.round(totalProgreso / this.seguimientoDetalle.length);

    return {
      pendientes,
      enProgreso,
      completadas,
      promedioProgreso
    };
  }






  // Métodos de utilidad
  getRutinaNombre(rutinaId: number): string {
    const rutina = this.rutinas.find(r => r.id === rutinaId);
    return rutina?.nombre || 'Rutina no encontrada';
  }

  getUserName(userId: number): string {
    const user = this.usuarios.find(u => u.id === userId);
    return user?.full_name || user?.username || 'Usuario no encontrado';
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
  get filteredAsignaciones(): AsignacionCompleta[] {
    let filtered = [...this.asignaciones];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.rutina_nombre.toLowerCase().includes(term) ||
        a.asignado_por_nombre.toLowerCase().includes(term)
      );
    }

    if (this.estadoFilter !== 'all') {
      filtered = filtered.filter(a => a.estado_asignacion === this.estadoFilter);
    }

    if (this.rutinaFilter !== 'all') {
      filtered = filtered.filter(a => a.rutina_nombre === this.rutinaFilter);
    }

    return filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.estadoFilter = 'all';
    this.rutinaFilter = 'all';
  }

  async refreshData(): Promise<void> {
    await this.loadAsignaciones();
  }

  // Verificar permisos
  canAssignRoutines(): boolean {
    return this.authService.isAdmin() || this.authService.hasProfile(3); // Admin o Supervisor
  }

  trackByAsignacionId(index: number, item: AsignacionCompleta): any {
    return item.asignacion_id;
  }

  trackByUserId(index: number, item: Profile): any {
    return item.id;
  }

  trackByRutinaId(index: number, item: Rutina): any {
    return item.id;
  }
}