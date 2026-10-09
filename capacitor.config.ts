import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.caodong.fzvoice',
  appName: '服装语音转写',
  webDir: 'www',
  server: {
    // 真机调试时若需局域网访问可打开：
    // url: 'http://192.168.x.x:5173',
  },
};

export default config;
