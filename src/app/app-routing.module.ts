// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, PermissionGuard, RoleGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login/login.component';
import { RegisterComponent } from './register/register/register.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { UsuariosComponent } from './usuarios/usuarios/usuarios.component';

// Crear un componente layout compartido
import { LayoutComponent } from './layout/layout/layout.component';

const routes: Routes = [
  // Ruta principal - Landing page (si tienes LandingComponent)
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // Rutas de autenticación (sin layout)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // Rutas protegidas con layout compartido
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'dashboard', 
        component: DashboardComponent
      },
      { 
        path: 'usuarios', 
        component: UsuariosComponent,
        canActivate: [PermissionGuard],
        data: { 
          permissions: ['view', 'admin'],
          profiles: [1, 3] // Solo admin y supervisor
        }
      },
      // Aquí puedes agregar más rutas protegidas
      // { path: 'reportes', component: ReportesComponent },
      // { path: 'configuracion', component: ConfiguracionComponent },
    ]
  },
  
  // Rutas de landing page alternativa (si tienes LandingComponent)
  // { path: 'home', component: LandingComponent },
  
  // Ruta wildcard - redirige a login
  { path: '**', redirectTo: '/login' }
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