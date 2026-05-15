import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /** Obtiene recorridos asignados al conductor logueado */
  getRecorridosConductor(): Observable<Recorrido[]> {
    const usuario = this.authService.getUser();
    if (!usuario) {
      return new Observable(subscriber => {
        subscriber.error('No hay usuario logueado');
      });
    }
    return this.http.get<Recorrido[]>(`${this.baseUrl}/conductor/${usuario.id_usuario}`);
  }

  getRecorridos(): Observable<Recorrido[]> {
    return this.http.get<Recorrido[]>(this.baseUrl);
  }

  /** Activa un recorrido en la base de datos */
  activarRecorrido(id: string | number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/activar`, {});
  }

  /** Finaliza un recorrido en la base de datos */
  finalizarRecorrido(id: string | number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/finalizar`, {});
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
}
