import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ThemeService } from 'src/app/core/services/theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage {
  quickAccess = [
    {
      title: 'Rutas',
      desc: 'Consulta horarios y zonas de recolección',
      route: '/tabs/rutas',
      icon: 'routes',
      cardClass: 'card-orange'
    },
    {
      title: 'Mapa',
      desc: 'Ubica rutas y puntos de interés',
      route: '/tabs/mapa',
      icon: 'map',
      cardClass: 'card-blue'
    },
    {
      title: 'Reportes',
      desc: 'Informa novedades del servicio',
      route: '/tabs/reportes',
      icon: 'report',
      cardClass: 'card-purple'
    },
    {
      title: 'Learn',
      desc: 'Aprende a reciclar y usar la app',
      route: '/tabs/learn',
      icon: 'learn',
      cardClass: 'card-green'
    },
    {
      title: 'Ayuda',
      desc: 'Soporte e información general',
      route: '/tabs/ayuda',
      icon: 'help',
      cardClass: 'card-teal'
    },
    {
      title: 'Calendario',
      desc: 'Fechas y recordatorios de recolección',
      route: '/tabs/calendario',
      icon: 'calendar',
      cardClass: 'card-red'
    }
  ];

  recentActivity = [
    {
      title: 'Separa antes de entregar',
      sub: 'Limpia envases y aparta orgánicos, reciclables y no aprovechables.',
      badge: 'Eco tip',
      badgeClass: 'badge-green',
      icon: 'learn',
      bg: '#e8f7ef',
      iconColor: '#2f9e62'
    },
    {
      title: 'Reportes ciudadanos',
      sub: 'Puedes avisar sobre retrasos, puntos críticos o residuos acumulados.',
      badge: 'Servicio',
      badgeClass: 'badge-blue',
      icon: 'report',
      bg: '#eef5ff',
      iconColor: '#4b7bec'
    }
  ];

  constructor(
    private router: Router,
    public themeService: ThemeService
  ) {}

  goTo(route: string): void {
    this.router.navigate([route]);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
