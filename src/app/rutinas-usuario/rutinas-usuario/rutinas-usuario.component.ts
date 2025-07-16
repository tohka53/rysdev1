// src/app/rutinas-usuarios/rutinas-usuarios.component.ts
import { Component, OnInit } from '@angular/core';
import { RutinasService } from '../../services/rutinas.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-rutinas-usuario',
  standalone: false,
  templateUrl: './rutinas-usuario.component.html',
  styleUrls: ['./rutinas-usuario.component.css']
})
export class RutinasUsuarioComponent implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
  
}