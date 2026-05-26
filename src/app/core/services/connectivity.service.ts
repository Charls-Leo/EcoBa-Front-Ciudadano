import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';

// =========================================================
// ConnectivityService — Detecta el estado de la red
// Usa Capacitor Network para detectar cambios online/offline
// en tiempo real en dispositivos nativos Android/iOS
// =========================================================

export interface NetworkInfo {
  connected: boolean;
  connectionType: ConnectionType;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {

  /** Estado actual de la red */
  private networkSubject = new BehaviorSubject<NetworkInfo>({ connected: true, connectionType: 'unknown' });
  readonly network$ = this.networkSubject.asObservable();

  /** Callbacks que se ejecutan cuando se recupera la conexión */
  private onReconnectCallbacks: Array<() => void | Promise<void>> = [];

  private initialized = false;

  constructor(private ngZone: NgZone) {}

  /** Inicializar el listener de red (llamar una sola vez al inicio de la app) */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Obtener estado actual
    try {
      const status: ConnectionStatus = await Network.getStatus();
      this.ngZone.run(() => {
        this.networkSubject.next({
          connected: status.connected,
          connectionType: status.connectionType
        });
      });
      console.log(`[ConnectivityService] Estado inicial de red: ${status.connected ? '🟢 Online' : '🔴 Offline'} (${status.connectionType})`);
    } catch (err) {
      console.warn('[ConnectivityService] Error obteniendo estado de red:', err);
    }

    // Escuchar cambios en tiempo real
    Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      this.ngZone.run(() => {
        const wasOffline = !this.networkSubject.value.connected;
        const isNowOnline = status.connected;

        this.networkSubject.next({
          connected: status.connected,
          connectionType: status.connectionType
        });

        console.log(`[ConnectivityService] Red cambió: ${status.connected ? '🟢 Online' : '🔴 Offline'} (${status.connectionType})`);

        // Si pasó de offline → online, ejecutar los callbacks de reconexión
        if (wasOffline && isNowOnline) {
          console.log('[ConnectivityService] 🔄 Reconexión detectada — sincronizando datos pendientes...');
          this.executeReconnectCallbacks();
        }
      });
    });
  }

  /** Registrar un callback que se ejecuta al recuperar conexión */
  onReconnect(callback: () => void | Promise<void>): void {
    this.onReconnectCallbacks.push(callback);
  }

  /** Ejecutar todos los callbacks de reconexión */
  private async executeReconnectCallbacks(): Promise<void> {
    for (const cb of this.onReconnectCallbacks) {
      try {
        await cb();
      } catch (err) {
        console.error('[ConnectivityService] Error en callback de reconexión:', err);
      }
    }
  }

  /** ¿Está online ahora mismo? */
  get isOnline(): boolean {
    return this.networkSubject.value.connected;
  }

  /** Tipo de conexión actual (wifi, cellular, none, unknown) */
  get connectionType(): ConnectionType {
    return this.networkSubject.value.connectionType;
  }
}
