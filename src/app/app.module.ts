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

import { Analytics } from "@vercel/analytics/next"
// Servicios
import { AuthService } from './services/auth.service';
import { SidebarComponent } from './sidebar/sidebar/sidebar.component';
import { LandingComponent } from './landing/landing/landing.component';
import { LayoutComponent } from './layout/layout/layout.component';


@NgModule({
  declarations: [
    AppComponent,
    UsuariosComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    SidebarComponent,
    LandingComponent,
    LayoutComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,  
    FormsModule            
    
     
  ],
  providers: [SupabaseService,AuthService],
  bootstrap: [AppComponent]
})
export class AppModule { }
