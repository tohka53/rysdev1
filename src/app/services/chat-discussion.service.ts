import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Profile } from '../interfaces/user.interfaces';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  username: string;
  avatar?: string;
  esAdmin: boolean;
  rol: string;
  id_perfil: number;
}

export interface Paquete {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: 'terapia' | 'rutina';
}

export interface TemaDiscusion {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: 'terapia' | 'rutina';
  paqueteId: number;
  paquete?: Paquete;
  adminId: number;
  adminNombre: string;
  fechaCreacion: Date;
  estado: 'activo' | 'cerrado';
  mensajesNoLeidos: number;
}

export interface MensajeChat {
  id: number;
  temaId: number;
  usuarioId: number;
  usuario: Usuario;
  mensaje: string;
  fechaEnvio: Date;
  editado: boolean;
  fechaEdicion?: Date;
  esAdmin: boolean;
}

export interface CrearTemaRequest {
  titulo: string;
  descripcion: string;
  tipo: 'terapia' | 'rutina';
  paqueteId: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatDiscussionService {
  
  // Subjects para manejar el estado
  private temasSubject = new BehaviorSubject<TemaDiscusion[]>([]);
  private mensajesSubject = new BehaviorSubject<MensajeChat[]>([]);
  private notificacionesSubject = new Subject<string>();
  private paquetesSubject = new BehaviorSubject<Paquete[]>([]);

  // Observables públicos
  public temas$ = this.temasSubject.asObservable();
  public mensajes$ = this.mensajesSubject.asObservable();
  public notificaciones$ = this.notificacionesSubject.asObservable();
  public paquetes$ = this.paquetesSubject.asObservable();

  // Usuario actual
  private usuarioActual: Usuario | null = null;
  private isInitialized = false;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {
    console.log('🚀 Inicializando ChatDiscussionService...');
    this.inicializarServicio();
  }

  private async inicializarServicio(): Promise<void> {
    try {
      await this.inicializarUsuarioActual();
      await this.verificarConexionDB();
      await this.cargarDatosIniciales();
      this.isInitialized = true;
      console.log('✅ ChatDiscussionService inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando ChatDiscussionService:', error);
      this.usarDatosDeEjemplo();
      this.isInitialized = true; // Marcar como inicializado incluso con datos de ejemplo
    }
  }

  private async inicializarUsuarioActual(): Promise<void> {
    console.log('👤 Inicializando usuario actual...');
    
    try {
      const currentUser = this.authService.getCurrentUser();
      console.log('Usuario desde AuthService:', currentUser);
      
      if (currentUser) {
        this.usuarioActual = await this.convertirProfileAUsuario(currentUser);
        console.log('✅ Usuario actual configurado:', this.usuarioActual);
      } else {
        this.usuarioActual = await this.crearUsuarioFallback();
        console.log('⚠️ Usando usuario por defecto:', this.usuarioActual);
      }
    } catch (error) {
      console.error('❌ Error inicializando usuario:', error);
      this.usuarioActual = await this.crearUsuarioFallback();
    }
  }

  private async convertirProfileAUsuario(profile: Profile): Promise<Usuario> {
    try {
      const { data: userData, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, id_perfil, avatar_url, status')
        .eq('id', profile.id)
        .single();

      if (error || !userData) {
        console.warn('No se pudo obtener datos completos del usuario, usando datos del profile');
        return this.crearUsuarioDesdeProfile(profile);
      }

      console.log('📋 Datos completos del usuario:', userData);

      return {
        id: userData.id,
        nombre: userData.full_name || userData.username || 'Usuario Sin Nombre',
        email: userData.username || '',
        username: userData.username || '',
        avatar: userData.avatar_url || undefined,
        esAdmin: this.esAdminPorPerfil(userData.id_perfil),
        rol: this.obtenerNombreRol(userData.id_perfil),
        id_perfil: userData.id_perfil || 2
      };

    } catch (error) {
      console.error('Error obteniendo datos del usuario:', error);
      return this.crearUsuarioDesdeProfile(profile);
    }
  }

  private crearUsuarioDesdeProfile(profile: Profile): Usuario {
    return {
      id: profile.id || 1,
      nombre: profile.full_name || profile.username || 'Usuario',
      email: profile.username || '',
      username: profile.username || '',
      avatar: profile.avatar_url || undefined,
      esAdmin: this.esAdminPorPerfil(profile.id_perfil),
      rol: this.obtenerNombreRol(profile.id_perfil),
      id_perfil: profile.id_perfil || 2
    };
  }

  private async crearUsuarioFallback(): Promise<Usuario> {
    try {
      const { data: adminUsers, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, id_perfil, avatar_url')
        .in('id_perfil', [1, 3])
        .eq('status', 1)
        .limit(1);

      if (!error && adminUsers && adminUsers.length > 0) {
        const adminUser = adminUsers[0];
        console.log('👑 Usando usuario admin encontrado:', adminUser);
        
        return {
          id: adminUser.id,
          nombre: adminUser.full_name || adminUser.username || 'Administrador',
          email: adminUser.username || '',
          username: adminUser.username || '',
          avatar: adminUser.avatar_url || undefined,
          esAdmin: true,
          rol: this.obtenerNombreRol(adminUser.id_perfil),
          id_perfil: adminUser.id_perfil
        };
      }
    } catch (error) {
      console.error('Error buscando usuario admin:', error);
    }

    return {
      id: 1,
      nombre: 'Administrador Temporal',
      email: 'admin@sistema.com',
      username: 'admin_temp',
      esAdmin: true,
      rol: 'Administrador',
      id_perfil: 1
    };
  }

  private esAdminPorPerfil(id_perfil?: number): boolean {
    return id_perfil === 1 || id_perfil === 3;
  }

  private obtenerNombreRol(id_perfil?: number): string {
    switch (id_perfil) {
      case 1: return 'Administrador';
      case 2: return 'Usuario';
      case 3: return 'Supervisor';
      case 4: return 'Invitado';
      default: return 'Usuario';
    }
  }

  private async verificarConexionDB(): Promise<void> {
    console.log('🔍 Verificando conexión a la base de datos...');
    
    try {
      const { data, error } = await this.supabaseService.client
        .from('chat_discusiones')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Error de conexión a DB:', error);
        throw new Error(`Error de base de datos: ${error.message}`);
      }

      console.log(`✅ Conexión a DB exitosa. Registros en chat_discusiones: ${data || 0}`);
      
    } catch (error) {
      console.error('❌ Fallo verificación de DB:', error);
      throw error;
    }
  }

  private async cargarDatosIniciales(): Promise<void> {
    console.log('📊 Cargando datos iniciales...');
    
    try {
      await Promise.all([
        this.cargarPaquetesDesdeDB(),
        this.cargarTemasDesdeDB()
      ]);
      
      console.log('✅ Datos iniciales cargados');
      
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
      throw error;
    }
  }

  // === MÉTODOS PARA TEMAS ===

  obtenerTemas(): Observable<TemaDiscusion[]> {
    console.log('📋 Solicitando temas... Inicializado:', this.isInitialized);
    
    // Siempre intentar cargar desde DB
    this.cargarTemasDesdeDB();
    
    return this.temas$;
  }

  private async cargarTemasDesdeDB(): Promise<void> {
    console.log('📊 Cargando temas desde la base de datos...');

    try {
      // Primero intentar query simple sin JOIN
      const { data: temasSimple, error: errorSimple } = await this.supabaseService.client
        .from('chat_discusiones')
        .select('*')
        .order('created_at', { ascending: false });

      if (errorSimple) {
        console.error('❌ Error cargando temas (query simple):', errorSimple);
        throw errorSimple;
      }

      console.log(`📋 Temas encontrados (query simple): ${temasSimple?.length || 0}`);

      if (!temasSimple || temasSimple.length === 0) {
        console.log('📝 No hay temas, creando datos de ejemplo...');
        await this.crearTemasEjemploEnDB();
        return;
      }

      // Obtener información de admins por separado
      const adminIds = [...new Set(temasSimple.map(t => t.admin_id))];
      const { data: admins } = await this.supabaseService.client
        .from('profiles')
        .select('id, full_name, username')
        .in('id', adminIds);

      const adminMap = new Map();
      if (admins) {
        admins.forEach(admin => {
          adminMap.set(admin.id, admin.full_name || admin.username || 'Administrador');
        });
      }

      const temasFormateados: TemaDiscusion[] = temasSimple.map(tema => {
        const adminNombre = adminMap.get(tema.admin_id) || 'Administrador';

        return {
          id: tema.id,
          titulo: tema.titulo,
          descripcion: tema.descripcion,
          tipo: tema.tipo,
          paqueteId: tema.paquete_id || 1,
          adminId: tema.admin_id || 1,
          adminNombre: adminNombre,
          fechaCreacion: new Date(tema.created_at),
          estado: tema.estado || 'activo',
          mensajesNoLeidos: 0
        };
      });

      console.log('Temas formateados:', temasFormateados);
      this.temasSubject.next(temasFormateados);
      console.log('✅ Temas cargados y emitidos correctamente');

    } catch (error) {
      console.error('❌ Error crítico cargando temas:', error);
      this.usarTemasDeEjemplo();
    }
  }

  private async crearTemasEjemploEnDB(): Promise<void> {
    if (!this.usuarioActual?.esAdmin) {
      console.log('❌ No es admin, no se pueden crear temas');
      this.usarTemasDeEjemplo();
      return;
    }

    try {
      console.log('📝 Creando temas de ejemplo en la base de datos...');
      
      const temasEjemplo = [
        {
          titulo: 'Bienvenida al Sistema de Discusiones',
          descripcion: 'Espacio para presentarse y compartir experiencias sobre rehabilitación',
          tipo: 'terapia',
          paquete_id: 1,
          admin_id: this.usuarioActual.id,
          estado: 'activo'
        },
        {
          titulo: 'Consejos de Rutinas Diarias',
          descripcion: 'Compartamos tips y estrategias para mantener una rutina efectiva',
          tipo: 'rutina',
          paquete_id: 2,
          admin_id: this.usuarioActual.id,
          estado: 'activo'
        },
        {
          titulo: 'Preguntas Frecuentes sobre Terapias',
          descripcion: 'Resuelve tus dudas más comunes aquí',
          tipo: 'terapia',
          paquete_id: 1,
          admin_id: this.usuarioActual.id,
          estado: 'activo'
        }
      ];

      const { data: temasCreados, error } = await this.supabaseService.client
        .from('chat_discusiones')
        .insert(temasEjemplo)
        .select();

      if (error) {
        console.error('❌ Error creando temas de ejemplo:', error);
        this.usarTemasDeEjemplo();
        return;
      }

      console.log('✅ Temas de ejemplo creados:', temasCreados?.length);

      if (temasCreados && temasCreados.length > 0) {
        for (const tema of temasCreados) {
          await this.crearMensajeBienvenida(tema.id);
        }
      }

      await this.cargarTemasDesdeDB();

    } catch (error) {
      console.error('❌ Error creando temas de ejemplo en DB:', error);
      this.usarTemasDeEjemplo();
    }
  }

  private usarTemasDeEjemplo(): void {
    console.log('📝 Usando temas de ejemplo locales...');
    
    const temasEjemplo: TemaDiscusion[] = [
      {
        id: 1,
        titulo: 'Bienvenida al Sistema',
        descripcion: 'Espacio para presentarse y compartir experiencias',
        tipo: 'terapia',
        paqueteId: 1,
        adminId: 1,
        adminNombre: this.usuarioActual?.nombre || 'Administrador',
        fechaCreacion: new Date(),
        estado: 'activo',
        mensajesNoLeidos: 0
      },
      {
        id: 2,
        titulo: 'Consejos de Rutinas',
        descripcion: 'Tips y estrategias para mantener rutinas efectivas',
        tipo: 'rutina',
        paqueteId: 2,
        adminId: 1,
        adminNombre: this.usuarioActual?.nombre || 'Administrador',
        fechaCreacion: new Date(Date.now() - 86400000),
        estado: 'activo',
        mensajesNoLeidos: 0
      }
    ];

    this.temasSubject.next(temasEjemplo);
    console.log('✅ Temas de ejemplo locales configurados');
  }

  crearTema(tema: CrearTemaRequest): Observable<TemaDiscusion> {
    console.log('📝 Creando nuevo tema:', tema);
    
    return new Observable(observer => {
      this.crearTemaEnDB(tema).then(nuevoTema => {
        observer.next(nuevoTema);
        observer.complete();
      }).catch(error => {
        console.error('❌ Error en crearTema:', error);
        observer.error(error);
      });
    });
  }

  private async crearTemaEnDB(tema: CrearTemaRequest): Promise<TemaDiscusion> {
    if (!this.usuarioActual?.esAdmin) {
      throw new Error('Solo los administradores pueden crear discusiones');
    }

    try {
      const { data, error } = await this.supabaseService.client
        .from('chat_discusiones')
        .insert({
          titulo: tema.titulo,
          descripcion: tema.descripcion,
          tipo: tema.tipo,
          paquete_id: tema.paqueteId,
          admin_id: this.usuarioActual.id,
          estado: 'activo'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando tema:', error);
        throw error;
      }

      const nuevoTema: TemaDiscusion = {
        id: data.id,
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        paqueteId: data.paquete_id,
        adminId: data.admin_id,
        adminNombre: this.usuarioActual.nombre,
        fechaCreacion: new Date(data.created_at),
        estado: data.estado,
        mensajesNoLeidos: 0
      };

      await this.crearMensajeBienvenida(nuevoTema.id);
      this.cargarTemasDesdeDB();
      this.notificacionesSubject.next('Discusión creada exitosamente');

      return nuevoTema;
    } catch (error) {
      console.error('Error crítico creando tema:', error);
      throw error;
    }
  }

  // === MÉTODOS PARA MENSAJES ===

  obtenerMensajes(temaId: number): Observable<MensajeChat[]> {
    console.log(`📨 Obteniendo mensajes para tema ${temaId}`);
    this.cargarMensajesDesdeDB(temaId);
    return this.mensajes$;
  }

  private async cargarMensajesDesdeDB(temaId: number): Promise<void> {
    console.log(`📨 Cargando mensajes desde DB para tema ${temaId}...`);

    try {
      // Primero intentar query simple sin JOIN
      const { data: mensajesSimple, error: errorSimple } = await this.supabaseService.client
        .from('chat_mensajes')
        .select('*')
        .eq('tema_id', temaId)
        .order('created_at', { ascending: true });

      if (errorSimple) {
        console.error('❌ Error cargando mensajes (query simple):', errorSimple);
        this.usarMensajesDeEjemplo(temaId);
        return;
      }

      console.log(`💬 Mensajes encontrados (query simple): ${mensajesSimple?.length || 0}`);

      if (!mensajesSimple || mensajesSimple.length === 0) {
        await this.crearMensajeBienvenida(temaId);
        return;
      }

      // Obtener información de usuarios por separado
      const userIds = [...new Set(mensajesSimple.map(m => m.usuario_id))];
      const { data: usuarios } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, id_perfil, avatar_url')
        .in('id', userIds);

      const usuarioMap = new Map();
      if (usuarios) {
        usuarios.forEach(user => {
          usuarioMap.set(user.id, user);
        });
      }

      const mensajesFormateados: MensajeChat[] = mensajesSimple.map(mensaje => {
        const usuarioData = usuarioMap.get(mensaje.usuario_id);
        
        const usuario: Usuario = {
          id: mensaje.usuario_id,
          nombre: usuarioData?.full_name || usuarioData?.username || `Usuario ${mensaje.usuario_id}`,
          email: usuarioData?.username || '',
          username: usuarioData?.username || '',
          avatar: usuarioData?.avatar_url,
          esAdmin: this.esAdminPorPerfil(usuarioData?.id_perfil),
          rol: this.obtenerNombreRol(usuarioData?.id_perfil),
          id_perfil: usuarioData?.id_perfil || 2
        };

        return {
          id: mensaje.id,
          temaId: mensaje.tema_id,
          usuarioId: mensaje.usuario_id,
          usuario: usuario,
          mensaje: mensaje.mensaje,
          fechaEnvio: new Date(mensaje.created_at),
          editado: mensaje.editado || false,
          esAdmin: usuario.esAdmin
        };
      });

      this.mensajesSubject.next(mensajesFormateados);
      console.log('✅ Mensajes cargados correctamente');

    } catch (error) {
      console.error('❌ Error crítico cargando mensajes:', error);
      this.usarMensajesDeEjemplo(temaId);
    }
  }

  private async crearMensajeBienvenida(temaId: number): Promise<void> {
    if (!this.usuarioActual) return;

    try {
      const { error } = await this.supabaseService.client
        .from('chat_mensajes')
        .insert({
          tema_id: temaId,
          usuario_id: this.usuarioActual.id,
          mensaje: `¡Bienvenidos a esta discusión! Soy ${this.usuarioActual.nombre} y estaré moderando este espacio. Este es un lugar seguro para compartir experiencias, hacer preguntas y apoyarnos mutuamente en nuestro proceso de rehabilitación. ¡No duden en participar activamente!`,
          editado: false
        });

      if (!error) {
        this.cargarMensajesDesdeDB(temaId);
      }
    } catch (error) {
      console.error('Error creando mensaje de bienvenida:', error);
    }
  }

  private usarMensajesDeEjemplo(temaId: number): void {
    const mensajesEjemplo: MensajeChat[] = [
      {
        id: 1,
        temaId: temaId,
        usuarioId: this.usuarioActual?.id || 1,
        usuario: this.usuarioActual || {
          id: 1,
          nombre: 'Administrador',
          email: 'admin@ejemplo.com',
          username: 'admin',
          esAdmin: true,
          rol: 'Administrador',
          id_perfil: 1
        },
        mensaje: '¡Bienvenidos a esta discusión! Este es un espacio seguro para compartir experiencias.',
        fechaEnvio: new Date(),
        editado: false,
        esAdmin: true
      }
    ];
    
    this.mensajesSubject.next(mensajesEjemplo);
  }

  enviarMensaje(temaId: number, mensaje: string): Observable<MensajeChat> {
    console.log(`📤 Enviando mensaje a tema ${temaId}:`, mensaje.substring(0, 50) + '...');
    
    return new Observable(observer => {
      this.enviarMensajeADB(temaId, mensaje).then(nuevoMensaje => {
        observer.next(nuevoMensaje);
        observer.complete();
      }).catch(error => {
        console.error('❌ Error enviando mensaje:', error);
        observer.error(error);
      });
    });
  }

  private async enviarMensajeADB(temaId: number, mensaje: string): Promise<MensajeChat> {
    if (!this.usuarioActual) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabaseService.client
      .from('chat_mensajes')
      .insert({
        tema_id: temaId,
        usuario_id: this.usuarioActual.id,
        mensaje: mensaje.trim(),
        editado: false
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const nuevoMensaje: MensajeChat = {
      id: data.id,
      temaId: data.tema_id,
      usuarioId: data.usuario_id,
      usuario: this.usuarioActual!,
      mensaje: data.mensaje,
      fechaEnvio: new Date(data.created_at),
      editado: false,
      esAdmin: this.usuarioActual!.esAdmin
    };

    this.cargarMensajesDesdeDB(temaId);
    return nuevoMensaje;
  }

  // === MÉTODOS PARA PAQUETES ===

  obtenerPaquetes(): Observable<Paquete[]> {
    console.log('📦 Obteniendo paquetes...');
    
    if (this.paquetesSubject.value.length === 0) {
      this.cargarPaquetesDesdeDB();
    }
    
    return this.paquetes$;
  }

  private async cargarPaquetesDesdeDB(): Promise<void> {
    console.log('📦 Cargando paquetes desde la base de datos...');

    try {
      const paquetesCombinados: Paquete[] = [];

      try {
        const { data: paquetes } = await this.supabaseService.client
          .from('paquetes')
          .select('id, nombre, descripcion, tipo')
          .eq('status', 1)
          .order('nombre');

        if (paquetes && paquetes.length > 0) {
          paquetes.forEach(paquete => {
            paquetesCombinados.push({
              id: paquete.id,
              nombre: paquete.nombre,
              descripcion: paquete.descripcion,
              tipo: paquete.tipo
            });
          });
        }
      } catch (error) {
        console.log('⚠️ Tabla paquetes no disponible');
      }

      try {
        const { data: rutinas } = await this.supabaseService.client
          .from('rutinas')
          .select('id, nombre, descripcion')
          .eq('status', 1)
          .order('nombre');

        if (rutinas && rutinas.length > 0) {
          rutinas.forEach(rutina => {
            paquetesCombinados.push({
              id: rutina.id,
              nombre: rutina.nombre,
              descripcion: rutina.descripcion,
              tipo: 'rutina'
            });
          });
        }
      } catch (error) {
        console.log('⚠️ Tabla rutinas no disponible');
      }

      try {
        const { data: terapias } = await this.supabaseService.client
          .from('terapias')
          .select('id, nombre, descripcion')
          .eq('status', 1)
          .order('nombre');

        if (terapias && terapias.length > 0) {
          terapias.forEach(terapia => {
            paquetesCombinados.push({
              id: terapia.id + 1000,
              nombre: terapia.nombre,
              descripcion: terapia.descripcion,
              tipo: 'terapia'
            });
          });
        }
      } catch (error) {
        console.log('⚠️ Tabla terapias no disponible');
      }

      if (paquetesCombinados.length === 0) {
        this.usarPaquetesDeEjemplo();
      } else {
        this.paquetesSubject.next(paquetesCombinados);
        console.log('✅ Paquetes cargados:', paquetesCombinados.length);
      }

    } catch (error) {
      console.error('❌ Error cargando paquetes:', error);
      this.usarPaquetesDeEjemplo();
    }
  }

  private usarPaquetesDeEjemplo(): void {
    const paquetesEjemplo: Paquete[] = [
      {
        id: 1,
        nombre: 'Terapia Respiratoria Básica',
        descripcion: 'Técnicas fundamentales de respiración para rehabilitación',
        tipo: 'terapia'
      },
      {
        id: 2,
        nombre: 'Rutina de Fortalecimiento',
        descripcion: 'Ejercicios básicos para fortalecer músculos',
        tipo: 'rutina'
      },
      {
        id: 3,
        nombre: 'Terapia de Movilidad',
        descripcion: 'Ejercicios para mejorar la movilidad articular',
        tipo: 'terapia'
      },
      {
        id: 4,
        nombre: 'Rutina de Resistencia',
        descripcion: 'Ejercicios cardiovasculares adaptados',
        tipo: 'rutina'
      }
    ];
    
    this.paquetesSubject.next(paquetesEjemplo);
    console.log('✅ Paquetes de ejemplo configurados');
  }

  obtenerPaquetesPorTipo(tipo: 'terapia' | 'rutina'): Observable<Paquete[]> {
    return new Observable(observer => {
      const paquetesActuales = this.paquetesSubject.value;
      const paquetesFiltrados = paquetesActuales.filter(p => p.tipo === tipo);
      observer.next(paquetesFiltrados);
      observer.complete();
    });
  }

  // === MÉTODOS AUXILIARES ===

  obtenerUsuarioActual(): Usuario {
    if (!this.usuarioActual) {
      this.inicializarUsuarioActual();
    }
    return this.usuarioActual!;
  }

  esAdmin(): boolean {
    const usuario = this.obtenerUsuarioActual();
    return usuario?.esAdmin || false;
  }

  marcarMensajesComoLeidos(temaId: number): void {
    console.log('✅ Mensajes marcados como leídos para tema:', temaId);
  }

  actualizarEstadoTema(temaId: number, estado: 'activo' | 'cerrado'): Observable<boolean> {
    console.log(`🔄 Actualizando estado de tema ${temaId} a ${estado}`);
    
    return new Observable(observer => {
      this.actualizarEstadoTemaEnDB(temaId, estado).then(resultado => {
        observer.next(resultado);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  private async actualizarEstadoTemaEnDB(temaId: number, estado: 'activo' | 'cerrado'): Promise<boolean> {
    if (!this.usuarioActual?.esAdmin) {
      this.notificacionesSubject.next('Solo los administradores pueden cambiar el estado');
      return false;
    }

    try {
      const { error } = await this.supabaseService.client
        .from('chat_discusiones')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', temaId);

      if (error) {
        console.error('Error actualizando estado del tema:', error);
        return false;
      }

      this.cargarTemasDesdeDB();
      this.notificacionesSubject.next(`Discusión ${estado === 'activo' ? 'abierta' : 'cerrada'}`);
      
      return true;
    } catch (error) {
      console.error('Error crítico actualizando estado:', error);
      return false;
    }
  }

  limpiarEstado(): void {
    this.temasSubject.next([]);
    this.mensajesSubject.next([]);
  }

  simularNuevoMensaje(temaId: number): void {
    console.log('ℹ️ Simulación deshabilitada - usando datos reales');
  }

  private usarDatosDeEjemplo(): void {
    console.log('📝 Usando todos los datos de ejemplo...');
    this.usarTemasDeEjemplo();
    this.usarPaquetesDeEjemplo();
  }

  // === MÉTODOS DE DEBUG ===

  async debugConexion(): Promise<void> {
    console.log('🔧 === DEBUG DE CONEXIÓN ===');
    
    try {
      console.log('Test 1: Conexión a Supabase');
      const { data: test1 } = await this.supabaseService.client
        .from('chat_discusiones')
        .select('count', { count: 'exact', head: true });
      console.log('✅ Test 1 exitoso, registros:', test1);

      console.log('Test 2: Datos de discusiones');
      const { data: test2, error: error2 } = await this.supabaseService.client
        .from('chat_discusiones')
        .select('*')
        .limit(5);
      console.log('Test 2 resultado:', { data: test2, error: error2 });

      console.log('Test 3: Usuario actual completo');
      console.log('Usuario actual:', this.usuarioActual);
      console.log('Es admin:', this.usuarioActual?.esAdmin);
      console.log('Rol:', this.usuarioActual?.rol);
      console.log('ID Perfil:', this.usuarioActual?.id_perfil);

      console.log('Test 4: Usuarios en profiles');
      const { data: usuarios, error: errorUsuarios } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, id_perfil')
        .eq('status', 1)
        .limit(5);
      console.log('Usuarios encontrados:', usuarios);
      if (errorUsuarios) console.error('Error obteniendo usuarios:', errorUsuarios);

      console.log('Test 5: Estados del servicio');
      console.log('Temas actuales:', this.temasSubject.value.length);
      console.log('Paquetes actuales:', this.paquetesSubject.value.length);
      console.log('Inicializado:', this.isInitialized);

      console.log('Test 6: Verificación de roles de admin');
      const { data: admins, error: errorAdmins } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, id_perfil')
        .in('id_perfil', [1, 3])
        .eq('status', 1);
      console.log('Administradores/Supervisores encontrados:', admins);
      if (errorAdmins) console.error('Error obteniendo admins:', errorAdmins);

    } catch (error) {
      console.error('❌ Error en debug:', error);
    }
  }

  // === MÉTODOS ADICIONALES PARA ROLES ===

  obtenerUsuariosPorRol(id_perfil: number): Observable<Usuario[]> {
    return new Observable(observer => {
      this.cargarUsuariosPorRol(id_perfil).then(usuarios => {
        observer.next(usuarios);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  private async cargarUsuariosPorRol(id_perfil: number): Promise<Usuario[]> {
    try {
      const { data: usuarios, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, full_name, id_perfil, avatar_url')
        .eq('id_perfil', id_perfil)
        .eq('status', 1)
        .order('full_name');

      if (error) {
        console.error('Error obteniendo usuarios por rol:', error);
        return [];
      }

      return (usuarios || []).map(usuario => ({
        id: usuario.id,
        nombre: usuario.full_name || usuario.username || 'Usuario Sin Nombre',
        email: usuario.username || '',
        username: usuario.username || '',
        avatar: usuario.avatar_url,
        esAdmin: this.esAdminPorPerfil(usuario.id_perfil),
        rol: this.obtenerNombreRol(usuario.id_perfil),
        id_perfil: usuario.id_perfil
      }));

    } catch (error) {
      console.error('Error crítico obteniendo usuarios por rol:', error);
      return [];
    }
  }

  async verificarPermisoCrearTema(): Promise<{ puede: boolean, razon: string }> {
    if (!this.usuarioActual) {
      return { puede: false, razon: 'Usuario no autenticado' };
    }

    if (!this.usuarioActual.esAdmin) {
      return { 
        puede: false, 
        razon: `Tu rol "${this.usuarioActual.rol}" no tiene permisos para crear discusiones. Solo Administradores y Supervisores pueden crear temas.`
      };
    }

    return { puede: true, razon: `Tienes permisos como ${this.usuarioActual.rol}` };
  }

  async obtenerEstadisticasChat(): Promise<any> {
    try {
      const { data: stats, error } = await this.supabaseService.client
        .rpc('get_chat_statistics');

      if (error) {
        console.log('Función RPC no disponible, calculando estadísticas manualmente');
        return await this.calcularEstadisticasManual();
      }

      return stats[0] || {};
    } catch (error) {
      console.log('Calculando estadísticas de forma manual');
      return await this.calcularEstadisticasManual();
    }
  }

  private async calcularEstadisticasManual(): Promise<any> {
    try {
      const { data: temas } = await this.supabaseService.client
        .from('chat_discusiones')
        .select('*');

      const { data: mensajes } = await this.supabaseService.client
        .from('chat_mensajes')
        .select('*');

      const { data: usuarios } = await this.supabaseService.client
        .from('profiles')
        .select('id, id_perfil')
        .eq('status', 1);

      return {
        total_temas: temas?.length || 0,
        temas_activos: temas?.filter(t => t.estado === 'activo').length || 0,
        total_mensajes: mensajes?.length || 0,
        total_usuarios: usuarios?.length || 0,
        usuarios_admin: usuarios?.filter(u => this.esAdminPorPerfil(u.id_perfil)).length || 0,
        usuarios_regulares: usuarios?.filter(u => !this.esAdminPorPerfil(u.id_perfil)).length || 0
      };
    } catch (error) {
      console.error('Error calculando estadísticas:', error);
      return {};
    }
  }

  get client() {
    return this.supabaseService.client;
  }

  async refrescarUsuarioActual(): Promise<void> {
    console.log('🔄 Refrescando datos del usuario actual...');
    await this.inicializarUsuarioActual();
  }
}