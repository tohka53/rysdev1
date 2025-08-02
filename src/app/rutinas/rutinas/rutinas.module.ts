import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RutinasRoutingModule } from './rutinas-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RutinasRoutingModule,
     FormsModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class RutinasModule { }
