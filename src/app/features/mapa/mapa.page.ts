import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import { RutaService } from 'src/app/core/services/ruta.service';
import { Ruta, GeoJSONGeometry } from 'src/app/core/models';
import { LocationService } from 'src/app/core/services/location.service';
import { TrackingStateService } from 'src/app/core/services/tracking-state.service';
import { TrackingService } from 'src/app/core/services/tracking.service';
import { RecorridoService } from 'src/app/core/services/recorrido.service';
import { CameraService } from 'src/app/core/services/camera.service';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss']
})
export class MapaPage implements OnDestroy, OnInit {
  private map: L.Map | undefined;
  private rutasLayer: L.FeatureGroup = L.featureGroup();
  private destroy$ = new Subject<void>();

  rutas: Ruta[] = [];
  selectedRutaId: string | number | null = null;
  private truckMarker: L.Marker | null = null;
  public isEnRuta = false;
  private officialRouteCoords: L.LatLng[] = [];

  // Ruta de acercamiento (OSRM)
  private approachRouteLayer: L.Polyline | null = null;
  private lastLocation: {lat: number, lng: number} | null = null;
  private isFetchingApproachRoute = false;
  private startPointCoords: {lat: number, lng: number} | null = null;
  private lastApproachUpdate = 0;

  // ═══ Estados de los controles del mapa ═══
  isTakingPhoto = false;
  isSendingPhoto = false;
  isFinishing = false;
  isPanelExpanded = false;

  togglePanel() {
    this.isPanelExpanded = !this.isPanelExpanded;
  }

  // ═══ Preview de foto ═══
  photoPreview: string | null = null;
  private photoBase64: string | null = null;
  photoStatusMsg: string | null = null;
  photoStatusSuccess = false;

  constructor(
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private rutaService: RutaService,
    private locationService: LocationService,
    public trackingState: TrackingStateService,
    private trackingService: TrackingService,
    private recorridoService: RecorridoService,
    private cameraService: CameraService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    // Escuchar parámetros para saber si queremos ver una ruta específica
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (this.trackingState.recorridoActivo) {
          // Si hay tracking activo, forzar a la ruta oficial del tracking
          this.selectedRutaId = this.trackingState.rutaActiva || null;
        } else {
          // Si no, usar params, o si no hay, la ruta que esté siendo trackeada actualmente
          this.selectedRutaId = params['ruta_id'] || this.trackingState.rutaActiva || null;
        }
        this.cargarRutas();
      });

    // Escuchar si el recorrido se detiene globalmente para limpiar el mapa al instante
    this.trackingState.recorridoId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        if (!id) {
          this.selectedRutaId = null;
          if (this.map) {
            this.rutasLayer.clearLayers();
            if (this.truckMarker) {
              this.truckMarker.remove();
              this.truckMarker = null;
            }
          }
        }
      });
  }

  ionViewDidEnter() {
    if (!this.map) {
      this.initMap();
      this.escucharUbicacionEnTiempoReal();
    }

    // Forzar renderizado completo del mapa
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        window.dispatchEvent(new Event('resize'));
        if (this.rutasLayer.getLayers().length > 0) {
          this.map.fitBounds(this.rutasLayer.getBounds(), { padding: [40, 40] });
        }
      }
    }, 300);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════
  // CÁMARA — Tomar foto y enviar a la API
  // ═══════════════════════════════════════════

  async tomarFoto(): Promise<void> {
    if (this.isTakingPhoto) return;
    this.isTakingPhoto = true;
    this.photoStatusMsg = null;

    try {
      const base64 = await this.cameraService.tomarFoto();

      if (base64) {
        // Guardar la foto para preview
        this.photoBase64 = base64;
        // Mostrar preview (asegurar que tenga prefijo para el <img>)
        this.photoPreview = base64.startsWith('data:')
          ? base64
          : `data:image/jpeg;base64,${base64}`;
      }
    } catch (err) {
      console.error('[MapaPage] Error al tomar foto:', err);
      this.photoStatusMsg = 'Error al acceder a la cámara';
      this.photoStatusSuccess = false;
    } finally {
      this.isTakingPhoto = false;
    }
  }

  async enviarFoto(): Promise<void> {
    if (!this.photoBase64 || this.isSendingPhoto) return;

    const recorridoId = this.trackingState.recorridoActivo;
    if (!recorridoId) {
      this.photoStatusMsg = 'No hay recorrido activo';
      this.photoStatusSuccess = false;
      return;
    }

    this.isSendingPhoto = true;
    this.photoStatusMsg = null;

    try {
      // 1. Priorizar la última ubicación del tracking activo (evita esperar 10s de GPS timeout)
      let lat: number | null = null;
      let lon: number | null = null;

      if (this.lastLocation) {
        // Tracking activo: usamos la última posición conocida directamente
        lat = this.lastLocation.lat;
        lon = this.lastLocation.lng;
      } else {
        // No hay tracking activo: intentar GPS en tiempo real (con timeout corto)
        try {
          const ubicacion = await this.locationService.getCurrentPosition();
          if (ubicacion) {
            lat = ubicacion.latitude;
            lon = ubicacion.longitude;
          }
        } catch { /* silencioso */ }
      }

      if (lat === null || lon === null) {
        this.photoStatusMsg = 'No se pudo obtener la ubicación GPS';
        this.photoStatusSuccess = false;
        this.isSendingPhoto = false;
        return;
      }

      // 2. Registrar posición y obtener posicion_id
      const posResponse = await this.recorridoService
        .registrarPosicion(recorridoId, lat, lon)
        .toPromise();

      const posicionId = posResponse?.data?.id || posResponse?.id;

      if (!posicionId) {
        this.photoStatusMsg = 'No se obtuvo ID de posición';
        this.photoStatusSuccess = false;
        this.isSendingPhoto = false;
        return;
      }

      // 3. Subir imagen asociada a esa posición
      await this.recorridoService
        .subirImagenPosicion(posicionId, this.photoBase64)
        .toPromise();

      this.photoStatusMsg = '¡Foto enviada correctamente!';
      this.photoStatusSuccess = true;

      // Cerrar preview después de 1.5s
      setTimeout(() => {
        this.cerrarPreview();
      }, 1500);

    } catch (err: any) {
      console.error('[MapaPage] Error al enviar foto:', err);
      this.photoStatusMsg = err?.error?.message || 'Error al enviar la foto';
      this.photoStatusSuccess = false;
    } finally {
      this.isSendingPhoto = false;
    }
  }

  descartarFoto(): void {
    this.cerrarPreview();
  }

  cerrarPreview(): void {
    this.photoPreview = null;
    this.photoBase64 = null;
    this.photoStatusMsg = null;
  }

  // ═══════════════════════════════════════════
  // FINALIZAR RECORRIDO desde el mapa
  // ═══════════════════════════════════════════

  async confirmarFinalizarRecorrido(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Finalizar recorrido',
      message: '¿Estás seguro de que deseas finalizar el recorrido actual?',
      cssClass: 'eco-custom-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'eco-btn-cancel'
        },
        {
          text: 'Finalizar',
          role: 'destructive',
          cssClass: 'eco-btn-confirm',
          handler: () => {
            this.finalizarRecorrido();
          }
        }
      ]
    });
    await alert.present();
  }

  private finalizarRecorrido(): void {
    const recId = this.trackingState.recorridoActivo;
    if (!recId || this.isFinishing) return;

    this.isFinishing = true;

    // 1. Finalizar en la BD
    this.recorridoService.finalizarRecorrido(recId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[MapaPage] Recorrido finalizado en BD');
          
          // 2. Detener GPS y limpiar estado global
          this.trackingService.stopTracking();
          this.trackingState.clear();

          this.isFinishing = false;

          // 3. Navegar de vuelta a recorridos
          this.router.navigate(['/tabs/recorridos']);
        },
        error: (err) => {
          console.error('[MapaPage] Error al finalizar en BD', err);
          this.isFinishing = false;
        }
      });
  }

  // ═══════════════════════════════════════════
  // MAPA — Inicialización y dibujo
  // ═══════════════════════════════════════════

  private initMap(): void {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    this.map = L.map('map', { attributionControl: false, zoomControl: false }).setView([3.8801, -77.03116], 14);

    // Mapa Estándar de Google Maps (Roadmap)
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    }).addTo(this.map);

    this.rutasLayer.addTo(this.map);

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 500);
  }

  escucharUbicacionEnTiempoReal() {
    this.locationService.location$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loc => {
        if (!this.map) return;

        const latlng = L.latLng(loc.latitude, loc.longitude);

        if (!this.truckMarker) {
          const placa = this.trackingState.vehiculoPlaca || undefined;
          const rutaNombre = this.trackingState.nombreRuta || undefined;

          const truckIcon = L.divIcon({
            html: this.makeTruckPinHtml(placa, rutaNombre, loc.heading || 0),
            className: 'truck-marker-wrapper',
            iconSize: [52, 52],
            iconAnchor: [26, 26]
          });
          this.truckMarker = L.marker(latlng, { icon: truckIcon, zIndexOffset: 1000 }).addTo(this.map);
          // Si es la primera vez que recibimos la ubicación, centramos el mapa en el conductor
          this.map.setView(latlng, 16);
        } else {
          // Actualizar posición y rotación
          const placa = this.trackingState.vehiculoPlaca || undefined;
          const rutaNombre = this.trackingState.nombreRuta || undefined;
          
          this.truckMarker.setLatLng(latlng);
          this.truckMarker.setIcon(L.divIcon({
            html: this.makeTruckPinHtml(placa, rutaNombre, loc.heading || 0),
            className: 'truck-marker-wrapper',
            iconSize: [52, 52],
            iconAnchor: [26, 26]
          }));
        }

        this.lastLocation = { lat: loc.latitude, lng: loc.longitude };
        this.isEnRuta = this.checkIfOnRoute(latlng);
        this.verificarRutaDeAcercamiento();
      });
  }

  // ═══════════════════════════════════════════
  // Comprobar si está sobre la ruta oficial
  // ═══════════════════════════════════════════
  private checkIfOnRoute(currentPos: L.LatLng): boolean {
    if (!this.officialRouteCoords || this.officialRouteCoords.length === 0 || !this.map) {
      return false;
    }

    let minDistance = Infinity;
    // Aproximación rápida calculando distancia a cada vértice de la ruta
    for (const point of this.officialRouteCoords) {
      const dist = this.map.distance(currentPos, point);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    
    // Si está a menos de 80 metros de la calle oficial, está "En ruta"
    return minDistance <= 80;
  }

  // ═══════════════════════════════════════════
  // Ruta de Acercamiento Automática (OSRM)
  // ═══════════════════════════════════════════
  private async verificarRutaDeAcercamiento() {
    if (!this.map || !this.lastLocation || !this.startPointCoords || !this.trackingState.recorridoActivo) {
      if (this.approachRouteLayer) {
        this.approachRouteLayer.remove();
        this.approachRouteLayer = null;
      }
      return;
    }

    // Distancia directa desde el camión hasta el punto de inicio de la ruta oficial
    const distToStart = this.map.distance(
      L.latLng(this.lastLocation.lat, this.lastLocation.lng), 
      L.latLng(this.startPointCoords.lat, this.startPointCoords.lng)
    );

    // Si está en la ruta oficial o muy cerca del punto de inicio
    if (this.isEnRuta || distToStart < 100) {
      if (this.approachRouteLayer) {
        this.approachRouteLayer.remove();
        this.approachRouteLayer = null;
      }
      return;
    }

    // Para no saturar OSRM y la red, calculamos la ruta cada 15 segundos máximo
    const now = Date.now();
    if (now - this.lastApproachUpdate < 15000 || this.isFetchingApproachRoute) return;

    this.isFetchingApproachRoute = true;
    this.lastApproachUpdate = now;

    try {
      const lon1 = this.lastLocation.lng;
      const lat1 = this.lastLocation.lat;
      const lon2 = this.startPointCoords.lng;
      const lat2 = this.startPointCoords.lat;

      const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates; // [lon, lat]
        const latlngs = coords.map((c: [number, number]) => L.latLng(c[1], c[0]));

        if (this.approachRouteLayer) {
          this.approachRouteLayer.remove();
        }

        // Dibujar ruta de acercamiento en color naranja punteado para diferenciarla
        this.approachRouteLayer = L.polyline(latlngs, {
          color: '#f59e0b', // Naranja/Ambar
          weight: 6,
          opacity: 0.8,
          dashArray: '10, 10',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.map);
      }
    } catch (err) {
      console.error('Error calculando ruta de acercamiento con OSRM:', err);
    } finally {
      this.isFetchingApproachRoute = false;
    }
  }

  cargarRutas() {
    this.rutaService.getRutas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.rutas = Array.isArray(data) ? data : [];
          this.dibujarRutas();
        },
        error: (err) => console.error('Error al cargar rutas', err)
      });
  }

  dibujarRutas() {
    if (!this.map || !this.rutas.length) return;

    this.rutasLayer.clearLayers();
    if (this.approachRouteLayer) {
      this.approachRouteLayer.remove();
      this.approachRouteLayer = null;
    }
    this.startPointCoords = null;
    this.officialRouteCoords = [];

    const rutasADibujar = this.selectedRutaId
      ? this.rutas.filter(r => String(r.id) === String(this.selectedRutaId))
      : [];

    const isTracking = !!this.trackingState.recorridoActivo;

    rutasADibujar.forEach((ruta) => {
      if (ruta.shape) {
        let shapeData: GeoJSONGeometry;
        if (typeof ruta.shape === 'string') {
          try {
            shapeData = JSON.parse(ruta.shape) as GeoJSONGeometry;
          } catch (e) {
            console.error('Error parsing route shape');
            return;
          }
        } else {
          shapeData = ruta.shape;
        }

        let allCoords: number[][] = [];
        if (shapeData.type === 'MultiLineString' && shapeData.coordinates) {
          (shapeData.coordinates as number[][][]).forEach((line: number[][]) => {
            allCoords.push(...line);
          });
        } else if (shapeData.coordinates) {
          allCoords = shapeData.coordinates as number[][];
        } else {
          return;
        }

        // L.latLng expects (lat, lng), GeoJSON has [lng, lat]
        const latlngs = allCoords.map((c: number[]) => L.latLng(c[1], c[0]));
        this.officialRouteCoords = latlngs;

        // ═══ ESTILO PREMIUM ═══

        // Color azul vibrante si está en recorrido activo, verde si es solo vista
        const mainColor = isTracking ? '#4A90FF' : '#3aad6f';
        const borderColor = isTracking ? '#1a3a7a' : '#1a5c3a';
        const glowColor = isTracking ? 'rgba(74, 144, 255, 0.35)' : 'rgba(58, 173, 111, 0.25)';

        // Capa 1: Resplandor (glow) — da profundidad
        const glowLine = L.polyline(latlngs, {
          color: glowColor,
          weight: 18,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        });

        // Capa 2: Borde oscuro — da contraste
        const borderLine = L.polyline(latlngs, {
          color: borderColor,
          weight: 10,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        });

        // Capa 3: Línea principal — el color vibrante
        const mainLine = L.polyline(latlngs, {
          color: mainColor,
          weight: 6,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        });

        this.rutasLayer.addLayer(glowLine);
        this.rutasLayer.addLayer(borderLine);
        this.rutasLayer.addLayer(mainLine);

        // ═══ MARCADORES DE INICIO Y FIN ═══
        if (latlngs.length > 0) {
          this.startPointCoords = { lat: latlngs[0].lat, lng: latlngs[0].lng };

          // Marcador de INICIO (verde)
          const startIcon = L.divIcon({
            html: this.makeRoutePointHtml('start', isTracking),
            className: 'route-point-wrapper',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          this.rutasLayer.addLayer(L.marker(latlngs[0], { icon: startIcon }));

          // Marcador de FIN (rojo)
          if (latlngs.length > 1) {
            const endIcon = L.divIcon({
              html: this.makeRoutePointHtml('end', isTracking),
              className: 'route-point-wrapper',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
            this.rutasLayer.addLayer(L.marker(latlngs[latlngs.length - 1], { icon: endIcon }));
          }
        }
      }
    });

    if (this.rutasLayer.getLayers().length > 0) {
      this.map.fitBounds(this.rutasLayer.getBounds(), { padding: [50, 50] });
    } else {
      // Fallback Buenaventura si no hay ruta seleccionada
      this.map.setView([3.8801, -77.03116], 14);
    }

    // Forzar re-cálculo de ruta de acercamiento porque las capas se limpiaron
    if (this.lastLocation && this.startPointCoords && this.trackingState.recorridoActivo) {
      // Reiniciamos el timer para forzar a OSRM a calcular inmediatamente
      this.lastApproachUpdate = 0; 
      this.verificarRutaDeAcercamiento();
    }
  }

  // ═══════════════════════════════════════════
  // Marcador del punto de inicio/fin de ruta
  // ═══════════════════════════════════════════
  private makeRoutePointHtml(type: 'start' | 'end', isActive: boolean): string {
    const colors = {
      start: { bg: '#22c55e', border: '#16a34a', icon: '▶' },
      end: { bg: '#ef4444', border: '#dc2626', icon: '■' }
    };
    const c = colors[type];

    return `
      <div style="
        width: 28px; height: 28px;
        background: ${c.bg};
        border: 3px solid ${c.border};
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.3);
        position: relative;
      ">
        <span style="color: white; font-size: 10px; font-weight: 900; line-height: 1;">${c.icon}</span>
      </div>
      ${isActive ? `<div class="route-point-pulse" style="
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 28px; height: 28px;
        border-radius: 50%;
        background: ${c.bg};
        opacity: 0;
        animation: pointPulse 2s ease-out infinite;
        pointer-events: none;
      "></div>` : ''}
    `;
  }

  // ═══════════════════════════════════════════
  // Marcador del camión (conductor en movimiento)
  // ═══════════════════════════════════════════
  private makeTruckPinHtml(placa?: string, rutaNombre?: string, heading?: number): string {
    const rotacion = heading ? `rotate(${heading}deg)` : 'rotate(0deg)';
    
    const tooltipHtml = (placa || rutaNombre) ? `
      <div style="
        position: absolute;
        bottom: 55px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 6px 12px;
        border-radius: 10px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.2);
        font-family: 'Nunito', sans-serif;
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        align-items: center;
        border: 1px solid rgba(0,0,0,0.05);
      ">
        ${rutaNombre ? `<span style="font-size: 11px; font-weight: 800; color: #4A90FF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">${rutaNombre}</span>` : ''}
        ${placa ? `<span style="font-size: 12px; font-weight: 700; color: #1e293b;">🚛 ${placa}</span>` : ''}
        <div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 10px; height: 10px; background: white; border-right: 1px solid rgba(0,0,0,0.05); border-bottom: 1px solid rgba(0,0,0,0.05);"></div>
      </div>
    ` : '';

    return `
      ${tooltipHtml}
      <!-- Contenedor rotatorio del camión -->
      <div style="
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%) ${rotacion};
        width: 40px; height: 40px;
        transition: transform 0.3s ease-out;
      ">
        <!-- Pulso GPS exterior -->
        <div class="gps-pulse-ring" style="position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px; border-radius: 50%;"></div>
        
        <!-- Círculo principal -->
        <div style="
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #4A90FF 0%, #357ABD 100%);
          border: 3px solid #ffffff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(74, 144, 255, 0.5), 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10;
        ">
          <!-- Icono de flecha de navegación (en lugar del camión estático) -->
          <svg viewBox="0 0 24 24" width="22" height="22" fill="white" style="transform: rotate(-45deg); margin-top: 2px; margin-right: 2px;">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </div>
      </div>
      <!-- Punto de dirección -->
      <div style="
        position: absolute; bottom: -2px; left: 50%;
        transform: translateX(-50%);
        width: 8px; height: 8px;
        background: #4A90FF;
        border-radius: 50%;
        box-shadow: 0 0 6px rgba(74, 144, 255, 0.8);
        z-index: 5;
      "></div>
    `;
  }

  goBack(): void {
    this.location.back();
  }

  centerOnLocation(): void {
    if (this.map && this.lastLocation) {
      this.map.setView(
        [this.lastLocation.lat, this.lastLocation.lng], 
        16, 
        { animate: true, duration: 0.5 }
      );
    }
  }
}