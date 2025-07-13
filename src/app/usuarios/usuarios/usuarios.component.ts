// src/app/usuarios/usuarios/usuarios.component.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { Profile } from '../../interfaces/user.interfaces';

@Component({
  selector: 'app-usuarios',
  standalone: false,
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  usuarios: Profile[] = [];
  filteredUsuarios: Profile[] = [];
  loading = true;
  error = '';
  searchTerm = '';
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedUser: Profile | null = null;
  
  // Formulario para nuevo usuario o edición
  userForm: Profile = {
    username: '',
    full_name: '',
    password: '',
    status: 1,
    id_perfil: 2
  };

  // Filtros
  statusFilter = 'all'; // all, active, inactive
  perfilFilter = 'all'; // all, 1, 2, etc.

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('UsuariosComponent inicializado');
    await this.loadUsuarios();
  }

  async loadUsuarios(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      console.log('Cargando usuarios desde la base de datos...');
      const data = await this.supabaseService.getData('profiles');
      console.log('Datos recibidos:', data);
      
      this.usuarios = data || [];
      this.filteredUsuarios = [...this.usuarios];
      this.applyFilters();
      
      console.log('Usuarios cargados exitosamente:', this.usuarios.length);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      this.error = 'Error al cargar los usuarios. Verifique la conexión a la base de datos.';
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    let filtered = [...this.usuarios];

    // Filtro por término de búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.username?.toLowerCase().includes(term) ||
        user.full_name?.toLowerCase().includes(term)
      );
    }

    // Filtro por estado
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(user => user.status === 1);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(user => user.status === 0);
    }

    // Filtro por perfil
    if (this.perfilFilter !== 'all') {
      filtered = filtered.filter(user => user.id_perfil === parseInt(this.perfilFilter));
    }

    this.filteredUsuarios = filtered;
    console.log('Usuarios filtrados:', this.filteredUsuarios.length);
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    console.log('Abriendo modal para crear usuario');
    this.modalMode = 'create';
    this.userForm = {
      username: '',
      full_name: '',
      password: '',
      status: 1,
      id_perfil: 2
    };
    this.error = '';
    this.showModal = true;
  }

  openEditModal(user: Profile): void {
    console.log('Abriendo modal para editar usuario:', user.username);
    this.modalMode = 'edit';
    this.selectedUser = user;
    this.userForm = {
      ...user,
      password: '' // No mostrar password en edición
    };
    this.error = '';
    this.showModal = true;
  }

  closeModal(): void {
    console.log('Cerrando modal');
    this.showModal = false;
    this.selectedUser = null;
    this.error = '';
  }

  async saveUser(): Promise<void> {
    try {
      console.log('Guardando usuario:', this.userForm);
      
      // Limpiar error previo
      this.error = '';

      // Validaciones básicas
      if (!this.userForm.username || !this.userForm.full_name) {
        this.error = 'Nombre de usuario y nombre completo son requeridos';
        return;
      }

      // Validar username
      if (this.userForm.username.length < 3) {
        this.error = 'El nombre de usuario debe tener al menos 3 caracteres';
        return;
      }

      // Validar caracteres especiales en username
      const usernamePattern = /^[a-zA-Z0-9_.-]+$/;
      if (!usernamePattern.test(this.userForm.username)) {
        this.error = 'El nombre de usuario solo puede contener letras, números, guiones, puntos y guiones bajos';
        return;
      }

      if (this.modalMode === 'create') {
        // Validaciones para crear usuario
        if (!this.userForm.password) {
          this.error = 'La contraseña es requerida para crear un usuario';
          return;
        }

        if (this.userForm.password.length < 6) {
          this.error = 'La contraseña debe tener al menos 6 caracteres';
          return;
        }

        // Verificar si el username ya existe
        console.log('Verificando si el username existe...');
        const existingUsers = await this.supabaseService.client
          .from('profiles')
          .select('username')
          .eq('username', this.userForm.username);

        if (existingUsers.data && existingUsers.data.length > 0) {
          this.error = 'El nombre de usuario ya existe';
          return;
        }

        // Crear nuevo usuario
        const newUserData = {
          username: this.userForm.username,
          full_name: this.userForm.full_name,
          password: this.userForm.password,
          status: this.userForm.status,
          id_perfil: this.userForm.id_perfil
        };

        console.log('Creando usuario:', newUserData);
        await this.supabaseService.insertData('profiles', newUserData);
        console.log('Usuario creado exitosamente');

      } else {
        // Editar usuario existente
        const updateData: any = {
          username: this.userForm.username,
          full_name: this.userForm.full_name,
          status: this.userForm.status,
          id_perfil: this.userForm.id_perfil
        };

        // Solo actualizar password si se proporcionó uno nuevo
        if (this.userForm.password && this.userForm.password.length > 0) {
          if (this.userForm.password.length < 6) {
            this.error = 'La nueva contraseña debe tener al menos 6 caracteres';
            return;
          }
          updateData.password = this.userForm.password;
        }

        console.log('Actualizando usuario:', updateData);
        await this.supabaseService.updateData('profiles', this.selectedUser!.id!.toString(), updateData);
        console.log('Usuario actualizado exitosamente');
      }

      // Recargar usuarios y cerrar modal
      await this.loadUsuarios();
      this.closeModal();

    } catch (error) {
      console.error('Error guardando usuario:', error);
      this.error = 'Error al guardar el usuario. Intente nuevamente.';
    }
  }

  async deactivateUser(user: Profile): Promise<void> {
    const confirmMessage = `¿Está seguro de desactivar al usuario "${user.username}"?`;
    if (confirm(confirmMessage)) {
      try {
        console.log('Desactivando usuario:', user.username);
        await this.supabaseService.updateData('profiles', user.id!.toString(), { status: 0 });
        await this.loadUsuarios();
        console.log('Usuario desactivado exitosamente');
      } catch (error) {
        console.error('Error desactivando usuario:', error);
        this.error = 'Error al desactivar el usuario';
        // Limpiar error después de 5 segundos
        setTimeout(() => this.error = '', 5000);
      }
    }
  }

  async reactivateUser(user: Profile): Promise<void> {
    const confirmMessage = `¿Está seguro de reactivar al usuario "${user.username}"?`;
    if (confirm(confirmMessage)) {
      try {
        console.log('Reactivando usuario:', user.username);
        await this.supabaseService.updateData('profiles', user.id!.toString(), { status: 1 });
        await this.loadUsuarios();
        console.log('Usuario reactivado exitosamente');
      } catch (error) {
        console.error('Error reactivando usuario:', error);
        this.error = 'Error al reactivar el usuario';
        // Limpiar error después de 5 segundos
        setTimeout(() => this.error = '', 5000);
      }
    }
  }

  // Métodos de utilidad
  getPerfilName(idPerfil: number | undefined): string {
    switch (idPerfil) {
      case 1: return 'Administrador';
      case 2: return 'Usuario';
      case 3: return 'Supervisor';
      case 4: return 'Invitado';
      default: return 'Sin asignar';
    }
  }

  getStatusText(status: number | undefined): string {
    return status === 1 ? 'Activo' : 'Inactivo';
  }

  getStatusColor(status: number | undefined): string {
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

  // Método para obtener las iniciales del usuario
  getUserInitials(user: Profile): string {
    if (!user.full_name) return 'U';
    const names = user.full_name.split(' ');
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    }
    return user.full_name.charAt(0).toUpperCase();
  }

  // Método para obtener el color del avatar
  getAvatarColor(user: Profile): string {
    const colors = [
      'bg-indigo-600',
      'bg-green-600',
      'bg-yellow-600',
      'bg-red-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-blue-600'
    ];
    
    if (!user.full_name) return 'bg-gray-600';
    
    const charCode = user.full_name.charCodeAt(0);
    return colors[charCode % colors.length];
  }

  // Método para refrescar la lista
  async refreshUsers(): Promise<void> {
    console.log('Refrescando lista de usuarios');
    await this.loadUsuarios();
  }

  // Método para limpiar filtros
  clearFilters(): void {
    console.log('Limpiando filtros');
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.perfilFilter = 'all';
    this.applyFilters();
  }

  // Método trackBy para optimizar el rendimiento de ngFor
  trackByUserId(index: number, user: Profile): any {
    return user.id || index;
  }
}