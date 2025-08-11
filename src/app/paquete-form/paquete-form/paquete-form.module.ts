import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PaqueteFormRoutingModule } from './paquete-form-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    PaqueteFormRoutingModule, // NECESARIO para pipes como titlecase
    ReactiveFormsModule, // NECESARIO para [formGroup]
    FormsModule,         // NECESARIO para [(ngModel)]
  ]
})
export class PaqueteFormModule { }
