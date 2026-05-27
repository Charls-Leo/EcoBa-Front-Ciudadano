import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ReporteService } from '../../core/services/reporte.service';
import { ReporteRequest } from '../../core/models';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss']
})
export class ReportesPage {
  activeNav = '';

  reporte = {
    nombre: '',
    correo: '',
    descripcion: '',
    imagen: null as File | null
  };

  imagenPreview: string | ArrayBuffer | null = null;
  nombreImagen = '';
  enviando = false;

  constructor(
    private location: Location,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private reporteService: ReporteService
  ) {}

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
      learn: '/learn'
    };

    if (routes[nav]) {
      this.router.navigate([routes[nav]]);
    }
  }

  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];
    const maxSizeMb = 5;

    if (archivo.size > maxSizeMb * 1024 * 1024) {
      this.mostrarAlerta('Imagen muy grande', `La imagen no puede superar ${maxSizeMb} MB.`);
      input.value = '';
      return;
    }

    this.reporte.imagen = archivo;
    this.nombreImagen = archivo.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagenPreview = reader.result;
    };
    reader.readAsDataURL(archivo);
  }

  eliminarImagen(): void {
    this.reporte.imagen = null;
    this.imagenPreview = null;
    this.nombreImagen = '';
  }

  async enviarReporte(): Promise<void> {
    if (!this.reporte.nombre.trim() || !this.reporte.correo.trim() || !this.reporte.descripcion.trim()) {
      await this.mostrarAlerta(
        'Campos incompletos',
        'Por favor ingresa tu nombre, correo electrónico y la descripción del reporte.'
      );
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Enviando reporte...',
      spinner: 'crescent'
    });
    await loading.present();

    this.enviando = true;

    try {
      const payload: ReporteRequest = {
        nombre: this.reporte.nombre.trim(),
        email: this.reporte.correo.trim(),
        reporte: this.reporte.descripcion.trim()
      };

      if (this.reporte.imagen && this.imagenPreview) {
        payload.imagen_base64 = this.imagenPreview as string;
      }

      this.reporteService.crearReporte(payload).subscribe({
        next: async () => {
          await loading.dismiss();
          this.enviando = false;

          await this.mostrarAlerta(
            'Reporte enviado',
            'Tu reporte fue registrado exitosamente. Gracias por ayudar a mejorar el servicio.'
          );

          this.limpiarFormulario();
        },
        error: async (err) => {
          await loading.dismiss();
          this.enviando = false;
          console.error('Error al enviar reporte:', err);

          const mensaje = err.error?.mensaje || 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';
          await this.mostrarAlerta('Error al enviar', mensaje);
        }
      });
    } catch (err) {
      await loading.dismiss();
      this.enviando = false;
      console.error('Error inesperado:', err);
      await this.mostrarAlerta('Error', 'Ocurrió un error inesperado.');
    }
  }

  limpiarFormulario(): void {
    this.reporte = {
      nombre: '',
      correo: '',
      descripcion: '',
      imagen: null
    };

    this.imagenPreview = null;
    this.nombreImagen = '';
  }

  private async mostrarAlerta(header: string, message: string): Promise<void> {
    const alerta = await this.alertController.create({
      header,
      message,
      buttons: ['Aceptar']
    });
    await alerta.present();
  }
}
