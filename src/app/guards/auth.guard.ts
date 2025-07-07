// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      console.log('Usuario no autenticado, redirigiendo a login');
      this.router.navigate(['/login']);
      return false;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.log('No se pudo obtener el usuario actual');
      this.router.navigate(['/login']);
      return false;
    }

    // Obtener la ruta que se intenta acceder
    const targetRoute = state.url;
    console.log('Verificando acceso a ruta:', targetRoute);

    // Rutas que no requieren verificación de permisos específicos
    const publicRoutes = ['/dashboard', '/login', '/register'];
    if (publicRoutes.includes(targetRoute)) {
      console.log('Ruta pública, acceso permitido');
      return true;
    }

    try {
      // Verificar si el usuario tiene permisos para acceder a la ruta
      const hasPermission = await this.permissionsService.canAccessRoute(targetRoute);
      
      if (!hasPermission) {
        console.log('Usuario sin permisos para acceder a:', targetRoute);
        // Redirigir a dashboard si no tiene permisos
        this.router.navigate(['/dashboard'], {
          queryParams: { 
            error: 'no_permissions',
            attempted_route: targetRoute 
          }
        });
        return false;
      }

      console.log('Acceso autorizado a:', targetRoute);
      return true;

    } catch (error) {
      console.error('Error verificando permisos:', error);
      // En caso de error, permitir acceso por defecto pero registrar el error
      return true;
    }
  }
}

// Guard adicional para verificar permisos específicos
@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Obtener permisos requeridos desde la configuración de la ruta
    const requiredPermissions = route.data['permissions'] as string[];
    const targetRoute = state.url;

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // Si no se especifican permisos, solo verificar acceso básico
      return await this.permissionsService.canAccessRoute(targetRoute);
    }

    try {
      // Verificar si tiene al menos uno de los permisos requeridos
      const hasPermission = await this.permissionsService.hasAnyPermission(
        targetRoute, 
        requiredPermissions
      );

      if (!hasPermission) {
        console.log('Permisos insuficientes para:', targetRoute, 'Requeridos:', requiredPermissions);
        this.router.navigate(['/dashboard'], {
          queryParams: { 
            error: 'insufficient_permissions',
            required: requiredPermissions.join(','),
            attempted_route: targetRoute 
          }
        });
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error en PermissionGuard:', error);
      return false;
    }
  }
}

// Guard para verificar roles específicos
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    const currentUser = this.authService.getCurrentUser();
    const requiredProfiles = route.data['profiles'] as number[];

    if (!requiredProfiles || requiredProfiles.length === 0) {
      return true; // Si no se especifican perfiles requeridos, permitir acceso
    }

    const userProfile = currentUser?.id_perfil;
    if (!userProfile) {
      console.log('Usuario sin perfil asignado');
      this.router.navigate(['/dashboard'], {
        queryParams: { error: 'no_profile' }
      });
      return false;
    }

    if (!requiredProfiles.includes(userProfile)) {
      console.log('Perfil insuficiente:', userProfile, 'Requeridos:', requiredProfiles);
      this.router.navigate(['/dashboard'], {
        queryParams: { 
          error: 'insufficient_role',
          required: requiredProfiles.join(',')
        }
      });
      return false;
    }

    return true;
  }
}