// src/app/landing/landing.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: false,
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  
  // Datos para la sección de servicios
  services = [
    {
      icon: 'fas fa-walking',
      title: 'Rehabilitación Motora',
      description: 'Recuperación de movilidad y fortalecimiento muscular con técnicas especializadas.',
      features: ['Terapia manual', 'Ejercicios terapéuticos', 'Reeducación postural']
    },
    {
      icon: 'fas fa-heartbeat',
      title: 'Fisioterapia Deportiva',
      description: 'Tratamiento especializado para lesiones deportivas y mejora del rendimiento.',
      features: ['Prevención de lesiones', 'Recuperación deportiva', 'Acondicionamiento físico']
    },
    {
      icon: 'fas fa-user-md',
      title: 'Terapia Personalizada',
      description: 'Planes de tratamiento individualizados según las necesidades de cada paciente.',
      features: ['Evaluación completa', 'Seguimiento continuo', 'Planes personalizados']
    },
    {
      icon: 'fas fa-spa',
      title: 'Terapias Alternativas',
      description: 'Tratamientos complementarios para el bienestar integral del paciente.',
      features: ['Masoterapia', 'Electroterapia', 'Termoterapia']
    }
  ];

  // Datos para la sección de precios
  pricingPlans = [
    {
      name: 'Básico',
      price: 'Q250',
      period: 'por sesión',
      features: [
        'Evaluación inicial',
        'Sesión de 45 minutos',
        'Ejercicios básicos',
        'Seguimiento personalizado'
      ],
      popular: false,
      buttonText: 'Reservar Cita'
    },
    {
      name: 'Profesional',
      price: 'Q1,200',
      period: 'paquete 5 sesiones',
      features: [
        'Evaluación completa',
        'Sesiones de 60 minutos',
        'Ejercicios especializados',
        'Plan de ejercicios para casa',
        'Seguimiento semanal'
      ],
      popular: true,
      buttonText: 'Más Popular'
    },
    {
      name: 'Premium',
      price: 'Q2,200',
      period: 'paquete 10 sesiones',
      features: [
        'Evaluación integral',
        'Sesiones de 60 minutos',
        'Terapias complementarias',
        'Plan nutricional básico',
        'Seguimiento 24/7',
        'Acceso a app móvil'
      ],
      popular: false,
      buttonText: 'Mejor Valor'
    }
  ];

  // Datos del equipo - Solo un fisioterapeuta
  team = [
    {
      name: 'Dra. María González',
      role: 'Fisioterapeuta Principal',
      specialization: 'Especialista en Rehabilitación Neurológica',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
      experience: '15 años de experiencia'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Inicialización del componente
  }

  // Navegación suave a secciones
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Navegar al login
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Método para contacto
  contactUs(): void {
    this.scrollToSection('contacto');
  }

  // Método para reservar cita
  bookAppointment(): void {
    // Aquí podrías abrir un modal o navegar a una página de reservas
    alert('¡Pronto podrás reservar tu cita online! Por ahora contáctanos directamente.');
  }

  // Método para mostrar más información
  showMoreInfo(service: any): void {
    alert(`Más información sobre: ${service.title}\n\n${service.description}`);
  }

  // Método para obtener las clases CSS dinámicas del grid del equipo
  getTeamGridClasses(): string {
    const teamCount = this.team.length;
    
    if (teamCount === 1) {
      return 'grid grid-cols-1 justify-items-center';
    } else if (teamCount === 2) {
      return 'grid grid-cols-1 md:grid-cols-2 justify-items-center';
    } else {
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-items-center';
    }
  }
}