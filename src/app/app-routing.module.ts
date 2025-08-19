// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, PermissionGuard, RoleGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login/login.component';
import { RegisterComponent } from './register/register/register.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { UsuariosComponent } from './usuarios/usuarios/usuarios.component';
import { LandingComponent } from './landing/landing/landing.component';

// Componente layout compartido para rutas protegidas
import { LayoutComponent } from './layout/layout/layout.component';
import { RutinasComponent } from './rutinas/rutinas/rutinas.component';
import { TiposSeccionComponent } from './tipos-seccion/tipos-seccion/tipos-seccion.component';
import { RutinasUsuarioComponent } from './rutinas-usuario/rutinas-usuario/rutinas-usuario.component';
import { MisRutinasComponent } from './mis-rutinas/mis-rutinas/mis-rutinas.component';
import { TerapiasComponent } from './terapias/terapias/terapias.component';
import { TerapiasUsuarioComponent } from './terapias-usuario/terapias-usuario/terapias-usuario.component';
import { MisTerapiasComponent } from './mis-terapias/mis-terapias/mis-terapias.component';
import { InformacionMedicaUsuariosComponent } from './informacion-medica-usuarios/informacion-medica-usuarios/informacion-medica-usuarios.component';

const routes: Routes = [
  // Ruta principal - Landing page
  { path: '', component: LandingComponent },
  { path: 'home', component: LandingComponent },
  
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
          profiles: [1, 3]
        }
      },
      { 
        path: 'rutinas', 
        component: RutinasComponent,
        canActivate: [PermissionGuard],
        data: { 
          permissions: ['view'],
          profiles: [1, 3]
        }
      },
      { 
        path: 'tipos-seccion', 
        component: TiposSeccionComponent,
        canActivate: [RoleGuard],
        data: { 
          profiles: [1]
        }
      },
      {
        path: 'rutinas-usuario',
        component: RutinasUsuarioComponent,
        canActivate: [RoleGuard],
        data: { 
          profiles: [1]
        }
      },
      { 
        path: 'mis-rutinas', 
        component: MisRutinasComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'terapias', 
        component: TerapiasComponent,
        canActivate: [PermissionGuard],
        data: { 
          permissions: ['view'],
          profiles: [1, 3]
        }
      }, 
      { 
        path: 'terapias-asignadas', 
        component: TerapiasUsuarioComponent,
        canActivate: [PermissionGuard],
        data: { 
          permissions: ['view'],
          profiles: [1, 3]
        }
      }, 
      { 
        path: 'mis-terapias', 
        component: MisTerapiasComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'informacion-medica', 
        component: InformacionMedicaUsuariosComponent,
        canActivate: [AuthGuard]
      },

      // ===============================================
      // RUTAS DE PAQUETES - LAZY LOADING (RUTA CORREGIDA)
      // ===============================================
      {
        path: 'paquetes',
        loadChildren: () => import('./paquetes/paquetes/paquetes.module').then(m => m.PaquetesModule),
        canActivate: [AuthGuard],
        data: { 
          title: 'Gestión de Paquetes'
        }
      },

      // ===============================================
      // RUTAS DE CHAT/DISCUSIONES - LAZY LOADING
      // ===============================================
      {
        path: 'chat-discussions',
        loadChildren: () => import('./chat-discussion/chat-discussion/chat-discussion.module').then(m => m.ChatDiscussionModule),
        canActivate: [AuthGuard],
        data: { 
          title: 'Sistema de Discusiones',
          requiredPermissions: ['view']
        }
      },

      // Alias alternativo para el chat
      {
        path: 'discusiones',
        redirectTo: 'chat-discussions',
        pathMatch: 'full'
      },

      // Ruta de chat simple (redirige a chat-discussions)
      {
        path: 'chat',
        redirectTo: 'chat-discussions',
        pathMatch: 'full'
      }
    ]
  },
  
  // Ruta wildcard - redirige al landing page
  { path: '**', redirectTo: '/' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Set to true for debugging
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }