// src/app/shared/layout/layout.component.ts - Actualizado con Rutinas y Sidebar Fijo
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PermissionsService, MenuModule } from '../../services/permissions.service';
import { SupabaseService } from '../../services/supabase.service';
import { Profile } from '../../interfaces/user.interfaces';

@Component({
  selector: 'app-layout',
  standalone: false,
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: Profile | null = null;
  menuItems: MenuModule[] = [];
  isSidebarCollapsed = false;
  isMobileMenuOpen = false;
  currentRoute = '';
  expandedModules: Set<number> = new Set();
  loading = false;
  
  // Stats para el dashboard
  stats = {
    totalUsers: 0,
    activeProjects: 23,
    pendingTasks: 47,
    totalReports: 156
  };
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  // Escuchar cambios de tamaño de ventana para cerrar menú móvil
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (event.target.innerWidth > 768 && this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  async ngOnInit(): Promise<void> {
    console.log('Layout inicializado');
    
    // Verificar si estamos en móvil al cargar
    this.checkMobileView();
    
    // Obtener usuario actual
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      console.log('No hay usuario autenticado, redirigiendo a login');
      this.router.navigate(['/login']);
      return;
    }

    // Cargar menú del usuario
    await this.loadUserMenu();
    
    // Cargar estadísticas si estamos en dashboard
    await this.loadDashboardStats();

    // Suscribirse a cambios de ruta
    this.subscriptions.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          this.currentRoute = event.urlAfterRedirects;
          // Cerrar menú móvil al navegar
          if (this.isMobileMenuOpen) {
            this.isMobileMenuOpen = false;
          }
          console.log('Ruta actual en layout:', this.currentRoute);
        })
    );

    // Obtener ruta actual
    this.currentRoute = this.router.url;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private checkMobileView(): void {
    // Auto-colapsar en móviles
    if (window.innerWidth <= 768) {
      this.isSidebarCollapsed = true;
    }
  }

  async loadUserMenu(): Promise<void> {
    try {
      console.log('Cargando menú del usuario en layout...');
      this.menuItems = await this.permissionsService.loadUserMenu();
      
      if (!this.menuItems || this.menuItems.length === 0) {
        console.log('No se obtuvo menú de la BD, usando menú por defecto');
        this.menuItems = this.createDefaultMenu();
      }
      
      this.updateExpandedModules();
      console.log('Menú cargado en layout:', this.menuItems);
    } catch (error) {
      console.error('Error cargando menú:', error);
      this.menuItems = this.createDefaultMenu();
      this.updateExpandedModules();
    }
  }

  createDefaultMenu(): MenuModule[] {
    return [
      {
        id_modulo: 1,
        nombre: 'Dashboard',
        descripcion: 'Panel principal',
        icono: 'fas fa-tachometer-alt',
        ruta: '/dashboard',
        orden: 1,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view'],
        expanded: false
      },
      {
        id_modulo: 2,
        nombre: 'Mis Rutinas',
        descripcion: 'Gestión de rutinas de entrenamiento',
        icono: 'fas fa-dumbbell',
        ruta: '/rutinas',
        orden: 2,
        es_padre: true,
        modulo_padre_id: null,
        permisos: ['view'],
        expanded: false,
        children: [
          {
            id_modulo: 7,
            nombre: 'Ver Rutinas',
            descripcion: 'Ver todas mis rutinas',
            icono: 'fas fa-eye',
            ruta: '/rutinas/lista',
            orden: 1,
            es_padre: false,
            modulo_padre_id: 2,
            permisos: ['view'],
            expanded: false
          },
          {
            id_modulo: 8,
            nombre: 'Crear Rutina',
            descripcion: 'Crear nueva rutina',
            icono: 'fas fa-plus',
            ruta: '/rutinas/crear',
            orden: 2,
            es_padre: false,
            modulo_padre_id: 2,
            permisos: ['create'],
            expanded: false
          },
          {
            id_modulo: 9,
            nombre: 'Ejercicios',
            descripcion: 'Biblioteca de ejercicios',
            icono: 'fas fa-list',
            ruta: '/rutinas/ejercicios',
            orden: 3,
            es_padre: false,
            modulo_padre_id: 2,
            permisos: ['view'],
            expanded: false
          }
        ]
      },
      {
        id_modulo: 3,
        nombre: 'Usuarios',
        descripcion: 'Gestión de usuarios',
        icono: 'fas fa-users',
        ruta: '/usuarios',
        orden: 3,
        es_padre: true,
        modulo_padre_id: null,
        permisos: ['view'],
        expanded: false,
        children: [
          {
            id_modulo: 10,
            nombre: 'Lista de Usuarios',
            descripcion: 'Ver todos los usuarios',
            icono: 'fas fa-list',
            ruta: '/usuarios/lista',
            orden: 1,
            es_padre: false,
            modulo_padre_id: 3,
            permisos: ['view'],
            expanded: false
          },
          {
            id_modulo: 11,
            nombre: 'Crear Usuario',
            descripcion: 'Crear nuevo usuario',
            icono: 'fas fa-user-plus',
            ruta: '/usuarios/crear',
            orden: 2,
            es_padre: false,
            modulo_padre_id: 3,
            permisos: ['create'],
            expanded: false
          }
        ]
      },
      {
        id_modulo: 4,
        nombre: 'Reportes',
        descripcion: 'Sistema de reportes',
        icono: 'fas fa-chart-bar',
        ruta: '/reportes',
        orden: 4,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view'],
        expanded: false
      },
      {
        id_modulo: 5,
        nombre: 'Configuración',
        descripcion: 'Configuración del sistema',
        icono: 'fas fa-cog',
        ruta: '/configuracion',
        orden: 5,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view'],
        expanded: false
      }
    ];
  }

  async loadDashboardStats(): Promise<void> {
    try {
      // Obtener número total de usuarios reales de la base de datos
      const usersData = await this.supabaseService.getData('profiles');
      this.stats.totalUsers = usersData?.length || 0;
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  private updateExpandedModules(): void {
    this.menuItems.forEach(module => {
      if (module.expanded === undefined) {
        module.expanded = false;
      }
      if (module.children) {
        module.children.forEach(child => {
          if (child.expanded === undefined) {
            child.expanded = false;
          }
        });
      }
    });
  }

  toggleSidebar(): void {
    // En móvil, no permitir colapsar/expandir, solo abrir/cerrar
    if (window.innerWidth <= 768) {
      this.toggleSidebarMobile();
      return;
    }
    
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    console.log('Sidebar colapsado:', this.isSidebarCollapsed);
    
    // Cerrar todos los módulos expandidos cuando se colapsa
    if (this.isSidebarCollapsed) {
      this.expandedModules.clear();
    }
  }

  toggleSidebarMobile(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    console.log('Menú móvil abierto:', this.isMobileMenuOpen);
  }

  toggleModule(moduleId: number): void {
    // No permitir expandir módulos si el sidebar está colapsado
    if (this.isSidebarCollapsed) {
      return;
    }

    if (this.expandedModules.has(moduleId)) {
      this.expandedModules.delete(moduleId);
    } else {
      this.expandedModules.add(moduleId);
    }

    const module = this.menuItems.find(m => m.id_modulo === moduleId);
    if (module) {
      module.expanded = this.expandedModules.has(moduleId);
    }
  }

  isModuleExpanded(moduleId: number): boolean {
    return this.expandedModules.has(moduleId);
  }

  getFilteredMenuItems(): MenuModule[] {
    return this.menuItems.filter(item => !item.modulo_padre_id);
  }

  getFilteredChildren(module: MenuModule): MenuModule[] {
    if (!module.children) {
      return this.menuItems.filter(item => item.modulo_padre_id === module.id_modulo);
    }
    return module.children;
  }

  isRouteActive(route: string): boolean {
    if (!route || route === '#') {
      return false;
    }
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  navigateTo(route: string): void {
    if (route && route !== '#') {
      console.log('Navegando a:', route);
      this.router.navigate([route]);
    }
  }

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
    switch (this.currentUser?.id_perfil) {
      case 1: return 'Administrador';
      case 2: return 'Usuario';
      case 3: return 'Supervisor';
      case 4: return 'Invitado';
      default: return 'Usuario';
    }
  }

  logout(): void {
    console.log('Cerrando sesión desde layout');
    this.permissionsService.clearUserData();
    this.currentUser = null;
    this.menuItems = [];
    this.expandedModules.clear();
    this.isSidebarCollapsed = false;
    this.isMobileMenuOpen = false;
    this.authService.logout();
  }

  getPageTitle(): string {
    const routeTitleMap: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/rutinas': 'Mis Rutinas',
      '/rutinas/lista': 'Ver Rutinas',
      '/rutinas/crear': 'Crear Rutina',
      '/rutinas/editar': 'Editar Rutina',
      '/rutinas/ejercicios': 'Biblioteca de Ejercicios',
      '/usuarios': 'Gestión de Usuarios',
      '/usuarios/lista': 'Lista de Usuarios',
      '/usuarios/crear': 'Crear Usuario',
      '/usuarios/editar': 'Editar Usuario',
      '/reportes': 'Reportes',
      '/configuracion': 'Configuración'
    };

    // Buscar coincidencia exacta primero
    if (routeTitleMap[this.currentRoute]) {
      return routeTitleMap[this.currentRoute];
    }

    // Buscar coincidencia parcial para rutas dinámicas
    for (const route in routeTitleMap) {
      if (this.currentRoute.startsWith(route)) {
        return routeTitleMap[route];
      }
    }

    return 'Sistema de Gestión';
  }

  // Verificar si estamos en dashboard para mostrar las estadísticas
  isDashboardRoute(): boolean {
    return this.currentRoute === '/dashboard';
  }

  // Verificar si estamos en rutinas
  isRutinasRoute(): boolean {
    return this.currentRoute.startsWith('/rutinas');
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
      return 'Fecha inválida';
    }
  }

  async refreshDashboard(): Promise<void> {
    this.loading = true;
    try {
      await this.loadUserMenu();
      await this.loadDashboardStats();
      await this.permissionsService.loadUserPermissions();
    } catch (error) {
      console.error('Error refrescando dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  // Método para verificar si el dispositivo es móvil
  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  // Método para obtener el estado actual del sidebar
  getSidebarState(): string {
    if (this.isMobile()) {
      return this.isMobileMenuOpen ? 'mobile-open' : 'mobile-closed';
    }
    return this.isSidebarCollapsed ? 'collapsed' : 'expanded';
  }

  // Métodos específicos para rutinas
  getTotalRutinas(): number {
    // Aquí conectarías con tu servicio de rutinas
    return 12; // Ejemplo
  }

  getRutinasCompletadas(): number {
    // Aquí conectarías con tu servicio de rutinas
    return 8; // Ejemplo
  }

  getEjerciciosFavoritos(): number {
    // Aquí conectarías con tu servicio de ejercicios
    return 25; // Ejemplo
  }

  // Método para obtener iconos específicos según el módulo
  getModuleIcon(moduleName: string): string {
    const iconMap: { [key: string]: string } = {
      'Dashboard': 'fas fa-tachometer-alt',
      'Mis Rutinas': 'fas fa-dumbbell',
      'Usuarios': 'fas fa-users',
      'Reportes': 'fas fa-chart-bar',
      'Configuración': 'fas fa-cog',
      'Ver Rutinas': 'fas fa-eye',
      'Crear Rutina': 'fas fa-plus',
      'Ejercicios': 'fas fa-list'
    };
    
    return iconMap[moduleName] || 'fas fa-circle';
  }
}