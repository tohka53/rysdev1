// src/app/paquetes/paquetes.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PaquetesRoutingModule } from './paquetes-routing.module';

// Importar todos los componentes
import { PaquetesComponent } from '../paquetes/paquetes.component';

import { PaqueteFormComponent } from '../../paquete-form/paquete-form/paquete-form.component';
import { PaqueteDetalleComponent } from '../../paquete-detalle/paquete-detalle/paquete-detalle.component';
import { AsignarPaqueteComponent } from '../../asignar-paquete/asignar-paquete/asignar-paquete.component';
import { AsignacionesListaComponent } from '../../asignaciones-lista/asignaciones-lista/asignaciones-lista.component';

@NgModule({
  declarations: [
    // Declarar todos los componentes del módulo
    PaquetesComponent,
    PaqueteFormComponent,
    PaqueteDetalleComponent,
    AsignarPaqueteComponent,
    AsignacionesListaComponent
  ],
  imports: [
    CommonModule,           // Para ngIf, ngFor, pipes básicos
    FormsModule,           // Para ngModel (template-driven forms)
    ReactiveFormsModule,   // Para FormGroup, FormBuilder (reactive forms)
    RouterModule,          // Para routerLink, router-outlet
    PaquetesRoutingModule  // Rutas del módulo
  ],
  providers: [
    // Aquí puedes agregar servicios específicos del módulo si es necesario
  ]
})
export class PaquetesModule { }