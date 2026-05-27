import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss']
})
export class OnboardingPage {
  current = 0;

  slides = [
    {
      step: 'Paso 1',
      title: 'Reporta incidencias',
      text: 'Informa problemas relacionados con residuos o puntos que necesiten atención para ayudar a mantener la ciudad limpia.'
    },
    {
      step: 'Paso 2',
      title: 'Consulta rutas y mapa',
      text: 'Visualiza información útil sobre horarios, zonas y procesos de recolección de manera clara y organizada.'
    },
    {
      step: 'Paso 3',
      title: 'Aprende hábitos ecológicos',
      text: 'Accede a guías simples para reciclar mejor y usar los servicios de EcoBahía como ciudadano.'
    }
  ];

  constructor(private router: Router) {}

  goTo(index: number): void {
    this.current = index;
  }

  nextSlide(): void {
    if (this.current < this.slides.length - 1) {
      this.current++;
    } else {
      this.goHome();
    }
  }

  skipToHome(): void {
    this.goHome();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  getTrackTransform(): string {
    return `translateX(-${this.current * 100}%)`;
  }

  isLastSlide(): boolean {
    return this.current === this.slides.length - 1;
  }
}
