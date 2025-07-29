import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SupabaseService } from './services/supabase.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // ← AGREGAR ESTO
import { environment } from '../environments/environment';
import { UsuariosComponent } from './usuarios/usuarios/usuarios.component';
import { LoginComponent } from './login/login/login.component';
import { RegisterComponent } from './register/register/register.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component'; // Asegúrate de que la ruta sea correcta
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
import { MisRutinasComponent } from './mis-rutinas/mis-rutinas/mis-rutinas.component';
import { TerapiasComponent } from './terapias/terapias/terapias.component';
import { TerapiasUsuarioComponent } from './terapias-usuario/terapias-usuario/terapias-usuario.component';
import { MisTerapiasComponent } from './mis-terapias/mis-terapias/mis-terapias.component';
import { InformacionMedicaUsuariosComponent } from './informacion-medica-usuarios/informacion-medica-usuarios/informacion-medica-usuarios.component';
import { PaquetesComponent } from './paquetes/paquetes/paquetes.component';
import { PaqueteFormComponent } from './paquete-form/paquete-form/paquete-form.component';
import { PaqueteDetalleComponent } from './paquete-detalle/paquete-detalle/paquete-detalle.component';


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
    MisRutinasComponent,
    TerapiasComponent,
    TerapiasUsuarioComponent,
    MisTerapiasComponent,
    InformacionMedicaUsuariosComponent,
    PaquetesComponent,
    PaqueteFormComponent,
    PaqueteDetalleComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,  
    FormsModule,
    RouterModule

    
     
  ],
  providers: [SupabaseService,AuthService],
  bootstrap: [AppComponent]
})
export class AppModule { }
