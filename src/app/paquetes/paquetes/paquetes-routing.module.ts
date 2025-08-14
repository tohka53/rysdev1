// ===============================================
// INTEGRACIÓN COMPLETA DEL CALENDARIO DE PAQUETES
// En tu estructura existente
// ===============================================

// 1. ACTUALIZAR paquetes-routing.module.ts
// src/app/paquetes/paquetes-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard, RoleGuard } from '../../guards/auth.guard';

// Importar componentes existentes
import { PaquetesComponent } from './paquetes.component';
import { PaqueteFormComponent } from '../../paquete-form/paquete-form/paquete-form.component';
import { PaqueteDetalleComponent } from '../../paquete-detalle/paquete-detalle/paquete-detalle.component';
import { AsignarPaqueteComponent } from '../../asignar-paquete/asignar-paquete/asignar-paquete.component';
import { AsignacionesListaComponent } from '../../asignaciones-lista/asignaciones-lista/asignaciones-lista.component';
// NUEVO: Importar calendario de paquetes
import { CalendarioPaquetesComponent } from '../../calendario-paquetes/calendario-paquetes/calendario-paquetes.component';

const routes: Routes = [
  // Ruta principal del módulo - lista de paquetes
  { 
    path: '', 
    component: PaquetesComponent,
    canActivate: [PermissionGuard],
    data: { 
      permissions: ['view'],
      profiles: [1, 2, 3] // Admin, Usuario, Supervisor
    }
  },
  
  // Gestión de paquetes
  { 
    path: 'crear', 
    component: PaqueteFormComponent,
    canActivate: [PermissionGuard],
    data: { 
      permissions: ['create'],
      profiles: [1, 3] // Solo Admin y Supervisor
    }
  },
  { 
    path: 'editar/:id', 
    component: PaqueteFormComponent,
    canActivate: [PermissionGuard],
    data: { 
      permissions: ['edit'],
      profiles: [1, 3] // Solo Admin y Supervisor
    }
  },
  { 
    path: 'detalle/:id', 
    component: PaqueteDetalleComponent,
    canActivate: [PermissionGuard],
    data: { 
      permissions: ['view'],
      profiles: [1, 2, 3] // Todos pueden ver detalles
    }
  },
  
  // Asignaciones
  { 
    path: 'asignar', 
    component: AsignarPaqueteComponent,
    canActivate: [PermissionGuard],
    data: { 
      permissions: ['create'],
      profiles: [1, 3] // Solo Admin y Supervisor
    }
  },
  { 
    path: 'asignar/:id', 
    component: AsignarPaqueteComponent,
    canActivate: [PermissionGuard],
    data: { 
      permissions: ['create'],
      profiles: [1, 3]
    }
  },
  { 
    path: 'asignaciones', 
    component: AsignacionesListaComponent,
    canActivate: [PermissionGuard],
    data: { 
      permissions: ['view'],
      profiles: [1, 3] // Solo Admin y Supervisor
    }
  },
  { 
    path: 'asignaciones/detalle/:id', 
    component: AsignacionesListaComponent,
    canActivate: [PermissionGuard],
    data: { 
      permissions: ['view'],
      profiles: [1, 3]
    }
  },
  
  // NUEVO: Calendario de Paquetes - ACCESO PARA TODOS
  { 
    path: 'calendario', 
    component: CalendarioPaquetesComponent,
    // Solo AuthGuard básico - todos los usuarios autenticados pueden acceder
    data: { 
      // Sin restricciones de perfil = acceso para todos
      title: 'Calendario de Paquetes',
      description: 'Visualiza y gestiona tus sesiones de paquetes'
    }
  },
  
  // Redirect de rutas no encontradas a la lista principal
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaquetesRoutingModule { }