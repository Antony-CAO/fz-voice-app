// 主逻辑：UI 事件 + 自我学习触发
import { TERM_DICT, HOMOPHONE_MAP } from './terms';
import {
  loadUserData, saveUserData, initData, highlightTerms, correct, correctWithHints,
  learnCorrection, loadXfyun, saveXfyun,
} from './correct';
import { createRecognizer, isNativeSpeech } from './speech';

const $ = (id: string) => document.getElementById(id)!;
let userData = initData();

// ── 初始化识别器 ──
let recognition = createRecognizer();
let isRecording = false;

function initSR() {
  if (!recognition) {
    const micBtn = $('micBtn') as HTMLButtonElement;
    micBtn.disabled = true;
    $('micLabel').textContent = '本设备不支持语音';
    return;
  }
  recognition.onstart = () => {
    isRecording = true;
    $('micBtn').classList.add('recording');
    $('micLabel').textContent = '录音中…';
    $('rawBox').classList.add('active');
    $('rawBox').textContent = '…';
  };
  recognition.onresult = (e: any) => {
    const raw = (e.results?.[0]?.[0]?.transcript || '').trim();
    applyResult(raw);
  };
  recognition.onerror = (e: any) => {
    isRecording = false;
    $('micBtn').classList.remove('recording');
    $('micLabel').textContent = '按住说话';
    $('rawBox').classList.remove('active');
    if (e.error !== 'no-speech' && e.error !== 'aborted') showToast('识别出错: ' + e.error);
  };
  recognition.onend = () => {
    isRecording = false;
    $('micBtn').classList.remove('recording');
    $('micLabel').textContent = '按住说话';
    $('rawBox').classList.remove('active');
  };
}

function applyResult(raw: string) {
  $('rawBox').textContent = raw || '（未识别到内容）';
  if (!raw) return;
  const { html, used } = correctWithHints(raw);
  $('fixedBox').innerHTML = '<span>' + highlightTerms(html) + '</span>';
  if (used.length > 0) {
    $('correctHint').style.display = 'flex';
    $('correctHintText').textContent = `本次自动修正 ${used.length} 处`;
  } else {
    $('correctHint').style.display = 'none';
  }
}

function startRecording(e?: Event) {
  if (e) e.preventDefault();
  if (!recognition) return;
  if (isRecording) { recognition.stop(); return; }
  try { recognition.start(); } catch { showToast('无法启动识别'); }
}
function stopRecording(e?: Event) {
  if (e) e.preventDefault();
  if (!recognition || !isRecording) return;
  try { recognition.stop(); } catch {}
}

// ── 自我学习 ──
function saveLearn() {
  const raw = $('rawBox').textContent;
  const fixed = $('fixedBox').textContent;
  if (!raw || raw === '按住麦克风，说一段服装行业的话…') { showToast('没有内容'); return; }
  if (learnCorrection(raw, fixed)) {
    showToast('已学习，下次自动修正 ✨');
    updateStatsUI();
  } else {
    showToast('内容与原始一致，无需学习');
  }
}
function updateStatsUI() {
  const d = loadUserData();
  $('statsLearned').textContent = `已学习 ${d.stats.learned} 条`;
  $('statsUsed').textContent = `今日修正 ${d.stats.usedToday} 次`;
}

// ── 工具 ──
function copyFixed() {
  const text = $('fixedBox').textContent;
  if (!text) { showToast('没有内容'); return; }
  navigator.clipboard.writeText(text).then(() => showToast('已复制'));
}
function clearAll() {
  $('rawBox').textContent = '按住麦克风，说一段服装行业的话…';
  $('fixedBox').innerHTML = '<span></span>';
  $('correctHint').style.display = 'none';
}
function showToast(msg: string, duration = 2000) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── 历史抽屉 ──
function openDrawer() {
  renderDrawer();
  $('drawerOverlay').classList.add('open');
  $('drawer').classList.add('open');
}
function closeDrawer() {
  $('drawerOverlay').classList.remove('open');
  $('drawer').classList.remove('open');
}
function escHtml(s: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function renderDrawer() {
  const d = loadUserData();
  const hist = d.history || [];
  const body = $('drawerBody');
  if (hist.length === 0) {
    body.innerHTML = '<div class="history-empty">还没有学习记录<br><br>修正转写结果时，系统会自动学习</div>';
    return;
  }
  body.innerHTML = hist.slice(0, 50).map((h, i) => `
    <div class="history-item">
      <div class="history-meta">${new Date(h.ts).toLocaleString('zh-CN')}</div>
      <div><span class="history-from">${escHtml(h.from)}</span> → <span class="history-to">${escHtml(h.to)}</span></div>
      <button class="history-del" onclick="deleteHistory(${i})">删除</button>
    </div>`).join('');
}
(window as any).deleteHistory = function (idx: number) {
  const d = loadUserData();
  d.history.splice(idx, 1);
  saveUserData(d);
  userData = d;
  renderDrawer();
  updateStatsUI();
};
(window as any).openDrawer = openDrawer;
(window as any).closeDrawer = closeDrawer;
(window as any).clearAll = clearAll;
(window as any).copyFixed = copyFixed;
(window as any).saveLearn = saveLearn;
(window as any).startRecording = startRecording;
(window as any).stopRecording = stopRecording;
(window as any).toggleXunfei = toggleXunfei;
(window as any).switchASR = switchASR;
(window as any).exportHistory = exportHistory;

// ── 讯飞云（浏览器/PWA 可用，原生隐藏）──
let xfyunConfigured = false;
let xfyunKeys: any = null;
let currentASR = 'local';
function checkXunfeiConfig() {
  const cfg = loadXfyun();
  if (cfg) { xfyunConfigured = true; xfyunKeys = cfg; }
  if (isNativeSpeech()) {
    // 原生包内不暴露讯飞云切换（走原生系统识别）
    $('xfyunBtn').style.display = 'none';
    $('asrToggle').style.display = 'none';
  } else if (xfyunConfigured) {
    $('asrToggle').style.display = 'flex';
    $('xfyunBtn').style.display = 'flex';
  }
}
function toggleXunfei() {
  if (!xfyunConfigured) showXunfeiConfig();
}
function showXunfeiConfig() {
  const appId = prompt('讯飞 APPID（留空清除）:', xfyunKeys?.appId || '');
  if (appId === null) return;
  if (!appId.trim()) {
    saveXfyun(null);
    xfyunConfigured = false; xfyunKeys = null;
    $('asrToggle').style.display = 'none';
    showToast('讯飞配置已清除');
    return;
  }
  const apiKey = prompt('讯飞 API Key:');
  if (!apiKey) return;
  const apiSecret = prompt('讯飞 API Secret:');
  if (!apiSecret) return;
  const cfg = { appId: appId.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };
  saveXfyun(cfg);
  xfyunKeys = cfg; xfyunConfigured = true;
  $('asrToggle').style.display = 'flex';
  showToast('讯飞配置已保存');
}
function switchASR(mode: string) {
  currentASR = mode;
  $('localBtn').classList.toggle('active', mode === 'local');
  $('cloudBtn').classList.toggle('active', mode === 'cloud');
  $('asrLabel').textContent = mode === 'local' ? '本地' : '讯飞';
}

function exportHistory() {
  const d = loadUserData();
  const hist = d.history || [];
  const corrs = d.corrections || {};
  const lines = ['# 服装语音转写 · 自我学习记录', '', '## 修正规则'];
  for (const [k, v] of Object.entries(corrs)) lines.push(`${k}\t${v}`);
  lines.push('', '## 历史', '');
  hist.forEach((h) => lines.push(`${new Date(h.ts).toLocaleString('zh-CN')}\t${h.from}\t${h.to}`));
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fz_asr_learn_' + Date.now() + '.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('已导出学习记录');
}

// ── 启动 ──
initSR();
checkXunfeiConfig();
updateStatsUI();
