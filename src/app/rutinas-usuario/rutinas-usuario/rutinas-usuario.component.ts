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
  status?: number;
  es_activa?: boolean; // Nueva propiedad para determinar si está activa
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

  // Formulario de asignación (sin fecha_fin)
  asignacionForm = {
    id_rutina: 0,
    usuarios_seleccionados: [] as number[],
    fecha_inicio: '',
    notas: ''
  };

  // Filtros y búsqueda
  searchTerm = '';
  estadoFilter = 'all';
  rutinaFilter = 'all';
  mostrarInactivas = true; // Toggle para mostrar/ocultar inactivas

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
    // Ejecutar limpieza de asignaciones vencidas al inicializar
    await this.procesarAsignacionesVencidas();
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
      // Obtener asignaciones masivas incluyendo las inactivas
      let query = this.supabaseService.client
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
          status,
          rutinas(nombre, descripcion),
          profiles!rutina_asignaciones_masivas_asignado_por_fkey(full_name)
        `);

      // Si no se muestran inactivas, filtrar por status = 1
      if (!this.mostrarInactivas) {
        query = query.eq('status', 1);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      this.asignaciones = (data || []).map((item: any) => {
        const fechaFin = new Date(item.fecha_fin);
        const hoy = new Date();
        const esActiva = item.status === 1 && fechaFin >= hoy;

        return {
          asignacion_id: item.id,
          rutina_nombre: item.rutinas?.nombre || 'Rutina no encontrada',
          rutina_descripcion: item.rutinas?.descripcion || '',
          fecha_inicio_programada: item.fecha_inicio,
          fecha_fin_programada: item.fecha_fin,
          usuarios_count: item.usuarios_asignados?.length || 0,
          estado_asignacion: item.estado,
          asignado_por_nombre: item.profiles?.full_name || 'Usuario no encontrado',
          fecha_asignacion: item.created_at,
          notas_asignacion: item.notas,
          status: item.status,
          es_activa: esActiva
        };
      });

    } catch (error) {
      console.error('Error cargando asignaciones:', error);
      await this.loadAsignacionesAlternativo();
    }
  }

  async loadAsignacionesAlternativo(): Promise<void> {
    try {
      const [asignacionesData, rutinasData, usuariosData] = await Promise.all([
        this.supabaseService.getData('rutina_asignaciones_masivas'),
        this.supabaseService.getData('rutinas'),
        this.supabaseService.getData('profiles')
      ]);

      let asignacionesFiltradas = asignacionesData || [];
      
      // Aplicar filtro de inactivas si es necesario
      if (!this.mostrarInactivas) {
        asignacionesFiltradas = asignacionesFiltradas.filter(a => a.status === 1);
      }

      this.asignaciones = asignacionesFiltradas.map((item: any) => {
        const rutina = rutinasData?.find(r => r.id === item.id_rutina);
        const asignador = usuariosData?.find(u => u.id === item.asignado_por);
        
        const fechaFin = new Date(item.fecha_fin);
        const hoy = new Date();
        const esActiva = item.status === 1 && fechaFin >= hoy;

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
          notas_asignacion: item.notas,
          status: item.status,
          es_activa: esActiva
        };
      });

    } catch (error) {
      console.error('Error en método alternativo:', error);
      this.asignaciones = [];
    }
  }

  // Método para procesar asignaciones vencidas automáticamente
  async procesarAsignacionesVencidas(): Promise<void> {
    try {
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0];

      // Buscar asignaciones activas que hayan vencido
      const { data: asignacionesVencidas, error } = await this.supabaseService.client
        .from('rutina_asignaciones_masivas')
        .select('id')
        .eq('status', 1)
        .lt('fecha_fin', fechaHoy);

      if (error) {
        console.error('Error buscando asignaciones vencidas:', error);
        return;
      }

      if (asignacionesVencidas && asignacionesVencidas.length > 0) {
        const idsVencidas = asignacionesVencidas.map(a => a.id);
        
        // Marcar como inactivas (status = 0)
        const { error: updateError } = await this.supabaseService.client
          .from('rutina_asignaciones_masivas')
          .update({ 
            status: 0,
            estado: 'expirada',
            updated_at: new Date().toISOString()
          })
          .in('id', idsVencidas);

        if (updateError) {
          console.error('Error actualizando asignaciones vencidas:', updateError);
        } else {
          console.log(`${idsVencidas.length} asignaciones marcadas como vencidas`);
        }
      }
    } catch (error) {
      console.error('Error procesando asignaciones vencidas:', error);
    }
  }

  openAsignarModal(): void {
    this.asignacionForm = {
      id_rutina: 0,
      usuarios_seleccionados: [],
      fecha_inicio: this.getTomorrowDate(),
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
      const { data: viaVista, error: errorVista } = await this.supabaseService.client
        .from('v_rutinas_asignadas_usuarios')
        .select('*')
        .eq('asignacion_id', asignacionId)
        .order('full_name');

      if (!errorVista && viaVista) {
        this.seguimientoDetalle = viaVista;
        return;
      }

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

  // Método para calcular fecha fin automáticamente (1 mes después)
  calcularFechaFin(fechaInicio: string): string {
    if (!fechaInicio) return '';
    const fecha = new Date(fechaInicio);
    fecha.setMonth(fecha.getMonth() + 1);
    return fecha.toISOString().split('T')[0];
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

      if (!this.asignacionForm.fecha_inicio) {
        this.error = 'Debe especificar la fecha de inicio';
        return;
      }

      this.loading = true;

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Calcular fecha de fin automáticamente (1 mes después)
      const fechaFin = this.calcularFechaFin(this.asignacionForm.fecha_inicio);

      let asignacionId: number;

      try {
        const { data, error } = await this.supabaseService.client
          .rpc('asignar_rutina_a_usuarios', {
            p_id_rutina: this.asignacionForm.id_rutina,
            p_usuarios_ids: this.asignacionForm.usuarios_seleccionados,
            p_asignado_por: currentUser.id,
            p_fecha_inicio: this.asignacionForm.fecha_inicio,
            p_fecha_fin: fechaFin, // Fecha calculada automáticamente
            p_notas: this.asignacionForm.notas || null
          });

        if (error) throw error;
        asignacionId = data;

      } catch (rpcError) {
        console.log('Función RPC no disponible, usando método manual');
        
        const asignacionData = {
          id_rutina: this.asignacionForm.id_rutina,
          usuarios_asignados: this.asignacionForm.usuarios_seleccionados,
          asignado_por: currentUser.id,
          fecha_inicio: this.asignacionForm.fecha_inicio,
          fecha_fin: fechaFin, // Fecha calculada automáticamente
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

      await this.loadAsignaciones();
      this.closeAsignarModal();

      alert(`Rutina asignada exitosamente a ${this.asignacionForm.usuarios_seleccionados.length} usuarios por 1 mes`);

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
            status: 0, // También marcar como inactiva
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

      const updateData: any = {
        progreso: nuevoProgreso,
        updated_at: new Date().toISOString()
      };

      if (nuevoProgreso === 0) {
        updateData.estado_individual = 'pendiente';
      } else if (nuevoProgreso < 100) {
        updateData.estado_individual = 'en_progreso';
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

      if (this.selectedAsignacion) {
        await this.loadSeguimientoDetalle(this.selectedAsignacion.asignacion_id);
      }

    } catch (error) {
      console.error('Error actualizando progreso:', error);
      alert('Error al actualizar el progreso');
    }
  }

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

        if (this.selectedAsignacion) {
          await this.loadSeguimientoDetalle(this.selectedAsignacion.asignacion_id);
        }

      } catch (error) {
        console.error('Error actualizando notas:', error);
        alert('Error al actualizar las notas');
      }
    }
  }

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

  // Método para toggle mostrar/ocultar inactivas
  async toggleMostrarInactivas(): Promise<void> {
    this.mostrarInactivas = !this.mostrarInactivas;
    await this.loadAsignaciones();
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

  getEstadoColor(estado: string, esActiva: boolean = true): string {
    if (!esActiva) return 'gray';
    
    switch (estado) {
      case 'activa': return 'green';
      case 'completada': return 'blue';
      case 'pausada': return 'yellow';
      case 'cancelada': case 'expirada': return 'red';
      default: return 'gray';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'activa': return 'fas fa-play-circle';
      case 'completada': return 'fas fa-check-circle';
      case 'pausada': return 'fas fa-pause-circle';
      case 'cancelada': return 'fas fa-times-circle';
      case 'expirada': return 'fas fa-clock';
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

  // Calcular días restantes para una asignación
  getDiasRestantes(fechaFin: string): number {
    const fin = new Date(fechaFin);
    const hoy = new Date();
    const diffTime = fin.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Verificar si ya venció
  isVencida(fechaFin: string): boolean {
    return this.getDiasRestantes(fechaFin) < 0;
  }

  // Filtros actualizados
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
    await this.procesarAsignacionesVencidas();
    await this.loadAsignaciones();
  }

  canAssignRoutines(): boolean {
    return this.authService.isAdmin() || this.authService.hasProfile(3);
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