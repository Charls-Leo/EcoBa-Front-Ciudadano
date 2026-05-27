import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Vehiculo } from '../models';

// =========================================================
// Servicio de dominio: Vehículos (solo lectura desde móvil)
// Solo maneja /vehiculos — sin lógica de UI
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class VehiculoService {

  private readonly baseUrl = `${environment.API_BASE_URL}/vehiculos`;
  private readonly perfilId = environment.PERFIL_ID;

  // ═══ ESTRATEGIA DE CACHING ═══
  private vehiculosCache: Vehiculo[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutos — los vehículos raramente cambian

  constructor(private http: HttpClient) {}

  /** Obtiene todos los vehículos — normaliza respuesta paginada del profesor y aplica caché */
  getVehiculos(forceRefresh = false): Observable<Vehiculo[]> {
    const now = Date.now();

    if (!forceRefresh && this.vehiculosCache && (now - this.lastFetchTime < this.CACHE_DURATION)) {
      console.log('📦 [VehiculoService] Devolviendo vehículos desde caché local');
      return of(this.vehiculosCache);
    }

    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map(response => {
        const data = Array.isArray(response) ? response : (response?.data && Array.isArray(response.data) ? response.data : []);
        this.vehiculosCache = data;
        this.lastFetchTime = now;
        return data;
      })
    );
  }

  /** Limpia el cache de vehículos manualmente */
  clearCache(): void {
    this.vehiculosCache = null;
    this.lastFetchTime = 0;
    console.log('📦 [VehiculoService] Caché de vehículos limpiado');
  }
}
