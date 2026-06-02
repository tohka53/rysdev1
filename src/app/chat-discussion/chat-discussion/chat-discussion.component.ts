import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { ChatDiscussionService, Usuario, Paquete, TemaDiscusion, MensajeChat } from '../../services/chat-discussion.service';

interface NuevoTema {
  titulo: string;
  descripcion: string;
  tipo: 'terapia' | 'rutina' | '';
  paqueteId: number | null;
}

@Component({
  selector: 'app-chat-discussion',
  standalone: false,
  templateUrl: './chat-discussion.component.html',
  styleUrls: ['./chat-discussion.component.css']
})
export class ChatDiscussionComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('mensajesContainer') mensajesContainer!: ElementRef;

  // Estado del usuario actual
  usuarioActual!: Usuario;
  isAdmin: boolean = false;
  permisoCrearTema: { puede: boolean, razon: string } = { puede: false, razon: '' };

  // Estado de la aplicación
  temasDiscusion: TemaDiscusion[] = [];
  temaSeleccionado: TemaDiscusion | null = null;
  mensajesChat: MensajeChat[] = [];
  paquetesDisponibles: Paquete[] = [];
  estadisticasChat: any = {};

  // Estados de carga y debug
  isLoading: boolean = true;
  errorMessage: string = '';
  debugInfo: string = '';

  // Formularios y controles
  mostrarFormularioTema: boolean = false;
  nuevoTema: NuevoTema = {
    titulo: '',
    descripcion: '',
    tipo: '',
    paqueteId: null
  };
  nuevoMensaje: string = '';

  // Subscripciones
  private subscripciones: Subscription = new Subscription();
  private shouldScrollToBottom: boolean = false;

  constructor(private chatService: ChatDiscussionService) {}

  ngOnInit(): void {
    console.log('🚀 Inicializando ChatDiscussionComponent...');
    this.inicializarComponente();
  }

  ngOnDestroy(): void {
    this.subscripciones.unsubscribe();
    this.chatService.limpiarEstado();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // === MÉTODOS DE INICIALIZACIÓN ===

  private async inicializarComponente(): Promise<void> {
    try {
      this.debugInfo = 'Inicializando...';
      this.isLoading = true;

      this.debugInfo = 'Obteniendo usuario actual...';
      this.usuarioActual = this.chatService.obtenerUsuarioActual();
      this.isAdmin = this.chatService.esAdmin();
      
      this.permisoCrearTema = await this.chatService.verificarPermisoCrearTema();
      
      console.log('👤 Usuario actual:', this.usuarioActual);
      console.log('🔑 Es admin:', this.isAdmin);
      console.log('📝 Permiso crear tema:', this.permisoCrearTema);

      this.debugInfo = 'Verificando conexión...';
      await this.ejecutarDebug();

      this.debugInfo = 'Cargando datos...';
      await this.cargarDatosIniciales();

      this.debugInfo = 'Cargando estadísticas...';
      await this.cargarEstadisticas();

      this.debugInfo = '';
      this.isLoading = false;
      console.log('✅ Componente inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando componente:', error);
      this.errorMessage = `Error de inicialización: ${error}`;
      this.isLoading = false;
    }
  }

  private async ejecutarDebug(): Promise<void> {
    try {
      console.log('🔧 Ejecutando debug del servicio...');
      await (this.chatService as any).debugConexion();
    } catch (error) {
      console.error('❌ Error en debug:', error);
    }
  }

  private async cargarDatosIniciales(): Promise<void> {
    try {
      console.log('📦 Cargando paquetes...');
      this.cargarPaquetes();

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('📋 Cargando temas...');
      this.cargarTemas();

      this.suscribirANotificaciones();

      console.log('✅ Datos iniciales cargados');

    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
      this.errorMessage = `Error cargando datos: ${error}`;
    }
  }

  private async cargarEstadisticas(): Promise<void> {
    try {
      this.estadisticasChat = await this.chatService.obtenerEstadisticasChat();
      console.log('📊 Estadísticas cargadas:', this.estadisticasChat);
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    }
  }

  private cargarPaquetes(): void {
    const paquetesSub = this.chatService.obtenerPaquetes().subscribe({
      next: (paquetes) => {
        console.log('📦 Paquetes recibidos:', paquetes.length);
        this.paquetesDisponibles = paquetes;
      },
      error: (error) => {
        console.error('❌ Error cargando paquetes:', error);
        this.errorMessage = 'Error cargando paquetes';
      }
    });
    this.subscripciones.add(paquetesSub);
  }

  private cargarTemas(): void {
    const temasSub = this.chatService.obtenerTemas().subscribe({
      next: (temas) => {
        console.log('📋 Temas recibidos:', temas.length, temas);
        this.temasDiscusion = temas;
        
        if (temas.length === 0 && this.permisoCrearTema.puede) {
          this.debugInfo = 'No hay temas. Puedes crear el primero como ' + this.usuarioActual.rol;
        } else if (temas.length === 0) {
          this.debugInfo = 'No hay temas disponibles aún.';
        }
      },
      error: (error) => {
        console.error('❌ Error cargando temas:', error);
        this.errorMessage = 'Error cargando temas de discusión';
      }
    });
    this.subscripciones.add(temasSub);
  }

  private suscribirANotificaciones(): void {
    const notifSub = this.chatService.notificaciones$.subscribe({
      next: (mensaje) => {
        console.log('📢 Notificación:', mensaje);
        this.mostrarNotificacion(mensaje);
      },
      error: (error) => {
        console.error('❌ Error en notificaciones:', error);
      }
    });
    this.subscripciones.add(notifSub);
  }

  private mostrarNotificacion(mensaje: string): void {
    this.debugInfo = `✅ ${mensaje}`;
    setTimeout(() => {
      if (this.debugInfo.includes(mensaje)) {
        this.debugInfo = '';
      }
    }, 3000);
  }

  // === MÉTODOS PARA GESTIÓN DE TEMAS ===

  seleccionarTema(tema: TemaDiscusion): void {
    console.log('🎯 Seleccionando tema:', tema.titulo);
    this.temaSeleccionado = tema;
    this.cargarMensajes(tema.id);
    this.chatService.marcarMensajesComoLeidos(tema.id);
  }

  private cargarMensajes(temaId: number): void {
    console.log(`📨 Cargando mensajes para tema ${temaId}`);
    
    const mensajesSub = this.chatService.obtenerMensajes(temaId).subscribe({
      next: (mensajes) => {
        console.log(`💬 Mensajes recibidos para tema ${temaId}:`, mensajes.length);
        this.mensajesChat = mensajes;
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('❌ Error cargando mensajes:', error);
        this.errorMessage = 'Error cargando mensajes';
      }
    });
    this.subscripciones.add(mensajesSub);
  }

  async crearTema(): Promise<void> {
    if (!this.permisoCrearTema.puede) {
      this.errorMessage = this.permisoCrearTema.razon;
      return;
    }

    if (!this.formularioValido()) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    try {
      console.log('📝 Creando nuevo tema:', this.nuevoTema);
      this.isLoading = true;

      const crearSub = this.chatService.crearTema({
        titulo: this.nuevoTema.titulo,
        descripcion: this.nuevoTema.descripcion,
        tipo: this.nuevoTema.tipo as 'terapia' | 'rutina',
        paqueteId: this.nuevoTema.paqueteId!
      }).subscribe({
        next: (nuevoTema) => {
          console.log('✅ Tema creado exitosamente:', nuevoTema);
          this.cancelarCreacion();
          this.seleccionarTema(nuevoTema);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error creando tema:', error);
          this.errorMessage = `Error creando tema: ${error.message}`;
          this.isLoading = false;
        }
      });
      this.subscripciones.add(crearSub);

    } catch (error) {
      console.error('❌ Error en crearTema:', error);
      this.errorMessage = `Error: ${error}`;
      this.isLoading = false;
    }
  }

  formularioValido(): boolean {
    return !!(
      this.nuevoTema.titulo.trim() &&
      this.nuevoTema.descripcion.trim() &&
      this.nuevoTema.tipo &&
      this.nuevoTema.paqueteId
    );
  }

  cancelarCreacion(): void {
    this.mostrarFormularioTema = false;
    this.nuevoTema = {
      titulo: '',
      descripcion: '',
      tipo: '',
      paqueteId: null
    };
    this.errorMessage = '';
  }

  toggleEstadoTema(): void {
    if (!this.temaSeleccionado) return;

    const nuevoEstado = this.temaSeleccionado.estado === 'activo' ? 'cerrado' : 'activo';
    console.log(`🔄 Cambiando estado de tema a: ${nuevoEstado}`);
    
    const toggleSub = this.chatService.actualizarEstadoTema(this.temaSeleccionado.id, nuevoEstado).subscribe({
      next: (exito) => {
        if (exito && this.temaSeleccionado) {
          this.temaSeleccionado.estado = nuevoEstado;
          console.log('✅ Estado actualizado correctamente');
        }
      },
      error: (error) => {
        console.error('❌ Error actualizando estado:', error);
        this.errorMessage = 'Error actualizando estado del tema';
      }
    });
    this.subscripciones.add(toggleSub);
  }

  // === MÉTODOS PARA GESTIÓN DE MENSAJES ===

  enviarMensaje(event?: Event): void {
    if (event && event instanceof KeyboardEvent && !event.ctrlKey) {
      event.preventDefault();
      return;
    }

    if (!this.nuevoMensaje.trim() || !this.temaSeleccionado) {
      console.log('⚠️ No se puede enviar mensaje vacío o sin tema seleccionado');
      return;
    }

    console.log('📤 Enviando mensaje:', this.nuevoMensaje.substring(0, 50) + '...');

    const enviarSub = this.chatService.enviarMensaje(
      this.temaSeleccionado.id, 
      this.nuevoMensaje.trim()
    ).subscribe({
      next: (nuevoMensaje) => {
        console.log('✅ Mensaje enviado exitosamente:', nuevoMensaje);
        this.nuevoMensaje = '';
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('❌ Error enviando mensaje:', error);
        this.errorMessage = `Error enviando mensaje: ${error.message}`;
      }
    });
    this.subscripciones.add(enviarSub);
  }

  // === MÉTODOS AUXILIARES Y UI ===

  private scrollToBottom(): void {
    try {
      const element = this.mensajesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.log('Error al hacer scroll:', err);
    }
  }

  trackByMensaje(index: number, mensaje: MensajeChat): number {
    return mensaje.id;
  }

  trackByTema(index: number, tema: TemaDiscusion): number {
    return tema.id;
  }

  trackByPaquete(index: number, paquete: Paquete): number {
    return paquete.id;
  }

  get paquetesFiltrados(): Paquete[] {
    if (!this.nuevoTema.tipo) return [];
    return this.paquetesDisponibles.filter(p => p.tipo === this.nuevoTema.tipo);
  }

  obtenerIniciales(nombre: string): string {
    return nombre.split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatearFecha(fecha: Date): string {
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `${minutos}m`;
    if (horas < 24) return `${horas}h`;
    if (dias < 7) return `${dias}d`;
    
    return fecha.toLocaleDateString();
  }

  obtenerColorTipo(tipo: 'terapia' | 'rutina'): string {
    return tipo === 'terapia' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';
  }

  obtenerEstadoVisual(estado: 'activo' | 'cerrado'): { color: string, icono: string } {
    return estado === 'activo' 
      ? { color: 'text-green-600', icono: '🟢' }
      : { color: 'text-red-600', icono: '🔴' };
  }

  obtenerColorRol(usuario: Usuario): string {
    switch (usuario.id_perfil) {
      case 1: return 'bg-red-100 text-red-700';
      case 2: return 'bg-blue-100 text-blue-700';
      case 3: return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  obtenerIconoRol(usuario: Usuario): string {
    switch (usuario.id_perfil) {
      case 1: return '👑';
      case 2: return '👤';
      case 3: return '🩺';
      default: return '❓';
    }
  }

  onTemaTyping(): void {
    if (this.nuevoTema.tipo) {
      console.log('🔄 Tipo de tema cambiado a:', this.nuevoTema.tipo);
    }
  }

  contarMensajesDelTema(temaId: number): number {
    return this.mensajesChat.filter(m => m.temaId === temaId).length;
  }

  hayMensajesNoLeidos(): boolean {
    return this.temasDiscusion.some(tema => tema.mensajesNoLeidos > 0);
  }

  totalMensajesNoLeidos(): number {
    return this.temasDiscusion.reduce((total, tema) => total + tema.mensajesNoLeidos, 0);
  }

  // === MÉTODOS DE DEBUG ===

  async recargarDatos(): Promise<void> {
    console.log('🔄 Recargando datos manualmente...');
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      await this.chatService.refrescarUsuarioActual();
      this.usuarioActual = this.chatService.obtenerUsuarioActual();
      this.isAdmin = this.chatService.esAdmin();
      this.permisoCrearTema = await this.chatService.verificarPermisoCrearTema();

      await this.cargarDatosIniciales();
      await this.cargarEstadisticas();
      this.debugInfo = '✅ Datos recargados exitosamente';
      setTimeout(() => this.debugInfo = '', 3000);
    } catch (error) {
      this.errorMessage = `Error recargando: ${error}`;
    }
    
    this.isLoading = false;
  }

  async ejecutarDebugManual(): Promise<void> {
    console.log('🔧 Ejecutando debug manual...');
    await this.ejecutarDebug();
    this.debugInfo = '✅ Debug ejecutado - revisa la consola';
    setTimeout(() => this.debugInfo = '', 3000);
  }

  limpiarErrores(): void {
    this.errorMessage = '';
    this.debugInfo = '';
  }

  // === MÉTODOS PARA MOSTRAR INFORMACIÓN DE USUARIO ===

  mostrarInfoCompleta(): boolean {
    return !!(this.usuarioActual && this.usuarioActual.nombre && this.usuarioActual.nombre !== 'Usuario Sin Nombre');
  }

  obtenerTextoRol(): string {
    if (!this.usuarioActual) return 'Sin rol';
    
    const rol = this.usuarioActual.rol;
    const icono = this.obtenerIconoRol(this.usuarioActual);
    
    return `${icono} ${rol}`;
  }

  obtenerDescripcionUsuario(): string {
    if (!this.usuarioActual) return 'Usuario no identificado';
    
    let descripcion = this.usuarioActual.nombre;
    
    if (this.usuarioActual.username && this.usuarioActual.username !== this.usuarioActual.nombre) {
      descripcion += ` (@${this.usuarioActual.username})`;
    }
    
    return descripcion;
  }

  // === MÉTODOS PARA ESTADÍSTICAS ===

  obtenerResumenEstadisticas(): string {
    if (!this.estadisticasChat || Object.keys(this.estadisticasChat).length === 0) {
      return 'Estadísticas no disponibles';
    }

    const stats = this.estadisticasChat;
    return `${stats.total_temas || 0} temas • ${stats.total_mensajes || 0} mensajes • ${stats.total_usuarios || 0} usuarios`;
  }

  mostrarEstadisticasDetalladas(): boolean {
    return !!(this.isAdmin && this.estadisticasChat && Object.keys(this.estadisticasChat).length > 0);
  }

  // === MÉTODOS PARA VALIDACIONES DE PERMISOS ===

  puedeCrearTemas(): boolean {
    return this.permisoCrearTema.puede;
  }

  puedeModificarEstado(): boolean {
    return this.isAdmin;
  }

  obtenerMensajePermisos(): string {
    if (this.permisoCrearTema.puede) {
      return `Tienes permisos para crear discusiones como ${this.usuarioActual?.rol}`;
    }
    return this.permisoCrearTema.razon;
  }

  // === MÉTODOS PARA MEJORAR UX ===

  obtenerClaseUsuario(mensaje: MensajeChat): string {
    const baseClass = 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium';
    return `${baseClass} ${this.obtenerColorRol(mensaje.usuario)}`;
  }

  mostrarDetallesMensaje(mensaje: MensajeChat): string {
    let detalles = `Enviado por ${mensaje.usuario.nombre}`;
    
    if (mensaje.usuario.rol) {
      detalles += ` (${mensaje.usuario.rol})`;
    }
    
    if (mensaje.editado) {
      detalles += ' • Editado';
    }
    
    detalles += ` • ${this.formatearFecha(mensaje.fechaEnvio)}`;
    
    return detalles;
  }

  obtenerPlaceholderMensaje(): string {
    if (!this.usuarioActual) return 'Escribe tu mensaje...';
    
    return `Escribe tu mensaje como ${this.usuarioActual.nombre}... (Ctrl + Enter para enviar)`;
  }

  // === MÉTODOS PARA TEMAS CON INFORMACIÓN DE ADMIN ===

  obtenerInfoCreador(tema: TemaDiscusion): string {
    let info = `Creado por ${tema.adminNombre || 'Administrador'}`;
    info += ` • ${this.formatearFecha(tema.fechaCreacion)}`;
    return info;
  }

  // === MÉTODO PARA DEBUGGING EN TEMPLATE ===

  logUsuarioActual(): void {
    console.log('🔍 Usuario actual para debugging:', {
      usuario: this.usuarioActual,
      esAdmin: this.isAdmin,
      permisos: this.permisoCrearTema,
      temas: this.temasDiscusion.length,
      paquetes: this.paquetesDisponibles.length
    });
  }
}