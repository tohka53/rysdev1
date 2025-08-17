import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms'; // ← CRÍTICO

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Tus imports existentes
import { LoginComponent } from './login/login/login.component';
import { RegisterComponent } from './register/register/register.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { UsuariosComponent } from './usuarios/usuarios/usuarios.component';
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
import { CalendarioRutinasComponent } from './calendario-rutinas/calendario-rutinas/calendario-rutinas.component';
import { CalendarioTerapiasComponent } from './calendario-terapias/calendario-terapias/calendario-terapias.component';
import { CalendarioPaquetesComponent } from './calendario-paquetes/calendario-paquetes/calendario-paquetes.component';
import { AvatarComponent } from './avatar/avatar/avatar.component';
import { MotivationalQuotesComponent } from './motivational-quotes/motivational-quotes/motivational-quotes.component';
import { inject } from '@vercel/analytics';
// Componentes de paquetes
inject();
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    UsuariosComponent,
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
    CalendarioRutinasComponent,
    CalendarioTerapiasComponent,
    AvatarComponent,
    MotivationalQuotesComponent

   
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,      // ← DEBE ESTAR AQUÍ
    FormsModule              // ← DEBE ESTAR AQUÍ
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }