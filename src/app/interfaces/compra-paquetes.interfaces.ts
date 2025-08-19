// src/app/interfaces/compra-paquetes.interfaces.ts

// ===================================
// INTERFACES PRINCIPALES
// ===================================

export interface CompraPaquete {
  id?: number;
  usuario_id: number;
  paquete_id: number;
  precio_paquete: number;
  descuento_aplicado: number;
  precio_final: number;
  metodo_pago: MetodoPago;
  comprobante_imagen?: string;
  comprobante_nombre?: string;
  comprobante_tipo?: string;
  numero_transaccion?: string;
  banco?: string;
  fecha_pago?: string;
  hora_pago?: string;
  estado_compra: EstadoCompra;
  fecha_compra?: string;
  validado_por?: number;
  fecha_validacion?: string;
  motivo_rechazo?: string;
  asignacion_completada?: boolean;
  usuario_paquete_id?: number;
  fecha_asignacion?: string;
  notas_usuario?: string;
  notas_admin?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

export interface CompraPaqueteCompleta {
  compra_id: number;
  usuario_id: number;
  usuario_nombre: string;
  usuario_username: string;
  paquete_id: number;
  paquete_nombre: string;
  paquete_tipo: string;
  precio_original_paquete: number;
  precio_paquete: number;
  descuento_aplicado: number;
  precio_final: number;
  metodo_pago: MetodoPago;
  numero_transaccion?: string;
  banco?: string;
  fecha_pago?: string;
  hora_pago?: string;
  estado_compra: EstadoCompra;
  fecha_compra: string;
  validado_por?: number;
  validado_por_nombre?: string;
  fecha_validacion?: string;
  motivo_rechazo?: string;
  asignacion_completada: boolean;
  usuario_paquete_id?: number;
  fecha_asignacion?: string;
  notas_usuario?: string;
  notas_admin?: string;
  comprobante_nombre?: string;
  comprobante_tipo?: string;
  tiene_comprobante: boolean;
  estado_descripcion: string;
  horas_desde_compra: number;
}

export interface DescuentoPaquete {
  id?: number;
  paquete_id?: number;
  aplicable_a: 'todos' | 'perfil_especifico' | 'usuario_especifico';
  perfil_id?: number;
  usuario_id?: number;
  tipo_descuento: 'porcentaje' | 'monto_fijo';
  valor_descuento: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  usos_maximos?: number;
  usos_actuales: number;
  nombre_descuento: string;
  descripcion?: string;
  created_at?: string;
  updated_at?: string;
  status?: number;
}

export interface HistorialCompraPaquete {
  id?: number;
  compra_id: number;
  estado_anterior?: string;
  estado_nuevo: string;
  cambio_realizado_por?: number;
  motivo?: string;
  fecha_cambio: string;
}

// ===================================
// INTERFACES PARA FORMULARIOS
// ===================================

export interface FormularioCompraPaquete {
  paquete_id: number;
  metodo_pago: MetodoPago;
  numero_transaccion?: string;
  banco?: string;
  fecha_pago: string;
  hora_pago?: string;
  comprobante?: File;
  notas_usuario?: string;
  acepta_terminos: boolean;
}

export interface ValidacionCompraPaquete {
  compra_id: number;
  accion: 'validar' | 'rechazar';
  motivo_rechazo?: string;
  notas_admin?: string;
}

export interface CalculoDescuento {
  descuento_id?: number;
  descuento_aplicable: number;
  tipo_descuento: 'porcentaje' | 'monto_fijo';
  nombre_descuento: string;
  precio_original: number;
  precio_final: number;
}

// ===================================
// INTERFACES PARA VISTAS
// ===================================

export interface PaqueteParaCompra {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: string;
  precio: number;
  cantidad_sesiones: number;
  
  imagen_url?: string;
  status: number;
  // Datos calculados
  precio_con_descuento?: number;
  ahorro?: number;
  contenido_detalle?: ContenidoPaqueteDetalle[];
  mejor_descuento?: CalculoDescuento;
}

export interface ContenidoPaqueteDetalle {
  id: number;
  nombre: string;
  tipo: 'rutina' | 'terapia';
  descripcion?: string;
  duracion_estimada?: number;
  sesiones_asignadas?: number;
  orden_en_paquete?: number;
}

export interface ResumenCompra {
  paquete: PaqueteParaCompra;
  descuento_aplicado?: CalculoDescuento;
  precio_original: number;
  descuento: number;
  precio_final: number;
  ahorro_porcentaje: number;
}

// ===================================
// TIPOS Y ENUMS
// ===================================

export type MetodoPago = 'transferencia' | 'deposito' | 'tarjeta_credito' | 'tarjeta_debito';

export type EstadoCompra = 'pendiente' | 'validada' | 'rechazada' | 'cancelada';

export const METODOS_PAGO: { value: MetodoPago; label: string; icono: string }[] = [
  { value: 'transferencia', label: 'Transferencia Bancaria', icono: 'fa-university' },
  { value: 'deposito', label: 'Depósito Bancario', icono: 'fa-piggy-bank' },
  { value: 'tarjeta_credito', label: 'Tarjeta de Crédito', icono: 'fa-credit-card' },
  { value: 'tarjeta_debito', label: 'Tarjeta de Débito', icono: 'fa-credit-card' }
];

export const ESTADOS_COMPRA: { value: EstadoCompra; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente de Validación', color: 'warning' },
  { value: 'validada', label: 'Validada', color: 'success' },
  { value: 'rechazada', label: 'Rechazada', color: 'danger' },
  { value: 'cancelada', label: 'Cancelada', color: 'secondary' }
];

export const BANCOS_DISPONIBLES = [
  'Banco Industrial',
  'Banco G&T Continental',
  'Banrural',
  'Banco de América Central (BAC)',
  'Banco Agromercantil',
  'Banco Promerica',
  'Banco Inmobiliario',
  'Banco Internacional',
  'Bantrab',
  'Vivibanco',
  'Otro'
];

// ===================================
// INTERFACES PARA FILTROS Y BÚSQUEDA
// ===================================

export interface FiltrosComprasPaquetes {
  usuario_id?: number;
  paquete_id?: number;
  estado_compra?: EstadoCompra;
  metodo_pago?: MetodoPago;
  fecha_desde?: string;
  fecha_hasta?: string;
  validado_por?: number;
  tiene_comprobante?: boolean;
  busqueda?: string;
  page?: number;
  limit?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}

export interface EstadisticasComprasPaquetes {
  total_compras: number;
  compras_pendientes: number;
  compras_validadas: number;
  compras_rechazadas: number;
  monto_total_pendiente: number;
  monto_total_validado: number;
  promedio_tiempo_validacion: number; // en horas
  metodo_pago_mas_usado: MetodoPago;
}

// ===================================
// RESPUESTAS DE API
// ===================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export interface RespuestaCompraPaquete {
  compra_id: number;
  mensaje: string;
  estado: EstadoCompra;
  requiere_validacion: boolean;
}

export interface RespuestaValidacionCompra {
  compra_id: number;
  estado_anterior: EstadoCompra;
  estado_nuevo: EstadoCompra;
  asignacion_completada: boolean;
  usuario_paquete_id?: number;
  mensaje: string;
}

// ===================================
// INTERFACES PARA NOTIFICACIONES
// ===================================

export interface NotificacionCompra {
  tipo: 'nueva_compra' | 'compra_validada' | 'compra_rechazada' | 'paquete_asignado';
  compra_id: number;
  usuario_id: number;
  paquete_nombre: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

// ===================================
// CONFIGURACIÓN DE COMPONENTES
// ===================================

export interface ConfiguracionCompraPaquetes {
  permitir_compras: boolean;
  metodos_pago_habilitados: MetodoPago[];
  validacion_automatica: boolean;
  limite_tiempo_validacion: number; // en horas
  formatos_comprobante_permitidos: string[];
  tamaño_maximo_comprobante: number; // en MB
  descuentos_automaticos_habilitados: boolean;
}

export const DEFAULT_CONFIG_COMPRA_PAQUETES: ConfiguracionCompraPaquetes = {
  permitir_compras: true,
  metodos_pago_habilitados: ['transferencia', 'deposito', 'tarjeta_credito', 'tarjeta_debito'],
  validacion_automatica: false,
  limite_tiempo_validacion: 24,
  formatos_comprobante_permitidos: ['.jpg', '.jpeg', '.png', '.pdf'],
  tamaño_maximo_comprobante: 5,
  descuentos_automaticos_habilitados: true
};