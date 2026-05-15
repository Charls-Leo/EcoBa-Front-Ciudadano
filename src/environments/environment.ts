// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,

  // ==========================================
  // 🔄 CAMBIA DE BACKEND AQUÍ
  // Comenta y descomenta según lo que necesites
  // ==========================================

  // 1. Backend Local (Docker en tu PC)
  API_BASE_URL: 'http://localhost:3007/api',

  // 2. Backend en la Nube (Railway)
  // API_BASE_URL: 'https://ecobahia-backend-production.up.railway.app/api',

  PERFIL_ID: 'd1344313-5afa-40aa-b604-545ed54bd91b'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
