// src/app/mis-rutinas/mis-rutinas.module.ts - CORREGIDO
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MisRutinasRoutingModule } from './mis-rutinas-routing.module';
import { MisRutinasComponent } from '../mis-rutinas/mis-rutinas.component';
import { CalendarioRutinasComponent } from '../../calendario-rutinas/calendario-rutinas/calendario-rutinas.component';

@NgModule({
  declarations: [
    MisRutinasComponent,
    CalendarioRutinasComponent
  ],
  imports: [
    CommonModule,
    MisRutinasRoutingModule,
    FormsModule
  ],
  exports: [
    MisRutinasComponent,
    CalendarioRutinasComponent
  ]
})
export class MisRutinasModule { }