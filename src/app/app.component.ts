import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ConnectivityService } from './core/services/connectivity.service';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private connectivity: ConnectivityService,
    private themeService: ThemeService,
    private authService: AuthService
  ) {
    this.clearLegacyDriverState();
    // Iniciar monitoreo de red al arrancar la app
    this.connectivity.init();
  }

  ngOnInit() {
    this.verificarSesionCiudadano();
  }

  private verificarSesionCiudadano(): void {
    if (!this.authService.isLoggedIn()) {
      console.log('[AppCiudadano] Generando sesión anónima automática...');
      this.authService.generarSesionAnonima().subscribe({
        next: (res) => console.log('[AppCiudadano] ✅ Sesión anónima generada correctamente:', res.usuario?.id_usuario),
        error: (err) => console.error('[AppCiudadano] ❌ Error al generar sesión anónima:', err)
      });
    } else {
      console.log('[AppCiudadano] ✅ Sesión activa detectada para el ciudadano:', this.authService.getUser()?.id_usuario);
    }
  }

  private clearLegacyDriverState(): void {
    if (typeof localStorage === 'undefined') return;

    [
      'ecobahia_driver_auth',
      'ecobahia_driver_token',
      'ecobahia_driver_user',
      'eco_active_recorrido_id',
      'eco_active_ruta_id',
      'eco_active_placa',
      'eco_active_ruta_name'
    ].forEach(key => localStorage.removeItem(key));
  }
}
