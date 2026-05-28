import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Recorrido } from '../models';
import { AuthService } from './auth.service';

// =========================================================
// Servicio de dominio: Recorridos del conductor
// Solo maneja /recorridos — sin lógica de UI
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class RecorridoService {

  private readonly baseUrl = `${environment.API_BASE_URL}/recorridos`;

  // ═══ ESTRATEGIA DE CACHING ═══
  private conductorRecorridosCache: Recorrido[] | null = null;
  private cachedConductorId: string | null = null; // Guardar el ID del conductor dueño de la caché actual
  private allRecorridosCache: Recorrido[] | null = null;
  private lastFetchTimeConductor = 0;
  private lastFetchTimeAll = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de TTL

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /** Obtiene recorridos asignados al conductor logueado con caché */
  getRecorridosConductor(forceRefresh = false): Observable<Recorrido[]> {
    const usuario = this.authService.getUser();
    if (!usuario) {
      return new Observable(subscriber => {
        subscriber.error('No hay usuario logueado');
      });
    }

    const now = Date.now();
    const isDifferentUser = this.cachedConductorId !== usuario.id_usuario;

    // Si cambia el usuario logueado, forzar la invalidación inmediata de la caché
    if (!forceRefresh && !isDifferentUser && this.conductorRecorridosCache && (now - this.lastFetchTimeConductor < this.CACHE_DURATION)) {
      console.log('📦 [RecorridoService] Devolviendo recorridos del conductor desde caché local');
      return of(this.conductorRecorridosCache);
    }

    return this.http.get<Recorrido[]>(`${this.baseUrl}/conductor/${usuario.id_usuario}`).pipe(
      tap(data => {
        this.conductorRecorridosCache = data;
        this.cachedConductorId = usuario.id_usuario;
        this.lastFetchTimeConductor = now;
      })
    );
  }

  /** Obtiene todos los recorridos con caché */
  getRecorridos(forceRefresh = false): Observable<Recorrido[]> {
    const now = Date.now();
    if (!forceRefresh && this.allRecorridosCache && (now - this.lastFetchTimeAll < this.CACHE_DURATION)) {
      console.log('📦 [RecorridoService] Devolviendo todos los recorridos desde caché local');
      return of(this.allRecorridosCache);
    }

    return this.http.get<Recorrido[]>(this.baseUrl).pipe(
      tap(data => {
        this.allRecorridosCache = data;
        this.lastFetchTimeAll = now;
      })
    );
  }

  /** Activa un recorrido en la base de datos y limpia la caché */
  activarRecorrido(id: string | number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/activar`, {}).pipe(
      tap(() => this.clearCache())
    );
  }

  /** Finaliza un recorrido en la base de datos y limpia la caché */
  finalizarRecorrido(id: string | number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/finalizar`, {}).pipe(
      tap(() => this.clearCache())
    );
  }

  /** Limpia el cache de recorridos manualmente */
  clearCache(): void {
    this.conductorRecorridosCache = null;
    this.cachedConductorId = null;
    this.allRecorridosCache = null;
    this.lastFetchTimeConductor = 0;
    this.lastFetchTimeAll = 0;
    console.log('📦 [RecorridoService] Caché de recorridos invalidado por acción mutadora');
  }

  // ═══════════════════════════════════════════
  // NUEVOS MÉTODOS — Posiciones e Imágenes
  // ═══════════════════════════════════════════

  /**
   * Registra una posición GPS en un recorrido activo.
   * Endpoint: POST /api/recorridos/{recorrido_id}/posiciones
   * 
   * Devuelve el objeto con el posicion_id necesario para subir imágenes.
   */
  registrarPosicion(recorridoId: string | number, lat: number, lon: number): Observable<any> {
    const usuario = this.authService.getUser();
    const perfilId = usuario?.id_usuario || environment.PERFIL_ID;

    return this.http.post(`${this.baseUrl}/${recorridoId}/posiciones`, {
      lat,
      lon,
      perfil_id: perfilId
    });
  }

  /**
   * Sube una imagen asociada a una posición específica del recorrido.
   * Endpoint: POST /api/recorridos/posiciones/{posicion_id}/imagen
   * 
   * La imagen debe estar en Base64 (con o sin prefijo data:image/...).
   * Solo funciona si el recorrido está en estado "En Curso".
   */
  subirImagenPosicion(posicionId: string, imagenBase64: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/posiciones/${posicionId}/imagen`, {
      imagen_base64: imagenBase64
    });
  }

  /**
   * Obtiene la imagen de una posición específica.
   * Endpoint: GET /api/recorridos/posiciones/{posicion_id}/imagen
   * 
   * Devuelve el binario de la imagen en formato WEBP.
   */
  obtenerImagenPosicion(posicionId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/posiciones/${posicionId}/imagen`, {
      responseType: 'blob'
    });
  }

  /** Obtiene las posiciones que contienen fotos para un recorrido */
  obtenerFotosRecorrido(id: string | number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${id}/fotos`);
  }

  /** Obtiene todas las posiciones del recorrido en la sesión actual */
  obtenerHistorialRecorrido(recorridoId: string | number): Observable<any> {
    return this.http.get<any>(`${environment.API_BASE_URL}/ubicaciones/recorrido/${recorridoId}`);
  }
}
