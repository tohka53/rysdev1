// src/app/terapias/terapias.component.ts
import { Component, OnInit } from '@angular/core';
import { TerapiasService } from '../../services/terapias.service';
import { AuthService } from '../../services/auth.service';
import {
  Terapia,
  TipoEjercicioTerapeutico,
  SeccionInfo,
  EjercicioTerapeutico,
  SeccionTerapia
} from '../../interfaces/terapias.interfaces';

@Component({
  selector: 'app-terapias',
  standalone: false,
  templateUrl: './terapias.component.html',
  styleUrls: ['./terapias.component.css']
})
export class TerapiasComponent implements OnInit {
  terapias: Terapia[] = [];
  filteredTerapias: Terapia[] = [];
  tiposEjercicios: TipoEjercicioTerapeutico[] = [];
  loading = false;
  error = '';
  showModal = false;
  showViewModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedTerapia: Terapia | null = null;
  selectedViewTerapia: Terapia | null = null;
  copySuccess = false;

  // Hacer Array disponible en el template
  Array = Array;

  // Formulario para terapia
  terapiaForm: Terapia = {
    nombre: '',
    descripcion: '',
    tipo: 'fisica',
    area_especializacion: '',
    nivel: 'principiante',
    duracion_estimada: 60,
    objetivo_principal: '',
    contraindicaciones: '',
    criterios_progresion: '',
    tags: [],
    status: 1,
    ejercicios: {}
  };

  // Secciones disponibles para terapias
  seccionesDisponibles: SeccionInfo[] = [
    { key: 'calentamiento', nombre: 'Calentamiento', descripcion: 'Ejercicios de preparación y movilización' },
    { key: 'fortalecimiento', nombre: 'Fortalecimiento', descripcion: 'Ejercicios de fortalecimiento muscular' },
    { key: 'equilibrio', nombre: 'Equilibrio', descripcion: 'Ejercicios de equilibrio y propiocepción' },
    { key: 'coordinacion', nombre: 'Coordinación', descripcion: 'Ejercicios de coordinación motora' },
    { key: 'estiramiento', nombre: 'Estiramiento', descripcion: 'Ejercicios de flexibilidad y relajación' },
    { key: 'respiracion', nombre: 'Respiración', descripcion: 'Ejercicios respiratorios y relajación' }
  ];

  // Filtros
  searchTerm = '';
  tipoFilter = 'all';
  areaFilter = 'all';
  nivelFilter = 'all';
  statusFilter = 'active';

  // Control de secciones activas en el formulario
  seccionesActivas: Set<string> = new Set();

  // Opciones para formularios
  tiposDisponibles = [
    { value: 'fisica', label: 'Fisioterapia' },
    { value: 'ocupacional', label: 'Terapia Ocupacional' },
    { value: 'respiratoria', label: 'Respiratoria' },
    { value: 'neurologica', label: 'Neurológica' },
    { value: 'cardiaca', label: 'Cardíaca' }
  ];

  nivelesDisponibles = [
    { value: 'principiante', label: 'Principiante' },
    { value: 'intermedio', label: 'Intermedio' },
    { value: 'avanzado', label: 'Avanzado' }
  ];

  areasEspecializacion = [
    'hombro', 'codo', 'muñeca', 'cadera', 'rodilla', 'tobillo', 
    'columna_cervical', 'columna_lumbar', 'core', 'respiratoria',
    'neurologica', 'cardiaca', 'pediatrica', 'geriatrica'
  ];

  intensidadesDisponibles = [
    { value: 'muy_baja', label: 'Muy Baja' },
    { value: 'baja', label: 'Baja' },
    { value: 'moderada', label: 'Moderada' },
    { value: 'alta', label: 'Alta' },
    { value: 'muy_alta', label: 'Muy Alta' }
  ];

  constructor(
    private terapiasService: TerapiasService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadTiposEjercicios();
    await this.loadTerapias();
  }

  async loadTiposEjercicios(): Promise<void> {
    try {
      this.tiposEjercicios = await this.terapiasService.getTiposEjerciciosTerapeuticos();
    } catch (error) {
      console.error('Error cargando tipos de ejercicios:', error);
      this.tiposEjercicios = [];
    }
  }

  async loadTerapias(): Promise<void> {
    try {
      this.loading = true;
      this.terapias = await this.terapiasService.getTerapias();
      this.applyFilters();
    } catch (error) {
      console.error('Error cargando terapias:', error);
      this.error = 'Error al cargar las terapias';
      this.terapias = [];
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    this.filteredTerapias = this.terapias.filter(terapia => {
      const matchesSearch = !this.searchTerm || 
        terapia.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        terapia.descripcion?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        terapia.area_especializacion?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesTipo = this.tipoFilter === 'all' || terapia.tipo === this.tipoFilter;
      const matchesArea = this.areaFilter === 'all' || terapia.area_especializacion === this.areaFilter;
      const matchesNivel = this.nivelFilter === 'all' || terapia.nivel === this.nivelFilter;
      const matchesStatus = this.statusFilter === 'all' || 
        (this.statusFilter === 'active' && terapia.status === 1) ||
        (this.statusFilter === 'inactive' && terapia.status === 0);

      return matchesSearch && matchesTipo && matchesArea && matchesNivel && matchesStatus;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.tipoFilter = 'all';
    this.areaFilter = 'all';
    this.nivelFilter = 'all';
    this.statusFilter = 'active';
    this.applyFilters();
  }

  // ===============================================
  // MÉTODOS AUXILIARES PARA EL TEMPLATE
  // ===============================================

  // Método para obtener el label del tipo de terapia (soluciona el error del template)
  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposDisponibles.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  // Método para obtener el nombre de una sección por su key
  getSeccionNombre(seccionKey: string): string {
    const seccion = this.seccionesDisponibles.find(s => s.key === seccionKey);
    return seccion ? seccion.nombre : seccionKey;
  }

  // Método para obtener el nombre de un tipo de ejercicio
  getTipoEjercicioNombre(tipoNombre: string): string {
    const tipo = this.tiposEjercicios.find(t => t.nombre === tipoNombre);
    return tipo ? tipo.nombre : tipoNombre;
  }

  // Método para obtener el label de una intensidad
  getIntensidadLabel(intensidad: string): string {
    const intensidadObj = this.intensidadesDisponibles.find(i => i.value === intensidad);
    return intensidadObj ? intensidadObj.label : intensidad;
  }

  // Método para exportar terapia (faltaba este método)
  exportarTerapia(terapia: Terapia): void {
    const texto = this.getFormattedTerapia(terapia);
    
    // Crear y descargar archivo
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.getFileNameSafe(terapia.nombre)}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Terapia exportada:', terapia.nombre);
  }

  // ===============================================
  // GESTIÓN DE MODALES
  // ===============================================

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedTerapia = null;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(terapia: Terapia): void {
    this.modalMode = 'edit';
    this.selectedTerapia = terapia;
    this.terapiaForm = JSON.parse(JSON.stringify(terapia)); // Deep copy
    
    // Identificar secciones activas basadas en ejercicios
    this.seccionesActivas.clear();
    if (this.terapiaForm.ejercicios) {
      this.seccionesDisponibles.forEach(seccion => {
        if (this.terapiaForm.ejercicios[seccion.key]) {
          this.seccionesActivas.add(seccion.key);
        }
      });
    }
    
    this.error = '';
    this.showModal = true;
  }

  openViewModal(terapia: Terapia): void {
    console.log('Abriendo modal de vista para terapia:', terapia.nombre);
    this.selectedViewTerapia = terapia;
    this.showViewModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedTerapia = null;
    this.error = '';
    this.resetForm();
  }

  closeViewModal(): void {
    console.log('Cerrando modal de vista');
    this.showViewModal = false;
    this.selectedViewTerapia = null;
    this.copySuccess = false;
  }

  resetForm(): void {
    this.terapiaForm = {
      nombre: '',
      descripcion: '',
      tipo: 'fisica',
      area_especializacion: '',
      nivel: 'principiante',
      duracion_estimada: 60,
      objetivo_principal: '',
      contraindicaciones: '',
      criterios_progresion: '',
      tags: [],
      status: 1,
      ejercicios: {}
    };
    this.seccionesActivas.clear();
  }

  // ===============================================
  // GESTIÓN DE SECCIONES
  // ===============================================

  toggleSeccion(seccionKey: string): void {
    if (this.seccionesActivas.has(seccionKey)) {
      this.seccionesActivas.delete(seccionKey);
      // Eliminar la sección del objeto ejercicios
      if (this.terapiaForm.ejercicios) {
        delete this.terapiaForm.ejercicios[seccionKey];
      }
    } else {
      this.seccionesActivas.add(seccionKey);
      // Inicializar la sección si no existe
      if (!this.terapiaForm.ejercicios) {
        this.terapiaForm.ejercicios = {};
      }
      if (!this.terapiaForm.ejercicios[seccionKey]) {
        this.terapiaForm.ejercicios[seccionKey] = {
          descripcion: '',
          tiempo_total: '',
          objetivos: [],
          ejercicios: []
        };
      }
    }
  }

  getSeccionData(seccionKey: string): SeccionTerapia | null {
    if (!this.terapiaForm.ejercicios || !this.terapiaForm.ejercicios[seccionKey]) {
      // Inicializar si no existe pero la sección está activa
      if (this.seccionesActivas.has(seccionKey)) {
        if (!this.terapiaForm.ejercicios) {
          this.terapiaForm.ejercicios = {};
        }
        this.terapiaForm.ejercicios[seccionKey] = {
          descripcion: '',
          tiempo_total: '',
          objetivos: [],
          ejercicios: []
        };
        return this.terapiaForm.ejercicios[seccionKey];
      }
      return null;
    }
    return this.terapiaForm.ejercicios[seccionKey];
  }

  updateSeccionData(seccionKey: string, data: SeccionTerapia): void {
    if (!this.terapiaForm.ejercicios) {
      this.terapiaForm.ejercicios = {};
    }
    this.terapiaForm.ejercicios[seccionKey] = data;
  }

  // ===============================================
  // GESTIÓN DE EJERCICIOS
  // ===============================================

  addEjercicio(seccionKey: string): void {
    const seccion = this.getSeccionData(seccionKey);
    if (!seccion) return;

    const nuevoEjercicio: EjercicioTerapeutico = {
      orden: seccion.ejercicios.length + 1,
      nombre: '',
      tipo: 'movilidad',
      repeticiones: 10,
      series: 2,
      duracion: '2:00',
      descripcion: '',
      intensidad: 'moderada',
      precauciones: ''
    };

    seccion.ejercicios.push(nuevoEjercicio);
    this.updateSeccionData(seccionKey, seccion);
  }

  removeEjercicio(seccionKey: string, index: number): void {
    const seccion = this.getSeccionData(seccionKey);
    if (!seccion) return;

    seccion.ejercicios.splice(index, 1);
    
    // Reordenar
    seccion.ejercicios.forEach((ejercicio, i) => {
      ejercicio.orden = i + 1;
    });

    this.updateSeccionData(seccionKey, seccion);
  }

  moveEjercicio(seccionKey: string, fromIndex: number, toIndex: number): void {
    const seccion = this.getSeccionData(seccionKey);
    if (!seccion || toIndex < 0 || toIndex >= seccion.ejercicios.length) return;

    const ejercicio = seccion.ejercicios.splice(fromIndex, 1)[0];
    seccion.ejercicios.splice(toIndex, 0, ejercicio);
    
    // Reordenar
    seccion.ejercicios.forEach((ejercicio, i) => {
      ejercicio.orden = i + 1;
    });

    this.updateSeccionData(seccionKey, seccion);
  }

  // ===============================================
  // GUARDADO Y VALIDACIÓN
  // ===============================================

  async saveTerapia(): Promise<void> {
    try {
      this.error = '';
      this.loading = true;

      // Validaciones
      if (!this.terapiaForm.nombre.trim()) {
        this.error = 'El nombre es requerido';
        return;
      }

      if (this.seccionesActivas.size === 0) {
        this.error = 'Debe activar al menos una sección con ejercicios';
        return;
      }

      // Validar que las secciones activas tengan ejercicios
      let tieneEjercicios = false;
      for (const seccionKey of this.seccionesActivas) {
        const seccion = this.getSeccionData(seccionKey);
        if (seccion && seccion.ejercicios.length > 0) {
          tieneEjercicios = true;
          break;
        }
      }

      if (!tieneEjercicios) {
        this.error = 'Debe agregar al menos un ejercicio en alguna sección';
        return;
      }

      // Preparar datos para guardar
      const dataToSave = { ...this.terapiaForm };
      
      // Asegurar que solo se guarden las secciones activas
      const ejerciciosLimpios: any = {};
      this.seccionesActivas.forEach(seccionKey => {
        const seccion = this.getSeccionData(seccionKey);
        if (seccion && seccion.ejercicios.length > 0) {
          ejerciciosLimpios[seccionKey] = seccion;
        }
      });
      
      dataToSave.ejercicios = ejerciciosLimpios;

      if (this.modalMode === 'create') {
        await this.terapiasService.createTerapia(dataToSave);
      } else {
        await this.terapiasService.updateTerapia(this.selectedTerapia!.id!, dataToSave);
      }

      await this.loadTerapias();
      this.closeModal();
    } catch (error) {
      console.error('Error guardando terapia:', error);
      this.error = 'Error al guardar la terapia. Intente nuevamente.';
    } finally {
      this.loading = false;
    }
  }

  async deleteTerapia(terapia: Terapia): Promise<void> {
    if (!confirm(`¿Está seguro de eliminar la terapia "${terapia.nombre}"?`)) {
      return;
    }

    try {
      this.loading = true;
      await this.terapiasService.deleteTerapia(terapia.id!);
      await this.loadTerapias();
    } catch (error) {
      console.error('Error eliminando terapia:', error);
      this.error = 'Error al eliminar la terapia';
    } finally {
      this.loading = false;
    }
  }

  // ===============================================
  // UTILIDADES Y MÉTODOS AUXILIARES
  // ===============================================

  canEditTerapia(): boolean {
    return this.authService.isAdmin() || this.authService.hasProfile(3); // Admin o Supervisor
  }

  formatDuracion(minutos?: number): string {
    if (!minutos) return 'Sin especificar';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  // Obtener áreas únicas de las terapias existentes
  getAreasUnicas(): string[] {
    const areas = new Set<string>();
    this.terapias.forEach(terapia => {
      if (terapia.area_especializacion) {
        areas.add(terapia.area_especializacion);
      }
    });
    return Array.from(areas).sort();
  }

  // Método para obtener nombre de archivo seguro (sin regex en template)
  getFileNameSafe(nombre: string): string {
    return nombre ? nombre.replace(/\s+/g, '_') : 'terapia';
  }

  // ===============================================
  // MÉTODOS PARA MODAL DE VISTA
  // ===============================================

  async copyToClipboard(): Promise<void> {
    if (!this.selectedViewTerapia) return;
    
    try {
      const formattedText = this.getFormattedTerapia(this.selectedViewTerapia);
      await navigator.clipboard.writeText(formattedText);
      this.copySuccess = true;
      setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    } catch (error) {
      console.error('Error al copiar:', error);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = this.getFormattedTerapia(this.selectedViewTerapia);
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.copySuccess = true;
        setTimeout(() => {
          this.copySuccess = false;
        }, 2000);
      } catch (fallbackError) {
        console.error('Error en fallback de copia:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  }

  getFormattedTerapia(terapia: Terapia): string {
    if (!terapia) return '';

    let texto = `${terapia.nombre}\n`;
    texto += `${terapia.descripcion || 'Terapia de rehabilitación'}\n`;
    texto += `Nivel: ${terapia.nivel || 'No especificado'} | Duración: ${this.formatDuracion(terapia.duracion_estimada)}\n\n`;

    // Agregar objetivos y área
    if (terapia.objetivo_principal) {
      texto += `Objetivo: ${terapia.objetivo_principal}\n`;
    }
    if (terapia.area_especializacion) {
      texto += `Área: ${terapia.area_especializacion}\n`;
    }
    texto += '\n';

    // Procesar ejercicios por secciones
    if (this.hasEjercicios(terapia)) {
      const seccionesConEjercicios = this.getSeccionesConEjercicios(terapia);
      
      seccionesConEjercicios.forEach(sectionKey => {
        const seccionData = terapia.ejercicios[sectionKey];
        if (seccionData && seccionData.ejercicios && seccionData.ejercicios.length > 0) {
          const nombreSeccion = this.getNombreSeccion(sectionKey);
          texto += `${nombreSeccion.toUpperCase()}\n`;
          
          if (seccionData.descripcion) {
            texto += `${seccionData.descripcion}\n`;
          }
          
          seccionData.ejercicios.forEach((ejercicio: any, index: number) => {
            texto += `${index + 1}. ${ejercicio?.nombre || 'Ejercicio sin nombre'}\n`;
            if (ejercicio?.descripcion) {
              texto += `   ${ejercicio.descripcion}\n`;
            }
            if (ejercicio?.repeticiones && ejercicio?.series) {
              texto += `   ${ejercicio.series} series x ${ejercicio.repeticiones} repeticiones\n`;
            }
            if (ejercicio?.duracion) {
              texto += `   Duración: ${ejercicio.duracion}\n`;
            }
            if (ejercicio?.precauciones) {
              texto += `   ⚠️ ${ejercicio.precauciones}\n`;
            }
            texto += '\n';
          });
        }
      });
    } else {
      texto += 'No se han definido ejercicios para esta terapia\n\n';
    }

    // Agregar contraindicaciones y criterios de progresión
    if (terapia.contraindicaciones) {
      texto += `CONTRAINDICACIONES\n${terapia.contraindicaciones}\n\n`;
    }
    
    if (terapia.criterios_progresion) {
      texto += `CRITERIOS DE PROGRESIÓN\n${terapia.criterios_progresion}\n`;
    }

    return texto;
  }

  getNombreSeccion(key: string): string {
    const secciones: { [key: string]: string } = {
      'calentamiento': 'Calentamiento',
      'fortalecimiento': 'Fortalecimiento',
      'equilibrio': 'Equilibrio',
      'coordinacion': 'Coordinación',
      'estiramiento': 'Estiramiento',
      'respiracion': 'Respiración'
    };
    return secciones[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }

  hasEjercicios(terapia: Terapia): boolean {
    if (!terapia || !terapia.ejercicios) return false;
    
    return Object.keys(terapia.ejercicios).some(key => {
      const seccion = terapia.ejercicios[key];
      return seccion && seccion.ejercicios && Array.isArray(seccion.ejercicios) && seccion.ejercicios.length > 0;
    });
  }

  getTotalEjercicios(terapia: Terapia): number {
    if (!terapia || !terapia.ejercicios) return 0;
    
    let total = 0;
    Object.keys(terapia.ejercicios).forEach(key => {
      const seccion = terapia.ejercicios[key];
      if (seccion && seccion.ejercicios && Array.isArray(seccion.ejercicios)) {
        total += seccion.ejercicios.length;
      }
    });
    return total;
  }

  getSeccionesConEjercicios(terapia: Terapia): string[] {
    if (!terapia || !terapia.ejercicios) return [];
    
    return Object.keys(terapia.ejercicios).filter(key => {
      const seccion = terapia.ejercicios[key];
      return seccion && seccion.ejercicios && Array.isArray(seccion.ejercicios) && seccion.ejercicios.length > 0;
    });
  }

  // ===============================================
  // GESTIÓN DE TAGS
  // ===============================================

  addTag(event: any): void {
    const tag = event.target.value.trim();
    if (tag && !this.terapiaForm.tags?.includes(tag)) {
      if (!this.terapiaForm.tags) {
        this.terapiaForm.tags = [];
      }
      this.terapiaForm.tags.push(tag);
      event.target.value = '';
    }
  }

  removeTag(index: number): void {
    if (this.terapiaForm.tags) {
      this.terapiaForm.tags.splice(index, 1);
    }
  }
}