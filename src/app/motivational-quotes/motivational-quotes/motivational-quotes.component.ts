import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-motivational-quotes',
  standalone: false,
  templateUrl: './motivational-quotes.component.html',
  styleUrls: ['./motivational-quotes.component.css']
})
export class MotivationalQuotesComponent implements OnInit, OnDestroy {
  currentQuoteIndex = 0;
  isAutoRotating = true;
  private intervalId: any;
  private readonly ROTATION_INTERVAL = 12 * 60 * 60 * 1000; // 12 horas en milisegundos

  motivationalQuotes = [
    {
      text: "Cada paso que das en tu rehabilitación es un paso hacia una vida mejor.",
      author: "RehabiMovement",
      category: "Progreso"
    },
    {
      text: "La fortaleza no viene de la capacidad física, sino de una voluntad indomable.",
      author: "Mahatma Gandhi",
      category: "Fortaleza"
    },
    {
      text: "No importa cuán lento vayas, siempre y cuando no te detengas.",
      author: "Confucio",
      category: "Perseverancia"
    },
    {
      text: "Tu recuperación no es una carrera, es un viaje. Disfruta cada momento de progreso.",
      author: "RehabiMovement",
      category: "Paciencia"
    },
    {
      text: "El dolor es temporal, pero rendirse dura para siempre.",
      author: "Lance Armstrong",
      category: "Resistencia"
    },
    {
      text: "Cada ejercicio que haces hoy es una inversión en tu futuro yo.",
      author: "RehabiMovement",
      category: "Futuro"
    },
    {
      text: "La diferencia entre lo imposible y lo posible radica en la determinación.",
      author: "Tommy Lasorda",
      category: "Determinación"
    },
    {
      text: "Tu cuerpo puede hacerlo. Es tu mente la que tienes que convencer.",
      author: "Motivación Fitness",
      category: "Mentalidad"
    },
    {
      text: "No se trata de ser perfecto, se trata de ser mejor que ayer.",
      author: "RehabiMovement",
      category: "Mejora"
    },
    {
      text: "La rehabilitación es el arte de transformar limitaciones en oportunidades.",
      author: "RehabiMovement",
      category: "Transformación"
    },
    {
      text: "Cada día sin desistir es una victoria en sí misma.",
      author: "Motivación Personal",
      category: "Victoria"
    },
    {
      text: "Tu fuerza interior es más poderosa que cualquier obstáculo externo.",
      author: "RehabiMovement",
      category: "Fuerza Interior"
    },
    {
      text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
      author: "Robert Collier",
      category: "Éxito"
    },
    {
      text: "No mires atrás, no vas en esa dirección. Enfócate en tu progreso.",
      author: "RehabiMovement",
      category: "Enfoque"
    },
    {
      text: "La sanación es un proceso, no un destino. Celebra cada pequeño avance.",
      author: "RehabiMovement",
      category: "Sanación"
    },
    {
      text: "Tu dedicación de hoy será tu fuerza de mañana.",
      author: "RehabiMovement",
      category: "Dedicación"
    },
    {
      text: "Los campeones siguen jugando hasta que lo hacen bien.",
      author: "Billie Jean King",
      category: "Persistencia"
    },
    {
      text: "La recuperación requiere valentía para enfrentar tus miedos y seguir adelante.",
      author: "RehabiMovement",
      category: "Valentía"
    },
    {
      text: "Cada sesión de terapia es una inversión en tu independencia futura.",
      author: "RehabiMovement",
      category: "Independencia"
    },
    {
      text: "Cree en ti mismo y en tu capacidad de superar cualquier desafío.",
      author: "RehabiMovement",
      category: "Autoconfianza"
    }
  ];

  ngOnInit(): void {
    this.loadSavedState();
    this.startAutoRotation();
  }

  ngOnDestroy(): void {
    this.stopAutoRotation();
  }

  /**
   * Cargar estado guardado del localStorage
   */
  private loadSavedState(): void {
    try {
      const savedIndex = localStorage.getItem('motivational-quote-index');
      const lastUpdate = localStorage.getItem('motivational-quote-last-update');
      
      if (savedIndex && lastUpdate) {
        const timeSinceUpdate = Date.now() - parseInt(lastUpdate);
        
        // Si han pasado más de 12 horas, cambiar automáticamente
        if (timeSinceUpdate >= this.ROTATION_INTERVAL) {
          this.nextQuote();
        } else {
          this.currentQuoteIndex = parseInt(savedIndex);
        }
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  }

  /**
   * Guardar estado actual
   */
  private saveState(): void {
    try {
      localStorage.setItem('motivational-quote-index', this.currentQuoteIndex.toString());
      localStorage.setItem('motivational-quote-last-update', Date.now().toString());
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  /**
   * Iniciar rotación automática
   */
  private startAutoRotation(): void {
    if (this.isAutoRotating) {
      this.intervalId = setInterval(() => {
        this.nextQuote();
      }, this.ROTATION_INTERVAL);
    }
  }

  /**
   * Detener rotación automática
   */
  private stopAutoRotation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Obtener frase actual
   */
  get currentQuote() {
    return this.motivationalQuotes[this.currentQuoteIndex];
  }

  /**
   * Avanzar a la siguiente frase
   */
  nextQuote(): void {
    this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.motivationalQuotes.length;
    this.saveState();
  }

  /**
   * Retroceder a la frase anterior
   */
  previousQuote(): void {
    this.currentQuoteIndex = this.currentQuoteIndex === 0 
      ? this.motivationalQuotes.length - 1 
      : this.currentQuoteIndex - 1;
    this.saveState();
  }

  /**
   * Ir a una frase específica
   */
  goToQuote(index: number): void {
    if (index >= 0 && index < this.motivationalQuotes.length) {
      this.currentQuoteIndex = index;
      this.saveState();
    }
  }

  /**
   * Toggle rotación automática
   */
  toggleAutoRotation(): void {
    this.isAutoRotating = !this.isAutoRotating;
    
    if (this.isAutoRotating) {
      this.startAutoRotation();
    } else {
      this.stopAutoRotation();
    }
  }

  /**
   * Obtener tiempo hasta la próxima actualización automática
   */
  getTimeUntilNextUpdate(): string {
    try {
      const lastUpdate = localStorage.getItem('motivational-quote-last-update');
      if (!lastUpdate) return 'No disponible';
      
      const timeSinceUpdate = Date.now() - parseInt(lastUpdate);
      const timeUntilNext = this.ROTATION_INTERVAL - timeSinceUpdate;
      
      if (timeUntilNext <= 0) return 'Próximamente';
      
      const hours = Math.floor(timeUntilNext / (60 * 60 * 1000));
      const minutes = Math.floor((timeUntilNext % (60 * 60 * 1000)) / (60 * 1000));
      
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return 'No disponible';
    }
  }

  /**
   * Forzar actualización manual
   */
  forceUpdate(): void {
    this.nextQuote();
    
    // Reiniciar el timer automático
    this.stopAutoRotation();
    if (this.isAutoRotating) {
      this.startAutoRotation();
    }
  }

  /**
   * Obtener progreso del indicador
   */
  getProgressPercentage(): number {
    return ((this.currentQuoteIndex + 1) / this.motivationalQuotes.length) * 100;
  }
}