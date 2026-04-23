import { Injectable, inject } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Platform } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface LocationAddress {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private currentLocationSubject = new BehaviorSubject<LocationCoordinates | null>(null);
  public currentLocation$: Observable<LocationCoordinates | null> = this.currentLocationSubject.asObservable();

  private watcherId: string | null = null;
  private platform = inject(Platform);

  /**
   * Get current device location
   */
  async getCurrentLocation(): Promise<LocationCoordinates> {
    try {
      const hasPermission = await this.checkAndRequestPermission();
      if (!hasPermission) {
        throw new Error('Quyền truy cập vị trí bị từ chối');
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      return this.convertPositionToLocation(position);
    } catch (error) {
      console.error('Error getting location:', error);
      throw this.handleGeolocationError(error);
    }
  }

  /**
   * Watch device location changes (real-time tracking)
   */
  watchLocation(callback: (location: LocationCoordinates) => void): void {
    this.watchLocationChanges(callback).catch(error => {
      console.error('Error watching location:', error);
    });
  }

  /**
   * Internal method to watch location
   */
  private async watchLocationChanges(callback: (location: LocationCoordinates) => void): Promise<void> {
    try {
      const hasPermission = await this.checkAndRequestPermission();
      if (!hasPermission) {
        throw new Error('Quyền truy cập vị trí bị từ chối');
      }

      this.watcherId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        },
        (position: Position | null) => {
          if (position) {
            const location = this.convertPositionToLocation(position);
            this.currentLocationSubject.next(location);
            callback(location);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up location watch:', error);
      throw this.handleGeolocationError(error);
    }
  }

  /**
   * Stop watching location
   */
  stopWatchingLocation(): void {
    if (this.watcherId !== null) {
      Geolocation.clearWatch({ id: this.watcherId })
        .then(() => {
          this.watcherId = null;
        })
        .catch(error => console.error('Error clearing watch:', error));
    }
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format coordinates to string
   */
  formatCoordinates(lat: number, lon: number, precision: number = 6): string {
    return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
  }

  /**
   * Check if device is close to location (within radius in meters)
   */
  isNearLocation(
    currentLat: number,
    currentLon: number,
    targetLat: number,
    targetLon: number,
    radiusInMeters: number = 50
  ): boolean {
    const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon);
    const distanceInMeters = distance * 1000;
    return distanceInMeters <= radiusInMeters;
  }

  /**
   * Check geolocation permission
   */
  async checkGeolocationPermission(): Promise<boolean> {
    try {
      if (this.isWebLikePlatform()) {
        return true;
      }

      const permission = await Geolocation.checkPermissions();
      return permission.location === 'granted';
    } catch (error) {
      console.error('Error checking geolocation permission:', error);
      return false;
    }
  }

  /**
   * Check and request geolocation permission
   */
  private async checkAndRequestPermission(): Promise<boolean> {
    try {
      if (this.isWebLikePlatform()) {
        return true;
      }

      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const result = await Geolocation.requestPermissions();
        return result.location === 'granted';
      }

      return true;
    } catch (error) {
      console.error('Error checking/requesting permission:', error);
      return false;
    }
  }

  private isWebLikePlatform(): boolean {
    return this.platform.is('mobileweb') || this.platform.is('desktop') || this.platform.is('pwa');
  }

  /**
   * Convert Capacitor Position to internal format
   */
  private convertPositionToLocation(position: Position): LocationCoordinates {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    };
  }

  /**
   * Handle geolocation errors
   */
  private handleGeolocationError(error: any): Error {
    let message = 'Có lỗi xảy ra khi lấy vị trí';

    if (error.code) {
      switch (error.code) {
        case 1:
          message = 'Quyền truy cập vị trí bị từ chối';
          break;
        case 2:
          message = 'Không thể lấy vị trí hiện tại. Vui lòng thử lại';
          break;
        case 3:
          message = 'Hết thời gian chờ lấy vị trí';
          break;
      }
    }

    return new Error(message);
  }

  /**
   * Get current location synchronously (if available)
   */
  getCurrentLocationSync(): LocationCoordinates | null {
    return this.currentLocationSubject.value;
  }

  /**
   * Get delivery zone based on location
   * Example: Determine if location is in Dalat
   */
  getDeliveryZone(latitude: number, longitude: number): string {
    // Đà Lạt coordinates: approximate center around 11.94°N, 108.44°E
    const dalatLat = 11.94;
    const dalatLon = 108.44;
    
    const distance = this.calculateDistance(latitude, longitude, dalatLat, dalatLon);
    
    if (distance < 1) {
      return 'dalat-center';
    } else if (distance < 10) {
      return 'dalat-area';
    } else if (distance < 50) {
      return 'lam-dong';
    } else {
      return 'outside-service-area';
    }
  }
}
