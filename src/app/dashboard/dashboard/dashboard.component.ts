// src/app/dashboard/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PermissionsService, MenuModule } from '../../services/permissions.service';
import { Profile } from '../../interfaces/user.interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: Profile | null = null;
  menuItems: MenuModule[] = [];
  isSidebarCollapsed = false;
  loading = true;
  error = '';
  currentRoute = '';
  expandedModules: Set<number> = new Set();

  // Stats data para rehabilitación
  stats = {
    todayProgress: 0,
    sessionsCompleted: 0,
    daysActive: 0,
    achievementPoints: 0
  };

  private subscriptions: Subscription = new Subscription();

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
      
      // Cargar estadísticas
      await this.loadDashboardStats();

      // Suscribirse a cambios de ruta
      this.subscriptions.add(
        this.router.events
          .pipe(filter(event => event instanceof NavigationEnd))
          .subscribe((event: NavigationEnd) => {
            this.currentRoute = event.urlAfterRedirects;
            console.log('Ruta actual:', this.currentRoute);
          })
      );

      // Obtener ruta actual
      this.currentRoute = this.router.url;

    } catch (error) {
      console.error('Error inicializando dashboard:', error);
      this.error = 'Error cargando el dashboard';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async loadUserMenu(): Promise<void> {
    try {
      console.log('Cargando menú del usuario...');
      this.menuItems = await this.permissionsService.loadUserMenu();
      
      if (!this.menuItems || this.menuItems.length === 0) {
        console.log('No se obtuvo menú de la BD, usando menú por defecto');
        this.menuItems = this.createDefaultMenu();
      }
      
      this.updateExpandedModules();
      console.log('Menú cargado:', this.menuItems);
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
        nombre: 'Usuarios',
        descripcion: 'Gestión de usuarios',
        icono: 'fas fa-users',
        ruta: '/usuarios',
        orden: 2,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view'],
        expanded: false
      },
      {
        id_modulo: 3,
        nombre: 'Reportes',
        descripcion: 'Sistema de reportes',
        icono: 'fas fa-chart-bar',
        ruta: '/reportes',
        orden: 3,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view'],
        expanded: false
      },
      {
        id_modulo: 4,
        nombre: 'Configuración',
        descripcion: 'Configuración del sistema',
        icono: 'fas fa-cog',
        ruta: '/configuracion',
        orden: 4,
        es_padre: false,
        modulo_padre_id: null,
        permisos: ['view'],
        expanded: false
      }
    ];
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

  async loadDashboardStats(): Promise<void> {
    try {
      // Aquí puedes hacer llamadas a servicios para obtener estadísticas reales
      // Por ahora, simulamos datos de progreso de rehabilitación
      this.stats = {
        todayProgress: this.calculateTodayProgress(),
        sessionsCompleted: this.getSessionsCompleted(),
        daysActive: this.getDaysActive(),
        achievementPoints: this.getAchievementPoints()
      };
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  /**
   * Calcular progreso del día basado en actividades
   */
  private calculateTodayProgress(): number {
    // Simular progreso basado en la fecha actual
    const today = new Date();
    const hour = today.getHours();
    
    // Progreso basado en la hora del día (más realista)
    if (hour < 8) return 10;
    if (hour < 12) return 35;
    if (hour < 16) return 65;
    if (hour < 20) return 85;
    return 95;
  }

  /**
   * Obtener sesiones completadas (ejemplo)
   */
  private getSessionsCompleted(): number {
    // Simular basado en días desde el registro
    const daysActive = this.getDaysActive();
    return Math.floor(daysActive * 0.8) + 15; // Aproximadamente 0.8 sesiones por día activo
  }

  /**
   * Calcular días activos desde el registro
   */
  private getDaysActive(): number {
    if (!this.currentUser?.created_at) return 1;
    
    const createdDate = new Date(this.currentUser.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays);
  }

  /**
   * Calcular puntos de logro
   */
  private getAchievementPoints(): number {
    const sessions = this.getSessionsCompleted();
    const days = this.getDaysActive();
    
    // Fórmula simple para calcular puntos
    return (sessions * 10) + (days * 5) + Math.floor(this.calculateTodayProgress() / 10) * 25;
  }

  /**
   * Obtener URL del avatar del usuario
   */
  getUserAvatarUrl(): string {
    return this.authService.getAvatarUrl(this.currentUser || undefined);
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    console.log('Sidebar colapsado:', this.isSidebarCollapsed);
  }

  toggleModule(moduleId: number): void {
    if (this.expandedModules.has(moduleId)) {
      this.expandedModules.delete(moduleId);
    } else {
      this.expandedModules.add(moduleId);
    }

    const module = this.menuItems.find(m => m.id_modulo === moduleId);
    if (module) {
      module.expanded = this.expandedModules.has(moduleId);
      console.log(`Módulo ${module.nombre} ${module.expanded ? 'expandido' : 'colapsado'}`);
    }
  }

  isModuleExpanded(moduleId: number): boolean {
    return this.expandedModules.has(moduleId);
  }

  logout(): void {
    console.log('Cerrando sesión desde dashboard');
    this.permissionsService.clearUserData();
    this.currentUser = null;
    this.menuItems = [];
    this.authService.logout();
  }

  // Métodos para el menú
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

  // Métodos de utilidad
  getUserInitials(): string {
    return this.authService.getUserInitials(this.currentUser || undefined);
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

  getPageTitle(): string {
    switch (this.currentRoute) {
      case '/dashboard': return 'Dashboard';
      case '/usuarios': return 'Gestión de Usuarios';
      case '/reportes': return 'Reportes';
      case '/configuracion': return 'Configuración';
      default: return 'Dashboard';
    }
  }

  // Verificar si estamos en la página principal del dashboard
  isDashboardHome(): boolean {
    return this.currentRoute === '/dashboard';
  }

  // Verificar si estamos en la página de usuarios
  isUsersPage(): boolean {
    return this.currentRoute === '/usuarios';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
}