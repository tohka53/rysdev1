// ===============================================
// PERMISSIONS SERVICE ACTUALIZADO PARA PAQUETES
// src/app/services/permissions.service.ts
// ===============================================

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
  expanded?: boolean;
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

  // ===============================================
  // MÉTODO PRINCIPAL ACTUALIZADO PARA VERIFICAR ACCESO
  // ===============================================
  async canAccessRoute(route: string): Promise<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      console.log('❌ Usuario no autenticado');
      return false;
    }

    console.log('🔍 Verificando acceso a:', route, 'Usuario ID:', currentUser.id, 'Perfil:', currentUser.id_perfil);

    // Rutas públicas que no requieren verificación
    const publicRoutes = ['/dashboard', '/login', '/register'];
    if (publicRoutes.includes(route)) {
      console.log('✅ Ruta pública, acceso permitido');
      return true;
    }

    // Para rutas de paquetes, usar verificación específica
    if (route.includes('/paquetes')) {
      return await this.checkPaquetesPermission(route, currentUser.id);
    }

    // Para otras rutas, usar el método original
    return await this.hasPermission(route, 'view');
  }

  // ===============================================
  // VERIFICACIÓN ESPECÍFICA PARA PAQUETES
  // ===============================================
  private async checkPaquetesPermission(route: string, userId: number): Promise<boolean> {
    try {
      console.log('🔍 Verificando permisos de paquetes para ruta:', route);

      // Usar la función que creamos en el SQL
      const { data, error } = await this.supabaseService.client
        .rpc('check_paquetes_permission', {
          p_user_id: userId,
          p_route: route,
          p_permission_code: 'view'
        });

      if (error) {
        console.error('❌ Error llamando check_paquetes_permission:', error);
        // Fallback: verificar por perfil
        return this.checkPaquetesPermissionByProfile(route);
      }

      const hasAccess = data === true;
      console.log(`${hasAccess ? '✅' : '❌'} Acceso a paquetes:`, hasAccess);
      return hasAccess;

    } catch (error) {
      console.error('❌ Error en checkPaquetesPermission:', error);
      // Fallback: verificar por perfil
      return this.checkPaquetesPermissionByProfile(route);
    }
  }

  // ===============================================
  // FALLBACK: VERIFICAR PERMISOS POR PERFIL
  // ===============================================
  private checkPaquetesPermissionByProfile(route: string): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id_perfil) {
      console.log('❌ Usuario sin perfil válido');
      return false;
    }

    const userProfile = currentUser.id_perfil;
    console.log('🔧 Fallback: verificando por perfil', userProfile, 'para ruta:', route);

    // Perfil 1 (Admin) - Acceso completo
    if (userProfile === 1) {
      console.log('✅ Admin: acceso completo');
      return true;
    }

    // Perfil 3 (Supervisor) - Acceso limitado
    if (userProfile === 3) {
      // No puede eliminar, pero puede el resto
      if (route.includes('/eliminar') || route.includes('/delete')) {
        console.log('❌ Supervisor: no puede eliminar');
        return false;
      }
      console.log('✅ Supervisor: acceso permitido');
      return true;
    }

    // Perfil 2 (Usuario) - Solo lectura
    if (userProfile === 2) {
      // Solo puede ver la lista principal, detalles y calendario
      const readOnlyRoutes = [
        '/paquetes',
        '/paquetes/detalle',
        '/paquetes/calendario'
      ];
      
      // Verificar si la ruta está permitida
      const isReadOnlyRoute = readOnlyRoutes.some(allowedRoute => 
        route === allowedRoute || route.startsWith(allowedRoute + '/')
      );
      
      // Verificar que no sea una acción restringida
      const restrictedActions = ['/crear', '/editar', '/asignar', '/asignaciones'];
      const isRestrictedAction = restrictedActions.some(action => route.includes(action));
      
      const hasAccess = isReadOnlyRoute && !isRestrictedAction;
      console.log(`${hasAccess ? '✅' : '❌'} Usuario: ${hasAccess ? 'puede acceder' : 'acceso denegado'} a ${route}`);
      return hasAccess;
    }

    console.log('❌ Perfil no reconocido:', userProfile);
    return false;
  }

  // ===============================================
  // MÉTODO ACTUALIZADO PARA hasPermission
  // ===============================================
  async hasPermission(route: string, permission: string): Promise<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return false;
    }

    // Para rutas de paquetes, usar verificación específica
    if (route.includes('/paquetes')) {
      return await this.checkPaquetesPermission(route, currentUser.id);
    }

    try {
      // Para otras rutas, intentar usar la función original
      const { data, error } = await this.supabaseService.client
        .rpc('user_has_permission', {
          p_user_id: currentUser.id,
          p_route: route,
          p_permission_code: permission
        });

      if (error) {
        console.error('Error verificando permiso (función no existe):', error);
        // Fallback: permitir acceso básico para usuarios autenticados
        return true;
      }

      return data === true;
    } catch (error) {
      console.error('Error en hasPermission:', error);
      // Fallback: permitir acceso básico
      return true;
    }
  }

  // ===============================================
  // MÉTODOS ESPECÍFICOS PARA PAQUETES
  // ===============================================
  
  // Verificar si puede ver un paquete específico
  async canViewPaquete(paqueteId: number): Promise<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return false;
    }

    try {
      const { data, error } = await this.supabaseService.client
        .rpc('user_can_view_paquete', {
          p_user_id: currentUser.id,
          p_paquete_id: paqueteId
        });

      if (error) {
        console.error('Error verificando acceso a paquete:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error en canViewPaquete:', error);
      return false;
    }
  }

  // Verificar si puede acceder a asignaciones
  async canAccessAsignaciones(): Promise<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return false;
    }

    try {
      const { data, error } = await this.supabaseService.client
        .rpc('user_can_access_asignaciones', {
          p_user_id: currentUser.id
        });

      if (error) {
        console.error('Error verificando acceso a asignaciones:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error en canAccessAsignaciones:', error);
      return false;
    }
  }

  // ===============================================
  // MÉTODOS ORIGINALES (mantener compatibilidad)
  // ===============================================

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

  async getCurrentUserMenu(): Promise<MenuModule[]> {
    return await this.loadUserMenu();
  }

  async hasAnyPermission(route: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(route, permission)) {
        return true;
      }
    }
    return false;
  }

  async getUserPermissions(): Promise<UserPermission[]> {
    return await this.loadUserPermissions();
  }

  private buildMenuTree(menuItems: any[]): MenuModule[] {
    const menuMap = new Map<number, MenuModule>();
    const rootItems: MenuModule[] = [];

    menuItems.forEach(item => {
      const menuModule: MenuModule = {
        id_modulo: item.modulo_id || item.id_modulo,
        nombre: item.nombre,
        descripcion: item.descripcion,
        icono: item.icono,
        ruta: item.ruta,
        orden: item.orden,
        es_padre: item.es_padre,
        modulo_padre_id: item.modulo_padre_id,
        permisos: item.permisos || [],
        children: [],
        expanded: false
      };
      menuMap.set(menuModule.id_modulo, menuModule);
    });

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

  // Métodos CRUD básicos actualizados
  async canView(route: string): Promise<boolean> {
    return await this.canAccessRoute(route);
  }

  async canCreate(route: string): Promise<boolean> {
    if (route.includes('/paquetes')) {
      const currentUser = this.authService.getCurrentUser();
      return currentUser && currentUser.id_perfil ? [1, 3].includes(currentUser.id_perfil) : false;
    }
    return await this.hasPermission(route, 'create');
  }

  async canEdit(route: string): Promise<boolean> {
    if (route.includes('/paquetes')) {
      const currentUser = this.authService.getCurrentUser();
      return currentUser && currentUser.id_perfil ? [1, 3].includes(currentUser.id_perfil) : false;
    }
    return await this.hasPermission(route, 'edit');
  }

  async canDelete(route: string): Promise<boolean> {
    if (route.includes('/paquetes')) {
      const currentUser = this.authService.getCurrentUser();
      return currentUser && currentUser.id_perfil ? currentUser.id_perfil === 1 : false; // Solo admin
    }
    return await this.hasPermission(route, 'delete');
  }

  async canExport(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'export');
  }

  async canAdmin(route: string): Promise<boolean> {
    return await this.hasPermission(route, 'admin');
  }

  clearUserData(): void {
    this.userMenuSubject.next([]);
    this.userPermissionsSubject.next([]);
  }

  async refreshUserData(): Promise<void> {
    await Promise.all([
      this.loadUserMenu(),
      this.loadUserPermissions()
    ]);
  }

  getUserMenu(): Observable<MenuModule[]> {
    return this.userMenu$;
  }

  getUserPermissionsObservable(): Observable<UserPermission[]> {
    return this.userPermissions$;
  }

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
      }
    ];

    this.userMenuSubject.next(defaultMenu);
    return defaultMenu;
  }
}