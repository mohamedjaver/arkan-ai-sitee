/* ═══════════════════════════════════════════════════════════
   ARKAN CORE — العمود الفقري الموحّد
   تستورده كل الصفحات. مصدر واحد للحقيقة:
   Firebase · الأسعار · الشرائح · الربح · الجلسة · الدوال المشتركة
   الاستخدام:  import * as ARKAN from './arkan-core.js';
   ═══════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

/* ── 1) إعداد Firebase (مكان واحد لكل الموقع) ── */
export const firebaseConfig = {
  apiKey: "AIzaSyCtL-OySTK9FeyD0h-31BiupYFtGBxbJ_U",
  authDomain: "arkan-rates-prod.firebaseapp.com",
  projectId: "arkan-rates-prod",
  storageBucket: "arkan-rates-prod.firebasestorage.app",
  messagingSenderId: "1039254650364",
  appId: "1:1039254650364:web:7972ce9eb77c24004d0679"
};
export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// تصدير دوال Firestore لإعادة استخدامها بلا استيراد متكرر
export { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp,
         onAuthStateChanged, signInWithEmailAndPassword, signOut };

/* ── 2) الثوابت الموحّدة ── */
export const WA = '22236295050';
export const ADMIN_EMAILS = ['mohamedarbi0208@gmail.com'];
export const isAdminEmail = e => !!e && ADMIN_EMAILS.includes(e.toLowerCase());
export const RATES_URL = 'rates-data.json';

export const FLAGS = { USDT:'tether', MRU:'mr', USD:'us', EUR:'eu', CNY:'cn', AED:'ae', AOA:'ao', GBP:'gb', SAR:'sa', MAD:'ma', TRY:'tr' };
export const NAMES = {
  USDT:'تيثر', MRU:'أوقية موريتانية', USD:'دولار أمريكي', EUR:'يورو', CNY:'يوان صيني',
  AED:'درهم إماراتي', AOA:'كوانزا أنغولي', GBP:'جنيه إسترليني', SAR:'ريال سعودي', MAD:'درهم مغربي', TRY:'ليرة تركية'
};

/* ── 3) الدوال المشتركة ── */
export const fmt = (v, dp = 2) =>
  Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—';
export const normPhone = p => (p || '').replace(/[^\d]/g, '');
export const makePin = () => String(Math.floor(1000 + Math.random() * 9000));
export const makeRef = () => 'AK' + Date.now().toString(36).toUpperCase().slice(-6);
export function flagHTML(cc, cls = '') {
  if (cc === 'USDT') return `<div class="flag tether ${cls}">₮</div>`;
  return `<div class="flag ${cls}" style="background-image:url('https://flagcdn.com/w160/${FLAGS[cc] || ''}.png')"></div>`;
}
export function toast(msg, ms = 2600) {
  let t = document.getElementById('arkan-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'arkan-toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;max-width:390px;'
      + 'padding:14px 18px;border-radius:14px;background:#131A2E;border:1px solid rgba(245,201,76,.3);'
      + 'color:#F4F6FB;font-family:"IBM Plex Sans Arabic",sans-serif;font-size:14px;display:none;text-align:center';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(() => t.style.display = 'none', ms);
}

/* ── 4) محرك الأسعار والربح (مصدر واحد) ── */
export let RATES = {};       // ccy -> {w,m,r,thr,thrM,buy}
export let RATES_META = {};  // {wa, date, ts}
const rateListeners = [];

export function onRatesChange(fn) { rateListeners.push(fn); if (Object.keys(RATES).length) fn(RATES, RATES_META); }

export async function loadRates() {
  try {
    const res = await fetch(RATES_URL + '?t=' + Date.now(), { cache: 'no-store' });
    const d = await res.json();
    const map = { MRU: { w:1, m:1, r:1, thr:0, thrM:0, buy:1 } };
    (d.r || []).forEach(x => map[x.ccy] = { w:+x.w, m:+x.m, r:+x.r, thr:+x.thr||0, thrM:+x.thrM||0, buy:+x.buy||0 });
    if (!map.USD && map.USDT) map.USD = { ...map.USDT };
    RATES = map;
    RATES_META = { wa: d.wa || WA, date: d.date || '', ts: d.ts || null };
    rateListeners.forEach(fn => { try { fn(RATES, RATES_META); } catch(e){ console.warn(e); } });
    return RATES;
  } catch (e) { console.warn('loadRates failed', e); return RATES; }
}

// اختيار الشريحة حسب المبلغ
export function arkTier(cc, amt) {
  const r = RATES[cc]; if (!r) return 'r';
  if (r.thr && amt >= r.thr) return 'w';
  if (r.thrM && amt >= r.thrM) return 'm';
  return 'r';
}
export const TIER_AR = { w: 'جملة', m: 'وسيط', r: 'تجزئة' };

// حساب الحوالة + الربح
export function arkCompute(from, to, amount) {
  const src = (from !== 'MRU') ? from : to;
  const R = RATES[src];
  if (!R) return { tier: 'r', sellRate: 0, buyRate: 0, received: 0, profit: 0 };
  const tier = arkTier(src, amount);
  const sell = R[tier];
  const buy  = R.buy || 0;
  let received, profit;
  if (from !== 'MRU') {
    received = to === 'MRU' ? amount * sell : amount * (sell / (RATES[to]?.[tier] || 1));
    profit   = amount * (sell - buy);
  } else {
    received = amount / sell;
    profit   = received * (sell - buy);
  }
  return { tier, sellRate: sell, buyRate: buy, received, profit: Math.max(0, profit) };
}

// سعر بسيط بين عملتين (للحاسبة)
export function rate(from, to, amount = 0) {
  return arkCompute(from, to, amount).received / (amount || 1);
}

/* ── 5) نظام جلسة العميل (واتساب + رمز) ── */
export function getSession() {
  try { return JSON.parse(localStorage.getItem('arkan_session') || 'null'); } catch { return null; }
}
export function saveSession(phone, pin) { localStorage.setItem('arkan_session', JSON.stringify({ phone, pin })); }
export function clearSession() { localStorage.removeItem('arkan_session'); }

export async function clientLogin(phone, pin) {
  phone = normPhone(phone);
  const snap = await getDoc(doc(db, 'users', phone));
  if (!snap.exists() || String(snap.data().pin) !== String(pin)) return null;
  saveSession(phone, pin);
  return { phone, ...snap.data() };
}

// إنشاء/جلب عميل + تسجيل حوالة (يُستخدم في نموذج الطلب)
export async function createTransferRequest({ name, phone, from, to, amount }) {
  phone = normPhone(phone);
  const uref = doc(db, 'users', phone);
  const snap = await getDoc(uref);
  let pin, ref;
  if (snap.exists()) { pin = snap.data().pin; ref = snap.data().ref; }
  else {
    pin = makePin(); ref = makeRef();
    await setDoc(uref, { name, phone, pin, ref, balance: 0, role: 'client', status: 'pending', createdAt: serverTimestamp() });
  }
  const comp = arkCompute(from, to, amount);
  await addDoc(collection(db, 'transactions'), {
    uid: phone, clientName: name, clientRef: ref, from, to, amount, received: comp.received,
    tier: comp.tier, sellRate: comp.sellRate, buyRate: comp.buyRate, profit: Math.round(comp.profit),
    type: 'out', dp: 2, status: 'pending', createdAt: serverTimestamp()
  });
  return { pin, ref, received: comp.received, tier: comp.tier };
}

/* ── 6) رابط واتساب موحّد ── */
export function waLink(msg) { return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`; }

/* تحميل الأسعار تلقائياً عند الاستيراد */
loadRates();
