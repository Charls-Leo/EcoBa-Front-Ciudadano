import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './ayuda.page.html',
  styleUrls: ['./ayuda.page.scss']
})
export class AyudaPage {
  activeNav = '';
  supportEmail = 'highdevsassociation@gmail.com';

  faqs = [
    {
      question: '¿Necesito iniciar sesión para usar la app?',
      answer: 'No. La versión ciudadana permite consultar rutas, calendario, mapa, reportes y contenido educativo sin login.'
    },
    {
      question: '¿Qué puedo reportar?',
      answer: 'Puedes reportar retrasos, acumulación de residuos, contenedores desbordados o puntos que necesiten atención.'
    },
    {
      question: '¿El calendario es definitivo?',
      answer: 'Por ahora es una guía simulada. Más adelante se conectará al backend para mostrar datos reales por zona.'
    },
    {
      question: '¿Cómo reviso una ruta?',
      answer: 'Entra a Rutas, selecciona una opción y la app abrirá el mapa con el recorrido correspondiente.'
    }
  ];

  quickHelp = [
    'Consulta el calendario antes de sacar residuos.',
    'Usa Reportes para avisar novedades del servicio.',
    'Revisa Learn para separar correctamente reciclables, orgánicos y residuos especiales.'
  ];

  constructor(private location: Location, private router: Router) {}

  goBack(): void {
    this.location.back();
  }

  setActiveNav(nav: string): void {
    this.activeNav = nav;
    const routes: Record<string, string> = {
      inicio: '/home',
      mapa: '/mapa',
      rutas: '/rutas',
      reportes: '/reportes',
      learn: '/learn',
      calendario: '/calendario'
    };
    if (routes[nav]) {
      this.router.navigate([routes[nav]]);
    }
  }
}
