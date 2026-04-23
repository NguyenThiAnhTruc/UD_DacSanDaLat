// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

type RuntimeEnv = {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID: string;
  APP_PUBLIC_BASE_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  ENABLE_DEMO_ACCOUNT: string;
  DEMO_ACCOUNT_PASSWORD: string;
};

declare global {
  interface Window {
    __env?: Partial<RuntimeEnv>;
  }
}

const runtimeEnv: Partial<RuntimeEnv> =
  (typeof window !== 'undefined' ? window.__env : undefined) ?? {};

const readRuntimeValue = (key: keyof RuntimeEnv, fallback = ''): string => {
  const value = runtimeEnv[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

export const environment = {
  production: false,
  enableDemoAccount: readRuntimeValue('ENABLE_DEMO_ACCOUNT', 'true') === 'true',
  demoAccountPassword: readRuntimeValue('DEMO_ACCOUNT_PASSWORD', ''),
  appPublicBaseUrl: readRuntimeValue('APP_PUBLIC_BASE_URL', ''),
  cloudinary: {
    cloudName: readRuntimeValue('CLOUDINARY_CLOUD_NAME', ''),
    uploadPreset: readRuntimeValue('CLOUDINARY_UPLOAD_PRESET', ''),
  },
  firebaseConfig: {
    apiKey: readRuntimeValue('FIREBASE_API_KEY', ''),
    authDomain: readRuntimeValue('FIREBASE_AUTH_DOMAIN', ''),
    projectId: readRuntimeValue('FIREBASE_PROJECT_ID', ''),
    storageBucket: readRuntimeValue('FIREBASE_STORAGE_BUCKET', ''),
    messagingSenderId: readRuntimeValue('FIREBASE_MESSAGING_SENDER_ID', ''),
    appId: readRuntimeValue('FIREBASE_APP_ID', ''),
    measurementId: readRuntimeValue('FIREBASE_MEASUREMENT_ID', ''),
  },
};

const containsPlaceholder = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return normalized.includes('xxxxx') || normalized.includes('example') || normalized.includes('placeholder');
};

export const isFirebaseConfigValid = (): boolean => {
  const config = environment.firebaseConfig;
  const requiredValues = [
    config.apiKey,
    config.authDomain,
    config.projectId,
    config.storageBucket,
    config.messagingSenderId,
    config.appId,
  ];

  if (requiredValues.some(value => !value || containsPlaceholder(value))) {
    return false;
  }

  if (!config.apiKey.startsWith('AIza')) {
    return false;
  }

  if (config.measurementId && containsPlaceholder(config.measurementId)) {
    return false;
  }

  return true;
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
