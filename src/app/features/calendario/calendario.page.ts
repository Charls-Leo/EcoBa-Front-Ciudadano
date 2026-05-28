import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './calendario.page.html',
  styleUrls: ['./calendario.page.scss']
})
export class CalendarioPage {
  ordinaryDays = ['Lunes', 'Miércoles', 'Viernes'];
  recyclingDays = ['Martes', 'Sábado'];
  specialDays = ['Primer jueves del mes', 'Tercer sábado del mes'];

  reminders = [
    'Saca tus residuos después de las 6:00 p.m.',
    'Separa reciclables limpios y secos antes de entregarlos.',
    'No mezcles residuos grandes con la recolección ordinaria.'
  ];

  upcoming = [
    {
      day: 'Lun',
      date: '03',
      title: 'Recolección ordinaria',
      detail: 'Residuos del hogar no aprovechables',
      type: 'ordinary'
    },
    {
      day: 'Mar',
      date: '04',
      title: 'Reciclaje',
      detail: 'Papel, cartón, plástico, vidrio y metal limpios',
      type: 'recycling'
    },
    {
      day: 'Jue',
      date: '06',
      title: 'Residuos grandes',
      detail: 'Muebles, colchones y elementos voluminosos',
      type: 'special'
    }
  ];

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
