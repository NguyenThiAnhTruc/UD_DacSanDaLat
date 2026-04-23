import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dalatfarm.app',
  appName: 'DaLatFarm',
  webDir: 'www',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorNavigator: {
      enabled: true,
    },
    FirebaseAuthentication: {
      authDomain: 'dacsandl-83208.firebaseapp.com',
      providers: ['google.com'],
      skipNativeAuth: true,
    },
  },
};

export default config;
