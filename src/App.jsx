import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Camera, Check, CheckCircle2, X, Lock, Settings, Plus, Trash2, Star,
  Clock, ChevronRight, ShoppingBag, Coins, Sparkles, ArrowLeft, CalendarDays, Package
} from 'lucide-react';

/* ============================== constantes ============================== */

const RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];
const RANK_COLOR = { E: '#9A93B3', D: '#4DE8D8', C: '#6C4DF6', B: '#C770F0', A: '#F5B14C', S: '#FF6B6B' };
const PERIOD_ORDER = ['Manhã', 'Tarde', 'Noite'];

function rankForLevel(level) {
  if (level >= 120) return 'S';
  if (level >= 80) return 'A';
  if (level >= 50) return 'B';
  if (level >= 25) return 'C';
  if (level >= 10) return 'D';
  return 'E';
}
function xpNeeded(level) { return 60 + (level - 1) * 22; }
function uid() { return Math.random().toString(36).slice(2, 10); }
function pad2(n) { return String(n).padStart(2, '0'); }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function timeNowLabel() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
function timeToMinutes(t) {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return h * 60 + m;
}
function fmtDatePt(key) {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

function defaultConfig() {
  return {
    pin: '0711',
    missions: [
      { id: uid(), title: 'Escovar os dentes', icon: '🪥', period: 'Manhã', type: 'photo', xp: 1, coins: 2 },
      { id: uid(), title: 'Tomar banho', icon: '🚿', period: 'Manhã', type: 'toggle', xp: 1, coins: 2 },
      { id: uid(), title: 'Arrumar a mochila', icon: '🎒', period: 'Manhã', type: 'photo', xp: 1, coins: 1 },
      { id: uid(), title: 'Arrumar a cama', icon: '🛏️', period: 'Manhã', type: 'photo', xp: 1, coins: 2 },
      { id: uid(), title: 'Remédio antes do almoço', icon: '💊', period: 'Tarde', type: 'medication', xp: 2, coins: 1, start: '11:30', end: '13:00' },
      { id: uid(), title: 'Fazer a lição de casa', icon: '📚', period: 'Tarde', type: 'photo', xp: 2, coins: 1 },
      { id: uid(), title: 'Remédio antes do jantar', icon: '💊', period: 'Noite', type: 'medication', xp: 2, coins: 1, start: '18:00', end: '19:30' },
      { id: uid(), title: 'Escovar os dentes', icon: '🪥', period: 'Noite', type: 'photo', xp: 1, coins: 1 },
    ],
    shop: [
      { id: uid(), title: '30 min extra de jogo', icon: '🎮', cost: 50 },
      { id: uid(), title: 'Escolher o jantar de hoje', icon: '🍕', cost: 70 },
      { id: uid(), title: 'Escolher o filme da família', icon: '🎬', cost: 90 },
      { id: uid(), title: 'Passeio no fim de semana', icon: '🌳', cost: 200 },
    ],
  };
}
function defaultAvatar() { return { level: 1, xp: 0, coins: 0 }; }

/* ============================== storage (window.storage API) ============================== */

async function loadKey(key, fallback) {
  try {
    const result = await window.storage.get(key);
    return result ? JSON.parse(result.value) : fallback;
  } catch {
    return fallback;
  }
}

async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.error('storage error', key, e);
  }
}

/* ============================== imagem ============================== */

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 480;
        let { width, height } = img;
        if (width > height) { if (width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; } }
        else { if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; } }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ============================== css ============================== */

const APP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Orbitron:wght@700;800;900&display=swap');

@keyframes shakeIt {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-8px)}
  40%{transform:translateX(8px)}
  60%{transform:translateX(-5px)}
  80%{transform:translateX(5px)}
}

.quest-app{
  --void:#14101F; --void-soft:#1E1830; --void-card:#241D3A;
  --mana:#6C4DF6; --mana-soft:rgba(108,77,246,0.18);
  --ember:#F5B14C; --spectral:#4DE8D8; --mist:#9A93B3; --paper:#F4F1F9; --danger:#FF6B6B;
  font-family:'Baloo 2', system-ui, sans-serif;
  background:radial-gradient(120% 100% at 50% -10%, var(--mana-soft), transparent 60%), var(--void);
  color:var(--paper);
  min-height:600px;
  width:100%;
  display:flex; justify-content:center;
  padding:18px 12px 90px;
  box-sizing:border-box;
}
.quest-app *{box-sizing:border-box;}
.quest-shell{ width:100%; max-width:440px; }
.quest-display{ font-family:'Orbitron', sans-serif; }
.quest-header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.quest-title{ font-size:15px; letter-spacing:0.06em; text-transform:uppercase; color:var(--mist); font-weight:700; }
.quest-switch{ display:flex; align-items:center; gap:6px; background:var(--void-soft); border:1px solid rgba(255,255,255,0.08);
  color:var(--paper); padding:8px 12px; border-radius:999px; font-family:'Baloo 2'; font-weight:700; font-size:13px; cursor:pointer; }
.quest-switch:focus-visible, .qbtn:focus-visible, .qcard:focus-visible, input:focus-visible, select:focus-visible{
  outline:2px solid var(--spectral); outline-offset:2px; }

/* ---- login ---- */
.login-panel{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  min-height:500px; gap:18px; text-align:center;
}
.login-panel h1{
  font-family:'Orbitron', sans-serif; font-size:28px; font-weight:900;
  background:linear-gradient(135deg, var(--mana), var(--spectral));
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  margin:0 0 8px;
}
.login-subtitle{
  font-size:13px; color:var(--mist); margin:-10px 0 10px;
}
.login-btn{
  width:100%; max-width:280px; padding:15px 20px;
  border:none; border-radius:16px; cursor:pointer;
  font-family:'Baloo 2'; font-weight:800; font-size:16px;
  display:flex; align-items:center; justify-content:center; gap:10px;
  transition:transform .15s, box-shadow .15s;
}
.login-btn:active{ transform:scale(0.97); }
.login-btn.child{
  background:linear-gradient(135deg, var(--mana), #9B5CF6);
  color:white;
  box-shadow:0 8px 24px rgba(108,77,246,0.4);
}
.login-btn.parent{
  background:var(--void-card);
  border:1px solid rgba(255,255,255,0.1);
  color:var(--paper);
}

/* ---- avatar ---- */
.avatar-card{ position:relative; background:linear-gradient(160deg, var(--void-card), var(--void-soft));
  border:1px solid rgba(255,255,255,0.06); border-radius:24px; padding:18px; display:flex; align-items:center; gap:16px; margin-bottom:18px; overflow:hidden; }
.avatar-card.sm{ padding:12px; gap:12px; }
.avatar-card::before{ content:''; position:absolute; inset:0; background:radial-gradient(circle at 14% 20%, var(--rank-glow) 0%, transparent 55%); opacity:0.35; }
.aura-wrap{ position:relative; width:78px; height:78px; flex:none; }
.avatar-card.sm .aura-wrap{ width:54px; height:54px; }
.aura-ring{ position:absolute; inset:0; border-radius:50%; border:2px dashed var(--rank-glow); animation:spin 16s linear infinite; opacity:0.8; }
.aura-ring.r2{ inset:8px; border-style:solid; opacity:0.5; animation-duration:10s; animation-direction:reverse; }
@keyframes spin{ to{ transform:rotate(360deg); } }
.avatar-figure{ position:absolute; inset:14px; border-radius:50%; background:var(--void); display:flex; align-items:center; justify-content:center;
  box-shadow:0 0 18px var(--rank-glow), inset 0 0 10px var(--rank-glow); }
.avatar-figure svg{ width:60%; height:60%; }
.avatar-info{ flex:1; min-width:0; }
.rank-row{ display:flex; align-items:center; gap:8px; margin-bottom:2px; }
.rank-badge{ font-family:'Orbitron'; font-weight:900; font-size:13px; color:var(--void); background:var(--rank-glow);
  width:22px; height:22px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex:none; }
.level-label{ font-family:'Orbitron'; font-weight:700; font-size:13px; color:var(--paper); }
.xp-track{ width:100%; height:8px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden; margin:6px 0; }
.xp-fill{ height:100%; border-radius:999px; background:linear-gradient(90deg, var(--rank-glow), var(--spectral)); transition:width .4s ease; }
.xp-label{ font-size:11px; color:var(--mist); margin-top:-2px; margin-bottom:4px; }
.coin-row{ display:flex; align-items:center; gap:6px; color:var(--ember); font-weight:700; font-size:13px; }

.med-banner{ display:flex; align-items:center; gap:10px; background:var(--mana-soft); border:1px solid var(--mana);
  border-radius:16px; padding:12px 14px; margin-bottom:14px; }
.med-banner b{ display:block; font-size:13px; }
.med-banner span{ font-size:12px; color:var(--mist); }

.period-label{ font-size:12px; letter-spacing:0.1em; text-transform:uppercase; color:var(--mist); font-weight:700;
  margin:18px 4px 8px; display:flex; align-items:center; gap:8px; }
.period-label::after{ content:''; flex:1; height:1px; background:rgba(255,255,255,0.08); }

.qcard{ background:var(--void-card); border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:13px 14px;
  display:flex; align-items:center; gap:12px; margin-bottom:10px; }
.qcard.done{ opacity:0.55; }
.qicon{ font-size:24px; width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,0.05);
  display:flex; align-items:center; justify-content:center; flex:none; }
.qbody{ flex:1; min-width:0; }
.qtitle{ font-weight:700; font-size:14.5px; }
.qmeta{ font-size:12px; color:var(--mist); display:flex; gap:8px; align-items:center; margin-top:2px; }
.qbtn{ border:none; cursor:pointer; font-family:'Baloo 2'; font-weight:700; border-radius:12px; padding:9px 12px; font-size:13px;
  display:flex; align-items:center; gap:6px; flex:none; }
.qbtn.primary{ background:var(--mana); color:white; }
.qbtn.toggle{ background:var(--spectral); color:var(--void); }
.qbtn.done{ background:rgba(255,255,255,0.06); color:var(--spectral); }
.qbtn.ghost{ background:transparent; border:1px solid rgba(255,255,255,0.15); color:var(--paper); }
.qbtn.danger{ background:rgba(255,107,107,0.15); color:var(--danger); }
.qthumb{ width:34px; height:34px; border-radius:9px; object-fit:cover; flex:none; }

.fab{ position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--ember); color:var(--void);
  border:none; border-radius:999px; padding:13px 22px; font-weight:800; font-family:'Baloo 2'; display:flex; gap:8px;
  align-items:center; box-shadow:0 8px 24px rgba(245,177,76,0.35); cursor:pointer; z-index:30; }

.overlay{ position:fixed; inset:0; background:rgba(10,8,18,0.72); display:flex; align-items:flex-end; justify-content:center;
  z-index:50; backdrop-filter:blur(2px); }
.sheet{ width:100%; max-width:460px; background:var(--void-soft); border-radius:24px 24px 0 0; padding:20px; max-height:85vh;
  overflow-y:auto; animation:rise .25s ease; }
@keyframes rise{ from{ transform:translateY(24px); opacity:0;} to{ transform:translateY(0); opacity:1;} }
.sheet-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.sheet-title{ font-weight:800; font-size:16px; }
.iconbtn{ background:rgba(255,255,255,0.06); border:none; color:var(--paper); width:32px; height:32px; border-radius:10px;
  display:flex; align-items:center; justify-content:center; cursor:pointer; }

.pin-dots{ display:flex; gap:10px; justify-content:center; margin:18px 0; }
.pin-dot{ width:14px; height:14px; border-radius:50%; border:2px solid var(--mist); }
.pin-dot.filled{ background:var(--mana); border-color:var(--mana); }
.pin-pad{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.pin-key{ background:var(--void-card); border:1px solid rgba(255,255,255,0.08); color:var(--paper); font-size:18px;
  font-weight:700; padding:14px 0; border-radius:14px; cursor:pointer; font-family:'Orbitron'; }

.toast{ position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:var(--void-card); border:1px solid var(--rank-glow, var(--mana));
  color:var(--paper); padding:10px 18px; border-radius:999px; font-weight:700; font-size:13px; z-index:60; box-shadow:0 6px 18px rgba(0,0,0,0.4);
  white-space:nowrap; }

.levelup{ position:fixed; inset:0; background:rgba(10,8,18,0.85); z-index:70; display:flex; align-items:center; justify-content:center; flex-direction:column; text-align:center; gap:6px; padding:24px; }
.levelup .big{ font-family:'Orbitron'; font-weight:900; font-size:42px; color:var(--ember); text-shadow:0 0 24px var(--ember); }

.tabs{ display:flex; gap:6px; margin-bottom:16px; overflow-x:auto; }
.tab{ flex:none; background:var(--void-soft); border:1px solid rgba(255,255,255,0.07); color:var(--mist); font-family:'Baloo 2';
  font-weight:700; font-size:12.5px; padding:9px 13px; border-radius:999px; cursor:pointer; display:flex; gap:6px; align-items:center; }
.tab.active{ background:var(--mana); color:white; border-color:var(--mana); }

.field-row{ display:flex; gap:8px; margin-bottom:8px; }
.field{ flex:1; min-width:0; }
.field label{ display:block; font-size:11px; color:var(--mist); margin-bottom:4px; }
.field input, .field select{ width:100%; background:var(--void); border:1px solid rgba(255,255,255,0.1); color:var(--paper);
  border-radius:10px; padding:8px 10px; font-family:'Baloo 2'; font-size:13px; }

.empty{ text-align:center; padding:30px 10px; color:var(--mist); font-size:13px; }
.danger-zone{ margin-top:24px; border-top:1px dashed rgba(255,107,107,0.3); padding-top:14px; }

@media (prefers-reduced-motion: reduce){
  .aura-ring{ animation:none; }
  .sheet{ animation:none; }
}
`;

/* ============================== sub-componentes ============================== */

function AvatarFigure() {
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="34" r="16" fill="currentColor" />
      <path d="M20 92c2-22 16-34 30-34s28 12 30 34" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

function AvatarCard({ avatar, small }) {
  const rank = rankForLevel(avatar.level);
  const need = xpNeeded(avatar.level);
  const pct = Math.min(100, Math.round((avatar.xp / need) * 100));
  return (
    <div className={`avatar-card${small ? ' sm' : ''}`} style={{ '--rank-glow': RANK_COLOR[rank] }}>
      <div className="aura-wrap">
        <div className="aura-ring" />
        <div className="aura-ring r2" />
        <div className="avatar-figure" style={{ color: RANK_COLOR[rank] }}>
          <AvatarFigure />
        </div>
      </div>
      <div className="avatar-info">
        <div className="rank-row">
          <span className="rank-badge">{rank}</span>
          <span className="level-label quest-display">NÍVEL {avatar.level}</span>
        </div>
        <div className="xp-track"><div className="xp-fill" style={{ width: pct + '%' }} /></div>
        <div className="xp-label">{avatar.xp} / {need} XP</div>
        <div className="coin-row"><Coins size={14} /> {avatar.coins} pontos</div>
      </div>
    </div>
  );
}

function PinModal({ pin, onSuccess, onClose }) {
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(false);

  const press = (d) => {
    const next = (value + d).slice(0, 4);
    setValue(next);
    if (next.length === 4) {
      if (next === pin) {
        onSuccess();
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setValue(''); }, 400);
      }
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, borderRadius: 24, textAlign: 'center' }}>
        <div className="sheet-head">
          <span className="sheet-title">Área dos responsáveis</span>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>
        <Lock size={28} style={{ margin: '8px auto', display: 'block', color: 'var(--mana)' }} />
        <div className="pin-dots" style={{ animation: shake ? 'shakeIt .4s' : 'none' }}>
          {[0, 1, 2, 3].map(i => <div key={i} className={`pin-dot${value.length > i ? ' filled' : ''}`} />)}
        </div>
        <div className="pin-pad">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} className="pin-key" onClick={() => press(d)}>{d}</button>
          ))}
          <div />
          <button className="pin-key" onClick={() => press('0')}>0</button>
          <button className="pin-key" onClick={() => setValue(v => v.slice(0, -1))}>⌫</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== app principal ============================== */

export default function QuestApp() {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState(null);
  const [avatar, setAvatar] = useState(defaultAvatar());
  const [completions, setCompletions] = useState({});
  const [redemptions, setRedemptions] = useState([]);

  const [view, setView] = useState('login'); // 'login' | 'child' | 'parent'
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [tab, setTab] = useState('missoes');

  const [shopOpen, setShopOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const [historyDate, setHistoryDate] = useState(todayKey());
  const [historyData, setHistoryData] = useState({});
  const [resetStep, setResetStep] = useState(0);

  const fileRef = useRef(null);
  const pendingMissionRef = useRef(null);

  /* ---- load inicial ---- */
  useEffect(() => {
    (async () => {
      const [cfg, av, comp, red] = await Promise.all([
        loadKey('config', defaultConfig()),
        loadKey('avatar', defaultAvatar()),
        loadKey(`completions:${todayKey()}`, {}),
        loadKey('redemptions', []),
      ]);
      setConfig(cfg);
      setAvatar(av);
      setCompletions(comp);
      setRedemptions(red);
      setReady(true);
    })();
  }, []);

  /* ---- toast auto-dismiss ---- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---- histórico ---- */
  useEffect(() => {
    if (view !== 'parent' || tab !== 'historico') return;
    loadKey(`completions:${historyDate}`, {}).then(setHistoryData);
  }, [historyDate, tab, view]);

  const grantReward = useCallback((xpGain, coinGain) => {
    setAvatar(prev => {
      let { level, xp, coins } = prev;
      xp += xpGain;
      coins += coinGain;
      let leveledUp = false;
      while (xp >= xpNeeded(level)) { xp -= xpNeeded(level); level += 1; leveledUp = true; }
      const next = { level, xp, coins };
      saveKey('avatar', next);
      if (leveledUp) setLevelUpInfo({ level });
      setToast({ msg: `+${xpGain} XP   +${coinGain} pontos` });
      return next;
    });
  }, []);

  const completeMission = useCallback((mission) => {
    setCompletions(prev => {
      const next = { ...prev, [mission.id]: { done: true, time: timeNowLabel() } };
      saveKey(`completions:${todayKey()}`, next);
      return next;
    });
    grantReward(mission.xp, mission.coins);
  }, [grantReward]);

  const openCamera = (mission) => { pendingMissionRef.current = mission; fileRef.current?.click(); };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const mission = pendingMissionRef.current;
    if (!file || !mission) return;
    try {
      await compressImage(file);
      completeMission(mission);
    } catch {
      setToast({ msg: 'Não consegui salvar a foto, tenta de novo' });
    }
  };

  const purchaseItem = (item) => {
    if (avatar.coins < item.cost) { setToast({ msg: 'Ainda não tem pontos suficientes' }); return; }
    const next = { ...avatar, coins: avatar.coins - item.cost };
    setAvatar(next);
    saveKey('avatar', next);
    const entry = {
      id: uid(), title: item.title, icon: item.icon, cost: item.cost,
      date: `${fmtDatePt(todayKey())} ${timeNowLabel()}`, fulfilled: false,
    };
    const list = [entry, ...redemptions];
    setRedemptions(list);
    saveKey('redemptions', list);
    setShopOpen(false);
    setToast({ msg: 'Combinado! Mostra pro responsável 🎉' });
  };

  const fulfillRedemption = (id) => {
    const list = redemptions.map(r => r.id === id ? { ...r, fulfilled: true } : r);
    setRedemptions(list);
    saveKey('redemptions', list);
  };

  const updateConfig = (next) => { setConfig(next); saveKey('config', next); };
  const updateMission = (id, patch) => updateConfig({ ...config, missions: config.missions.map(m => m.id === id ? { ...m, ...patch } : m) });
  const addMission = () => updateConfig({ ...config, missions: [...config.missions, { id: uid(), title: 'Nova missão', icon: '⭐', period: 'Manhã', type: 'photo', xp: 10, coins: 5 }] });
  const deleteMission = (id) => updateConfig({ ...config, missions: config.missions.filter(m => m.id !== id) });
  const updateShopItem = (id, patch) => updateConfig({ ...config, shop: config.shop.map(s => s.id === id ? { ...s, ...patch } : s) });
  const addShopItem = () => updateConfig({ ...config, shop: [...config.shop, { id: uid(), title: 'Nova recompensa', icon: '🎁', cost: 50 }] });
  const deleteShopItem = (id) => updateConfig({ ...config, shop: config.shop.filter(s => s.id !== id) });

  const resetAll = async () => {
    const cfg = defaultConfig();
    const av = defaultAvatar();
    await Promise.all([
      saveKey('config', cfg),
      saveKey('avatar', av),
      saveKey(`completions:${todayKey()}`, {}),
      saveKey('redemptions', []),
    ]);
    setConfig(cfg); setAvatar(av); setCompletions({}); setRedemptions([]);
    setResetStep(0);
    setToast({ msg: 'Tudo zerado' });
  };

  const medAlerts = useMemo(() => {
    if (!config?.missions) return [];
    const m = nowMinutes();
    return config.missions.filter(ms =>
      ms.type === 'medication' && !completions[ms.id]?.done &&
      m >= timeToMinutes(ms.start) - 10 && m <= timeToMinutes(ms.end)
    );
  }, [config, completions]);

  const grouped = useMemo(() => {
    const g = {}; PERIOD_ORDER.forEach(p => g[p] = []);
    (config?.missions || []).forEach(m => { (g[m.period] || (g[m.period] = [])).push(m); });
    return g;
  }, [config]);

  const pendingRedemptions = redemptions.filter(r => !r.fulfilled);
  const fulfilledRedemptions = redemptions.filter(r => r.fulfilled);

  /* ============================== renders ============================== */

  if (!ready) {
    return (
      <div className="quest-app">
        <style>{APP_CSS}</style>
        <div className="quest-shell"><div className="empty">Carregando missões…</div></div>
      </div>
    );
  }

  /* ---- tela de login ---- */
  if (view === 'login') {
    return (
      <div className="quest-app">
        <style>{APP_CSS}</style>
        <div className="quest-shell">
          <div className="login-panel">
            <h1 className="quest-display">Quest Kids</h1>
            <p className="login-subtitle">Missões do dia, recompensas e diversão!</p>

            <button className="login-btn child" onClick={() => setView('child')}>
              🧒 Entrar como Criança
            </button>

            <button className="login-btn parent" onClick={() => {
              if (parentUnlocked) setView('parent');
              else setShowPin(true);
            }}>
              <Lock size={16} /> Entrar como Responsável
            </button>
          </div>
        </div>

        {showPin && (
          <PinModal
            pin={config.pin}
            onClose={() => setShowPin(false)}
            onSuccess={() => {
              setParentUnlocked(true);
              setShowPin(false);
              setView('parent');
            }}
          />
        )}
      </div>
    );
  }

  /* ---- views child / parent ---- */
  return (
    <div className="quest-app">
      <style>{APP_CSS}</style>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChange} />

      <div className="quest-shell">
        <div className="quest-header">
          <span className="quest-title quest-display">
            {view === 'child' ? 'Missões do Dia' : 'Painel da Família'}
          </span>
          <button className="quest-switch" onClick={() => {
            if (view === 'child') {
              if (parentUnlocked) setView('parent');
              else setShowPin(true);
            } else {
              setView('login');
            }
          }}>
            {view === 'child' ? <Settings size={15} /> : <ArrowLeft size={15} />}
            {view === 'child' ? 'Responsável' : 'Voltar'}
          </button>
        </div>

        <AvatarCard avatar={avatar} small={view === 'parent'} />

        {/* ===== VIEW CRIANÇA ===== */}
        {view === 'child' && (
          <>
            {medAlerts.map(m => (
              <div className="med-banner" key={m.id}>
                <Clock size={20} color="var(--mana)" />
                <div>
                  <b>{m.title}</b>
                  <span>Já tomou? Toca em "Foto" pra confirmar</span>
                </div>
              </div>
            ))}

            {PERIOD_ORDER.map(period => grouped[period]?.length ? (
              <div key={period}>
                <div className="period-label">{period}</div>
                {grouped[period].map(mission => {
                  const done = completions[mission.id]?.done;
                  return (
                    <div className={`qcard${done ? ' done' : ''}`} key={mission.id}>
                      <div className="qicon">{mission.icon}</div>
                      <div className="qbody">
                        <div className="qtitle">{mission.title}</div>
                        <div className="qmeta">
                          {mission.type === 'medication' && <><Clock size={12} />{mission.start}–{mission.end}</>}
                          {!done && <span>+{mission.xp} XP · +{mission.coins} pts</span>}
                          {done && <span>Feito às {completions[mission.id].time}</span>}
                        </div>
                      </div>
                      {done ? (
                        <span className="qbtn done"><CheckCircle2 size={16} />OK</span>
                      ) : mission.type === 'toggle' ? (
                        <button className="qbtn toggle" onClick={() => completeMission(mission)}><Check size={15} />Feito</button>
                      ) : (
                        <button className="qbtn primary" onClick={() => openCamera(mission)}><Camera size={15} />Foto</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null)}

            <button className="fab" onClick={() => setShopOpen(true)}>
              <ShoppingBag size={17} />Loja de recompensas
            </button>
          </>
        )}

        {/* ===== VIEW RESPONSÁVEL ===== */}
        {view === 'parent' && (
          <>
            <div className="tabs">
              <button className={`tab${tab === 'missoes' ? ' active' : ''}`} onClick={() => setTab('missoes')}><Star size={13} />Missões</button>
              <button className={`tab${tab === 'loja' ? ' active' : ''}`} onClick={() => setTab('loja')}><ShoppingBag size={13} />Loja</button>
              <button className={`tab${tab === 'historico' ? ' active' : ''}`} onClick={() => setTab('historico')}><CalendarDays size={13} />Histórico</button>
              <button className={`tab${tab === 'resgates' ? ' active' : ''}`} onClick={() => setTab('resgates')}>
                <Package size={13} />Resgates{pendingRedemptions.length > 0 ? ` (${pendingRedemptions.length})` : ''}
              </button>
            </div>

            {/* ---- aba missões ---- */}
            {tab === 'missoes' && (
              <>
                {config.missions.map(m => (
                  <div className="qcard" key={m.id} style={{ flexWrap: 'wrap' }}>
                    <div style={{ width: '100%' }}>
                      <div className="field-row">
                        <div className="field" style={{ flex: '0 0 56px' }}>
                          <label>Ícone</label>
                          <input value={m.icon} onChange={e => updateMission(m.id, { icon: e.target.value })} />
                        </div>
                        <div className="field">
                          <label>Título</label>
                          <input value={m.title} onChange={e => updateMission(m.id, { title: e.target.value })} />
                        </div>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>Período</label>
                          <select value={m.period} onChange={e => updateMission(m.id, { period: e.target.value })}>
                            {PERIOD_ORDER.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Confirmação</label>
                          <select value={m.type} onChange={e => updateMission(m.id, { type: e.target.value })}>
                            <option value="photo">Com foto</option>
                            <option value="toggle">Só marcar</option>
                            <option value="medication">Remédio (horário)</option>
                          </select>
                        </div>
                      </div>
                      {m.type === 'medication' && (
                        <div className="field-row">
                          <div className="field"><label>A partir de</label><input type="time" value={m.start || ''} onChange={e => updateMission(m.id, { start: e.target.value })} /></div>
                          <div className="field"><label>Até</label><input type="time" value={m.end || ''} onChange={e => updateMission(m.id, { end: e.target.value })} /></div>
                        </div>
                      )}
                      <div className="field-row">
                        <div className="field"><label>XP</label><input type="number" value={m.xp} onChange={e => updateMission(m.id, { xp: Number(e.target.value) })} /></div>
                        <div className="field"><label>Pontos</label><input type="number" value={m.coins} onChange={e => updateMission(m.id, { coins: Number(e.target.value) })} /></div>
                        <button className="qbtn danger" style={{ alignSelf: 'flex-end' }} onClick={() => deleteMission(m.id)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="qbtn ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={addMission}><Plus size={15} />Nova missão</button>

                <div className="danger-zone">
                  {resetStep === 0
                    ? <button className="qbtn danger" onClick={() => setResetStep(1)}><Trash2 size={14} />Apagar todos os dados</button>
                    : (
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--mist)', marginBottom: 8 }}>Isso apaga missões, nível, pontos e histórico. Confirma?</p>
                        <button className="qbtn danger" onClick={resetAll}>Sim, apagar tudo</button>{' '}
                        <button className="qbtn ghost" onClick={() => setResetStep(0)}>Cancelar</button>
                      </div>
                    )}
                </div>
              </>
            )}

            {/* ---- aba loja ---- */}
            {tab === 'loja' && (
              <>
                {config.shop.map(s => (
                  <div className="qcard" key={s.id} style={{ flexWrap: 'wrap' }}>
                    <div style={{ width: '100%' }}>
                      <div className="field-row">
                        <div className="field" style={{ flex: '0 0 56px' }}><label>Ícone</label><input value={s.icon} onChange={e => updateShopItem(s.id, { icon: e.target.value })} /></div>
                        <div className="field"><label>Recompensa</label><input value={s.title} onChange={e => updateShopItem(s.id, { title: e.target.value })} /></div>
                      </div>
                      <div className="field-row">
                        <div className="field"><label>Custo em pontos</label><input type="number" value={s.cost} onChange={e => updateShopItem(s.id, { cost: Number(e.target.value) })} /></div>
                        <button className="qbtn danger" style={{ alignSelf: 'flex-end' }} onClick={() => deleteShopItem(s.id)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="qbtn ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={addShopItem}><Plus size={15} />Nova recompensa</button>
              </>
            )}

            {/* ---- aba histórico ---- */}
            {tab === 'historico' && (
              <>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Ver o dia</label>
                  <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} />
                </div>
                {config.missions.map(m => {
                  const c = historyData[m.id];
                  return (
                    <div className="qcard" key={m.id}>
                      <div className="qicon">{m.icon}</div>
                      <div className="qbody">
                        <div className="qtitle">{m.title}</div>
                        <div className="qmeta">{c?.done ? `Feito às ${c.time}` : 'Não feito'}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ---- aba resgates ---- */}
            {tab === 'resgates' && (
              <>
                {pendingRedemptions.length === 0 && <div className="empty">Nenhum resgate pendente</div>}
                {pendingRedemptions.map(r => (
                  <div className="qcard" key={r.id}>
                    <div className="qicon">{r.icon}</div>
                    <div className="qbody"><div className="qtitle">{r.title}</div><div className="qmeta">{r.cost} pontos · {r.date}</div></div>
                    <button className="qbtn primary" onClick={() => fulfillRedemption(r.id)}><Check size={14} />Entreguei</button>
                  </div>
                ))}
                {fulfilledRedemptions.length > 0 && <div className="period-label">Já entregues</div>}
                {fulfilledRedemptions.map(r => (
                  <div className="qcard done" key={r.id}>
                    <div className="qicon">{r.icon}</div>
                    <div className="qbody"><div className="qtitle">{r.title}</div><div className="qmeta">{r.cost} pontos · {r.date}</div></div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* ===== LOJA MODAL ===== */}
      {shopOpen && (
        <div className="overlay" onClick={() => setShopOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-head">
              <span className="sheet-title">🛒 Loja de recompensas</span>
              <button className="iconbtn" onClick={() => setShopOpen(false)}><X size={16} /></button>
            </div>
            <div className="coin-row" style={{ marginBottom: 12 }}><Coins size={15} />{avatar.coins} pontos disponíveis</div>
            {config.shop.map(item => (
              <div className="qcard" key={item.id}>
                <div className="qicon">{item.icon}</div>
                <div className="qbody"><div className="qtitle">{item.title}</div><div className="qmeta">{item.cost} pontos</div></div>
                <button
                  className="qbtn primary"
                  disabled={avatar.coins < item.cost}
                  style={avatar.coins < item.cost ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                  onClick={() => purchaseItem(item)}
                >Trocar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== PIN MODAL ===== */}
      {showPin && (
        <PinModal
          pin={config.pin}
          onClose={() => setShowPin(false)}
          onSuccess={() => {
            setParentUnlocked(true);
            setShowPin(false);
            setView('parent');
          }}
        />
      )}

      {/* ===== LEVEL UP ===== */}
      {levelUpInfo && (
        <div className="levelup" onClick={() => setLevelUpInfo(null)}>
          <Sparkles size={36} color="var(--ember)" />
          <div className="big quest-display">LEVEL UP!</div>
          <div style={{ fontSize: 18 }}>Agora você é nível {levelUpInfo.level}</div>
          <div style={{ fontSize: 13, color: 'var(--mist)', marginTop: 8 }}>Toca em qualquer lugar pra continuar</div>
        </div>
      )}

      {/* ===== TOAST ===== */}
      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  );
}
