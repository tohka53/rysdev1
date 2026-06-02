import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { Injectable } from "@angular/core";

// src/app/guards/admin-only.guard.ts (optimizado para tu estructura)
@Injectable({
  providedIn: 'root'
})
export class AdminOnlyGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    
    if (!this.authService.isAuthenticated()) {
      console.log('Usuario no autenticado');
      this.router.navigate(['/login']);
      return false;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id || currentUser.id_perfil !== 1) {
      console.log('Usuario sin permisos de administrador');
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}