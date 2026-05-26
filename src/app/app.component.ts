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
    // Iniciar monitoreo de red al arrancar la app
    this.connectivity.init();
  }
}
