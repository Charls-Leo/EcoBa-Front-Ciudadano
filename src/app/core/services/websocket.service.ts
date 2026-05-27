import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

// =========================================================
// WebSocketService — Capa de comunicación en tiempo real
// Implementado con Socket.IO para compatibilidad con backend
// + Auto-reconexión con token fresco desde localStorage
// =========================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WebSocketMessage {
  event: string;
  data: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  /** Estado de la conexión */
  private statusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  readonly connectionStatus$ = this.statusSubject.asObservable();

  /** Mensajes entrantes del servidor (opcional) */
  private messageSubject = new Subject<WebSocketMessage>();
  readonly messages$ = this.messageSubject.asObservable();

  /** Referencia al cliente Socket.IO */
  private socket: Socket | null = null;

  /** URL del servidor Socket.IO (remueve el /api del endpoint) */
  private readonly serverUrl = environment.API_BASE_URL.replace(/\/api$/, '');

  /** Control de reconexión manual */
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private reconnectTimer: any = null;

  // -----------------------------------------------------------
  // Conexión
  // -----------------------------------------------------------

  /** Conectar al servidor Socket.IO con JWT */
  connect(token: string): void {
    if (this.socket && this.socket.connected) {
      return; // Ya conectado
    }

    // Limpiar socket previo si existe pero no está conectado
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.statusSubject.next('connecting');
    this.reconnectAttempts = 0;

    this.createSocket(token);
  }

  /** Crea el socket y configura los listeners */
  private createSocket(token: string): void {
    try {
      this.socket = io(this.serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false // Desactivamos la reconexión automática de Socket.IO
                            // porque necesitamos refrescar el token en cada intento
      });

      this.socket.on('connect', () => {
        this.statusSubject.next('connected');
        this.reconnectAttempts = 0; // Reset en conexión exitosa
        console.log('[WebSocketService] ✅ Conectado al servidor Socket.IO');
      });

      this.socket.on('connect_error', (err) => {
        console.error('[WebSocketService] ❌ Error de conexión:', err.message);
        this.statusSubject.next('error');
        this.attemptReconnect();
      });

      this.socket.on('disconnect', (reason) => {
        this.statusSubject.next('disconnected');
        console.log('[WebSocketService] Desconectado:', reason);

        // Si el servidor nos desconectó (ej: token expiró), intentar reconectar
        if (reason === 'io server disconnect' || reason === 'transport close') {
          this.attemptReconnect();
        }
      });

      // Escuchar eventos dinámicos
      this.socket.onAny((event, ...args) => {
        this.messageSubject.next({ event, data: args[0] });
      });

    } catch (err) {
      this.statusSubject.next('error');
      console.error('[WebSocketService] Error al inicializar Socket.IO:', err);
    }
  }

  /**
   * Reconexión inteligente con token fresco.
   * Lee el token MÁS RECIENTE del localStorage (no el que se pasó en connect()),
   * lo que soluciona el caso donde el usuario hizo login de nuevo y tiene un token nuevo
   * pero el WebSocket seguía intentando con el viejo.
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn('[WebSocketService] ⛔ Máximo de intentos de reconexión alcanzado');
      return;
    }

    // Leer token fresco desde localStorage
    const freshToken = localStorage.getItem('ecobahia_driver_token');
    if (!freshToken) {
      console.warn('[WebSocketService] No hay token en localStorage — no se puede reconectar');
      return;
    }

    this.reconnectAttempts++;
    // Backoff exponencial: 1s, 2s, 4s, 8s... máximo 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`[WebSocketService] 🔄 Reconectando en ${delay / 1000}s (intento ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      // Limpiar socket viejo
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Crear nueva conexión con token fresco
      this.statusSubject.next('connecting');
      this.createSocket(freshToken);
    }, delay);
  }

  // -----------------------------------------------------------
  // Envío de datos
  // -----------------------------------------------------------

  /** Enviar evento con datos al servidor */
  send(event: string, data: unknown): boolean {
    if (!this.socket || !this.socket.connected) {
      console.warn('[WebSocketService] No conectado — mensaje descartado:', event);
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }

  // -----------------------------------------------------------
  // Desconexión
  // -----------------------------------------------------------

  /** Desconectar del servidor */
  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS; // Evitar reconexión automática

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.statusSubject.next('disconnected');
    }
  }

  /** ¿Está conectado? */
  get isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
}
