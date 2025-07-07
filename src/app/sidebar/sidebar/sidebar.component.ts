// src/app/sidebar/sidebar/sidebar.component.ts
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PermissionsService, MenuModule } from '../../services/permissions.service';
import { Profile } from '../../interfaces/user.interfaces';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  currentUser: Profile | null = null;
  menuItems: MenuModule[] = [];
  expandedModules: Set<number> = new Set(); // Para rastrear módulos expandidos
  loading = true;
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('SidebarComponent inicializado');
    
    try {
      // Obtener usuario actual
      this.currentUser = this.authService.getCurrentUser();
      
      if (!this.currentUser) {
        console.log('No hay usuario autenticado');
        this.router.navigate(['/login']);
        return;
      }

      // Cargar menú del usuario
      await this.loadUserMenu();

      // Suscribirse a cambios en el menú (opcional)
      this.subscriptions.add(
        this.permissionsService.getUserMenu().subscribe(menu => {
          if (menu && menu.length > 0) {
            this.menuItems = menu;
            this.updateExpandedModules();
          }
        })
      );

    } catch (error) {
      console.error('Error inicializando sidebar:', error);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async loadUserMenu(): Promise<void> {
    try {
      console.log('Cargando menú del usuario en sidebar...');
      
      if (this.currentUser?.id) {
        // Usar el método loadUserMenu que espera el ID del usuario
        this.menuItems = await this.permissionsService.loadUserMenu();
        
        // Si no se obtuvo menú, usar el por defecto
        if (!this.menuItems || this.menuItems.length === 0) {
          console.log('No se obtuvo menú de la BD, usando menú por defecto');
          this.menuItems = this.permissionsService.createDefaultMenu();
        }
        
        // Inicializar estados de expansión
        this.updateExpandedModules();
        
        console.log('Menú cargado en sidebar:', this.menuItems);
      }
    } catch (error) {
      console.error('Error cargando menú del usuario:', error);
      // Usar menú por defecto en caso de error
      this.menuItems = this.permissionsService.createDefaultMenu();
      this.updateExpandedModules();
    }
  }

  private updateExpandedModules(): void {
    // Inicializar expanded para todos los módulos si no existe
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

  toggleModule(moduleId: number): void {
    if (this.expandedModules.has(moduleId)) {
      this.expandedModules.delete(moduleId);
    } else {
      this.expandedModules.add(moduleId);
    }

    // También actualizar la propiedad expanded del módulo
    const module = this.menuItems.find(m => m.id_modulo === moduleId);
    if (module) {
      module.expanded = this.expandedModules.has(moduleId);
      console.log(`Módulo ${module.nombre} ${module.expanded ? 'expandido' : 'colapsado'}`);
    }
  }

  isModuleExpanded(moduleId: number): boolean {
    return this.expandedModules.has(moduleId);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
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

  // Métodos para verificar permisos
  async canUserAccess(route: string): Promise<boolean> {
    try {
      return await this.permissionsService.canAccessRoute(route);
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return true; // Permitir acceso por defecto en caso de error
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

  logout(): void {
    console.log('Cerrando sesión desde sidebar');
    
    // Limpiar datos de permisos y menú
    this.permissionsService.clearUserData();
    
    // Limpiar datos locales
    this.currentUser = null;
    this.menuItems = [];
    this.expandedModules.clear();
    
    // Cerrar sesión
    this.authService.logout();
  }

  // Método para refrescar menú
  async refreshMenu(): Promise<void> {
    this.loading = true;
    try {
      await this.loadUserMenu();
    } catch (error) {
      console.error('Error refrescando menú:', error);
    } finally {
      this.loading = false;
    }
  }
}