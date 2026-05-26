import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para obligar al usuario a iniciar sesión antes de ingresar a las secciones principales
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirigir al Login si no hay sesión activa
  return router.createUrlTree(['/login']);
};

/**
 * Guard para evitar que usuarios autenticados vuelvan a ver la pantalla de login, splash u onboarding
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  // Redirigir al Home si ya tiene una sesión iniciada
  return router.createUrlTree(['/tabs/home']);
};
