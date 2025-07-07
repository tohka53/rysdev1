// src/app/services/permissions.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface MenuModule {
  id_modulo: number;
  nombre: string;
  descripcion: string;
  icono: string;
  ruta: string;
  orden: number;
  es_padre: boolean;
  modulo_padre_id: number | null;
  permisos: string[];
  children?: MenuModule[];
  expanded?: boolean; // Para controlar el estado de expansión en el UI
}

export interface UserPermission {
  user_id: number;
  username: string;
  ruta: string;
  permiso: string;
  granted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private userMenuSubject = new BehaviorSubject<MenuModule[]>([]);
  public userMenu$ = this.userMenuSubject.asObservable();

  private userPermissionsSubject = new BehaviorSubject<UserPermission[]>([]);
  public userPermissions$ = this.userPermissionsSubject.asObservable();

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // Cargar y actualizar el menú del usuario
  async loadUserMenu(): Promise<MenuModule[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.userMenuSubject.next([]);
      return [];
    }

    try {
      const { data, error } = await this.supabaseService.client
        .rpc('get_user_menu', { p_user_id: currentUser.id });

      if (error) {
        console.error('Error obteniendo menú del usuario:', error);
        this.userMenuSubject.next([]);
        return [];
      }

      const menuTree = this.buildMenuTree(data || []);
      this.userMenuSubject.next(menuTree);
      return menuTree;
    } catch (error) {
      console.error('Error en loadUserMenu:', error);
      this.userMenuSubject.next([]);
      return [];
    }
  }

  // Cargar permisos del usuario
  async loadUserPermissions(): Promise<UserPermission[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.userPermissionsSubject.next([]);
      return [];
    }

    try {
      const { data, error } = await this.supabaseService.client
        .from('v_permisos_usuario')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('granted', true);

      if (error) {
        console.error('Error obteniendo permisos del usuario:', error);
        this.userPermissionsSubject.next([]);
        return [];
      }

      const permissions = data || [];
      this.userPermissionsSubject.next(permissions);
      return permissions;
    } catch (error) {
      console.error('Error en loadUserPermissions:', error);
      this.userPermissionsSubject.next([]);
      return [];
    }
  }

  // Obtener el menú del usuario actual (método existente - mantener compatibilidad)
  async getCurrentUserMenu(): Promise<MenuModule[]> {
    return await this.loadUserMenu();
  }

  // Verificar si el usuario tiene un permiso específico
  async hasPermission(route: string, permission: string): Promise<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return false;
    }

    try {
      const { data, error } = await this.supabaseService.client
        .rpc('user_has_permission', {
          p_user_id: currentUser.id,
          p_route: route,
          p_permission_code: permission
        });

      if (error) {
        console.error('Error verificando permiso:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error en hasPermission:', error);
      return false;
    }
  }

  // Verificar si puede acceder a una ruta
  async canAccessRoute(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'view');
  }

  // Verificar múltiples permisos
  async hasAnyPermission(route: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(route, permission)) {
        return true;
      }
    }
    return false;
  }

  // Obtener todos los permisos del usuario (alias para compatibilidad)
  async getUserPermissions(): Promise<UserPermission[]> {
    return await this.loadUserPermissions();
  }

  // Construir árbol de menú jerárquico
  private buildMenuTree(menuItems: any[]): MenuModule[] {
    const menuMap = new Map<number, MenuModule>();
    const rootItems: MenuModule[] = [];

    // Crear mapa de elementos
    menuItems.forEach(item => {
      const menuModule: MenuModule = {
        id_modulo: item.modulo_id || item.id_modulo, // Manejar ambos nombres de propiedad
        nombre: item.nombre,
        descripcion: item.descripcion,
        icono: item.icono,
        ruta: item.ruta,
        orden: item.orden,
        es_padre: item.es_padre,
        modulo_padre_id: item.modulo_padre_id,
        permisos: item.permisos || [],
        children: [],
        expanded: false // Inicializar como no expandido
      };
      menuMap.set(menuModule.id_modulo, menuModule);
    });

    // Construir jerarquía
    menuMap.forEach(module => {
      if (module.modulo_padre_id === null) {
        rootItems.push(module);
      } else {
        const parent = menuMap.get(module.modulo_padre_id);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(module);
        }
      }
    });

    // Ordenar por orden
    this.sortMenuItems(rootItems);
    
    return rootItems;
  }

  private sortMenuItems(items: MenuModule[]): void {
    items.sort((a, b) => a.orden - b.orden);
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        this.sortMenuItems(item.children);
      }
    });
  }

  // Verificar permisos CRUD básicos
  async canView(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'view');
  }

  async canCreate(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'create');
  }

  async canEdit(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'edit');
  }

  async canDelete(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'delete');
  }

  async canExport(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'export');
  }

  async canAdmin(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'admin');
  }

  // Métodos para limpiar el estado cuando el usuario cierra sesión
  clearUserData(): void {
    this.userMenuSubject.next([]);
    this.userPermissionsSubject.next([]);
  }

  // Método para refrescar tanto menú como permisos
  async refreshUserData(): Promise<void> {
    await Promise.all([
      this.loadUserMenu(),
      this.loadUserPermissions()
    ]);
  }

  // Obtener menú desde el observable (para componentes que quieren suscribirse)
  getUserMenu(): Observable<MenuModule[]> {
    return this.userMenu$;
  }

  // Obtener permisos desde el observable
  getUserPermissionsObservable(): Observable<UserPermission[]> {
    return this.userPermissions$;
  }

  // Método para crear menú por defecto cuando fallan las consultas a BD
  createDefaultMenu(): MenuModule[] {
    const defaultMenu: MenuModule[] = [
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

    this.userMenuSubject.next(defaultMenu);
    return defaultMenu;
  }
}