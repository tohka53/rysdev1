// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, PermissionGuard, RoleGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login/login.component';
import { RegisterComponent } from './register/register/register.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { LandingComponent } from './landing/landing/landing.component';
import { UsuariosComponent } from './usuarios/usuarios/usuarios.component';

const routes: Routes = [
  // Ruta principal - Landing page
  { path: '', component: LandingComponent },
  
  // Rutas de autenticación
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // Rutas protegidas - requieren autenticación
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  
  // Rutas del sistema con permisos específicos
  { 
    path: 'usuarios', 
    component: UsuariosComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { 
      permissions: ['view', 'admin'],
      profiles: [1, 3] // Solo admin y supervisor
    }
  },
  
  // Rutas adicionales del sistema (para futuras funcionalidades)
 
  
  // Ruta de landing page alternativa
  { path: 'home', component: LandingComponent },
  
  // Ruta wildcard - redirige a landing page
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // Configuraciones adicionales
    enableTracing: false, // Set to true for debugging
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }