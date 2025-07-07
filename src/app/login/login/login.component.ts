// src/app/components/login/login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../interfaces/user.interfaces';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials: LoginCredentials = {
    username: '',
    password: ''
  };

  loading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    console.log('LoginComponent inicializado');
  }

  async onLogin(): Promise<void> {
    console.log('onLogin ejecutado');
    
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      console.log('Error: Campos vacíos');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      console.log('Intentando login con:', this.credentials.username);
      const result = await this.authService.login(this.credentials);
      
      if (result.success) {
        console.log('Login exitoso, navegando a dashboard');
        this.router.navigate(['/dashboard']);
      } else {
        console.log('Login falló:', result.message);
        this.errorMessage = result.message;
      }
    } catch (error) {
      console.error('Error inesperado en login:', error);
      this.errorMessage = 'Error inesperado. Intente nuevamente.';
    } finally {
      this.loading = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    console.log('Password visibility toggled:', this.showPassword);
  }

  goToRegister(): void {
    console.log('goToRegister ejecutado - navegando a /register');
    
    try {
      this.router.navigate(['/register']);
      console.log('Navegación a /register iniciada');
    } catch (error) {
      console.error('Error al navegar a register:', error);
    }
  }

  // Método de prueba para verificar que el botón funciona
  testNavigation(): void {
    console.log('Test navigation button clicked!');
    alert('¡El botón funciona! Navegando a register...');
    this.goToRegister();
  }
}