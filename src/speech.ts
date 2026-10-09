// 语音识别封装：原生用 Capacitor 插件，浏览器/PWA 用 Web Speech API
import { Capacitor } from '@capacitor/core';

let NativeSR: any = null;
if (Capacitor.isNativePlatform()) {
  try {
    const mod = await import('@capgo/capacitor-speech-recognition');
    NativeSR = ((Capacitor as any).Plugins)?.SpeechRecognition || (mod as any).SpeechRecognition;
  } catch (e) {
    console.warn('[speech] 原生语音插件加载失败', e);
  }
}

export function isNativeSpeech(): boolean {
  return !!NativeSR;
}

// 统一接口：start() / stop() / onstart / onresult / onerror / onend
export function createRecognizer(): any {
  if (NativeSR) {
    let listening = false;
    const wrap: any = {
      lang: 'zh-CN',
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      onresult: null,
      onerror: null,
      onend: null,
      onstart: null,
    };
    wrap.start = async () => {
      if (listening) return;
      try {
        await NativeSR.requestPermissions();
      } catch {}
      try {
        await NativeSR.addListener('partialResults', (ev: any) => {
          const t = (ev?.matches && ev.matches[0]) || '';
          if (wrap.onresult) wrap.onresult({ results: [[{ transcript: t }]] });
        });
        await NativeSR.start({
          language: 'zh-CN',
          partialResults: true,
          maxResults: 1,
          popup: false,
        });
        listening = true;
        wrap.onstart && wrap.onstart();
      } catch (e: any) {
        wrap.onerror && wrap.onerror({ error: e?.message || 'native-error' });
      }
    };
    wrap.stop = async () => {
      if (!listening) return;
      try {
        await NativeSR.stop();
      } catch {}
      listening = false;
      wrap.onend && wrap.onend();
    };
    return wrap;
  }

  // 浏览器 / PWA：Web Speech API
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'zh-CN';
  r.continuous = false;
  r.interimResults = false;
  r.maxAlternatives = 1;
  return r;
}
