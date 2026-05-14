import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReporteRequest, ReporteResponse } from '../models';

// =========================================================
// Servicio de dominio: Reportes
// Maneja POST /reportes — sin lógica de UI
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class ReporteService {

  private readonly baseUrl = `${environment.API_BASE_URL}/reportes`;

  constructor(private http: HttpClient) { }

  /** Envía un reporte al backend */
  crearReporte(reporte: ReporteRequest): Observable<ReporteResponse> {
    return this.http.post<ReporteResponse>(this.baseUrl, reporte);
  }
}
