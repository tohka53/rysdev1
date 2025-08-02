import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SupabaseService } from './services/supabase.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../environments/environment';
import { UsuariosComponent } from './usuarios/usuarios/usuarios.component';
import { LoginComponent } from './login/login/login.component';
import { RegisterComponent } from './register/register/register.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { Router, RouterModule } from '@angular/router';
import { Analytics } from "@vercel/analytics/next"
// Servicios
import { AuthService } from './services/auth.service';
import { SidebarComponent } from './sidebar/sidebar/sidebar.component';
import { LandingComponent } from './landing/landing/landing.component';
import { LayoutComponent } from './layout/layout/layout.component';
import { RutinasComponent } from './rutinas/rutinas/rutinas.component';
import { TiposSeccionComponent } from './tipos-seccion/tipos-seccion/tipos-seccion.component';
import { RutinasUsuarioComponent } from './rutinas-usuario/rutinas-usuario/rutinas-usuario.component';
import { TerapiasComponent } from './terapias/terapias/terapias.component';
import { TerapiasUsuarioComponent } from './terapias-usuario/terapias-usuario/terapias-usuario.component';
import { MisTerapiasComponent } from './mis-terapias/mis-terapias/mis-terapias.component';
import { InformacionMedicaUsuariosComponent } from './informacion-medica-usuarios/informacion-medica-usuarios/informacion-medica-usuarios.component';
import { PaquetesComponent } from './paquetes/paquetes/paquetes.component';
import { PaqueteFormComponent } from './paquete-form/paquete-form/paquete-form.component';
import { PaqueteDetalleComponent } from './paquete-detalle/paquete-detalle/paquete-detalle.component';
import { CommonModule } from '@angular/common';

// IMPORTAR EL MÓDULO EN LUGAR DE LOS COMPONENTES INDIVIDUALES
import { MisRutinasModule } from '../app/mis-rutinas/mis-rutinas/mis-rutinas.module';
import { CalendarioTerapiasComponent } from './calendario-terapias/calendario-terapias/calendario-terapias.component';

@NgModule({
  declarations: [
    AppComponent,
    UsuariosComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    SidebarComponent,
    LandingComponent,
    LayoutComponent,
    RutinasComponent,
    TiposSeccionComponent,
    RutinasUsuarioComponent,
    TerapiasComponent,
    TerapiasUsuarioComponent,
    MisTerapiasComponent,
    InformacionMedicaUsuariosComponent,
    PaquetesComponent,
    PaqueteFormComponent,
    PaqueteDetalleComponent,
    CalendarioTerapiasComponent
    // NO declarar MisRutinasComponent ni CalendarioRutinasComponent aquí
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MisRutinasModule // IMPORTAR EL MÓDULO
  ],
  providers: [SupabaseService, AuthService],
  bootstrap: [AppComponent]
})
export class AppModule { }