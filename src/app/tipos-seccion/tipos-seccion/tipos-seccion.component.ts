// src/app/tipos-seccion/tipos-seccion.component.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';

export interface TipoSeccion {
  id?: number;
  nombre: string;
  descripcion: string;
  icono?: string;
  status: number;
  created_at?: string;
}

@Component({
  selector: 'app-tipos-seccion',
  standalone: false,
  templateUrl: './tipos-seccion.component.html',
  styleUrls: ['./tipos-seccion.component.css']
})
export class TiposSeccionComponent implements OnInit {
  tiposSecciones: TipoSeccion[] = [];
  filteredTiposSecciones: TipoSeccion[] = [];
  loading = false;
  error = '';
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedTipo: TipoSeccion | null = null;

  // Formulario
  tipoForm: TipoSeccion = {
    nombre: '',
    descripcion: '',
    icono: '',
    status: 1
  };

  // Filtros
  searchTerm = '';
  statusFilter = 'active';

  // Iconos predefinidos disponibles para entrenamientos
  iconosDisponibles = [
    { clase: 'fas fa-fire', nombre: 'Fuego - Intensidad' },
    { clase: 'fas fa-heartbeat', nombre: 'Cardio' },
    { clase: 'fas fa-dumbbell', nombre: 'Pesas' },
    { clase: 'fas fa-circle-dot', nombre: 'Core' },
    { clase: 'fas fa-plus-circle', nombre: 'Extra' },
    { clase: 'fas fa-running', nombre: 'Corriendo' },
    { clase: 'fas fa-hand-paper', nombre: 'Flexibilidad' },
    { clase: 'fas fa-spa', nombre: 'Recuperación' },
    { clase: 'fas fa-bolt', nombre: 'Potencia' },
    { clase: 'fas fa-star', nombre: 'Destacado' },
    { clase: 'fas fa-shield-alt', nombre: 'Resistencia' },
    { clase: 'fas fa-stopwatch', nombre: 'Tiempo' },
    { clase: 'fas fa-trophy', nombre: 'Competición' },
    { clase: 'fas fa-chart-line', nombre: 'Progreso' },
    { clase: 'fas fa-weight-hanging', nombre: 'Peso' },
    { clase: 'fas fa-bicycle', nombre: 'Ciclismo' },
    { clase: 'fas fa-swimming-pool', nombre: 'Natación' },
    { clase: 'fas fa-hiking', nombre: 'Funcional' },
    { clase: 'fas fa-mountain', nombre: 'Resistencia' },
    { clase: 'fas fa-thermometer-half', nombre: 'Calentamiento' }
  ];

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    // Verificar que el usuario es administrador
    if (!this.authService.isAdmin()) {
      this.error = 'No tienes permisos para acceder a esta sección';
      return;
    }
    
    await this.loadTiposSecciones();
  }

  async loadTiposSecciones(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      console.log('Cargando tipos de sección...');
      const data = await this.supabaseService.getData('tipos_seccion');
      this.tiposSecciones = data || [];
      this.filteredTiposSecciones = [...this.tiposSecciones];
      this.applyFilters();
      console.log('Tipos de sección cargados:', this.tiposSecciones.length);
    } catch (error) {
      console.error('Error cargando tipos de sección:', error);
      this.error = 'Error al cargar los tipos de sección. Verifique la conexión a la base de datos.';
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    let filtered = [...this.tiposSecciones];

    // Filtro por status
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(tipo => tipo.status === 1);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(tipo => tipo.status === 0);
    }

    // Filtro por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(tipo => 
        tipo.nombre.toLowerCase().includes(term) ||
        tipo.descripcion.toLowerCase().includes(term)
      );
    }

    this.filteredTiposSecciones = filtered;
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.tipoForm = {
      nombre: '',
      descripcion: '',
      icono: '',
      status: 1
    };
    this.error = '';
    this.showModal = true;
  }

  openEditModal(tipo: TipoSeccion): void {
    this.modalMode = 'edit';
    this.selectedTipo = tipo;
    this.tipoForm = { ...tipo };
    this.error = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedTipo = null;
    this.error = '';
  }

  async saveTipo(): Promise<void> {
    try {
      this.error = '';

      // Validaciones
      if (!this.tipoForm.nombre?.trim()) {
        this.error = 'El nombre es requerido';
        return;
      }

      if (!this.tipoForm.descripcion?.trim()) {
        this.error = 'La descripción es requerida';
        return;
      }

      // Validar longitud del nombre
      if (this.tipoForm.nombre.trim().length > 50) {
        this.error = 'El nombre no puede exceder 50 caracteres';
        return;
      }

      // Validar longitud de la descripción
      if (this.tipoForm.descripcion.trim().length > 100) {
        this.error = 'La descripción no puede exceder 100 caracteres';
        return;
      }

      // Limpiar y formatear el nombre (convertir a snake_case)
      const nombreOriginal = this.tipoForm.nombre;
      this.tipoForm.nombre = this.tipoForm.nombre.toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      if (!this.tipoForm.nombre) {
        this.error = 'El nombre debe contener al menos una letra o número válido';
        return;
      }

      console.log(`Nombre convertido de "${nombreOriginal}" a "${this.tipoForm.nombre}"`);

      // Validar que el nombre no exista (solo en crear o si cambió)
      const nombreExiste = this.tiposSecciones.some(tipo => 
        tipo.nombre.toLowerCase() === this.tipoForm.nombre.toLowerCase() &&
        (this.modalMode === 'create' || tipo.id !== this.selectedTipo?.id)
      );

      if (nombreExiste) {
        this.error = 'Ya existe un tipo de sección con ese nombre';
        return;
      }

      // Limpiar icono si está vacío
      if (!this.tipoForm.icono?.trim()) {
        this.tipoForm.icono = '';
      }

      if (this.modalMode === 'create') {
        console.log('Creando tipo de sección:', this.tipoForm);
        await this.supabaseService.insertData('tipos_seccion', this.tipoForm);
        console.log('Tipo de sección creado exitosamente');
      } else {
        console.log('Actualizando tipo de sección:', this.tipoForm);
        await this.supabaseService.updateData('tipos_seccion', this.selectedTipo!.id!.toString(), this.tipoForm);
        console.log('Tipo de sección actualizado exitosamente');
      }

      await this.loadTiposSecciones();
      this.closeModal();
    } catch (error) {
      console.error('Error guardando tipo de sección:', error);
      this.error = 'Error al guardar el tipo de sección. Intente nuevamente.';
    }
  }

  async deleteTipo(tipo: TipoSeccion): Promise<void> {
    const confirmMessage = `¿Está seguro de desactivar el tipo de sección "${tipo.descripcion}"?`;
    if (confirm(confirmMessage)) {
      try {
        console.log('Desactivando tipo de sección:', tipo.nombre);
        await this.supabaseService.updateData('tipos_seccion', tipo.id!.toString(), { status: 0 });
        await this.loadTiposSecciones();
        console.log('Tipo de sección desactivado exitosamente');
      } catch (error) {
        console.error('Error desactivando tipo de sección:', error);
        this.error = 'Error al desactivar el tipo de sección';
        setTimeout(() => this.error = '', 5000);
      }
    }
  }

  async reactivateTipo(tipo: TipoSeccion): Promise<void> {
    const confirmMessage = `¿Está seguro de reactivar el tipo de sección "${tipo.descripcion}"?`;
    if (confirm(confirmMessage)) {
      try {
        console.log('Reactivando tipo de sección:', tipo.nombre);
        await this.supabaseService.updateData('tipos_seccion', tipo.id!.toString(), { status: 1 });
        await this.loadTiposSecciones();
        console.log('Tipo de sección reactivado exitosamente');
      } catch (error) {
        console.error('Error reactivando tipo de sección:', error);
        this.error = 'Error al reactivar el tipo de sección';
        setTimeout(() => this.error = '', 5000);
      }
    }
  }

  // Métodos de utilidad
  getStatusText(status: number): string {
    return status === 1 ? 'Activo' : 'Inactivo';
  }

  getStatusColor(status: number): string {
    return status === 1 ? 'green' : 'red';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'active';
    this.applyFilters();
  }

  async refreshTipos(): Promise<void> {
    console.log('Refrescando tipos de sección');
    await this.loadTiposSecciones();
  }

  // Método para previsualizar el icono seleccionado
  selectIcon(iconClass: string): void {
    this.tipoForm.icono = iconClass;
    console.log('Icono seleccionado:', iconClass);
  }

  // Método trackBy para optimizar rendimiento
  trackByTipoId(index: number, tipo: TipoSeccion): any {
    return tipo.id || index;
  }

  // Método para verificar si un icono está seleccionado
  isIconSelected(iconClass: string): boolean {
    return this.tipoForm.icono === iconClass;
  }

  // Método para limpiar el icono seleccionado
  clearIcon(): void {
    this.tipoForm.icono = '';
  }

  // Método para validar el formulario
  isFormValid(): boolean {
    return !!(this.tipoForm.nombre?.trim() && this.tipoForm.descripcion?.trim());
  }

  // Método para obtener la clase CSS del botón de icono
  getIconButtonClass(iconClass: string): string {
    const baseClass = 'p-2 rounded-md border transition-colors duration-150 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500';
    return this.isIconSelected(iconClass) ? `${baseClass} border-red-500 bg-red-50` : `${baseClass} border-gray-200`;
  }
}