import { Component } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Analytics, getAnalytics, isSupported } from 'firebase/analytics';
import { environment, isFirebaseConfigValid } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private firebaseApp?: FirebaseApp;
  private analytics?: Analytics;

  constructor() {
    console.info('[AppComponent] Initializing...');
    
    // Capture global errors to display on page
    window.addEventListener('error', (event) => {
      const errorMsg = `ERROR: ${event.error?.message || event.message}`;
      console.error(errorMsg);
      // Store error in localStorage for debugging
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push({ time: new Date().toISOString(), msg: errorMsg });
      localStorage.setItem('app_errors', JSON.stringify(errors.slice(-10))); // Keep last 10
      // Show alert on first error
      if (errors.length === 1) alert(errorMsg);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorMsg = `PROMISE REJECTION: ${event.reason}`;
      console.error(errorMsg);
      alert(errorMsg);
    });
    
    if (!environment.production) {
      console.info('[Firebase] Analytics disabled in development mode.');
      return;
    }

    if (!isFirebaseConfigValid()) {
      console.warn('[Firebase] Invalid runtime config, skipping analytics initialization.');
      return;
    }

    if (!getApps().length) {
      this.firebaseApp = initializeApp(environment.firebaseConfig);
    } else {
      this.firebaseApp = getApps()[0];
    }

    void this.initializeAnalytics();
  }

  private async initializeAnalytics(): Promise<void> {
    if (!this.firebaseApp) {
      return;
    }

    try {
      if (await isSupported()) {
        this.analytics = getAnalytics(this.firebaseApp);
      }
    } catch (error) {
      console.warn('[Firebase] Analytics disabled due to runtime config error:', error);
    }
  }
}
