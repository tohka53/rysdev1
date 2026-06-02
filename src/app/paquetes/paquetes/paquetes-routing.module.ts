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
import { CompraPaquetesComponent } from '../../compra-paquetes/compra-paquetes/compra-paquetes.component';


const routes: Routes = [
  // ==================================================
  // LISTA DE PAQUETES ADMINISTRATIVOS - SOLO ADMIN/SUPERVISOR
  // ==================================================
  { 
    path: '', 
    component: PaquetesComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Gestión de Paquetes'
    }
  },
  
  // ==================================================
  // CATÁLOGO PÚBLICO DE PAQUETES - ACCESIBLE PARA TODOS
  // ==================================================

  { 
    path: 'compra-paquetes', 
    component: CompraPaquetesComponent,
    canActivate: [AuthGuard], // Solo verificación de autenticación
    data: { 
      title: 'Compra de Paquetes'
    }
  }, 
  // ==================================================
  // PROCESO DE COMPRA - USUARIOS AUTENTICADOS
  // ==================================================
  
  
  // ==================================================
  // MIS PAQUETES - USUARIOS AUTENTICADOS
  // ==================================================
  
  
  // ==================================================
  // VALIDACIÓN DE COMPRAS - SOLO ADMIN
  // ==================================================

  
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
  
  // ==================================================
  // GESTIÓN ADMINISTRATIVA - SOLO ADMIN Y SUPERVISOR
  // ==================================================
  { 
    path: 'crear', 
    component: PaqueteFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Crear Paquete'
    }
  },
  
  { 
    path: 'editar/:id', 
    component: PaqueteFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Editar Paquete'
    }
  },
  
  { 
    path: 'detalle/:id', 
    component: PaqueteDetalleComponent,
    canActivate: [AuthGuard],
    data: { 
      title: 'Detalle de Paquete'
    }
  },
  
  { 
    path: 'asignar', 
    component: AsignarPaqueteComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Asignar Paquete'
    }
  },
  
  { 
    path: 'asignar/:id', 
    component: AsignarPaqueteComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Asignar Paquete Específico'
    }
  },
  
  { 
    path: 'asignaciones', 
    component: AsignacionesListaComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Gestión de Asignaciones'
    }
  },
  
  { 
    path: 'asignaciones/detalle/:id', 
    component: AsignacionesListaComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      profiles: [1, 3], // Solo Admin (1) y Supervisor (3)
      title: 'Detalle de Asignación'
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