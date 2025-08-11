// src/app/paquetes/paquetes-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Importar componentes
import { PaquetesComponent } from './paquetes.component';
import { PaqueteFormComponent } from '../../paquete-form/paquete-form/paquete-form.component';
import { PaqueteDetalleComponent } from '../../paquete-detalle/paquete-detalle/paquete-detalle.component';
import { AsignarPaqueteComponent } from '../../asignar-paquete/asignar-paquete/asignar-paquete.component';
import { AsignacionesListaComponent } from '../../asignaciones-lista/asignaciones-lista/asignaciones-lista.component';

const routes: Routes = [
  // Ruta principal del módulo - lista de paquetes
  { path: '', component: PaquetesComponent },
  
  // Gestión de paquetes
  { path: 'crear', component: PaqueteFormComponent },
  { path: 'editar/:id', component: PaqueteFormComponent },
  { path: 'detalle/:id', component: PaqueteDetalleComponent },
  
  // Asignaciones
  { path: 'asignar', component: AsignarPaqueteComponent },
  { path: 'asignar/:id', component: AsignarPaqueteComponent },
  { path: 'asignaciones', component: AsignacionesListaComponent },
  { path: 'asignaciones/detalle/:id', component: AsignacionesListaComponent },

  // Redirect de rutas no encontradas a la lista principal
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaquetesRoutingModule { }