import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// =========================================================
// TrackingStateService — Mantiene el estado global del recorrido activo
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class TrackingStateService {
  private recorridoIdSubj = new BehaviorSubject<string | null>(null);
  readonly recorridoId$ = this.recorridoIdSubj.asObservable();
  
  private rutaIdSubj = new BehaviorSubject<string | null>(null);
  
  private vehiculoPlacaSubj = new BehaviorSubject<string | null>(null);
  private nombreRutaSubj = new BehaviorSubject<string | null>(null);
  private progresoSubj = new BehaviorSubject<number>(0);

  readonly progreso$ = this.progresoSubj.asObservable();

  constructor() {
    // Intentar recuperar el estado de localStorage al iniciar el servicio
    const storedRecorridoId = localStorage.getItem('eco_active_recorrido_id');
    const storedRutaId = localStorage.getItem('eco_active_ruta_id');
    const storedPlaca = localStorage.getItem('eco_active_placa');
    const storedRutaName = localStorage.getItem('eco_active_ruta_name');

    if (storedRecorridoId) {
      this.recorridoIdSubj.next(storedRecorridoId);
      if (storedRutaId) this.rutaIdSubj.next(storedRutaId);
      if (storedPlaca) this.vehiculoPlacaSubj.next(storedPlaca);
      if (storedRutaName) this.nombreRutaSubj.next(storedRutaName);
    }
  }

  setRecorrido(id: string | number, rutaId?: string | number, placa?: string, nombreRuta?: string): void {
    this.recorridoIdSubj.next(String(id));
    localStorage.setItem('eco_active_recorrido_id', String(id));

    if (rutaId) {
      this.rutaIdSubj.next(String(rutaId));
      localStorage.setItem('eco_active_ruta_id', String(rutaId));
    }
    if (placa) {
      this.vehiculoPlacaSubj.next(placa);
      localStorage.setItem('eco_active_placa', placa);
    }
    if (nombreRuta) {
      this.nombreRutaSubj.next(nombreRuta);
      localStorage.setItem('eco_active_ruta_name', nombreRuta);
    }
  }

  setProgreso(porcentaje: number): void {
    this.progresoSubj.next(porcentaje);
  }

  clear(): void {
    this.recorridoIdSubj.next(null);
    this.rutaIdSubj.next(null);
    this.vehiculoPlacaSubj.next(null);
    this.nombreRutaSubj.next(null);
    this.progresoSubj.next(0);

    localStorage.removeItem('eco_active_recorrido_id');
    localStorage.removeItem('eco_active_ruta_id');
    localStorage.removeItem('eco_active_placa');
    localStorage.removeItem('eco_active_ruta_name');
  }

  get recorridoActivo(): string | null {
    return this.recorridoIdSubj.value;
  }
  
  get rutaActiva(): string | null {
    return this.rutaIdSubj.value;
  }

  get vehiculoPlaca(): string | null {
    return this.vehiculoPlacaSubj.value;
  }

  get nombreRuta(): string | null {
    return this.nombreRutaSubj.value;
  }
}
