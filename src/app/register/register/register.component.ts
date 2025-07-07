// src/app/components/register/register.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterData } from '../../interfaces/user.interfaces';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  user: RegisterData = {
    username: '',
    full_name: '',
    password: '',
    status: 1,
    id_perfil: 2 // Perfil "Usuario" por defecto
  };
  
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    console.log('RegisterComponent inicializado');
  }

  async onRegister(): Promise<void> {
    console.log('onRegister llamado');
    console.log('Datos del formulario:', this.user);

    // Limpiar mensajes previos
    this.errorMessage = '';
    this.successMessage = '';

    // Validaciones
    if (!this.user.username || !this.user.full_name || !this.user.password || !this.confirmPassword) {
      this.errorMessage = 'Por favor complete todos los campos';
      console.log('Error: Campos vacíos');
      return;
    }

    if (this.user.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      console.log('Error: Contraseñas no coinciden');
      return;
    }

    if (this.user.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      console.log('Error: Contraseña muy corta');
      return;
    }

    if (this.user.username.length < 3) {
      this.errorMessage = 'El nombre de usuario debe tener al menos 3 caracteres';
      console.log('Error: Username muy corto');
      return;
    }

    // Validar que no haya espacios en el username
    if (this.user.username.includes(' ')) {
      this.errorMessage = 'El nombre de usuario no puede contener espacios';
      console.log('Error: Username con espacios');
      return;
    }

    // Validar caracteres especiales en username
    const usernamePattern = /^[a-zA-Z0-9_.-]+$/;
    if (!usernamePattern.test(this.user.username)) {
      this.errorMessage = 'El nombre de usuario solo puede contener letras, números, guiones, puntos y guiones bajos';
      console.log('Error: Username con caracteres inválidos');
      return;
    }

    this.loading = true;
    console.log('Iniciando proceso de registro...');

    try {
      const result = await this.authService.register(this.user);
      console.log('Resultado del registro:', result);
      
      if (result.success) {
        this.successMessage = 'Usuario creado exitosamente. Redirigiendo al login...';
        console.log('Registro exitoso, redirigiendo...');
        
        // Limpiar formulario
        this.user = {
          username: '',
          full_name: '',
          password: '',
          status: 1,
          id_perfil: 2
        };
        this.confirmPassword = '';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.errorMessage = result.message;
        console.log('Error en registro:', result.message);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      this.errorMessage = 'Error inesperado. Intente nuevamente.';
    } finally {
      this.loading = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    console.log('Password visibility toggled:', this.showPassword);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
    console.log('Confirm password visibility toggled:', this.showConfirmPassword);
  }

  goToLogin(): void {
    console.log('Navegando a login');
    this.router.navigate(['/login']);
  }

  // Método para debugging - puedes llamarlo desde el template
  testButton(): void {
    console.log('Test button clicked!');
    console.log('Current user data:', this.user);
    console.log('Confirm password:', this.confirmPassword);
  }
}