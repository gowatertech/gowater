import type { CapacitorConfig } from '@capacitor/cli';

const prodUrl = 'https://gowater.app/mobile-app';
const devUrl = 'https://d1299512-b679-4553-b6bf-6043a19b76b9-00-1pl9yba3wloqe.spock.replit.dev/mobile-app';

const isProduction = true;

const config: CapacitorConfig = {
  appId: 'com.gowater.driver',
  appName: 'GoWater Driver',
  webDir: 'dist/public',
  server: {
    url: isProduction ? prodUrl : devUrl,
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
    allowNavigation: [
      '*.gowater.app',
      '*.gowater.do',
      '*.replit.app',
      '*.replit.dev'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0066FF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0066FF'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: !isProduction
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true
  }
};

export default config;
