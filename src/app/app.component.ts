import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ConnectivityService } from './core/services/connectivity.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private connectivity: ConnectivityService) {
    this.clearLegacyDriverState();
    // Iniciar monitoreo de red al arrancar la app
    this.connectivity.init();
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
