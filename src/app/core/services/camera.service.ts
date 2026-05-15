import { Injectable } from '@angular/core';

// =========================================================
// CameraService — Acceso a la cámara del dispositivo
// Usa @capacitor/camera para captura nativa
// Devuelve la imagen en formato Base64
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  /**
   * Abre la cámara del dispositivo y devuelve la foto en Base64.
   * Retorna null si el usuario cancela o hay un error.
   */
  async tomarFoto(): Promise<string | null> {
    try {
      // Importación dinámica para evitar errores si el plugin no está instalado
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        correctOrientation: true
      });

      if (image.base64String) {
        // Retornar con prefijo data URI para compatibilidad con la API
        const mimeType = image.format === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${image.base64String}`;
      }

      return null;
    } catch (err: any) {
      // Si el usuario canceló, no es un error real
      if (err?.message?.includes('User cancelled') || err?.message?.includes('cancelled')) {
        console.log('[CameraService] Usuario canceló la captura');
        return null;
      }
      console.error('[CameraService] Error al capturar foto:', err);
      throw err;
    }
  }

  /**
   * Abre la galería para seleccionar una foto existente.
   * Retorna la imagen en Base64 o null si se cancela.
   */
  async seleccionarDeGaleria(): Promise<string | null> {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 1024,
        height: 1024,
        correctOrientation: true
      });

      if (image.base64String) {
        const mimeType = image.format === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${image.base64String}`;
      }

      return null;
    } catch (err: any) {
      if (err?.message?.includes('User cancelled') || err?.message?.includes('cancelled')) {
        console.log('[CameraService] Usuario canceló la selección');
        return null;
      }
      console.error('[CameraService] Error al seleccionar de galería:', err);
      throw err;
    }
  }
}