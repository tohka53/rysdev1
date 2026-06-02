// src/app/paquete-form/paquete-form/paquete-form.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaquetesService } from '../../services/paquetes.service';
import { SupabaseService } from '../../services/supabase.service';
import { 
  Paquete, 
  PaqueteFormData, 
  TIPOS_PAQUETE,
  SelectorRutinaTerapia
} from '../../interfaces/paquetes.interfaces';

// Interfaces locales para los datos de la base de datos
interface RutinaDB {
  id: any;
  nombre: any;
  descripcion: any;
  nivel: any;
  duracion_estimada: any;
  tipo: any;
}

interface TerapiaDB {
  id: any;
  nombre: any;
  descripcion: any;
  tipo: any;
  area_especializacion: any;
  nivel: any;
  duracion_estimada: any;
}

@Component({
  selector: 'app-paquete-form',
  standalone: false,
  templateUrl: './paquete-form.component.html',
  styleUrls: ['./paquete-form.component.css']
})
export class PaqueteFormComponent implements OnInit {

  // ================================
  // PROPIEDADES
  // ================================
  paqueteForm!: FormGroup;
  esEdicion = false;
  paqueteId: number | null = null;
  cargando = false;
  guardando = false;
  error: string | null = null;

  // Opciones
  tiposPaquete = TIPOS_PAQUETE;

  // Listas para selección
  rutinasDisponibles: SelectorRutinaTerapia[] = [];
  terapiasDisponibles: SelectorRutinaTerapia[] = [];
  cargandoOpciones = false;

  // Selecciones actuales
  rutinasSeleccionadas: number[] = [];
  terapiasSeleccionadas: number[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private paquetesService: PaquetesService,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.verificarModoEdicion();
  }

  // ================================
  // INICIALIZACIÓN
  // ================================

  private inicializarFormulario(): void {
    this.paqueteForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(255)]],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(0.01)]],
      cantidad_sesiones: [1, [Validators.required, Validators.min(1), Validators.max(25)]],
      tipo: ['terapia', [Validators.required]],
      descuento: [0, [Validators.min(0), Validators.max(100)]]
    });

    // Listener para cambio de tipo
    this.paqueteForm.get('tipo')?.valueChanges.subscribe((tipo) => {
      this.onTipoChange(tipo);
    });

    // Listener para cambio de cantidad de sesiones
    this.paqueteForm.get('cantidad_sesiones')?.valueChanges.subscribe((cantidad) => {
      this.validarSelecciones();
    });

    // Cargar opciones iniciales (terapias por defecto)
    this.cargarTerapias();
  }

  private verificarModoEdicion(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion = true;
      this.paqueteId = parseInt(id);
      this.cargarPaquete();
    }
  }

  // ================================
  // CARGA DE DATOS
  // ================================

  private async cargarPaquete(): Promise<void> {
    if (!this.paqueteId) return;

    this.cargando = true;
    this.error = null;

    try {
      const paquete = await this.paquetesService.obtenerPaquetePorId(this.paqueteId);
      
      if (paquete) {
        this.paqueteForm.patchValue({
          nombre: paquete.nombre,
          descripcion: paquete.descripcion || '',
          precio: paquete.precio,
          cantidad_sesiones: paquete.cantidad_sesiones,
          tipo: paquete.tipo,
          descuento: paquete.descuento
        });

        // Cargar selecciones previas
        if (paquete.tipo === 'rutina' && paquete.rutinas_seleccionadas) {
          this.rutinasSeleccionadas = [...paquete.rutinas_seleccionadas];
        } else if (paquete.tipo === 'terapia' && paquete.terapias_seleccionadas) {
          this.terapiasSeleccionadas = [...paquete.terapias_seleccionadas];
        }

        // Cargar opciones según el tipo
        await this.onTipoChange(paquete.tipo);
      } else {
        this.error = 'Paquete no encontrado';
      }
    } catch (error) {
      console.error('Error cargando paquete:', error);
      this.error = 'Error al cargar el paquete';
    } finally {
      this.cargando = false;
    }
  }

  private async cargarRutinas(): Promise<void> {
    try {
      this.cargandoOpciones = true;
      
      const { data: rutinas, error } = await this.supabaseService.client
        .from('rutinas')
        .select('id, nombre, descripcion, nivel, duracion_estimada, tipo')
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;

      this.rutinasDisponibles = (rutinas || []).map((rutina: RutinaDB) => ({
        id: Number(rutina.id),
        nombre: String(rutina.nombre || ''),
        descripcion: String(rutina.descripcion || ''),
        informacion_adicional: this.construirInfoRutina(rutina),
        seleccionado: this.rutinasSeleccionadas.includes(Number(rutina.id))
      }));
    } catch (error) {
      console.error('Error cargando rutinas:', error);
      this.error = 'Error al cargar las rutinas disponibles';
    } finally {
      this.cargandoOpciones = false;
    }
  }

  private async cargarTerapias(): Promise<void> {
    try {
      this.cargandoOpciones = true;
      
      const { data: terapias, error } = await this.supabaseService.client
        .from('terapias')
        .select('id, nombre, descripcion, tipo, area_especializacion, nivel, duracion_estimada')
        .eq('status', 1)
        .order('nombre');

      if (error) throw error;

      this.terapiasDisponibles = (terapias || []).map((terapia: TerapiaDB) => ({
        id: Number(terapia.id),
        nombre: String(terapia.nombre || ''),
        descripcion: String(terapia.descripcion || ''),
        informacion_adicional: this.construirInfoTerapia(terapia),
        seleccionado: this.terapiasSeleccionadas.includes(Number(terapia.id))
      }));
    } catch (error) {
      console.error('Error cargando terapias:', error);
      this.error = 'Error al cargar las terapias disponibles';
    } finally {
      this.cargandoOpciones = false;
    }
  }

  // ================================
  // MANEJO DE SELECCIONES
  // ================================

  async onTipoChange(tipo: string): Promise<void> {
    // Limpiar selecciones actuales
    this.rutinasSeleccionadas = [];
    this.terapiasSeleccionadas = [];

    // Cargar opciones según el tipo
    if (tipo === 'rutina') {
      await this.cargarRutinas();
    } else if (tipo === 'terapia') {
      await this.cargarTerapias();
    }
  }

  onSeleccionChange(id: number, esRutina: boolean): void {
    const cantidadPermitida = this.paqueteForm.get('cantidad_sesiones')?.value || 1;
    
    if (esRutina) {
      const index = this.rutinasSeleccionadas.indexOf(id);
      if (index > -1) {
        // Deseleccionar
        this.rutinasSeleccionadas.splice(index, 1);
      } else {
        // Seleccionar solo si no se supera el límite
        if (this.rutinasSeleccionadas.length < cantidadPermitida) {
          this.rutinasSeleccionadas.push(id);
        } else {
          this.mostrarMensajeError(`Solo puedes seleccionar hasta ${cantidadPermitida} rutinas`);
          return;
        }
      }
      
      // Actualizar estado visual
      this.rutinasDisponibles = this.rutinasDisponibles.map(rutina => ({
        ...rutina,
        seleccionado: this.rutinasSeleccionadas.includes(rutina.id)
      }));
    } else {
      const index = this.terapiasSeleccionadas.indexOf(id);
      if (index > -1) {
        // Deseleccionar
        this.terapiasSeleccionadas.splice(index, 1);
      } else {
        // Seleccionar solo si no se supera el límite
        if (this.terapiasSeleccionadas.length < cantidadPermitida) {
          this.terapiasSeleccionadas.push(id);
        } else {
          this.mostrarMensajeError(`Solo puedes seleccionar hasta ${cantidadPermitida} terapias`);
          return;
        }
      }
      
      // Actualizar estado visual
      this.terapiasDisponibles = this.terapiasDisponibles.map(terapia => ({
        ...terapia,
        seleccionado: this.terapiasSeleccionadas.includes(terapia.id)
      }));
    }
  }

  private validarSelecciones(): void {
    const cantidadPermitida = this.paqueteForm.get('cantidad_sesiones')?.value || 1;
    const tipo = this.paqueteForm.get('tipo')?.value;

    if (tipo === 'rutina' && this.rutinasSeleccionadas.length > cantidadPermitida) {
      // Mantener solo las primeras selecciones
      this.rutinasSeleccionadas = this.rutinasSeleccionadas.slice(0, cantidadPermitida);
      this.actualizarEstadoVisualRutinas();
    } else if (tipo === 'terapia' && this.terapiasSeleccionadas.length > cantidadPermitida) {
      // Mantener solo las primeras selecciones
      this.terapiasSeleccionadas = this.terapiasSeleccionadas.slice(0, cantidadPermitida);
      this.actualizarEstadoVisualTerapias();
    }
  }

  private actualizarEstadoVisualRutinas(): void {
    this.rutinasDisponibles = this.rutinasDisponibles.map(rutina => ({
      ...rutina,
      seleccionado: this.rutinasSeleccionadas.includes(rutina.id)
    }));
  }

  private actualizarEstadoVisualTerapias(): void {
    this.terapiasDisponibles = this.terapiasDisponibles.map(terapia => ({
      ...terapia,
      seleccionado: this.terapiasSeleccionadas.includes(terapia.id)
    }));
  }

  limpiarSelecciones(): void {
    this.rutinasSeleccionadas = [];
    this.terapiasSeleccionadas = [];
    this.actualizarEstadoVisualRutinas();
    this.actualizarEstadoVisualTerapias();
  }

  // ================================
  // ACCIONES DEL FORMULARIO
  // ================================

  async onSubmit(): Promise<void> {
    if (this.paqueteForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    // Validar que se hayan seleccionado rutinas/terapias
    const tipo = this.paqueteForm.get('tipo')?.value;
    if (tipo === 'rutina' && this.rutinasSeleccionadas.length === 0) {
      this.error = 'Debe seleccionar al menos una rutina para el paquete';
      return;
    } else if (tipo === 'terapia' && this.terapiasSeleccionadas.length === 0) {
      this.error = 'Debe seleccionar al menos una terapia para el paquete';
      return;
    }

    this.guardando = true;
    this.error = null;

    try {
      const formData: PaqueteFormData = {
        ...this.paqueteForm.value,
        rutinas_seleccionadas: tipo === 'rutina' ? this.rutinasSeleccionadas : undefined,
        terapias_seleccionadas: tipo === 'terapia' ? this.terapiasSeleccionadas : undefined
      };

      let response;
      if (this.esEdicion && this.paqueteId) {
        response = await this.paquetesService.actualizarPaquete(this.paqueteId, formData);
      } else {
        response = await this.paquetesService.crearPaquete(formData);
      }

      if (response.success) {
        this.mostrarMensajeExito(response.message);
        this.router.navigate(['/paquetes']);
      } else {
        this.error = response.message;
      }
    } catch (error) {
      console.error('Error guardando paquete:', error);
      this.error = 'Error al guardar el paquete';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/paquetes']);
  }

  // ================================
  // UTILIDADES
  // ================================

  private construirInfoRutina(rutina: RutinaDB): string {
    const partes = [];
    if (rutina.nivel) partes.push(`Nivel: ${String(rutina.nivel)}`);
    if (rutina.duracion_estimada) partes.push(`${rutina.duracion_estimada} min`);
    if (rutina.tipo) partes.push(String(rutina.tipo));
    return partes.join(' • ');
  }

  private construirInfoTerapia(terapia: TerapiaDB): string {
    const partes = [];
    if (terapia.tipo) partes.push(`Tipo: ${String(terapia.tipo)}`);
    if (terapia.area_especializacion) partes.push(String(terapia.area_especializacion));
    if (terapia.nivel) partes.push(`Nivel: ${String(terapia.nivel)}`);
    if (terapia.duracion_estimada) partes.push(`${terapia.duracion_estimada} min`);
    return partes.join(' • ');
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.paqueteForm.controls).forEach(key => {
      this.paqueteForm.get(key)?.markAsTouched();
    });
  }

  esInvalido(campo: string): boolean {
    const control = this.paqueteForm.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  obtenerMensajeError(campo: string): string {
    const control = this.paqueteForm.get(campo);
    if (control?.errors) {
      if (control.errors['required']) return `${campo} es requerido`;
      if (control.errors['min']) return `${campo} debe ser mayor a ${control.errors['min'].min}`;
      if (control.errors['max']) return `${campo} debe ser menor a ${control.errors['max'].max}`;
      if (control.errors['maxlength']) return `${campo} es demasiado largo`;
    }
    return '';
  }

  private mostrarMensajeExito(mensaje: string): void {
    // Implementar notificación de éxito
    console.log('Éxito:', mensaje);
  }

  private mostrarMensajeError(mensaje: string): void {
    // Implementar notificación de error
    console.log('Error:', mensaje);
  }

  // ================================
  // GETTERS
  // ================================

  get hayDescuento(): boolean {
    return (this.paqueteForm.get('descuento')?.value || 0) > 0;
  }

  get precioFinalCalculado(): number {
    const precio = this.paqueteForm.get('precio')?.value || 0;
    const descuento = this.paqueteForm.get('descuento')?.value || 0;
    return precio - (precio * descuento / 100);
  }

  get cantidadSeleccionada(): number {
    const tipo = this.paqueteForm.get('tipo')?.value;
    return tipo === 'rutina' ? this.rutinasSeleccionadas.length : this.terapiasSeleccionadas.length;
  }

  get cantidadPermitida(): number {
    return this.paqueteForm.get('cantidad_sesiones')?.value || 1;
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(precio);
  }
}