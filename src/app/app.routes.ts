import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    loadComponent: () =>
      import('./features/inicio/splash/splash.page').then(m => m.SplashPage)
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/inicio/onboarding/onboarding.page').then(m => m.OnboardingPage)
  },
  {
    path: 'login',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  },
  {
    path: 'registro',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  },
  {
    path: 'tabs',
    loadComponent: () => import('./layout/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/inicio/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'rutas',
        loadComponent: () => import('./features/rutas/rutas.page').then(m => m.RutasPage)
      },
      {
        path: 'mapa',
        loadComponent: () => import('./features/mapa/mapa.page').then(m => m.MapaPage)
      },
      {
        path: 'ayuda',
        loadComponent: () => import('./features/ayuda/ayuda.page').then(m => m.AyudaPage)
      },
      {
        path: 'calendario',
        loadComponent: () => import('./features/calendario/calendario.page').then(m => m.CalendarioPage)
      },
      {
        path: 'learn',
        loadComponent: () => import('./features/learn/learn.page').then(m => m.LearnPage)
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/reportes/reportes.page').then(m => m.ReportesPage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'home',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  },
  {
    path: 'mapa',
    redirectTo: '/tabs/mapa',
    pathMatch: 'full'
  },
  {
    path: 'recorridos',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  },
  {
    path: 'rutas',
    redirectTo: '/tabs/rutas',
    pathMatch: 'full'
  },
  {
    path: 'perfil',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  },
  {
    path: 'ayuda',
    redirectTo: '/tabs/ayuda',
    pathMatch: 'full'
  },
  {
    path: 'calendario',
    redirectTo: '/tabs/calendario',
    pathMatch: 'full'
  },
  {
    path: 'reportes',
    redirectTo: '/tabs/reportes',
    pathMatch: 'full'
  },
  {
    path: 'learn',
    redirectTo: '/tabs/learn',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/tabs/home'
  }
];
