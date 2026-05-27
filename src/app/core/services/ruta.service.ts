import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ruta } from '../models';

// =========================================================
// Servicio de dominio: Rutas
// Solo maneja /rutas — sin lógica de UI
// =========================================================

/** La API puede devolver un array directo o un wrapper { data: [...] } / { rutas: [...] } */
interface RutasApiResponse {
  data?: Ruta[];
  rutas?: Ruta[];
}

@Injectable({
  providedIn: 'root'
})
export class RutaService {

  private readonly baseUrl = `${environment.API_BASE_URL}/rutas`;
  private readonly perfilId = environment.PERFIL_ID;

  // ═══ ESTRATEGIA DE CACHING ═══
  private rutasCache: Ruta[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de tiempo de vida (TTL)

  constructor(private http: HttpClient) {}

  /** Obtiene todas las rutas — normaliza la respuesta del backend y aplica caché */
  getRutas(forceRefresh = false): Observable<Ruta[]> {
    const now = Date.now();
    
    // Si no se fuerza el refresco y hay cache válido, retornar cache
    if (!forceRefresh && this.rutasCache && (now - this.lastFetchTime < this.CACHE_DURATION)) {
      console.log('📦 [RutaService] Devolviendo rutas desde caché local (in-memory)');
      return of(this.rutasCache);
    }

    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.get<Ruta[] | RutasApiResponse>(this.baseUrl, { params }).pipe(
      map(response => {
        const data = Array.isArray(response) ? response : (response.data || response.rutas || []);
        this.rutasCache = data;
        this.lastFetchTime = now;
        return data;
      })
    );
  }

  /** Obtiene una ruta por su ID (busca en caché primero) */
  getRutaPorId(id: string): Observable<Ruta> {
    if (this.rutasCache) {
      const rutaLocal = this.rutasCache.find(r => String(r.id) === String(id));
      if (rutaLocal) {
        console.log(`📦 [RutaService] Ruta ${id} encontrada en caché local`);
        return of(rutaLocal);
      }
    }

    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.get<Ruta>(`${this.baseUrl}/${id}`, { params });
  }

  /** Limpia el cache de rutas manualmente */
  clearCache(): void {
    this.rutasCache = null;
    this.lastFetchTime = 0;
    console.log('📦 [RutaService] Caché de rutas limpiado');
  }
}
