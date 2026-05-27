// =========================================================
// Modelo de dominio: Recorrido (asignación conductor-ruta-vehículo)
// =========================================================

export interface Recorrido {
  id?: string | number;
  id_recorrido?: string | number;
  ruta_id: string | number;
  vehiculo_id: string | number;
  conductor_id: string;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

// ═══════════════════════════════════════════
// Interfaces para Posiciones e Imágenes
// ═══════════════════════════════════════════

/** Respuesta al registrar una posición GPS */
export interface PosicionResponse {
  success?: boolean;
  message?: string;
  data?: {
    id?: string;
    id_posicion?: string;
    id_posiciones?: string;
    posicion_id?: string;
    recorrido_id: string;
    lat: number;
    lon: number;
    perfil_id: string;
  };
  id?: string;
  id_posicion?: string;
  id_posiciones?: string;
  posicion_id?: string;
}

/** Respuesta al subir una imagen a una posición */
export interface ImagenPosicionResponse {
  success: boolean;
  message: string;
  data?: {
    posicion_id: string;
    imagen: string;
    url: string;
  };
}