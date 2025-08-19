// ===============================================
// PAQUETES MODULE CORREGIDO
// src/app/paquetes/paquetes.module.ts
// ===============================================
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PaquetesRoutingModule } from './paquetes-routing.module';

// Importar componentes existentes del sistema administrativo
import { PaquetesComponent } from '../paquetes/paquetes.component';
import { PaqueteFormComponent } from '../../paquete-form/paquete-form/paquete-form.component';
import { PaqueteDetalleComponent } from '../../paquete-detalle/paquete-detalle/paquete-detalle.component';
import { AsignarPaqueteComponent } from '../../asignar-paquete/asignar-paquete/asignar-paquete.component';
import { AsignacionesListaComponent } from '../../asignaciones-lista/asignaciones-lista/asignaciones-lista.component';

// NUEVO: Importar componentes del sistema de compras
import { CalendarioPaquetesComponent } from '../../calendario-paquetes/calendario-paquetes/calendario-paquetes.component';

// Servicios
import { PaquetesService } from '../../services/paquetes.service';

@NgModule({
  declarations: [
    // Componentes administrativos existentes
    PaquetesComponent,
    PaqueteFormComponent,
    PaqueteDetalleComponent,
    AsignarPaqueteComponent,
    AsignacionesListaComponent,
    
    // NUEVO: Componentes del sistema de compras
    CalendarioPaquetesComponent
            // Catálogo público
  ],
  imports: [
    CommonModule,           // Para ngIf, ngFor, pipes básicos
    FormsModule,           // Para ngModel (template-driven forms)
    ReactiveFormsModule,   // Para FormGroup, FormBuilder (reactive forms)
    RouterModule,          // Para routerLink, router-outlet
    PaquetesRoutingModule  // Rutas del módulo
  ],
  providers: [
    PaquetesService       // Servicio para gestión administrativa
  ]
})
export class PaquetesModule { }