// 纠错 + 自我学习引擎（纯逻辑，浏览器/原生 WebView 通用）
import { TERM_DICT, HOMOPHONE_MAP, allTerms } from './terms';

export interface UserData {
  corrections: Record<string, string>;
  history: { from: string; to: string; ts: number; used: number }[];
  stats: { learned: number; usedToday: number; lastDate: string };
}

const KEY = 'fz_asr_user';

export function loadUserData(): UserData {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {} as UserData;
  }
}
export function saveUserData(d: UserData) {
  localStorage.setItem(KEY, JSON.stringify(d));
}
export function initData(): UserData {
  const d = loadUserData();
  if (!d.corrections) d.corrections = {};
  if (!d.history) d.history = [];
  if (!d.stats) d.stats = { learned: 0, usedToday: 0, lastDate: '' };
  const today = new Date().toDateString();
  if (d.stats.lastDate !== today) {
    d.stats.usedToday = 0;
    d.stats.lastDate = today;
  }
  saveUserData(d);
  return d;
}

// 术语高亮
export function highlightTerms(text: string): string {
  const sorted = allTerms().sort((a, b) => b.length - a.length);
  for (const t of sorted) {
    if (t.length < 2) continue;
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    text = text.replace(re, `<span class="term-highlight">${t}</span>`);
  }
  return text;
}

// 纠错：用户学习记录优先 -> 同音字典
export function correct(text: string): string {
  const corrs = loadUserData().corrections || {};
  const keys = Object.keys(corrs).sort((a, b) => b.length - a.length);
  for (const k of keys) text = text.split(k).join(corrs[k]);
  for (const [w, r] of Object.entries(HOMOPHONE_MAP)) text = text.split(w).join(r);
  return text;
}

// 纠错并标注用到的学习来源（用于 UI 提示）
export function correctWithHints(text: string): { html: string; used: string[] } {
  const corrs = loadUserData().corrections || {};
  const keys = Object.keys(corrs).sort((a, b) => b.length - a.length);
  let result = text;
  const used: string[] = [];
  for (const k of keys) {
    if (result.includes(k)) {
      used.push(k);
      result = result.split(k).join(
        `<span class="correction" data-from="学习: ${k}→${corrs[k]}">${corrs[k]}</span>`
      );
    }
  }
  for (const [w, r] of Object.entries(HOMOPHONE_MAP)) {
    if (result.includes(w)) {
      result = result.split(w).join(
        `<span class="correction" data-from="同音: ${w}→${r}">${r}</span>`
      );
      used.push(`[同音]${w}`);
    }
  }
  return { html: result, used };
}

// 学习一次修正：从 from 提取差异片段存入 corrections
export function learnCorrection(fromText: string, toText: string): boolean {
  if (!fromText.trim() || !toText.trim() || fromText === toText) return false;
  const d = loadUserData();
  const corrections = d.corrections || {};
  const diff = findDiff(fromText, toText);
  if (diff) {
    corrections[diff.wrong] = diff.right;
    d.corrections = corrections;
    d.stats.learned = Object.keys(corrections).length;
    d.stats.usedToday = (d.stats.usedToday || 0) + 1;
  }
  d.history = [{ from: fromText, to: toText, ts: Date.now(), used: 1 }, ...(d.history || [])].slice(0, 200);
  saveUserData(d);
  return true;
}

function findDiff(from: string, to: string): { wrong: string; right: string } | null {
  for (let len = from.length; len >= 1; len--) {
    for (let i = 0; i <= from.length - len; i++) {
      const sub = from.slice(i, i + len);
      if (!to.includes(sub)) {
        const right = to.slice(i, i + len) || to.trim();
        if (right && right !== sub && right.length <= 8) {
          return { wrong: sub, right };
        }
      }
    }
  }
  if (from.trim() !== to.trim() && from.trim().length <= 10) {
    return { wrong: from.trim(), right: to.trim() };
  }
  return null;
}

// 讯飞云配置（可选）
const XF_KEY = 'fz_xfyun_cfg';
export function loadXfyun(): { appId: string; apiKey: string; apiSecret: string } | null {
  try {
    const c = localStorage.getItem(XF_KEY);
    return c ? JSON.parse(c) : null;
  } catch {
    return null;
  }
}
export function saveXfyun(cfg: { appId: string; apiKey: string; apiSecret: string } | null) {
  if (cfg) localStorage.setItem(XF_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(XF_KEY);
}
