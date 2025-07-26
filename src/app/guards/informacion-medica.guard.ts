// src/app/guards/informacion-medica.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class InformacionMedicaGuard implements CanActivate {

  constructor(
    private authService: AuthService,
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
    if (!currentUser || !currentUser.id) {
      console.log('No se pudo obtener el usuario actual');
      this.router.navigate(['/login']);
      return false;
    }

    // Verificar que el usuario tenga un perfil válido (admin o usuario regular)
    const validProfiles = [1, 2]; // 1 = Admin, 2 = Usuario
    if (!validProfiles.includes(currentUser.id_perfil)) {
      console.log('Usuario sin perfil válido para información médica');
      this.router.navigate(['/dashboard']);
      return false;
    }

    console.log('Acceso permitido a información médica para usuario:', currentUser.username);
    return true;
  }
}

