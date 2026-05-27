import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { Usuario } from 'src/app/core/models';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})
export class PerfilPage implements OnInit {
  activeNav = 'perfil';
  usuario: Usuario | null = null;
  isLoggedIn = false;

  constructor(
    private location: Location,
    private router: Router,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  ionViewWillEnter(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    if (this.isLoggedIn) {
      this.usuario = this.authService.getUser();
    }
  }

  getShortId(id: string | undefined): string {
    if (!id) return '';
    // Genera un número de 3 dígitos de forma determinista y única a partir del UUID
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const shortNum = Math.abs(hash % 900) + 100; // Número entre 100 y 999
    return `#${shortNum}`;
  }

  async cerrarSesion(): Promise<void> {
    this.authService.logout();
    this.isLoggedIn = false;
    this.usuario = null;

    const toast = await this.toastCtrl.create({
      message: 'Sesión cerrada correctamente',
      duration: 2000,
      color: 'medium',
      position: 'top'
    });
    await toast.present();
    this.router.navigate(['/home']);
  }

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
}