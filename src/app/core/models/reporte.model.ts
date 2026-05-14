// =========================================================
// Modelo de dominio: Reporte
// =========================================================

export interface ReporteRequest {
  nombre: string;
  email: string;
  usuario_id?: string;
  reporte: string;
  imagen_base64?: string;
}

export interface ReporteResponse {
  mensaje: string;
  data: {
    id: string;
    nombre: string;
    email: string;
    usuario_id?: string;
    reporte: string;
    imagen_base64?: string;
    createdAt: string;
    updatedAt: string;
  };
}
