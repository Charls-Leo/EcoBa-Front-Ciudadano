import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './learn.page.html',
  styleUrls: ['./learn.page.scss']
})
export class LearnPage {
  guideSteps = [
    {
      title: 'Consulta rutas',
      text: 'Revisa las rutas disponibles y abre el mapa para ubicar el recorrido que te interesa.'
    },
    {
      title: 'Reporta novedades',
      text: 'Envía reportes cuando veas acumulación de residuos, retrasos o puntos que requieren atención.'
    },
    {
      title: 'Aprende hábitos verdes',
      text: 'Usa esta sección para recordar cómo separar, limpiar y entregar mejor tus residuos.'
    }
  ];

  ecoTopics = [
    {
      title: 'Reciclables limpios',
      text: 'Botellas, latas, cartón y papel deben ir secos y sin restos de comida.'
    },
    {
      title: 'Orgánicos separados',
      text: 'Cáscaras, restos vegetales y residuos de comida pueden aprovecharse para compostaje.'
    },
    {
      title: 'Residuos especiales',
      text: 'Pilas, medicamentos, aceite usado y electrónicos no deben mezclarse con la basura común.'
    }
  ];

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
