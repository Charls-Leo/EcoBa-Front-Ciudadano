import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

// Mantiene compatibilidad con tokens antiguos sin obligar login en la app ciudadana.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('ecobahia_driver_token');

  const request = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(request).pipe(
    catchError(error => {
      if (error.status === 401) {
        localStorage.removeItem('ecobahia_driver_auth');
        localStorage.removeItem('ecobahia_driver_token');
        localStorage.removeItem('ecobahia_driver_user');
      }

      return throwError(() => error);
    })
  );
};
