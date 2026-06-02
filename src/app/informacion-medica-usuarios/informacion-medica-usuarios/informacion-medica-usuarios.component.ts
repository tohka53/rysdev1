// src/app/components/informacion-medica-usuarios/informacion-medica-usuarios.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InformacionMedicaService, UsuarioConInformacionMedica, InformacionMedicaUsuario } from '../../services/informacion-medica.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-informacion-medica-usuarios',
  standalone: false,
  templateUrl: './informacion-medica-usuarios.component.html',
  styleUrls: ['./informacion-medica-usuarios.component.css']
})
export class InformacionMedicaUsuariosComponent implements OnInit {
  usuarios: UsuarioConInformacionMedica[] = [];
  filteredUsuarios: UsuarioConInformacionMedica[] = [];
  selectedUsuario: UsuarioConInformacionMedica | null = null;
  informacionMedicaForm: FormGroup;
  loading = false;
  saving = false;
  isAdmin = false;
  currentUserId: number | null = null;
  showModal = false;
  errorMessage: string = '';
  successMessage: string = '';
  searchTerm: string = '';
  currentScrollPage: number = 0;
  itemsPerPage: number = 4;

  constructor(
    private fb: FormBuilder,
    private informacionMedicaService: InformacionMedicaService,
    private authService: AuthService
  ) {
    this.informacionMedicaForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeComponent();
    this.loadUsuarios();
  }

  private initializeComponent(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.isAdmin = currentUser.id_perfil === 1;
      this.currentUserId = currentUser.id || null;
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      usuario_id: [null, Validators.required],
      fecha_nacimiento: [''],
      genero: [''],
      telefono: ['', [Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      direccion: [''],
      diagnostico_principal: [''],
      diagnosticos_secundarios: [[]],
      historial_medico: [''],
      medicamentos_actuales: [''],
      alergias: [''],
      limitaciones_fisicas: [''],
      observaciones_generales: [''],
      contacto_emergencia_nombre: [''],
      contacto_emergencia_telefono: ['', [Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      contacto_emergencia_relacion: [''],
      peso: [null, [Validators.min(1), Validators.max(300)]],
      altura: [null, [Validators.min(50), Validators.max(250)]]
    });
  }

  async loadUsuarios(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    
    try {
      this.usuarios = await this.informacionMedicaService.getInformacionMedicaConPermisos();
      this.filteredUsuarios = [...this.usuarios];
      
      // Si no es admin y solo hay un usuario (el propio), lo selecciona automáticamente
      if (!this.isAdmin && this.usuarios.length === 1) {
        this.selectUsuario(this.usuarios[0]);
      } else if (!this.isAdmin && this.usuarios.length === 0 && this.currentUserId) {
        // Si es usuario regular pero no hay datos, crear entrada vacía
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
          const emptyUser: UsuarioConInformacionMedica = {
            id: currentUser.id,
            username: currentUser.username || '',
            full_name: currentUser.full_name || '',
            email: '', // Profile no tiene email, usar string vacío
            id_perfil: currentUser.id_perfil || 2,
            informacion_medica: null
          };
          this.usuarios = [emptyUser];
          this.filteredUsuarios = [emptyUser];
          this.selectUsuario(emptyUser);
        }
      }
    } catch (error: any) {
      console.error('Error al cargar usuarios:', error);
      this.errorMessage = error?.message || 'Error al cargar la información de usuarios';
    } finally {
      this.loading = false;
    }
  }

  filterUsuarios(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsuarios = [...this.usuarios];
      this.currentScrollPage = 0; // Reset scroll page when clearing search
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredUsuarios = this.usuarios.filter(usuario => {
      // Buscar en nombre completo
      const fullNameMatch = (usuario.full_name || '').toLowerCase().includes(term);
      
      // Buscar en username
      const usernameMatch = (usuario.username || '').toLowerCase().includes(term);
      
      // Buscar en email
      const emailMatch = (usuario.email || '').toLowerCase().includes(term);
      
      // Buscar en información médica si existe
      let medicalInfoMatch = false;
      if (usuario.informacion_medica) {
        const info = usuario.informacion_medica;
        medicalInfoMatch = 
          (info.diagnostico_principal || '').toLowerCase().includes(term) ||
          (info.historial_medico || '').toLowerCase().includes(term) ||
          (info.medicamentos_actuales || '').toLowerCase().includes(term) ||
          (info.alergias || '').toLowerCase().includes(term) ||
          (info.limitaciones_fisicas || '').toLowerCase().includes(term) ||
          (info.observaciones_generales || '').toLowerCase().includes(term) ||
          (info.diagnosticos_secundarios || []).some(d => d.toLowerCase().includes(term));
      }

      return fullNameMatch || usernameMatch || emailMatch || medicalInfoMatch;
    });
    
    this.currentScrollPage = 0; // Reset to first page after filtering
  }

  selectUsuario(usuario: UsuarioConInformacionMedica): void {
    this.selectedUsuario = usuario;
    this.loadInformacionMedica(usuario);
    this.clearMessages();
  }

  loadInformacionMedica(usuario: UsuarioConInformacionMedica): void {
    const info = usuario.informacion_medica;
    
    console.log('Cargando información para usuario:', usuario.username, 'Info:', info);
    
    // Resetear formulario con el usuario_id
    this.informacionMedicaForm.reset();
    this.informacionMedicaForm.patchValue({ usuario_id: usuario.id });
    
    if (info) {
      // Convertir fecha de nacimiento al formato correcto para input date
      let fechaNacimiento = '';
      if (info.fecha_nacimiento) {
        try {
          const fecha = new Date(info.fecha_nacimiento);
          if (!isNaN(fecha.getTime())) {
            fechaNacimiento = fecha.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Error al procesar fecha:', e);
        }
      }

      // Cargar todos los datos disponibles
      const formData = {
        usuario_id: usuario.id,
        fecha_nacimiento: fechaNacimiento,
        genero: info.genero || '',
        telefono: info.telefono || '',
        direccion: info.direccion || '',
        diagnostico_principal: info.diagnostico_principal || '',
        diagnosticos_secundarios: info.diagnosticos_secundarios || [],
        historial_medico: info.historial_medico || '',
        medicamentos_actuales: info.medicamentos_actuales || '',
        alergias: info.alergias || '',
        limitaciones_fisicas: info.limitaciones_fisicas || '',
        observaciones_generales: info.observaciones_generales || '',
        contacto_emergencia_nombre: info.contacto_emergencia_nombre || '',
        contacto_emergencia_telefono: info.contacto_emergencia_telefono || '',
        contacto_emergencia_relacion: info.contacto_emergencia_relacion || '',
        peso: info.peso || null,
        altura: info.altura || null
      };

      console.log('Datos del formulario a cargar:', formData);
      
      // Aplicar los datos al formulario
      this.informacionMedicaForm.patchValue(formData);
      
      // Marcar como pristine para detectar cambios correctamente
      this.informacionMedicaForm.markAsPristine();
    }

    this.calculateIMC();
  }

  calculateIMC(): void {
    const peso = this.informacionMedicaForm.get('peso')?.value;
    const altura = this.informacionMedicaForm.get('altura')?.value;
    
    if (peso && altura && altura > 0) {
      const alturaEnMetros = altura / 100;
      const imc = peso / (alturaEnMetros * alturaEnMetros);
      // El IMC se calcula automáticamente para mostrar, pero se guarda en el backend
    }
  }

  async saveInformacionMedica(): Promise<void> {
    if (this.informacionMedicaForm.invalid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Por favor complete los campos requeridos correctamente';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    try {
      const formValue = this.informacionMedicaForm.value;
      
      // Calcular IMC si hay peso y altura
      let imc = null;
      if (formValue.peso && formValue.altura) {
        const alturaEnMetros = formValue.altura / 100;
        imc = formValue.peso / (alturaEnMetros * alturaEnMetros);
      }

      // Preparar datos para guardar
      const informacionMedica: InformacionMedicaUsuario = {
        usuario_id: formValue.usuario_id,
        fecha_nacimiento: formValue.fecha_nacimiento || null,
        genero: formValue.genero || null,
        telefono: formValue.telefono || null,
        direccion: formValue.direccion || null,
        diagnostico_principal: formValue.diagnostico_principal || null,
        historial_medico: formValue.historial_medico || null,
        medicamentos_actuales: formValue.medicamentos_actuales || null,
        alergias: formValue.alergias || null,
        limitaciones_fisicas: formValue.limitaciones_fisicas || null,
        observaciones_generales: formValue.observaciones_generales || null,
        contacto_emergencia_nombre: formValue.contacto_emergencia_nombre || null,
        contacto_emergencia_telefono: formValue.contacto_emergencia_telefono || null,
        contacto_emergencia_relacion: formValue.contacto_emergencia_relacion || null,
        peso: formValue.peso || null,
        altura: formValue.altura || null,
        imc: imc,
        diagnosticos_secundarios: this.processDiagnosticosSecundarios(formValue.diagnosticos_secundarios)
      };

      // Usar el método existente del servicio de terapias que ya tienes
      await this.informacionMedicaService.saveInformacionMedica(informacionMedica);
      
      this.successMessage = 'Información médica guardada exitosamente';
      
      // Recargar datos para reflejar los cambios
      await this.loadUsuarios();
      
      // Re-seleccionar el usuario actual para actualizar la vista
      if (this.selectedUsuario) {
        const updatedUser = this.usuarios.find(u => u.id === this.selectedUsuario!.id);
        if (updatedUser) {
          this.selectUsuario(updatedUser);
        }
      }

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);

    } catch (error: any) {
      console.error('Error al guardar información médica:', error);
      this.errorMessage = error?.message || 'Error al guardar la información médica';
    } finally {
      this.saving = false;
    }
  }

  private processDiagnosticosSecundarios(diagnosticos: any): string[] | null {
    if (!diagnosticos) return null;
    
    if (Array.isArray(diagnosticos)) {
      return diagnosticos.filter(d => d && d.trim().length > 0);
    }
    
    if (typeof diagnosticos === 'string') {
      return diagnosticos.split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0);
    }
    
    return null;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.informacionMedicaForm.controls).forEach(key => {
      const control = this.informacionMedicaForm.get(key);
      control?.markAsTouched();
    });
  }

  canEditCurrentUser(): boolean {
    if (!this.selectedUsuario) return false;
    return this.informacionMedicaService.canEditUser(this.selectedUsuario.id);
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  getIMC(): number | null {
    const peso = this.informacionMedicaForm.get('peso')?.value;
    const altura = this.informacionMedicaForm.get('altura')?.value;
    
    if (peso && altura && altura > 0) {
      const alturaEnMetros = altura / 100;
      return peso / (alturaEnMetros * alturaEnMetros);
    }
    return null;
  }

  getIMCClassification(): string {
    const imc = this.getIMC();
    if (!imc) return '';
    
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  getIMCColor(): string {
    const imc = this.getIMC();
    if (!imc) return 'text-gray-500';
    
    if (imc < 18.5) return 'text-blue-600';
    if (imc < 25) return 'text-green-600';
    if (imc < 30) return 'text-yellow-600';
    return 'text-red-600';
  }

  getDiagnosticosAsString(): string {
    const diagnosticos = this.informacionMedicaForm.get('diagnosticos_secundarios')?.value;
    if (Array.isArray(diagnosticos)) {
      return diagnosticos.join(', ');
    }
    return diagnosticos || '';
  }

  setDiagnosticosFromString(value: string): void {
    const diagnosticos = value.split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    this.informacionMedicaForm.patchValue({ diagnosticos_secundarios: diagnosticos });
  }

  // Método para calcular la edad a partir de la fecha de nacimiento
  getAge(fechaNacimiento: Date | string): number {
    if (!fechaNacimiento) return 0;
    
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    
    if (isNaN(birthDate.getTime())) return 0;
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Método para resetear mensajes
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Método para recargar datos
  async reloadData(): Promise<void> {
    this.clearMessages();
    this.searchTerm = '';
    await this.loadUsuarios();
  }

  // Método para resetear formulario
  resetForm(): void {
    if (this.selectedUsuario) {
      this.loadInformacionMedica(this.selectedUsuario);
    } else {
      this.informacionMedicaForm.reset();
    }
    this.clearMessages();
  }

  // Método para verificar si hay cambios en el formulario
  hasFormChanges(): boolean {
    return this.informacionMedicaForm.dirty;
  }

  // Método para obtener el nombre de usuario a mostrar
  getUserDisplayName(usuario: UsuarioConInformacionMedica): string {
    return usuario.full_name || usuario.username || usuario.email || 'Usuario';
  }

  // Método para verificar si un campo tiene errores
  hasFieldError(fieldName: string): boolean {
    const field = this.informacionMedicaForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Método para obtener el mensaje de error de un campo
  getFieldError(fieldName: string): string {
    const field = this.informacionMedicaForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['pattern']) return 'Formato inválido';
    if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;

    return 'Campo inválido';
  }

  // Método para formatear el texto del diagnóstico principal para mostrar en la tarjeta
  getShortDiagnosis(diagnosis: string): string {
    if (!diagnosis) return '';
    return diagnosis.length > 50 ? diagnosis.substring(0, 50) + '...' : diagnosis;
  }

  // Método para verificar si el usuario tiene información médica completa
  isProfileComplete(usuario: UsuarioConInformacionMedica): boolean {
    const info = usuario.informacion_medica;
    if (!info) return false;
    
    // Verificar campos esenciales
    return !!(
      info.fecha_nacimiento &&
      info.genero &&
      info.telefono &&
      info.contacto_emergencia_nombre &&
      info.contacto_emergencia_telefono
    );
  }

  // Método para obtener el porcentaje de completitud del perfil
  getProfileCompleteness(usuario: UsuarioConInformacionMedica): number {
    const info = usuario.informacion_medica;
    if (!info) return 0;
    
    const fields = [
      'fecha_nacimiento',
      'genero', 
      'telefono',
      'direccion',
      'diagnostico_principal',
      'historial_medico',
      'contacto_emergencia_nombre',
      'contacto_emergencia_telefono',
      'contacto_emergencia_relacion',
      'peso',
      'altura'
    ];
    
    let completedFields = 0;
    fields.forEach(field => {
      if (info[field as keyof typeof info]) {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / fields.length) * 100);
  }

  // Métodos para el scroll horizontal
  getScrollPages(): number[] {
    const totalItems = this.filteredUsuarios.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  getCurrentPageItems(): UsuarioConInformacionMedica[] {
    const startIndex = this.currentScrollPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredUsuarios.slice(startIndex, endIndex);
  }

  nextScrollPage(): void {
    const totalPages = Math.ceil(this.filteredUsuarios.length / this.itemsPerPage);
    if (this.currentScrollPage < totalPages - 1) {
      this.currentScrollPage++;
    }
  }

  prevScrollPage(): void {
    if (this.currentScrollPage > 0) {
      this.currentScrollPage--;
    }
  }

  goToScrollPage(page: number): void {
    const totalPages = Math.ceil(this.filteredUsuarios.length / this.itemsPerPage);
    if (page >= 0 && page < totalPages) {
      this.currentScrollPage = page;
    }
  }
}