// ===============================================
// PAQUETES ROUTING CORREGIDO CON GUARDS
// src/app/paquetes/paquetes-routing.module.ts
// ===============================================

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Importar guards correctamente
import { AuthGuard, PermissionGuard, RoleGuard } from '../../guards/auth.guard';

// Importar componentes existentes
import { PaquetesComponent } from './paquetes.component';
import { PaqueteFormComponent } from '../../paquete-form/paquete-form/paquete-form.component';
import { PaqueteDetalleComponent } from '../../paquete-detalle/paquete-detalle/paquete-detalle.component';
import { AsignarPaqueteComponent } from '../../asignar-paquete/asignar-paquete/asignar-paquete.component';
import { AsignacionesListaComponent } from '../../asignaciones-lista/asignaciones-lista/asignaciones-lista.component';

// NUEVO: Importar calendario de paquetes
import { CalendarioPaquetesComponent } from '../../calendario-paquetes/calendario-paquetes/calendario-paquetes.component';


const routes: Routes = [
  // ==================================================
  // LISTA DE PAQUETES - TODOS PUEDEN VER
  // ==================================================
  { 
    path: '', 
    component: PaquetesComponent,
    canActivate: [AuthGuard], // Solo verificación de autenticación
    data: { 
      title: 'Lista de Paquetes'
    }
  },
  
  // ==================================================
  // CREAR PAQUETE - SOLO ADMIN Y SUPERVISOR
  // ==================================================
  { 
    path: 'crear', 
    component: PaqueteFormComponent,
    canActivate: [AuthGuard, RoleGuard], // AuthGuard + RoleGuard
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Crear Paquete'
    }
  },
  
  // ==================================================
  // EDITAR PAQUETE - SOLO ADMIN Y SUPERVISOR  
  // ==================================================
  { 
    path: 'editar/:id', 
    component: PaqueteFormComponent,
    canActivate: [AuthGuard, RoleGuard], // AuthGuard + RoleGuard
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Editar Paquete'
    }
  },
  
  // ==================================================
  // VER DETALLE - TODOS PUEDEN VER
  // ==================================================
  { 
    path: 'detalle/:id', 
    component: PaqueteDetalleComponent,
    canActivate: [AuthGuard], // Solo verificación de autenticación
   data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Editar Paquete'
    }
  },
  
  // ==================================================
  // ASIGNAR PAQUETE - SOLO ADMIN Y SUPERVISOR
  // ==================================================
  { 
    path: 'asignar', 
    component: AsignarPaqueteComponent,
    canActivate: [AuthGuard, RoleGuard], // AuthGuard + RoleGuard
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Asignar Paquete'
    }
  },
  
  { 
    path: 'asignar/:id', 
    component: AsignarPaqueteComponent,
    canActivate: [AuthGuard, RoleGuard], // AuthGuard + RoleGuard
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Asignar Paquete Específico'
    }
  },
  
  // ==================================================
  // GESTIÓN DE ASIGNACIONES - SOLO ADMIN Y SUPERVISOR
  // ==================================================
  { 
    path: 'asignaciones', 
    component: AsignacionesListaComponent,
    canActivate: [AuthGuard, RoleGuard], // AuthGuard + RoleGuard
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Gestión de Asignaciones'
    }
  },
  
  { 
    path: 'asignaciones/detalle/:id', 
    component: AsignacionesListaComponent,
    canActivate: [AuthGuard, RoleGuard], // AuthGuard + RoleGuard
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Detalle de Asignación'
    }
  },
  
  // ==================================================
  // CALENDARIO - TODOS PUEDEN ACCEDER
  // ==================================================
  { 
    path: 'calendario', 
    component: CalendarioPaquetesComponent,
    canActivate: [AuthGuard], // Solo verificación de autenticación
    data: { 
      title: 'Calendario de Paquetes'
    }
  },
  
  // Redirect para rutas no encontradas
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaquetesRoutingModule { }

// ===============================================
// DEBUGGING - AGREGAR AL CONSTRUCTOR DE TU COMPONENTE
// Para verificar que los guards están funcionando
// ===============================================

/*
constructor(private authService: AuthService) {
  // Debug para verificar usuario actual
  const user = this.authService.getCurrentUser();
  console.log('🔍 Usuario actual en paquetes:', {
    id: user?.id,
    username: user?.username,
    perfil: user?.id_perfil,
    puede_crear: [1, 3].includes(user?.id_perfil || 0),
    puede_editar: [1, 3].includes(user?.id_perfil || 0),
    puede_asignar: [1, 3].includes(user?.id_perfil || 0),
    puede_ver_asignaciones: [1, 3].includes(user?.id_perfil || 0)
  });
}
*/