import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

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

  constructor(
    private location: Location,
    private router: Router,
    private alertController: AlertController
  ) {}

  goBack(): void {
    this.location.back();
  }

  setActiveNav(nav: string): void {
    this.activeNav = nav;

    const routes: Record<string, string> = {
      inicio: '/home',
      mapa: '/mapa',
      recorridos: '/recorridos',
      rutas: '/rutas',
      perfil: '/perfil'
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
      const alerta = await this.alertController.create({
        header: 'Campos incompletos',
        message: 'Por favor ingresa tu nombre, correo electrónico y la descripción del reporte.',
        buttons: ['Aceptar']
      });

      await alerta.present();
      return;
    }

    const alerta = await this.alertController.create({
      header: 'Reporte preparado',
      message: 'El reporte quedó registrado de forma visual. Más adelante se conectará con el backend para enviarlo al sistema.',
      buttons: ['Aceptar']
    });

    await alerta.present();

    this.limpiarFormulario();
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
}