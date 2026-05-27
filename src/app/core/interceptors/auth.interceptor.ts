import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

// =========================================================
// Interceptor HTTP: Inyección automática de JWT
// + Manejo automático de sesión expirada (401)
// Se aplica globalmente — elimina headers manuales
// =========================================================

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Rutas públicas que no necesitan token
  const publicPaths = ['/usuarios/login-conductor', '/usuarios/register'];
  const isPublic = publicPaths.some(path => req.url.includes(path));

  if (isPublic) {
    return next(req);
  }

  const token = localStorage.getItem('ecobahia_driver_token');

  let request = req;
  if (token) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(request).pipe(
    catchError(error => {
      // Si el backend responde 401 (token expirado o inválido),
      // limpiar la sesión local y redirigir al login automáticamente.
      if (error.status === 401 && !isPublic) {
        console.warn('⚠️ [AuthInterceptor] Token expirado o inválido — cerrando sesión automáticamente');
        localStorage.removeItem('ecobahia_driver_auth');
        localStorage.removeItem('ecobahia_driver_token');
        localStorage.removeItem('ecobahia_driver_user');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
