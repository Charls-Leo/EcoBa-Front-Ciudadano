import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RutaService } from 'src/app/core/services/ruta.service';
import { RecorridoService } from 'src/app/core/services/recorrido.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { TrackingStateService } from 'src/app/core/services/tracking-state.service';
import { Ruta } from 'src/app/core/models';

@Component({
  selector: 'app-rutas',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './rutas.page.html',
  styleUrls: ['./rutas.page.scss']
})
export class RutasPage implements OnInit, OnDestroy {
  activeNav = 'rutas';
  rutas: Ruta[] = [];
  isLoading = true;
  errorMsg = '';

  private destroy$ = new Subject<void>();

  constructor(
    private location: Location,
    private router: Router,
    private rutaService: RutaService,
    public trackingState: TrackingStateService,
    private recorridoService: RecorridoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarRutas();
  }

  ionViewWillEnter(): void {
    // Si la memoria local ya sabe que estamos trabajando, detenemos todo.
    // Cero llamadas a la API = Ahorro masivo de datos móviles.
    if (this.trackingState.recorridoActivo) {
      this.isLoading = false;
      return;
    }

    // Si aparentemente estamos libres, primero le preguntamos al backend si dejamos algo a medias.
    if (!this.authService.isLoggedIn()) return;
    
    this.isLoading = true;
    this.recorridoService.getRecorridosConductor()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const activoDB = (data || []).find((r: any) => r.estado === 'en_curso' || r.activo);
          if (activoDB) {
            // ¡Pillado! Había un recorrido activo en la BD. Lo resucitamos en memoria y NO cargamos las rutas.
            const recId = activoDB.id_recorrido || activoDB.id || '';
            const rutaId = activoDB.ruta_id || '';
            if (recId) {
              this.trackingState.setRecorrido(recId, rutaId);
            }
            this.isLoading = false;
          } else {
            // Definitivamente libre, ahora sí permitimos descargar la lista de rutas a la pantalla.
            this.cargarRutas();
          }
        },
        error: () => {
          // Si falla la red, intentamos de todas formas cargar las rutas locales o de caché.
          this.cargarRutas();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarRutas(): void {
    this.isLoading = true;
    this.errorMsg = '';

    this.rutaService.getRutas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // La API puede devolver un array directamente o un objeto con data
          this.rutas = Array.isArray(data) ? data : [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error cargando rutas:', err);
          this.errorMsg = 'No se pudieron cargar las rutas';
          this.isLoading = false;
        }
      });
  }

  goBack(): void {
    this.location.back();
  }

  irAMiMapa() {
    this.router.navigate(['/tabs/mapa']);
  }

  async verMapa(rutaId: string | number) {
    this.router.navigate(['/tabs/mapa'], { queryParams: { ruta_id: rutaId } });
  }
}