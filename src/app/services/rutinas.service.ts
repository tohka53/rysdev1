// src/app/services/rutinas.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { 
  Rutina, 
  RutinaProfile, 
  RutinaProfileVista, 
  AsignarRutinaRequest, 
  ActualizarProgresoRequest,
  FiltrosRutinas,
  EstadisticasRutinas 
} from '../interfaces/rutina-profile.interfaces';

@Injectable({
  providedIn: 'root'
})
export class RutinasService {

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // ================================
  // CRUD RUTINAS BÁSICAS
  // ================================

  async getRutinas(): Promise<Rutina[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutinas')
        .select('*')
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo rutinas:', error);
      throw error;
    }
  }

  async getRutinaById(id: number): Promise<Rutina | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutinas')
        .select('*')
        .eq('id', id)
        .eq('status', 1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo rutina:', error);
      return null;
    }
  }

  async createRutina(rutina: Rutina): Promise<Rutina | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutinas')
        .insert(rutina)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creando rutina:', error);
      throw error;
    }
  }

  async updateRutina(id: number, rutina: Partial<Rutina>): Promise<Rutina | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('rutinas')
        .update({ ...rutina, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando rutina:', error);
      throw error;
    }
  }

  async deleteRutina(id: number): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('rutinas')
        .update({ status: 0 })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando rutina:', error);
      throw error;
    }
  }

  // ================================
  // ASIGNACIÓN DE RUTINAS A USUARIOS
  // ================================

  async asignarRutina(asignacion: AsignarRutinaRequest): Promise<RutinaProfile | null> {
    try {
      // Validar fechas
      const fechaInicio = new Date(asignacion.fecha_inicio);
      const fechaFin = new Date(asignacion.fecha_fin);
      
      if (fechaFin < fechaInicio) {
        throw new Error('La fecha fin debe ser posterior a la fecha inicio');
      }

      const { data, error } = await this.supabaseService.client
        .from('rutina_profiles')
        .insert(asignacion)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error asignando rutina:', error);
      throw error;
    }
  }

  async getRutinasUsuario(idProfile?: number, filtros?: FiltrosRutinas): Promise<RutinaProfileVista[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      const userId = idProfile || currentUser?.id;

      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      let query = this.supabaseService.client
        .from('v_rutinas_activas')
        .select('*');

      // Aplicar filtros
      if (userId) {
        query = query.eq('id_profile', userId);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.estado_temporal) {
        query = query.eq('estado_temporal', filtros.estado_temporal);
      }

      if (filtros?.tipo) {
        query = query.eq('rutina_tipo', filtros.tipo);
      }

      if (filtros?.nivel) {
        query = query.eq('rutina_nivel', filtros.nivel);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_inicio', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_fin', filtros.fecha_hasta);
      }

      query = query.order('fecha_inicio', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo rutinas del usuario:', error);
      throw error;
    }
  }

  async getRutinasVigentes(idProfile?: number): Promise<RutinaProfileVista[]> {
    const filtros: FiltrosRutinas = {
      estado_temporal: 'vigente',
      estado: 'activa'
    };
    return this.getRutinasUsuario(idProfile, filtros);
  }

  async actualizarProgreso(actualizacion: ActualizarProgresoRequest): Promise<RutinaProfile | null> {
    try {
      const updateData: any = {
        progreso: actualizacion.progreso,
        updated_at: new Date().toISOString()
      };

      if (actualizacion.estado) {
        updateData.estado = actualizacion.estado;
      }

      if (actualizacion.notas !== undefined) {
        updateData.notas = actualizacion.notas;
      }

      // Si el progreso es 100%, marcar como completada automáticamente
      if (actualizacion.progreso >= 100) {
        updateData.estado = 'completada';
      }

      const { data, error } = await this.supabaseService.client
        .from('rutina_profiles')
        .update(updateData)
        .eq('id', actualizacion.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando progreso:', error);
      throw error;
    }
  }

  async cancelarRutina(id: number, motivo?: string): Promise<boolean> {
    try {
      const updateData: any = {
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      };

      if (motivo) {
        updateData.notas = motivo;
      }

      const { error } = await this.supabaseService.client
        .from('rutina_profiles')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cancelando rutina:', error);
      throw error;
    }
  }

  async pausarRutina(id: number, motivo?: string): Promise<boolean> {
    try {
      const updateData: any = {
        estado: 'pausada',
        updated_at: new Date().toISOString()
      };

      if (motivo) {
        updateData.notas = motivo;
      }

      const { error } = await this.supabaseService.client
        .from('rutina_profiles')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error pausando rutina:', error);
      throw error;
    }
  }

  async reanudarRutina(id: number): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('rutina_profiles')
        .update({ 
          estado: 'activa',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error reanudando rutina:', error);
      throw error;
    }
  }

  // ================================
  // ESTADÍSTICAS Y REPORTES
  // ================================

  async getEstadisticasUsuario(idProfile?: number): Promise<EstadisticasRutinas> {
    try {
      const currentUser = this.authService.getCurrentUser();
      const userId = idProfile || currentUser?.id;

      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      const { data, error } = await this.supabaseService.client
        .from('v_rutinas_activas')
        .select('estado, estado_temporal, progreso')
        .eq('id_profile', userId);

      if (error) throw error;

      const rutinas = data || [];
      const total = rutinas.length;
      const activas = rutinas.filter(r => r.estado === 'activa').length;
      const completadas = rutinas.filter(r => r.estado === 'completada').length;
      const vigentes = rutinas.filter(r => r.estado_temporal === 'vigente').length;
      const vencidas = rutinas.filter(r => r.estado_temporal === 'vencida').length;
      
      const progresoPromedio = rutinas.length > 0 
        ? rutinas.reduce((acc, r) => acc + r.progreso, 0) / rutinas.length 
        : 0;

      return {
        total_rutinas: total,
        rutinas_activas: activas,
        rutinas_completadas: completadas,
        progreso_promedio: Math.round(progresoPromedio),
        rutinas_vigentes: vigentes,
        rutinas_vencidas: vencidas
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // ================================
  // MÉTODOS UTILITARIOS
  // ================================

  calcularDiasRestantes(fechaFin: string): number {
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  calcularDuracionTotal(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - inicio.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24)) + 1; // +1 para incluir el día inicial
  }

  validarFechas(fechaInicio: string, fechaFin: string): boolean {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const hoy = new Date();
    
    // La fecha de inicio no puede ser anterior a hoy
    // La fecha de fin debe ser posterior a la fecha de inicio
    return inicio >= hoy && fin > inicio;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getColorEstado(estado: string): string {
    switch (estado) {
      case 'activa': return 'green';
      case 'completada': return 'blue';
      case 'pausada': return 'yellow';
      case 'cancelada': return 'red';
      default: return 'gray';
    }
  }

  getColorEstadoTemporal(estadoTemporal: string): string {
    switch (estadoTemporal) {
      case 'vigente': return 'green';
      case 'pendiente': return 'blue';
      case 'vencida': return 'red';
      default: return 'gray';
    }
  }
}