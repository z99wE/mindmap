import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rementally.app',
  appName: 'ReMentally',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SpeechRecognition: {
      permissions: {
        ios: 'microphone',
        android: 'RECORD_AUDIO',
      },
    },
  },
};

export default config;
