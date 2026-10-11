import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mandate.ai',
  appName: 'Mandate',
  webDir: 'out',
  server: {
    // Connect to host machine running Next.js dev server over Wi-Fi
    url: 'http://192.168.29.4:3000',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
