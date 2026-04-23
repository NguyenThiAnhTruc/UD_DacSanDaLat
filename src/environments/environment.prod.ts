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
  production: true,
  // Never allow demo accounts in production builds.
  enableDemoAccount: false,
  demoAccountPassword: '',
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
