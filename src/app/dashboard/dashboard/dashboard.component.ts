// src/app/dashboard/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PermissionsService, MenuModule } from '../../services/permissions.service';
import { Profile } from '../../interfaces/user.interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: Profile | null = null;
  menuItems: MenuModule[] = [];
  isSidebarCollapsed = false;
  loading = true;
  error = '';

  // Stats data (puedes conectar esto a servicios reales)
  stats = {
    totalUsers: 0,
    activeProjects: 0,
    pendingTasks: 0,
    totalReports: 0
  };

  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('Dashboard inicializado');
    
    try {
      // Obtener usuario actual
      this.currentUser = this.authService.getCurrentUser();
      console.log('Usuario actual:', this.currentUser);

      if (!this.currentUser) {
        console.log('No hay usuario autenticado, redirigiendo a login');
        this.router.navigate(['/login']);
        return;
      }

      // Cargar menú del usuario
      await this.loadUserMenu();
      
      // Cargar estadísticas (opcional)
      await this.loadDashboardStats();

    } catch (error) {
      console.error('Error inicializando dashboard:', error);
      this.error = 'Error cargando el dashboard';
    } finally {
      this.loading = false;
    }
  }

  async loadUserMenu(): Promise<void> {
    try {
      console.log('Cargando menú del usuario...');
      // Usar el método correcto que ahora existe
      this.menuItems = await this.permissionsService.loadUserMenu();
      
      // Inicializar la propiedad expanded para todos los módulos
      this.initializeExpandedState(this.menuItems);
      
      console.log('Menú cargado:', this.menuItems);
    } catch (error) {
      console.error('Error cargando menú:', error);
      this.menuItems = [];
      // No mostrar error al usuario por el menú, usar menú por defecto
      this.createDefaultMenu();
    }
  }

  private initializeExpandedState(modules: MenuModule[]): void {
    modules.forEach(module => {
      if (module.expanded === undefined) {
        module.expanded = false;
      }
      if (module.children && module.children.length > 0) {
        this.initializeExpandedState(module.children);
      }
    });
  }

  createDefaultMenu(): void {
    // Menú por defecto si falla la carga desde la base de datos
    this.menuItems = [
      {
        id_modulo: 1,
        nombre: 'Usuarios',
        descripcion: 'Gestión de usuarios',
        icono: 'fas fa-users',
        ruta: '/usuarios',
        orden: 1,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view']
      },
      {
        id_modulo: 2,
        nombre: 'Reportes',
        descripcion: 'Sistema de reportes',
        icono: 'fas fa-chart-bar',
        ruta: '/reportes',
        orden: 2,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view']
      },
      {
        id_modulo: 3,
        nombre: 'Configuración',
        descripcion: 'Configuración del sistema',
        icono: 'fas fa-cog',
        ruta: '/configuracion',
        orden: 3,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view']
      }
    ];
  }

  async loadDashboardStats(): Promise<void> {
    try {
      // Aquí puedes hacer llamadas a servicios para obtener estadísticas reales
      // Por ahora usamos datos de ejemplo
      this.stats = {
        totalUsers: 1247,
        activeProjects: 23,
        pendingTasks: 47,
        totalReports: 156
      };
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    console.log('Sidebar colapsado:', this.isSidebarCollapsed);
  }

  logout(): void {
    console.log('Cerrando sesión desde dashboard');
    
    // Limpiar datos de permisos y menú
    this.permissionsService.clearUserData();
    
    // Limpiar datos locales
    this.currentUser = null;
    this.menuItems = [];
    
    // Cerrar sesión
    this.authService.logout();
  }

  // Métodos para el menú
  getFilteredMenuItems(): MenuModule[] {
    // Filtrar solo módulos padre o módulos sin padre
    return this.menuItems.filter(item => !item.modulo_padre_id);
  }

  getFilteredChildren(module: MenuModule): MenuModule[] {
    if (!module.children) {
      // Si no tiene children, buscar en menuItems los que tengan este módulo como padre
      return this.menuItems.filter(item => item.modulo_padre_id === module.id_modulo);
    }
    return module.children;
  }

  isRouteActive(route: string): boolean {
    if (!route || route === '#') {
      return false;
    }
    // Obtener la ruta actual
    const currentPath = this.router.url;
    return currentPath === route || currentPath.startsWith(route + '/');
  }

  navigateTo(route: string): void {
    if (route && route !== '#') {
      console.log('Navegando a:', route);
      this.router.navigate([route]);
    }
  }

  toggleModuleExpansion(module: MenuModule): void {
    // Alternar expansión del módulo
    if (module.expanded === undefined) {
      module.expanded = false;
    }
    module.expanded = !module.expanded;
    console.log(`Módulo ${module.nombre} ${module.expanded ? 'expandido' : 'colapsado'}`);
  }

  // Métodos para verificar permisos
  async canUserAccess(route: string): Promise<boolean> {
    try {
      return await this.permissionsService.canAccessRoute(route);
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return true; // Permitir acceso por defecto en caso de error
    }
  }

  async hasPermission(route: string, permission: string): Promise<boolean> {
    try {
      return await this.permissionsService.hasPermission(route, permission);
    } catch (error) {
      console.error('Error verificando permiso específico:', error);
      return false;
    }
  }

  // Métodos de utilidad
  getUserInitials(): string {
    if (!this.currentUser?.full_name) {
      return 'U';
    }
    const names = this.currentUser.full_name.split(' ');
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    }
    return this.currentUser.full_name.charAt(0).toUpperCase();
  }

  getUserRole(): string {
    // Mapear id_perfil a nombre de rol
    switch (this.currentUser?.id_perfil) {
      case 1:
        return 'Administrador';
      case 2:
        return 'Usuario';
      case 3:
        return 'Supervisor';
      case 4:
        return 'Invitado';
      default:
        return 'Usuario';
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  // Método para refrescar datos
  async refreshDashboard(): Promise<void> {
    this.loading = true;
    try {
      await this.loadUserMenu();
      await this.loadDashboardStats();
      // También cargar permisos si es necesario
      await this.permissionsService.loadUserPermissions();
    } catch (error) {
      console.error('Error refrescando dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  // Método para manejar errores de navegación
  handleNavigationError(route: string, error: any): void {
    console.error('Error navegando a:', route, error);
    // Puedes mostrar un mensaje de error al usuario aquí
  }

  // Método para obtener el color del estado del usuario
  getUserStatusColor(): string {
    return this.currentUser?.status === 1 ? 'green' : 'red';
  }

  getUserStatusText(): string {
    return this.currentUser?.status === 1 ? 'Activo' : 'Inactivo';
  }
}