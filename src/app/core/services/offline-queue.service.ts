import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import * as CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';
import { environment } from '../../../environments/environment';
import { ConnectivityService } from './connectivity.service';

// =========================================================
// OfflineQueueService — Cola de datos en base de datos local SQLite
// Almacena ubicaciones y fotos en la base de datos SQLite del dispositivo
// (con fallback a IndexedDB/LocalStorage en web) cuando no hay conexión.
// Sincroniza automáticamente los datos al recuperar la red.
// =========================================================

export interface PendingLocation {
  recorrido_id: string;
  lat: number;
  lon: number;
  perfil_id: string;
  timestamp: number;
}

export interface PendingPhoto {
  recorrido_id: string;
  lat: number;
  lon: number;
  perfil_id: string;
  imagen_base64: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineQueueService {

  private readonly LOCATIONS_KEY = 'ecobahia_offline_locations';
  private readonly PHOTOS_KEY = 'ecobahia_offline_photos';
  private readonly MAX_LOCATIONS = 1000;
  private readonly MAX_PHOTOS = 30; // SQLite soporta archivos grandes (fotos) sin problema

  private _storage: Storage | null = null;
  private isInitialized = false;

  /** Contadores reactivos para la UI */
  private pendingLocationsCount = new BehaviorSubject<number>(0);
  readonly pendingLocations$ = this.pendingLocationsCount.asObservable();

  private pendingPhotosCount = new BehaviorSubject<number>(0);
  readonly pendingPhotos$ = this.pendingPhotosCount.asObservable();

  /** Estado de sincronización */
  private isSyncing = false;
  private syncingSubject = new BehaviorSubject<boolean>(false);
  readonly syncing$ = this.syncingSubject.asObservable();

  private readonly baseUrl = `${environment.API_BASE_URL}/recorridos`;

  constructor(
    private http: HttpClient,
    private connectivity: ConnectivityService
  ) {
    this.initStorage();
  }

  /** Inicializar base de datos SQLite / LocalForage */
  private async initStorage(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const storage = new Storage({
        name: 'ecobahia_offline_db',
        driverOrder: [
          CordovaSQLiteDriver._driver, // SQLite nativo en dispositivos Android/iOS
          'sqlite',
          'indexeddb', 
          'websql', 
          'localstorage' // Fallback en navegador web
        ]
      });

      // Registrar el driver de SQLite
      await storage.defineDriver(CordovaSQLiteDriver);
      this._storage = await storage.create();
      this.isInitialized = true;
      console.log('🐘 [OfflineQueue] Base de datos local SQLite/IndexedDB inicializada con éxito.');

      // Cargar contadores iniciales
      await this.refreshCounts();

      // Registrar callback para sincronizar automáticamente al recuperar conexión
      this.connectivity.onReconnect(() => this.syncAll());
      
      // Intentar una sincronización inicial si estamos online al arrancar
      if (this.connectivity.isOnline) {
        this.syncAll();
      }

    } catch (err) {
      console.error('❌ [OfflineQueue] Error inicializando base de datos local:', err);
    }
  }

  private async ensureStorage(): Promise<Storage> {
    if (!this.isInitialized || !this._storage) {
      await this.initStorage();
    }
    return this._storage!;
  }

  // ═══════════════════════════════════════════
  // GUARDAR DATOS EN SQLITE (OFFLINE)
  // ═══════════════════════════════════════════

  /** Guardar una ubicación en la cola local */
  async enqueueLocation(location: PendingLocation): Promise<void> {
    const storage = await this.ensureStorage();
    const queue = await this.getLocationsQueue();

    // Limitar tamaño del buffer
    if (queue.length >= this.MAX_LOCATIONS) {
      queue.shift(); // Descartar la más vieja
    }

    queue.push(location);
    await storage.set(this.LOCATIONS_KEY, queue);
    this.pendingLocationsCount.next(queue.length);
    console.log(`[OfflineQueue] 📍 Ubicación guardada en base de datos local (${queue.length} pendientes)`);
  }

  /** Guardar una foto con su ubicación en la cola local */
  async enqueuePhoto(photo: PendingPhoto): Promise<void> {
    const storage = await this.ensureStorage();
    const queue = await this.getPhotosQueue();

    // Limitar cantidad de fotos
    if (queue.length >= this.MAX_PHOTOS) {
      queue.shift();
    }

    queue.push(photo);
    await storage.set(this.PHOTOS_KEY, queue);
    this.pendingPhotosCount.next(queue.length);
    console.log(`[OfflineQueue] 📸 Foto guardada en base de datos local (${queue.length} pendientes)`);
  }

  // ═══════════════════════════════════════════
  // SINCRONIZACIÓN (AL RECUPERAR CONEXIÓN)
  // ═══════════════════════════════════════════

  /** Sincronizar todo: ubicaciones primero, luego fotos */
  async syncAll(): Promise<void> {
    if (this.isSyncing) return;
    
    // Asegurar inicialización antes de sincronizar
    const storage = await this.ensureStorage();
    if (!this.connectivity.isOnline) return;

    const locations = await this.getLocationsQueue();
    const photos = await this.getPhotosQueue();

    if (locations.length === 0 && photos.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.syncingSubject.next(true);
    console.log('[OfflineQueue] 🔄 Iniciando sincronización de datos de base de datos local...');

    try {
      await this.syncLocations();
      await this.syncPhotos();
      console.log('[OfflineQueue] ✅ Sincronización local exitosa');
    } catch (err) {
      console.error('[OfflineQueue] ❌ Error durante sincronización local:', err);
    } finally {
      this.isSyncing = false;
      this.syncingSubject.next(false);
      await this.refreshCounts();
    }
  }

  /** Sincronizar ubicaciones pendientes una por una */
  private async syncLocations(): Promise<void> {
    const storage = await this.ensureStorage();
    const queue = await this.getLocationsQueue();
    if (queue.length === 0) return;

    console.log(`[OfflineQueue] Sincronizando ${queue.length} ubicaciones pendientes...`);
    const failed: PendingLocation[] = [];

    for (const loc of queue) {
      if (!this.connectivity.isOnline) {
        failed.push(loc);
        continue;
      }

      try {
        await this.http.post(`${this.baseUrl}/${loc.recorrido_id}/posiciones`, {
          lat: loc.lat,
          lon: loc.lon,
          perfil_id: loc.perfil_id
        }).toPromise();
      } catch (err) {
        console.warn('[OfflineQueue] Error sincronizando ubicación local:', err);
        failed.push(loc);
      }
    }

    // Guardar en la base de datos las que fallaron para reintentar
    await storage.set(this.LOCATIONS_KEY, failed);
  }

  /** Sincronizar fotos pendientes una por una */
  private async syncPhotos(): Promise<void> {
    const storage = await this.ensureStorage();
    const queue = await this.getPhotosQueue();
    if (queue.length === 0) return;

    console.log(`[OfflineQueue] Sincronizando ${queue.length} fotos pendientes...`);
    const failed: PendingPhoto[] = [];

    for (const photo of queue) {
      if (!this.connectivity.isOnline) {
        failed.push(photo);
        continue;
      }

      try {
        // 1. Registrar la posición primero para obtener el posicion_id
        const posResponse: any = await this.http.post(
          `${this.baseUrl}/${photo.recorrido_id}/posiciones`,
          {
            lat: photo.lat,
            lon: photo.lon,
            perfil_id: photo.perfil_id
          }
        ).toPromise();

        const posicionId = posResponse?.data?.id_posiciones ||
                           posResponse?.id_posiciones ||
                           posResponse?.data?.id_posicion ||
                           posResponse?.id_posicion ||
                           posResponse?.data?.id ||
                           posResponse?.id ||
                           posResponse?.data?.posicion_id ||
                           posResponse?.posicion_id;

        if (!posicionId) {
          console.warn('[OfflineQueue] No se obtuvo posicion_id para foto local');
          failed.push(photo);
          continue;
        }

        // 2. Subir la imagen asociada
        await this.http.post(`${this.baseUrl}/posiciones/${posicionId}/imagen`, {
          imagen_base64: photo.imagen_base64
        }).toPromise();

        console.log(`[OfflineQueue] ✅ Foto sincronizada desde SQLite: ${posicionId}`);
      } catch (err) {
        console.warn('[OfflineQueue] Error sincronizando foto local:', err);
        failed.push(photo);
      }
    }

    await storage.set(this.PHOTOS_KEY, failed);
  }

  // ═══════════════════════════════════════════
  // AUXILIARES
  // ═══════════════════════════════════════════

  private async getLocationsQueue(): Promise<PendingLocation[]> {
    const storage = await this.ensureStorage();
    try {
      const data = await storage.get(this.LOCATIONS_KEY);
      return data || [];
    } catch {
      return [];
    }
  }

  private async getPhotosQueue(): Promise<PendingPhoto[]> {
    const storage = await this.ensureStorage();
    try {
      const data = await storage.get(this.PHOTOS_KEY);
      return data || [];
    } catch {
      return [];
    }
  }

  /** Refrescar contadores desde la base de datos */
  private async refreshCounts(): Promise<void> {
    const locs = await this.getLocationsQueue();
    const photos = await this.getPhotosQueue();
    this.pendingLocationsCount.next(locs.length);
    this.pendingPhotosCount.next(photos.length);
  }

  /** Obtiene la última ubicación local registrada (para mostrar estado offline) */
  async getLastPendingLocation(): Promise<PendingLocation | null> {
    const queue = await this.getLocationsQueue();
    if (queue.length > 0) {
      return queue[queue.length - 1];
    }
    return null;
  }
}
