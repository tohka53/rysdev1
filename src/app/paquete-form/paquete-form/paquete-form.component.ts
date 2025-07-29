// src/app/components/paquetes/paquete-form/paquete-form.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaquetesService } from '../../services/paquetes.service';
import { 
  Paquete, 
  PaqueteFormData, 
  TIPOS_PAQUETE 
} from '../../interfaces/paquetes.interfaces';

@Component({
  selector: 'app-paquete-form',
  standalone: false,
  templateUrl: './paquete-form.component.html',
  styleUrls: ['./paquete-form.component.css']
})
export class PaqueteFormComponent implements OnInit {

  // ================================
  // PROPIEDADES
  // ================================
  paqueteForm!: FormGroup;
  esEdicion = false;
  paqueteId: number | null = null;
  cargando = false;
  guardando = false;
  error: string | null = null;

  // Opciones
  tiposPaquete = TIPOS_PAQUETE;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private paquetesService: PaquetesService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.verificarModoEdicion();
  }

  // ================================
  // INICIALIZACIÓN
  // ================================

  private inicializarFormulario(): void {
    this.paqueteForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(255)]],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(0.01)]],
      cantidad_sesiones: [1, [Validators.required, Validators.min(1)]],
      tipo: ['terapia', [Validators.required]],
      descuento: [0, [Validators.min(0), Validators.max(100)]]
    });

    // Listener para calcular precio final en tiempo real
    this.paqueteForm.valueChanges.subscribe(() => {
      this.calcularPrecioFinal();
    });
  }

  private verificarModoEdicion(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion = true;
      this.paqueteId = parseInt(id);
      this.cargarPaquete();
    }
  }

  // ================================
  // CARGA DE DATOS
  // ================================

  private async cargarPaquete(): Promise<void> {
    if (!this.paqueteId) return;

    this.cargando = true;
    this.error = null;

    try {
      const paquete = await this.paquetesService.obtenerPaquetePorId(this.paqueteId);
      
      if (paquete) {
        this.paqueteForm.patchValue({
          nombre: paquete.nombre,
          descripcion: paquete.descripcion || '',
          precio: paquete.precio,
          cantidad_sesiones: paquete.cantidad_sesiones,
          tipo: paquete.tipo,
          descuento: paquete.descuento
        });
      } else {
        this.error = 'Paquete no encontrado';
      }
    } catch (error) {
      console.error('Error cargando paquete:', error);
      this.error = 'Error al cargar el paquete';
    } finally {
      this.cargando = false;
    }
  }

  // ================================
  // ACCIONES DEL FORMULARIO
  // ================================

  async onSubmit(): Promise<void> {
    if (this.paqueteForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.guardando = true;
    this.error = null;

    try {
      const formData: PaqueteFormData = this.paqueteForm.value;
      let response;

      if (this.esEdicion && this.paqueteId) {
        response = await this.paquetesService.actualizarPaquete(this.paqueteId, formData);
      } else {
        response = await this.paquetesService.crearPaquete(formData);
      }

      if (response.success) {
        this.mostrarMensajeExito(response.message);
        this.router.navigate(['/paquetes']);
      } else {
        this.error = response.message;
      }
    } catch (error) {
      console.error('Error guardando paquete:', error);
      this.error = 'Error al guardar el paquete';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/paquetes']);
  }

  // ================================
  // VALIDACIONES Y UTILIDADES
  // ================================

  private marcarCamposComoTocados(): void {
    Object.keys(this.paqueteForm.controls).forEach(key => {
      this.paqueteForm.get(key)?.markAsTouched();
    });
  }

  esInvalido(campo: string): boolean {
    const control = this.paqueteForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.paqueteForm.get(campo);
    if (!control || !control.errors) return '';

    const errores = control.errors;

    if (errores['required']) return `${this.obtenerNombreCampo(campo)} es obligatorio`;
    if (errores['maxlength']) return `${this.obtenerNombreCampo(campo)} no puede exceder ${errores['maxlength'].requiredLength} caracteres`;
    if (errores['min']) return `${this.obtenerNombreCampo(campo)} debe ser mayor a ${errores['min'].min}`;
    if (errores['max']) return `${this.obtenerNombreCampo(campo)} debe ser menor a ${errores['max'].max}`;

    return 'Campo inválido';
  }

  private obtenerNombreCampo(campo: string): string {
    const nombres: { [key: string]: string } = {
      'nombre': 'El nombre',
      'precio': 'El precio',
      'cantidad_sesiones': 'La cantidad de sesiones',
      'tipo': 'El tipo',
      'descuento': 'El descuento'
    };
    return nombres[campo] || 'El campo';
  }

  // ================================
  // CÁLCULOS
  // ================================

  calcularPrecioFinal(): number {
    const precio = this.paqueteForm.get('precio')?.value || 0;
    const descuento = this.paqueteForm.get('descuento')?.value || 0;
    return this.paquetesService.calcularPrecioFinal(precio, descuento);
  }

  formatearPrecio(precio: number): string {
    return this.paquetesService.formatearPrecio(precio);
  }

  // ================================
  // GETTERS PARA EL TEMPLATE
  // ================================

  get nombreControl() { return this.paqueteForm.get('nombre'); }
  get descripcionControl() { return this.paqueteForm.get('descripcion'); }
  get precioControl() { return this.paqueteForm.get('precio'); }
  get cantidadSesionesControl() { return this.paqueteForm.get('cantidad_sesiones'); }
  get tipoControl() { return this.paqueteForm.get('tipo'); }
  get descuentoControl() { return this.paqueteForm.get('descuento'); }

  get precioFinalCalculado(): number {
    return this.calcularPrecioFinal();
  }

  get hayDescuento(): boolean {
    return (this.descuentoControl?.value || 0) > 0;
  }

  private mostrarMensajeExito(mensaje: string): void {
    // Implementar notificación de éxito
    console.log('Éxito:', mensaje);
  }
}