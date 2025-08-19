import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      const user = await this.authService.getCurrentUser();
      if (user && user.id_perfil === 1) { // Asumiendo que 1 = Admin
        return true;
      }
      
      this.router.navigate(['/dashboard']);
      return false;
    } catch (error) {
      this.router.navigate(['/login']);
      return false;
    }
  }
}