"use strict";
/* 우리집 학원 매니저 — 데이터는 이 기기의 브라우저 저장소(localStorage)에만 저장됩니다. */

const KEY = "academy-planner-v1";
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const addMonths = (m, n) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const daysInMonth = m => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
const toMin = t => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + m; };
const fromMin = m => { m = ((m % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
const won = n => `${Math.round(Number(n) || 0).toLocaleString("ko-KR")}원`;
const man = n => (n % 10000 === 0 && n !== 0) ? `${(n / 10000).toLocaleString("ko-KR")}만원` : won(n);
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayStr = () => ymd(new Date());
const fmtDate = s => { const d = parseYmd(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
const fmtShort = s => { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmtMonth = m => `${m.slice(0, 4)}년 ${Number(m.slice(5))}월`;
const CARD = { samsung: "삼성카드", shinhan: "신한카드", transfer: "계좌이체", cash: "현금" };
const MODE = { always: "학원 갈 때마다 픽업", monthly: "월별 입력 일정만 픽업", none: "픽업 없음" };
const NOT_GUARDIAN = { shuttle: "학원 차량", self: "혼자 이동", none: "필요 없음" };

/* ---------- 저장 ---------- */
const COLLS = ["children", "guardians", "academies", "classes", "exceptions", "adhoc", "monthlyPlans", "fees", "payments"];
function normalize(d) {
  d = d && typeof d === "object" ? d : {};
  COLLS.forEach(c => { if (!Array.isArray(d[c])) d[c] = []; });
  if (!d.pickups || typeof d.pickups !== "object") d.pickups = {};
  d.settings = { samsungTarget: 700000, discountRate: 10, bufferMin: 10, ...(d.settings || {}) };
  return d;
}
function load() { try { const s = localStorage.getItem(KEY); return s ? normalize(JSON.parse(s)) : null; } catch (e) { return null; } }
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast("이 브라우저에서는 저장할 수 없어요"); } }
function save() { saveLocal(); schedulePush(); }

function seed() {
  const c1 = uid(), c2 = uid();
  const a = { math: uid(), eng: uid(), kor: uid(), tkd: uid(), piano: uid(), art: uid() };
  const month = todayStr().slice(0, 7);
  const cls = (childId, academyId, weekdays, start, end) => ({ id: uid(), childId, academyId, weekdays, start, end, validFrom: "", validTo: "" });
  const fee = (academyId, childId, amount, dueDay) => ({ id: uid(), academyId, childId, amount, dueDay });
  const plan = (weekday, time, place) => ({ id: uid(), childId: c1, month, weekday, time, place, leg: "하원", travelMin: 15 });
  return {
    version: 1,
    children: [
      { id: c1, name: "첫째", grade: "중3", color: "#2b6fd6", pickupMode: "monthly" },
      { id: c2, name: "둘째", grade: "초1", color: "#e0703a", pickupMode: "always" },
    ],
    guardians: [{ id: uid(), name: "엄마" }, { id: uid(), name: "아빠" }, { id: uid(), name: "할머니" }],
    academies: [
      { id: a.math, name: "수학학원", subject: "수학", phone: "", address: "", shuttle: false, travelMin: 15 },
      { id: a.eng, name: "영어학원", subject: "영어", phone: "", address: "", shuttle: false, travelMin: 20 },
      { id: a.kor, name: "국어학원", subject: "국어", phone: "", address: "", shuttle: false, travelMin: 15 },
      { id: a.tkd, name: "태권도", subject: "체육", phone: "", address: "", shuttle: true, travelMin: 10 },
      { id: a.piano, name: "피아노", subject: "음악", phone: "", address: "", shuttle: false, travelMin: 10 },
      { id: a.art, name: "미술학원", subject: "미술", phone: "", address: "", shuttle: false, travelMin: 10 },
    ],
    classes: [
      cls(c1, a.math, [1, 3, 5], "19:00", "22:00"),
      cls(c1, a.eng, [2, 4], "18:00", "21:00"),
      cls(c1, a.kor, [6], "10:00", "12:00"),
      cls(c2, a.tkd, [1, 2, 3, 4, 5], "14:00", "15:00"),
      cls(c2, a.piano, [1, 3, 5], "15:10", "16:00"),
      cls(c2, a.art, [2, 4], "15:30", "16:30"),
    ],
    exceptions: [], adhoc: [], pickups: {},
    monthlyPlans: [plan(1, "22:00", "수학학원"), plan(2, "21:00", "영어학원"), plan(3, "22:00", "수학학원"), plan(5, "22:00", "수학학원")],
    fees: [
      fee(a.math, c1, 400000, 5), fee(a.eng, c1, 300000, 10), fee(a.kor, c1, 250000, 15),
      fee(a.tkd, c2, 150000, 1), fee(a.piano, c2, 150000, 20), fee(a.art, c2, 140000, 25),
    ],
    payments: [],
    settings: { samsungTarget: 700000, discountRate: 10, bufferMin: 10 },
  };
}

/* 예시 데이터: 이번 달 결제일이 이미 지난 학원비는 추천 카드로 결제한 것으로 표시 */
function seedDemo() {
  db = seed();
  const m = todayStr().slice(0, 7);
  ensurePayments(m);
  const al = allocate(m);
  db.payments.filter(p => p.month === m && p.due < todayStr()).forEach(p => Object.assign(p, { paid: true, card: al.map[p.id], paidAt: p.due }));
  save();
}
let db = load();
const view = { tab: "today", date: todayStr(), month: todayStr().slice(0, 7), setSec: "family", planMonth: todayStr().slice(0, 7) };

const child = id => db.children.find(c => c.id === id);
const acad = id => db.academies.find(a => a.id === id);
const guardian = id => db.guardians.find(g => g.id === id);

/* ---------- 일정 ---------- */
function sessionsOn(date) {
  const wd = parseYmd(date).getDay();
  const out = [];
  for (const c of db.classes) {
    if (!child(c.childId)) continue;
    const ex = db.exceptions.filter(e => e.classId === c.id && e.date === date);
    const inRange = !(c.validFrom && date < c.validFrom) && !(c.validTo && date > c.validTo);
    if (inRange && c.weekdays.includes(wd)) {
      const cancel = ex.find(e => e.type === "cancel"), change = ex.find(e => e.type === "change");
      out.push({ key: c.id, classId: c.id, childId: c.childId, academyId: c.academyId,
        start: change ? change.start : c.start, end: change ? change.end : c.end,
        cancelled: !!cancel, changed: !!change, exId: (cancel || change)?.id });
    }
    for (const e of ex.filter(e => e.type === "extra")) {
      out.push({ key: `${c.id}-x${e.id}`, classId: c.id, childId: c.childId, academyId: c.academyId, start: e.start, end: e.end, extra: true, exId: e.id });
    }
  }
  return out.sort((x, y) => x.start.localeCompare(y.start));
}

/* ---------- 픽업 ---------- */
function makeTask(date, ref, ch, leg, time, place, shuttle, travelMin) {
  const key = `${date}|${ref}`;
  const o = db.pickups[key] || {};
  const assignee = o.assignee !== undefined ? o.assignee : (shuttle ? "shuttle" : "");
  const travel = Number(travelMin) || 15;
  return { key, childId: ch.id, leg, time, place: place || "", assignee, done: !!o.done, travel,
    depart: fromMin(toMin(time) - travel - (Number(db.settings.bufferMin) || 0)) };
}
const byGuardian = t => !!guardian(t.assignee);
const isUnassigned = t => !t.assignee || (!guardian(t.assignee) && !NOT_GUARDIAN[t.assignee]);

function pickupsOn(date) {
  const month = date.slice(0, 7), wd = parseYmd(date).getDay();
  const sessions = sessionsOn(date).filter(s => !s.cancelled);
  const tasks = [], missing = [];
  for (const ch of db.children) {
    if (ch.pickupMode === "always") {
      const ss = sessions.filter(s => s.childId === ch.id);
      ss.forEach((s, i) => {
        const ac = acad(s.academyId), prev = ss[i - 1], next = ss[i + 1];
        if (!prev || toMin(s.start) - toMin(prev.end) > 30) {
          tasks.push(makeTask(date, `${s.key}|in`, ch, "등원", s.start, ac?.name, ac?.shuttle, ac?.travelMin));
        }
        if (next && toMin(next.start) - toMin(s.end) <= 30) {
          const nac = acad(next.academyId);
          tasks.push(makeTask(date, `${s.key}|move`, ch, "이동", s.end, `${ac?.name} → ${nac?.name}`, ac?.shuttle || nac?.shuttle, nac?.travelMin));
        } else {
          tasks.push(makeTask(date, `${s.key}|out`, ch, "하원", s.end, ac?.name, ac?.shuttle, ac?.travelMin));
        }
      });
    } else if (ch.pickupMode === "monthly") {
      const plans = db.monthlyPlans.filter(p => p.childId === ch.id && p.month === month);
      if (!plans.length) missing.push(ch);
      plans.filter(p => p.weekday === wd).forEach(p => tasks.push(makeTask(date, `plan-${p.id}`, ch, p.leg || "하원", p.time, p.place, false, p.travelMin)));
    }
  }
  for (const a of db.adhoc.filter(a => a.date === date)) {
    const ch = child(a.childId);
    if (ch) tasks.push({ ...makeTask(date, `adhoc-${a.id}`, ch, "추가 픽업", a.time, a.place, false, a.travelMin), adhocId: a.id });
  }
  tasks.sort((x, y) => x.time.localeCompare(y.time));
  // 같은 보호자가 이동 시간 안에 다른 장소의 픽업을 또 맡으면 충돌
  const groups = {};
  tasks.filter(byGuardian).forEach(t => (groups[t.assignee] = groups[t.assignee] || []).push(t));
  Object.values(groups).forEach(list => {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      if (a.place !== b.place && toMin(b.time) - toMin(a.time) < b.travel) { a.conflict = b.conflict = true; }
    }
  });
  return { tasks, missing };
}

/* ---------- 학원비 ---------- */
function ensurePayments(month) {
  let changed = false;
  const dim = daysInMonth(month);
  for (const f of db.fees) {
    const due = `${month}-${pad(Math.min(Math.max(1, Number(f.dueDay) || 1), dim))}`;
    const p = db.payments.find(p => p.feeId === f.id && p.month === month);
    if (!p) {
      // 기기마다 같은 id가 나오게 해서, 두 기기가 동시에 만들어도 중복되지 않게
      db.payments.push({ id: `${f.id}-${month}`, feeId: f.id, month, academyId: f.academyId, childId: f.childId, label: "", amount: Number(f.amount) || 0,
        category: "수강료", due, paid: false, card: "", paidAt: "", pinCard: "", custom: false });
      changed = true;
    } else if (!p.paid && !p.custom && (p.amount !== Number(f.amount) || p.due !== due || p.academyId !== f.academyId || p.childId !== f.childId)) {
      Object.assign(p, { amount: Number(f.amount) || 0, due, academyId: f.academyId, childId: f.childId });
      changed = true;
    }
  }
  const before = db.payments.length;
  db.payments = db.payments.filter(p => p.paid || !p.feeId || db.fees.some(f => f.id === p.feeId));
  if (db.payments.length !== before) changed = true;
  if (changed) save();
}

/* 삼성카드: 학원비 합계가 정확히 목표액(70만원)이 되는 조합 → 없으면 목표액을 넘는 조합 중 가장 작은 것.
   같은 금액이면 학원 수가 적은 조합. 나머지는 신한카드. */
function allocate(month) {
  const T = Number(db.settings.samsungTarget) || 0;
  const pays = db.payments.filter(p => p.month === month);
  const map = {};
  let fixed = 0;
  const open = [];
  for (const p of pays) {
    if (p.paid) { map[p.id] = p.card; if (p.card === "samsung") fixed += p.amount; }
    else if (p.pinCard) { map[p.id] = p.pinCard; if (p.pinCard === "samsung") fixed += p.amount; }
    else open.push(p);
  }
  const need = T - fixed;
  let pick = [];
  if (need > 0 && open.length) {
    const total = open.reduce((s, p) => s + p.amount, 0);
    if (total <= need) pick = open.slice();
    else if (open.length <= 20) {
      let best = null;
      const n = open.length;
      for (let m = 1; m < (1 << n); m++) {
        let s = 0, c = 0;
        for (let i = 0; i < n; i++) if (m & (1 << i)) { s += open[i].amount; c++; }
        if (s < need) continue;
        if (!best || s < best.s || (s === best.s && c < best.c)) best = { m, s, c };
      }
      pick = open.filter((_, i) => best.m & (1 << i));
    } else {
      let s = 0;
      for (const p of open.slice().sort((x, y) => y.amount - x.amount)) { if (s >= need) break; pick.push(p); s += p.amount; }
    }
  }
  pick.forEach(p => (map[p.id] = "samsung"));
  open.forEach(p => { if (!map[p.id]) map[p.id] = "shinhan"; });
  const sum = pred => pays.filter(pred).reduce((s, p) => s + p.amount, 0);
  const samsungTotal = sum(p => map[p.id] === "samsung");
  return {
    map, target: T, samsungTotal,
    samsungPaid: sum(p => p.paid && p.card === "samsung"),
    status: samsungTotal === T ? "exact" : samsungTotal > T ? "over" : "short",
    samsungItems: pays.filter(p => map[p.id] === "samsung"),
  };
}
const payName = p => p.label || acad(p.academyId)?.name || "학원비";

/* ---------- 알림 ---------- */
function alertsFor(date) {
  const out = [];
  const { tasks, missing } = pickupsOn(date);
  const un = tasks.filter(isUnassigned);
  if (un.length) out.push({ k: "bad", msg: `담당자가 없는 픽업이 ${un.length}건 있어요. 아래에서 담당자를 골라 주세요.` });
  const conf = tasks.filter(t => t.conflict);
  if (conf.length) out.push({ k: "bad", msg: `같은 사람이 맡은 픽업 시간이 너무 가까워요: ${conf.map(t => `${t.time} ${child(t.childId)?.name}`).join(", ")}` });
  missing.forEach(ch => out.push({ k: "warn", msg: `${Number(date.slice(5, 7))}월 ${ch.name}(${ch.grade}) 픽업 일정이 아직 없어요.`, plans: date.slice(0, 7) }));
  if (date !== todayStr()) return out;

  const d = parseYmd(date), month = date.slice(0, 7);
  if (d.getDate() >= 25) {
    const nm = addMonths(month, 1);
    db.children.filter(c => c.pickupMode === "monthly" && !db.monthlyPlans.some(p => p.childId === c.id && p.month === nm))
      .forEach(c => out.push({ k: "warn", msg: `다음 달(${Number(nm.slice(5))}월) ${c.name} 픽업 일정을 입력할 때예요.`, plans: nm }));
  }
  const tm = pickupsOn(addDays(date, 1)).tasks.filter(isUnassigned).length;
  if (tm) out.push({ k: "warn", msg: `내일 담당자가 없는 픽업이 ${tm}건 있어요.` });

  ensurePayments(month);
  const al = allocate(month);
  const unpaid = db.payments.filter(p => p.month === month && !p.paid).sort((a, b) => a.due.localeCompare(b.due));
  const late = unpaid.filter(p => p.due < date);
  if (late.length) out.push({ k: "bad", msg: `결제일이 지난 학원비 ${late.length}건: ${late.map(p => `${payName(p)} ${man(p.amount)}`).join(", ")}`, fees: true });
  unpaid.filter(p => p.due >= date).forEach(p => {
    const diff = Math.round((parseYmd(p.due) - parseYmd(date)) / 864e5);
    if (diff <= 3) out.push({ k: "warn", msg: `${diff === 0 ? "오늘" : `D-${diff}`} ${payName(p)} ${man(p.amount)} · ${CARD[al.map[p.id]] || ""}로 결제`, fees: true });
  });
  const left = daysInMonth(month) - d.getDate();
  if (left <= 7 && al.samsungPaid < al.target) {
    out.push({ k: "warn", msg: `삼성카드 할인 조건(${man(al.target)})까지 ${won(al.target - al.samsungPaid)} 남았어요.`, fees: true });
  }
  return out;
}

/* ---------- 가족 공유 (Supabase) ----------
   가족 하나 = ap_families 한 줄(data: 앱 데이터 전체). 저장할 때 버전을 확인하고,
   다른 기기가 먼저 저장했으면 바뀐 항목끼리 합친 뒤 다시 저장한다. */
const SUPABASE_URL = "https://avvmycgqrvpzkpzecbwr.supabase.co";
const SUPABASE_KEY = "sb_publishable_O_ndK-wY7oMYAf1B0oi6OA__chheIsz";
const SKEY = "academy-planner-sync-v1";
const clone = o => JSON.parse(JSON.stringify(o));
// DB(jsonb)는 키 순서를 바꿔서 돌려주므로, 키를 정렬한 문자열로 비교
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v;
const sig = v => JSON.stringify(canon(v));
const same = (a, b) => sig(a) === sig(b);
const sync = { sb: null, st: loadSync(), status: "local", err: "", channel: null, timer: null, busy: false, pendingPull: false };
function loadSync() { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } }
function saveSync() { try { localStorage.setItem(SKEY, JSON.stringify(sync.st)); } catch (e) {} }

const SYNC_TEXT = { local: "이 기기에만 저장", synced: "가족과 공유됨", saving: "저장 중…", offline: "오프라인 · 연결되면 올라가요", error: "동기화 오류" };
function setStatus(s, e) { sync.status = s; sync.err = e ? String(e.message || e) : ""; paintSync(); }
function paintSync() {
  const el = $("#sync"); if (!el) return;
  const s = sync.st.familyId ? sync.status : "local";
  el.textContent = SYNC_TEXT[s] || "";
  el.className = `syncbadge ${s === "synced" ? "ok" : s === "saving" || s === "offline" ? "busy" : s === "error" ? "bad" : ""}`;
}
function friendly(e) {
  const m = String(e?.message || e);
  if (/invalid join code/i.test(m)) return "초대 코드가 맞지 않아요.";
  if (/anonymous/i.test(m)) return "Supabase에서 익명 로그인이 꺼져 있어요.";
  if (/fetch|network|Failed/i.test(m) || !navigator.onLine) return "인터넷 연결을 확인해 주세요.";
  if (/family-missing/.test(m)) return "가족 데이터를 찾지 못했어요. 초대 코드로 다시 들어가 주세요.";
  return "오류: " + m;
}

/* 세 갈래 합치기: base(마지막으로 맞춘 상태) 대비 이 기기에서 바뀐 것만 remote에 얹는다 */
function merge3(base, local, remote) {
  base = base || {};
  const out = normalize(clone(remote));
  for (const c of COLLS) {
    const b = new Map((base[c] || []).map(x => [x.id, sig(x)]));
    const l = local[c] || [], lids = new Set(l.map(x => x.id));
    let r = out[c];
    for (const id of b.keys()) if (!lids.has(id)) r = r.filter(x => x.id !== id);
    for (const x of l) {
      if (b.get(x.id) === sig(x)) continue;
      const i = r.findIndex(y => y.id === x.id);
      if (i >= 0) r[i] = clone(x); else r.push(clone(x));
    }
    out[c] = r;
  }
  const bp = base.pickups || {}, lp = local.pickups || {};
  for (const k of new Set([...Object.keys(bp), ...Object.keys(lp)])) {
    if (same(lp[k], bp[k])) continue;
    if (lp[k] === undefined) delete out.pickups[k]; else out.pickups[k] = clone(lp[k]);
  }
  const bs = base.settings || {};
  for (const k of Object.keys(local.settings || {})) if (!same(bs[k], local.settings[k])) out.settings[k] = local.settings[k];
  return out;
}

async function ensureAuth() {
  if (!window.supabase) throw new Error("network");
  sync.sb = sync.sb || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: { session } } = await sync.sb.auth.getSession();
  if (session) return session.user;
  const { data, error } = await sync.sb.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}
async function fetchRemote(retry = true) {
  const { data, error } = await sync.sb.from("ap_families").select("data,version").eq("id", sync.st.familyId).maybeSingle();
  if (error) throw error;
  if (!data && retry && sync.st.joinCode) {
    // 이 기기의 로그인이 초기화된 경우: 저장해 둔 초대 코드로 자동 재가입
    const { error: e2 } = await sync.sb.rpc("ap_join_family", { code: sync.st.joinCode, member_name: sync.st.name || "" });
    if (e2) throw e2;
    return fetchRemote(false);
  }
  if (!data) throw new Error("family-missing");
  return { data: normalize(data.data), version: data.version };
}
function applyRemote(remote) {
  const dirty = !same(db, sync.st.base);
  db = dirty ? merge3(sync.st.base, db, remote.data) : clone(remote.data);
  sync.st.base = clone(remote.data);
  sync.st.version = remote.version;
  saveSync(); saveLocal();
  if (dirty) schedulePush();
}
async function pull() {
  if (!sync.st.familyId || !sync.sb) return;
  if ($("#dlg").open) { sync.pendingPull = true; return; } // 입력 창을 닫은 뒤에 반영
  const remote = await fetchRemote();
  if (remote.version === sync.st.version) return;
  applyRemote(remote);
  render();
}
function schedulePush() {
  if (!sync.st.familyId) return;
  clearTimeout(sync.timer);
  if (!same(db, sync.st.base)) setStatus("saving");
  sync.timer = setTimeout(() => push().catch(() => {}), 700);
}
async function push() {
  if (!sync.st.familyId || !sync.sb || sync.busy) return;
  if (same(db, sync.st.base)) { setStatus("synced"); return; }
  sync.busy = true; setStatus("saving");
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const sending = clone(db);
      const { data: v, error } = await sync.sb.rpc("ap_save", { fid: sync.st.familyId, new_data: sending, base_version: sync.st.version });
      if (error) throw error;
      if (v) { sync.st.version = v; sync.st.base = sending; saveSync(); break; }
      applyRemote(await fetchRemote()); // 다른 기기가 먼저 저장함 → 합치고 다시
      render();
    }
    setStatus(same(db, sync.st.base) ? "synced" : "saving");
  } catch (e) {
    setStatus(navigator.onLine ? "error" : "offline", e);
  } finally {
    sync.busy = false;
  }
  if (!same(db, sync.st.base) && sync.status !== "error" && sync.status !== "offline") schedulePush();
}
function subscribe() {
  if (!sync.sb || !sync.st.familyId) return;
  if (sync.channel) sync.sb.removeChannel(sync.channel);
  sync.channel = sync.sb.channel(`ap-${sync.st.familyId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ap_families", filter: `id=eq.${sync.st.familyId}` }, () => pull().catch(() => {}))
    .subscribe();
}
async function syncStart() {
  paintSync();
  if (!sync.st.familyId) return;
  try {
    await ensureAuth();
    subscribe();
    await pull();
    await push();
    if (same(db, sync.st.base)) setStatus("synced");
  } catch (e) {
    setStatus(navigator.onLine ? "error" : "offline", e);
  }
}
async function loadMembers() {
  const el = $("#members");
  if (!el || !sync.sb) return;
  const { data, error } = await sync.sb.from("ap_members").select("name,joined_at").eq("family_id", sync.st.familyId).order("joined_at");
  if (error || !$("#members")) return;
  $("#members").innerHTML = data.map(m => `<div class="li"><b>${esc(m.name || "이름 없음")}</b><span class="small muted">${m.joined_at.slice(0, 10)} 연결</span></div>`).join("") || `<div class="empty">없음</div>`;
}
function runAsync(fn) { fn().catch(e => { toast(friendly(e)); render(); }); }

function renderFamily() {
  const st = sync.st;
  if (st.familyId) {
    return `<section class="card"><h2>가족 공유 <small>${esc(SYNC_TEXT[sync.status] || "")}</small></h2>
      <p class="small muted" style="margin:0">배우자 휴대폰에서 이 앱을 열고 설정 → 가족 공유에 아래 초대 코드를 넣으면 같은 일정과 학원비를 함께 봐요.</p>
      <div class="code">${esc(st.joinCode)}</div>
      ${sync.err ? `<div class="alert bad">${esc(friendly(sync.err))}</div>` : ""}
      <div class="row wrapflex"><button class="btn primary" data-act="copycode">코드 복사</button><button class="btn" data-act="syncnow">지금 동기화</button></div></section>
      <section class="card"><h2>연결된 사람</h2><div class="list" id="members"><div class="empty">불러오는 중…</div></div></section>
      <section class="card"><h2>연결 끊기</h2><p class="small muted" style="margin-top:0">이 기기만 가족 공유에서 빠져요. 가족 데이터는 그대로 남아요.</p>
      <button class="btn danger" data-act="leave">이 기기 연결 끊기</button></section>`;
  }
  return `<section class="card"><h2>가족 공유 <small>지금은 이 기기에만 저장</small></h2>
      <p class="small muted" style="margin-top:0">가족을 만들면 이 기기의 데이터가 올라가고 초대 코드가 생겨요. 예시 데이터라면 먼저 백업 → 모두 지우기 후 실제 정보를 넣고 만드세요.</p>
      <div class="stack"><input class="inp" id="myname" placeholder="이 기기 사용자 (예: 엄마)" value="${esc(st.name || "")}">
      <button class="btn primary" data-act="createfamily">가족 만들기</button></div></section>
    <section class="card"><h2>초대 코드로 들어가기</h2>
      <p class="small muted" style="margin-top:0">가족이 이미 있으면 받은 코드를 넣으세요. 이 기기에 있던 데이터는 가족 데이터로 바뀌어요.</p>
      <div class="stack"><input class="inp" id="joinname" placeholder="이 기기 사용자 (예: 아빠)">
      <input class="inp" id="joincode" placeholder="초대 코드 8자리" maxlength="8" autocomplete="off" style="letter-spacing:.15em;text-transform:uppercase">
      <button class="btn primary" data-act="joinfamily">들어가기</button></div></section>`;
}

/* ---------- 화면 ---------- */
function render() {
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === view.tab));
  const titles = { today: "오늘", week: "주간 일정", fees: "학원비", settings: "설정" };
  $("#title").textContent = titles[view.tab];
  $("#datenav").hidden = view.tab === "settings";
  const main = $("#main");
  if (view.tab === "today") { $("#datelabel").textContent = fmtDate(view.date); main.innerHTML = renderToday(); }
  if (view.tab === "week") { const s = weekStart(view.date); $("#datelabel").textContent = `${fmtShort(s)} – ${fmtShort(addDays(s, 6))}`; main.innerHTML = renderWeek(); }
  if (view.tab === "fees") { $("#datelabel").textContent = fmtMonth(view.month); main.innerHTML = renderFees(); }
  if (view.tab === "settings") {
    main.innerHTML = renderSettings();
    if (view.setSec === "family" && sync.st.familyId) loadMembers().catch(() => {});
  }
  paintSync();
}

function alertHtml(a) {
  const btn = a.plans ? `<button class="btn sm" data-act="goplans" data-month="${a.plans}" style="margin-left:auto">입력</button>`
    : a.fees ? `<button class="btn sm" data-act="gofees" style="margin-left:auto">보기</button>` : "";
  return `<div class="alert ${a.k}"><span>${esc(a.msg)}</span>${btn}</div>`;
}

function renderToday() {
  const d = view.date;
  let h = d !== todayStr() ? `<div style="margin-bottom:10px"><button class="btn sm" data-act="gotoday">오늘로 돌아가기</button></div>` : "";
  h += alertsFor(d).map(alertHtml).join("");

  const { tasks } = pickupsOn(d);
  const need = tasks.filter(t => byGuardian(t) || isUnassigned(t));
  h += `<section class="card"><h2><span>픽업 <small>보호자 픽업 ${need.length}건</small></span><button class="btn sm" data-act="addadhoc">+ 픽업 추가</button></h2>`;
  if (!tasks.length) h += `<div class="empty">이 날은 픽업이 없어요.</div>`;
  for (const t of tasks) {
    const ch = child(t.childId);
    const cls = ["pickup", isUnassigned(t) ? "need" : "", t.conflict ? "conflict" : "", t.done ? "done" : ""].join(" ");
    const opts = [["", "담당자 선택"], ...db.guardians.map(g => [g.id, g.name]), ...Object.entries(NOT_GUARDIAN)]
      .map(([v, l]) => `<option value="${v}" ${t.assignee === v ? "selected" : ""}>${esc(l)}</option>`).join("");
    h += `<div class="${cls}">
      <div class="row between"><div><span class="dot" style="background:${ch.color}"></span> <b>${esc(ch.name)}</b> ${esc(t.leg)} <span class="muted">· ${esc(t.place)}</span></div><b>${t.time}</b></div>
      <div class="row between" style="margin-top:6px">
        <div class="row"><select data-pick="${esc(t.key)}" aria-label="담당자">${opts}</select>
        ${byGuardian(t) ? `<span class="small muted">${t.depart} 출발</span>` : ""}</div>
        <div class="row">
        ${t.conflict ? `<span class="badge b-cancel">시간 겹침</span>` : ""}
        ${byGuardian(t) ? `<label class="check small"><input type="checkbox" data-done="${esc(t.key)}" ${t.done ? "checked" : ""}> 완료</label>` : ""}
        ${t.adhocId ? `<button class="btn ghost sm danger" data-act="deladhoc" data-id="${t.adhocId}">삭제</button>` : ""}</div>
      </div></div>`;
  }
  h += `</section>`;

  const ss = sessionsOn(d);
  h += `<section class="card"><h2>학원 일정 <button class="btn sm" data-act="addextra">+ 보강</button></h2>`;
  if (!ss.length) h += `<div class="empty">이 날은 학원 일정이 없어요.</div>`;
  for (const s of ss) {
    const ch = child(s.childId), ac = acad(s.academyId);
    const btns = s.extra ? `<button class="btn sm" data-act="delex" data-id="${s.exId}">보강 삭제</button>`
      : (s.cancelled || s.changed) ? `<button class="btn sm" data-act="delex" data-id="${s.exId}">원래대로</button>`
      : `<button class="btn sm" data-act="cancel" data-class="${s.classId}">오늘 휴강</button><button class="btn sm" data-act="change" data-class="${s.classId}">시간 변경</button>`;
    h += `<div class="item ${s.cancelled ? "cancelled" : ""}"><div class="time">${s.start}–${s.end}</div>
      <div class="body"><div class="title"><span class="dot" style="background:${ch.color}"></span> ${esc(ch.name)} · ${esc(ac?.name)}${s.extra ? `<span class="badge b-extra">보강</span>` : ""}${s.changed ? `<span class="badge b-change">시간 변경</span>` : ""}${s.cancelled ? `<span class="badge b-cancel">휴강</span>` : ""}</div>
      <div class="row wrapflex" style="margin-top:6px">${btns}</div></div></div>`;
  }
  return h + `</section>`;
}

function weekStart(date) { const wd = parseYmd(date).getDay(); return addDays(date, wd === 0 ? -6 : 1 - wd); }

function renderWeek() {
  const s = weekStart(view.date), t = todayStr();
  let h = `<div class="week">`;
  for (let i = 0; i < 7; i++) {
    const d = addDays(s, i);
    const ss = sessionsOn(d).filter(x => !x.cancelled);
    const { tasks } = pickupsOn(d);
    const need = tasks.filter(x => byGuardian(x) || isUnassigned(x)).length, un = tasks.filter(isUnassigned).length;
    h += `<div class="day ${d === t ? "today" : ""}" data-act="openday" data-date="${d}">
      <h3><span>${fmtDate(d)}</span><span class="small ${un ? "" : "muted"}" style="${un ? "color:var(--bad)" : ""}">픽업 ${need}건${un ? ` · 미배정 ${un}` : ""}</span></h3>
      ${ss.length ? ss.map(x => { const ch = child(x.childId); return `<span class="chip"><span class="dot" style="background:${ch.color}"></span>${x.start} ${esc(acad(x.academyId)?.name)}${x.extra ? " (보강)" : ""}</span>`; }).join("") : `<span class="small muted">일정 없음</span>`}
    </div>`;
  }
  return h + `</div>`;
}

function renderFees() {
  const m = view.month;
  ensurePayments(m);
  const al = allocate(m);
  const pays = db.payments.filter(p => p.month === m).sort((a, b) => a.due.localeCompare(b.due));
  const total = pays.reduce((s, p) => s + p.amount, 0), paid = pays.filter(p => p.paid).reduce((s, p) => s + p.amount, 0);
  const T = al.target, rate = Number(db.settings.discountRate) || 0;
  const pctPaid = T ? Math.min(100, al.samsungPaid / T * 100) : 0, pctPlan = T ? Math.min(100, al.samsungTotal / T * 100) : 0;
  const msg = al.status === "exact" ? { k: "good", t: `삼성카드 학원비를 ${man(T)}에 정확히 맞췄어요. 할인 ${won(T * rate / 100)} 조건 충족.` }
    : al.status === "over" ? { k: "warn", t: `정확히 ${man(T)}이 되는 조합이 없어 ${won(al.samsungTotal - T)} 넘는 조합을 제안해요. 학원비 수정으로 카드를 직접 고정할 수 있어요.` }
    : { k: "bad", t: `삼성카드로 낼 학원비가 ${won(T - al.samsungTotal)} 모자라 할인 조건을 못 채워요.` };

  let h = `<section class="card"><h2>삼성카드 할인 <small>목표 ${man(T)} · ${rate}% 할인</small></h2>
    <div class="row between small"><span>결제 완료 <b>${won(al.samsungPaid)}</b></span><span class="muted">배분 예정 ${won(al.samsungTotal)}</span></div>
    <div class="progress"><em style="left:0;width:${pctPlan}%"></em><i style="width:${pctPaid}%;position:relative"></i></div>
    <div class="small muted" style="margin-bottom:8px">삼성카드: ${al.samsungItems.map(p => `${esc(payName(p))} ${man(p.amount)}`).join(" + ") || "없음"}</div>
    <div class="alert ${msg.k}" style="margin:0">${esc(msg.t)}</div></section>`;

  const byCard = k => pays.filter(p => al.map[p.id] === k).reduce((s, p) => s + p.amount, 0);
  h += `<section class="card"><div class="kpis">
    <div class="kpi"><span>이번 달 합계</span><b>${won(total)}</b></div>
    <div class="kpi"><span>결제 완료</span><b>${won(paid)}</b></div>
    <div class="kpi"><span>남은 금액</span><b>${won(total - paid)}</b></div></div>
    <div class="small muted" style="margin-top:10px">${db.children.map(c => `${esc(c.name)} ${won(pays.filter(p => p.childId === c.id).reduce((s, p) => s + p.amount, 0))}`).join(" · ")}</div>
    <div class="small muted">삼성카드 ${won(byCard("samsung"))} · 신한카드 ${won(byCard("shinhan"))}${byCard("transfer") + byCard("cash") ? ` · 기타 ${won(byCard("transfer") + byCard("cash"))}` : ""}</div></section>`;

  h += `<section class="card"><h2>결제 목록 <button class="btn sm" data-act="addpay">+ 추가 비용</button></h2><div class="list">`;
  if (!pays.length) h += `<div class="empty">학원비가 없어요. 설정 → 학원비에서 등록해 주세요.</div>`;
  const t = todayStr();
  for (const p of pays) {
    const ch = child(p.childId), card = al.map[p.id];
    const state = p.paid ? `<span class="badge b-paid">완료</span>` : p.due < t ? `<span class="badge b-late">연체</span>` : `<span class="badge b-due">예정</span>`;
    const cardBadge = `<span class="badge ${card === "samsung" ? "b-samsung" : card === "shinhan" ? "b-shinhan" : "b-plain"}">${p.paid ? "" : p.pinCard ? "고정 " : "추천 "}${CARD[card] || ""}</span>`;
    h += `<div class="li"><div class="t">
        <div><b>${esc(payName(p))}</b> <span class="muted small">${esc(ch?.name || "")}${p.category !== "수강료" ? ` · ${esc(p.category)}` : ""}</span></div>
        <div class="small muted">${fmtDate(p.due)} ${state}${cardBadge}</div></div>
      <div style="text-align:right;flex:none"><b>${won(p.amount)}</b><div class="row" style="justify-content:flex-end;margin-top:4px">
        <button class="btn sm ghost" data-act="editpay" data-id="${p.id}">수정</button>
        ${p.paid ? `<button class="btn sm" data-act="unpay" data-id="${p.id}">취소</button>` : `<button class="btn sm primary" data-act="pay" data-id="${p.id}">결제 완료</button>`}
      </div></div></div>`;
  }
  return h + `</div></section>`;
}

/* ---------- 설정 ---------- */
const opt = (list, label) => list.map(x => [x.id, label(x)]);
const SPECS = {
  children: {
    title: "자녀", blank: () => ({ color: "#6a5acd", pickupMode: "always" }),
    fields: () => [
      { k: "name", label: "이름", type: "text", req: true }, { k: "grade", label: "학년", type: "text" },
      { k: "color", label: "색상", type: "color" },
      { k: "pickupMode", label: "픽업 방식", type: "select", options: Object.entries(MODE) }],
    line: c => `<span class="dot" style="background:${c.color}"></span> <b>${esc(c.name)}</b> <span class="muted small">${esc(c.grade)} · ${MODE[c.pickupMode]}</span>`,
  },
  guardians: {
    title: "보호자", blank: () => ({}),
    fields: () => [{ k: "name", label: "이름 (예: 엄마, 아빠, 할머니)", type: "text", req: true }],
    line: g => `<b>${esc(g.name)}</b>`,
  },
  academies: {
    title: "학원", blank: () => ({ travelMin: 15, shuttle: false }),
    fields: () => [
      { k: "name", label: "학원 이름", type: "text", req: true }, { k: "subject", label: "과목", type: "text" },
      { k: "phone", label: "전화번호", type: "tel" }, { k: "address", label: "주소", type: "text" },
      { k: "travelMin", label: "이동 시간 (분)", type: "number" }, { k: "shuttle", label: "학원 차량 운행", type: "checkbox" }],
    line: a => `<b>${esc(a.name)}</b> <span class="muted small">${esc(a.subject)} · 이동 ${a.travelMin}분${a.shuttle ? " · 차량" : ""}</span>${a.phone ? ` <a class="small" href="tel:${esc(a.phone)}">전화</a>` : ""}`,
  },
  classes: {
    title: "수업 시간표", blank: () => ({ weekdays: [], start: "15:00", end: "16:00", childId: db.children[0]?.id, academyId: db.academies[0]?.id }),
    fields: () => [
      { k: "childId", label: "자녀", type: "select", options: opt(db.children, c => c.name) },
      { k: "academyId", label: "학원", type: "select", options: opt(db.academies, a => a.name) },
      { k: "weekdays", label: "요일", type: "weekdays" },
      { k: "start", label: "시작", type: "time", req: true }, { k: "end", label: "끝", type: "time", req: true },
      { k: "validFrom", label: "시작일 (비우면 계속)", type: "date" }, { k: "validTo", label: "종료일 (비우면 계속)", type: "date" }],
    line: c => `<span class="dot" style="background:${child(c.childId)?.color}"></span> <b>${esc(child(c.childId)?.name)} · ${esc(acad(c.academyId)?.name)}</b><div class="small muted">${WD_ORDER.filter(w => c.weekdays.includes(w)).map(w => WD[w]).join("·")} ${c.start}–${c.end}${c.validTo ? ` · ~${c.validTo}` : ""}</div>`,
  },
  fees: {
    title: "학원비", blank: () => ({ amount: 0, dueDay: 1, childId: db.children[0]?.id, academyId: db.academies[0]?.id }),
    fields: () => [
      { k: "academyId", label: "학원", type: "select", options: opt(db.academies, a => a.name) },
      { k: "childId", label: "자녀", type: "select", options: opt(db.children, c => c.name) },
      { k: "amount", label: "월 수강료 (원)", type: "number", req: true }, { k: "dueDay", label: "매월 결제일", type: "number", req: true }],
    line: f => `<b>${esc(acad(f.academyId)?.name)}</b> <span class="muted small">${esc(child(f.childId)?.name)}</span><div class="small muted">${man(f.amount)} · 매월 ${f.dueDay}일</div>`,
  },
};

function renderSettings() {
  const secs = [["family", "가족 공유"], ["children", "자녀"], ["guardians", "보호자"], ["academies", "학원"], ["classes", "시간표"], ["fees", "학원비"], ["plans", "월별 픽업"], ["basics", "기본값"], ["backup", "백업"]];
  let h = `<div class="seg">${secs.map(([k, l]) => `<button data-act="sec" data-sec="${k}" class="${view.setSec === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const sec = view.setSec;
  if (SPECS[sec]) {
    const sp = SPECS[sec], list = db[sec];
    h += `<section class="card"><h2>${sp.title} <button class="btn sm" data-act="add" data-sec="${sec}">+ 추가</button></h2><div class="list">`;
    if (sec === "fees") h += `<div class="small muted" style="margin-bottom:6px">월 합계 ${won(list.reduce((s, f) => s + (Number(f.amount) || 0), 0))}</div>`;
    if (!list.length) h += `<div class="empty">아직 없어요.</div>`;
    list.forEach(x => (h += `<div class="li"><div class="t">${sp.line(x)}</div><button class="btn sm ghost" data-act="edit" data-sec="${sec}" data-id="${x.id}">수정</button></div>`));
    h += `</div></section>`;
  }
  if (sec === "family") h += renderFamily();
  if (sec === "plans") h += renderPlans();
  if (sec === "basics") {
    const s = db.settings;
    h += `<section class="card"><h2>기본값 <button class="btn sm" data-act="editbasics">수정</button></h2><div class="list">
      <div class="li"><span>삼성카드 월 학원비 목표</span><b>${won(s.samsungTarget)}</b></div>
      <div class="li"><span>삼성카드 할인율</span><b>${s.discountRate}%</b></div>
      <div class="li"><span>출발 여유 시간</span><b>${s.bufferMin}분</b></div></div></section>`;
  }
  if (sec === "backup") {
    h += `<section class="card"><h2>백업</h2>
      <p class="small muted" style="margin-top:0">데이터는 지금 이 기기의 브라우저에만 저장돼요. 다른 기기로 옮기거나 보관하려면 파일로 내보내세요.</p>
      <div class="row wrapflex"><button class="btn primary" data-act="export">파일로 내보내기</button>
      <label class="btn">파일에서 가져오기<input type="file" accept="application/json" id="importfile" hidden></label></div></section>
      <section class="card"><h2>초기화</h2><div class="row wrapflex">
      <button class="btn" data-act="sample">예시 데이터로 바꾸기</button><button class="btn danger" data-act="wipe">모두 지우기</button></div></section>`;
  }
  return h;
}

function renderPlans() {
  const m = view.planMonth;
  const kids = db.children.filter(c => c.pickupMode === "monthly");
  let h = `<section class="card"><h2><span class="row"><button class="icon-btn" data-act="planprev" aria-label="이전 달">‹</button> ${fmtMonth(m)} <button class="icon-btn" data-act="plannext" aria-label="다음 달">›</button></span></h2>
    <p class="small muted" style="margin:0">픽업 방식이 '월별 입력 일정만 픽업'인 자녀는 여기 입력한 요일·시각에만 픽업이 잡혀요. 매월 25일부터 다음 달 입력 알림이 떠요.</p></section>`;
  if (!kids.length) return h + `<section class="card"><div class="empty">월별 픽업 자녀가 없어요. 자녀 설정에서 픽업 방식을 바꿔 주세요.</div></section>`;
  for (const c of kids) {
    const list = db.monthlyPlans.filter(p => p.childId === c.id && p.month === m).sort((a, b) => WD_ORDER.indexOf(a.weekday) - WD_ORDER.indexOf(b.weekday) || a.time.localeCompare(b.time));
    h += `<section class="card"><h2><span><span class="dot" style="background:${c.color}"></span> ${esc(c.name)} <small>${esc(c.grade)}</small></span>
      <span class="row"><button class="btn sm" data-act="copyplan" data-child="${c.id}">지난달 복사</button><button class="btn sm primary" data-act="addplan" data-child="${c.id}">+ 추가</button></span></h2><div class="list">`;
    if (!list.length) h += `<div class="empty">이 달 픽업 일정이 없어요.</div>`;
    list.forEach(p => (h += `<div class="li"><div class="t"><b>${WD[p.weekday]}요일 ${p.time}</b> <span class="muted small">${esc(p.leg)} · ${esc(p.place)} · 이동 ${p.travelMin}분</span></div><button class="btn sm ghost" data-act="editplan" data-id="${p.id}">수정</button></div>`));
    h += `</div></section>`;
  }
  return h;
}

const PLAN_FIELDS = () => [
  { k: "weekday", label: "요일", type: "select", options: WD_ORDER.map(w => [w, `${WD[w]}요일`]) },
  { k: "time", label: "픽업 시각", type: "time", req: true },
  { k: "leg", label: "구분", type: "select", options: [["하원", "하원 (데리러 가기)"], ["등원", "등원 (데려다주기)"]] },
  { k: "place", label: "장소", type: "text", req: true },
  { k: "travelMin", label: "이동 시간 (분)", type: "number" }];

/* ---------- 입력 창 ---------- */
function fieldHtml(f, v) {
  const id = `f_${f.k}`;
  if (f.type === "select") {
    return `<label class="field"><span>${esc(f.label)}</span><select name="${f.k}" id="${id}">${f.options.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(v) === String(ov) ? "selected" : ""}>${esc(ol)}</option>`).join("")}</select></label>`;
  }
  if (f.type === "weekdays") {
    const set = v || [];
    return `<div class="field"><span>${esc(f.label)}</span><div class="wds">${WD_ORDER.map(w => `<label><input type="checkbox" name="${f.k}" value="${w}" ${set.includes(w) ? "checked" : ""}>${WD[w]}</label>`).join("")}</div></div>`;
  }
  if (f.type === "checkbox") return `<label class="check"><input type="checkbox" name="${f.k}" ${v ? "checked" : ""}> ${esc(f.label)}</label>`;
  return `<label class="field"><span>${esc(f.label)}</span><input name="${f.k}" id="${id}" type="${f.type}" value="${esc(v ?? "")}" ${f.req ? "required" : ""} ${f.type === "number" ? 'inputmode="numeric" min="0"' : ""}></label>`;
}
function readField(form, f) {
  if (f.type === "weekdays") return [...form.querySelectorAll(`input[name="${f.k}"]:checked`)].map(i => Number(i.value));
  const el = form.elements[f.k];
  if (f.type === "checkbox") return el.checked;
  if (f.type === "number") return Number(el.value) || 0;
  if (f.type === "select" && f.options.length && typeof f.options[0][0] === "number") return Number(el.value);
  return el.value.trim();
}
function openForm(title, fields, values, onSave, del, note) {
  const form = $("#dlgform"), dlg = $("#dlg");
  form.innerHTML = `<h3>${esc(title)}</h3>${note ? `<p class="small muted" style="margin:0">${esc(note)}</p>` : ""}${fields.map(f => fieldHtml(f, values[f.k])).join("")}
    <div class="actions">${del ? `<button type="button" class="btn danger" data-x="del" style="margin-right:auto">삭제</button>` : ""}
    <button type="button" class="btn" data-x="cancel">취소</button><button type="submit" class="btn primary">저장</button></div>`;
  form.onsubmit = e => {
    e.preventDefault();
    const out = {};
    fields.forEach(f => (out[f.k] = readField(form, f)));
    const err = onSave(out);
    if (err) { toast(err); return; }
    dlg.close(); save(); render();
  };
  form.querySelector("[data-x=cancel]").onclick = () => dlg.close();
  if (del) form.querySelector("[data-x=del]").onclick = () => { if (confirm("삭제할까요?")) { del(); dlg.close(); save(); render(); } };
  dlg.showModal();
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function validateRecord(sec, v) {
  if ((sec === "classes" || sec === "fees") && (!v.childId || !v.academyId)) return "자녀와 학원을 먼저 등록해 주세요.";
  if (sec === "classes" && !v.weekdays.length) return "요일을 하나 이상 골라 주세요.";
  if (sec === "classes" && v.end <= v.start) return "끝나는 시각이 시작보다 늦어야 해요.";
  if (sec === "fees" && (v.dueDay < 1 || v.dueDay > 31)) return "결제일은 1~31 사이로 입력해 주세요.";
  return null;
}
function removeRecord(sec, id) {
  db[sec] = db[sec].filter(x => x.id !== id);
  if (sec === "children") {
    db.classes = db.classes.filter(c => c.childId !== id);
    db.fees = db.fees.filter(f => f.childId !== id);
    db.monthlyPlans = db.monthlyPlans.filter(p => p.childId !== id);
    db.adhoc = db.adhoc.filter(a => a.childId !== id);
  }
  if (sec === "academies") { db.classes = db.classes.filter(c => c.academyId !== id); db.fees = db.fees.filter(f => f.academyId !== id); }
  if (sec === "classes") db.exceptions = db.exceptions.filter(e => e.classId !== id);
}

/* ---------- 동작 ---------- */
const ACTIONS = {
  prev() { shift(-1); }, next() { shift(1); },
  gotoday() { view.date = todayStr(); },
  goplans(el) { view.tab = "settings"; view.setSec = "plans"; view.planMonth = el.dataset.month; },
  gofees() { view.tab = "fees"; view.month = todayStr().slice(0, 7); },
  openday(el) { view.date = el.dataset.date; view.tab = "today"; },
  sec(el) { view.setSec = el.dataset.sec; },
  add(el) {
    const sec = el.dataset.sec, sp = SPECS[sec];
    openForm(`${sp.title} 추가`, sp.fields(), sp.blank(), v => { const e = validateRecord(sec, v); if (e) return e; db[sec].push({ id: uid(), ...v }); });
    return false;
  },
  edit(el) {
    const sec = el.dataset.sec, sp = SPECS[sec], rec = db[sec].find(x => x.id === el.dataset.id);
    openForm(`${sp.title} 수정`, sp.fields(), rec, v => { const e = validateRecord(sec, v); if (e) return e; Object.assign(rec, v); }, () => removeRecord(sec, rec.id));
    return false;
  },
  cancel(el) { setException(el.dataset.class, "cancel"); toast("오늘 휴강으로 바꿨어요"); },
  change(el) {
    const c = db.classes.find(x => x.id === el.dataset.class);
    openForm("오늘만 시간 변경", [{ k: "start", label: "시작", type: "time", req: true }, { k: "end", label: "끝", type: "time", req: true }], c, v => {
      if (v.end <= v.start) return "끝나는 시각이 시작보다 늦어야 해요.";
      setException(c.id, "change", v);
    }, null, "반복 시간표는 그대로 두고 이 날만 바꿔요.");
    return false;
  },
  delex(el) { db.exceptions = db.exceptions.filter(e => e.id !== el.dataset.id); },
  addextra() {
    if (!db.classes.length) { toast("먼저 설정에서 수업 시간표를 등록해 주세요"); return false; }
    openForm(`보강 추가 · ${fmtDate(view.date)}`, [
      { k: "classId", label: "수업", type: "select", options: db.classes.map(c => [c.id, `${child(c.childId)?.name} · ${acad(c.academyId)?.name}`]) },
      { k: "start", label: "시작", type: "time", req: true }, { k: "end", label: "끝", type: "time", req: true }],
    { classId: db.classes[0].id, start: "18:00", end: "20:00" }, v => {
      if (v.end <= v.start) return "끝나는 시각이 시작보다 늦어야 해요.";
      db.exceptions.push({ id: uid(), classId: v.classId, date: view.date, type: "extra", start: v.start, end: v.end });
    });
    return false;
  },
  addadhoc() {
    if (!db.children.length) { toast("먼저 자녀를 등록해 주세요"); return false; }
    openForm(`픽업 추가 · ${fmtDate(view.date)}`, [
      { k: "childId", label: "자녀", type: "select", options: opt(db.children, c => c.name) },
      { k: "time", label: "픽업 시각", type: "time", req: true }, { k: "place", label: "장소", type: "text", req: true },
      { k: "travelMin", label: "이동 시간 (분)", type: "number" }],
    { childId: db.children[0].id, time: "21:00", travelMin: 15 }, v => { db.adhoc.push({ id: uid(), date: view.date, ...v }); },
    null, "아이가 전화·카톡으로 데리러 와 달라고 할 때 이 날만 추가해요.");
    return false;
  },
  deladhoc(el) { db.adhoc = db.adhoc.filter(a => a.id !== el.dataset.id); },
  addpay() {
    openForm(`추가 비용 · ${fmtMonth(view.month)}`, [
      { k: "label", label: "내용 (예: 수학 교재비)", type: "text", req: true },
      { k: "category", label: "종류", type: "select", options: [["교재비", "교재비"], ["차량비", "차량비"], ["특강비", "특강비"], ["기타", "기타"]] },
      { k: "childId", label: "자녀", type: "select", options: opt(db.children, c => c.name) },
      { k: "academyId", label: "학원", type: "select", options: [["", "선택 안 함"], ...opt(db.academies, a => a.name)] },
      { k: "amount", label: "금액 (원)", type: "number", req: true },
      { k: "due", label: "결제일", type: "date", req: true }],
    { category: "교재비", childId: db.children[0]?.id, academyId: "", due: `${view.month}-${pad(Math.min(daysInMonth(view.month), parseYmd(todayStr()).getDate()))}` }, v => {
      if (v.due.slice(0, 7) !== view.month) return `${fmtMonth(view.month)} 안의 날짜를 골라 주세요.`;
      db.payments.push({ id: uid(), feeId: null, month: view.month, ...v, paid: false, card: "", paidAt: "", pinCard: "", custom: true });
    });
    return false;
  },
  editpay(el) {
    const p = db.payments.find(x => x.id === el.dataset.id);
    openForm(`${payName(p)} · ${fmtMonth(p.month)}`, [
      { k: "amount", label: "이번 달 금액 (원)", type: "number", req: true },
      { k: "due", label: "결제일", type: "date", req: true },
      { k: "pinCard", label: "카드 배분", type: "select", options: [["", "자동 (70만원 조합 추천)"], ...Object.entries(CARD).map(([k, l]) => [k, `${l}로 고정`])] }],
    p, v => {
      if (v.due.slice(0, 7) !== p.month) return `${fmtMonth(p.month)} 안의 날짜를 골라 주세요.`;
      Object.assign(p, v, { custom: true });
    }, p.feeId ? null : () => { db.payments = db.payments.filter(x => x.id !== p.id); },
    p.feeId ? "여기서 바꾸면 이번 달에만 적용돼요. 매달 금액은 설정 → 학원비에서 바꿔요." : "");
    return false;
  },
  pay(el) {
    const p = db.payments.find(x => x.id === el.dataset.id), sug = allocate(p.month).map[p.id];
    openForm(`결제 완료 · ${payName(p)} ${won(p.amount)}`, [
      { k: "card", label: "결제한 카드", type: "select", options: Object.entries(CARD) },
      { k: "paidAt", label: "결제일", type: "date", req: true }],
    { card: sug, paidAt: todayStr() }, v => { Object.assign(p, v, { paid: true }); }, null, `추천 카드: ${CARD[sug]}`);
    return false;
  },
  unpay(el) { const p = db.payments.find(x => x.id === el.dataset.id); Object.assign(p, { paid: false, card: "", paidAt: "" }); },
  planprev() { view.planMonth = addMonths(view.planMonth, -1); },
  plannext() { view.planMonth = addMonths(view.planMonth, 1); },
  addplan(el) {
    const cid = el.dataset.child;
    openForm(`${child(cid).name} 픽업 · ${fmtMonth(view.planMonth)}`, PLAN_FIELDS(), { weekday: 1, time: "22:00", leg: "하원", travelMin: 15 },
      v => { db.monthlyPlans.push({ id: uid(), childId: cid, month: view.planMonth, ...v }); });
    return false;
  },
  editplan(el) {
    const p = db.monthlyPlans.find(x => x.id === el.dataset.id);
    openForm(`${child(p.childId).name} 픽업 · ${fmtMonth(p.month)}`, PLAN_FIELDS(), p, v => { Object.assign(p, v); },
      () => { db.monthlyPlans = db.monthlyPlans.filter(x => x.id !== p.id); });
    return false;
  },
  copyplan(el) {
    const cid = el.dataset.child, m = view.planMonth, pm = addMonths(m, -1);
    const src = db.monthlyPlans.filter(p => p.childId === cid && p.month === pm);
    if (!src.length) { toast("지난달 일정이 없어요"); return; }
    const cur = db.monthlyPlans.filter(p => p.childId === cid && p.month === m);
    if (cur.length && !confirm("이 달 일정을 지난달 일정으로 바꿀까요?")) return false;
    db.monthlyPlans = db.monthlyPlans.filter(p => !(p.childId === cid && p.month === m)).concat(src.map(p => ({ ...p, id: uid(), month: m })));
    toast(`${src.length}건 복사했어요. 바뀐 부분만 고쳐 주세요.`);
  },
  editbasics() {
    openForm("기본값", [
      { k: "samsungTarget", label: "삼성카드 월 학원비 목표 (원)", type: "number", req: true },
      { k: "discountRate", label: "할인율 (%)", type: "number" },
      { k: "bufferMin", label: "출발 여유 시간 (분)", type: "number" }], db.settings, v => { Object.assign(db.settings, v); });
    return false;
  },
  export() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `학원매니저-백업-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return false;
  },
  gofamily() { view.tab = "settings"; view.setSec = "family"; },
  createfamily() {
    const name = $("#myname").value.trim();
    if (!name) { toast("이 기기 사용자 이름을 넣어 주세요"); return false; }
    runAsync(async () => {
      await ensureAuth();
      const { data, error } = await sync.sb.rpc("ap_create_family", { initial: db, member_name: name });
      if (error) throw error;
      sync.st = { familyId: data.id, joinCode: data.join_code, version: data.version, base: clone(db), name };
      saveSync(); subscribe(); setStatus("synced");
      toast("가족을 만들었어요. 초대 코드를 배우자에게 알려 주세요.");
      render();
    });
    return false;
  },
  joinfamily() {
    const name = $("#joinname").value.trim(), code = $("#joincode").value.trim().toUpperCase();
    if (!name) { toast("이 기기 사용자 이름을 넣어 주세요"); return false; }
    if (code.length !== 8) { toast("초대 코드 8자리를 넣어 주세요"); return false; }
    if (!confirm("이 기기에 있던 데이터가 가족 데이터로 바뀌어요. 계속할까요?")) return false;
    runAsync(async () => {
      await ensureAuth();
      const { data, error } = await sync.sb.rpc("ap_join_family", { code, member_name: name });
      if (error) throw error;
      sync.st = { familyId: data.id, joinCode: code, version: 0, base: null, name };
      const remote = await fetchRemote(false);
      db = clone(remote.data);
      sync.st.base = clone(remote.data); sync.st.version = remote.version;
      saveSync(); saveLocal(); subscribe(); setStatus("synced");
      toast("가족에 들어왔어요");
      render();
    });
    return false;
  },
  copycode() {
    const code = sync.st.joinCode;
    (navigator.clipboard?.writeText(code) || Promise.reject()).then(() => toast("초대 코드를 복사했어요"), () => toast(`초대 코드: ${code}`));
    return false;
  },
  syncnow() { runAsync(async () => { await ensureAuth(); await pull(); await push(); toast(SYNC_TEXT[sync.status]); render(); }); return false; },
  leave() {
    if (!confirm("이 기기를 가족 공유에서 뺄까요? 이 기기의 데이터는 남지만 더 이상 함께 바뀌지 않아요.")) return false;
    runAsync(async () => {
      const user = await ensureAuth();
      const { error } = await sync.sb.from("ap_members").delete().eq("family_id", sync.st.familyId).eq("user_id", user.id);
      if (error) throw error;
      if (sync.channel) sync.sb.removeChannel(sync.channel);
      sync.channel = null;
      sync.st = { name: sync.st.name };
      saveSync(); setStatus("local"); toast("연결을 끊었어요"); render();
    });
    return false;
  },
  sample() { if (!confirm("지금 데이터를 지우고 예시 데이터로 바꿀까요?")) return false; seedDemo(); },
  wipe() {
    if (!confirm("모든 데이터를 지울까요? 되돌릴 수 없어요.")) return false;
    db = { ...seed(), children: [], academies: [], classes: [], fees: [], monthlyPlans: [], guardians: [{ id: uid(), name: "엄마" }, { id: uid(), name: "아빠" }] };
  },
};
function shift(n) {
  if (view.tab === "today") view.date = addDays(view.date, n);
  if (view.tab === "week") view.date = addDays(view.date, 7 * n);
  if (view.tab === "fees") view.month = addMonths(view.month, n);
}
function setException(classId, type, v = {}) {
  db.exceptions = db.exceptions.filter(e => !(e.classId === classId && e.date === view.date && (e.type === "cancel" || e.type === "change")));
  db.exceptions.push({ id: uid(), classId, date: view.date, type, ...v });
}

document.addEventListener("click", e => {
  const tab = e.target.closest("nav.tabs button");
  if (tab) { view.tab = tab.dataset.tab; if (view.tab === "today") view.date = todayStr(); render(); window.scrollTo(0, 0); return; }
  const el = e.target.closest("[data-act]");
  if (!el || !ACTIONS[el.dataset.act]) return;
  if (ACTIONS[el.dataset.act](el) === false) return;
  save(); render();
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.pick) { db.pickups[t.dataset.pick] = { ...(db.pickups[t.dataset.pick] || {}), assignee: t.value }; save(); render(); }
  if (t.dataset.done) { db.pickups[t.dataset.done] = { ...(db.pickups[t.dataset.done] || {}), done: t.checked }; save(); render(); }
  if (t.id === "importfile" && t.files[0]) {
    t.files[0].text().then(txt => {
      const data = JSON.parse(txt);
      if (!data || !Array.isArray(data.children) || !Array.isArray(data.classes)) throw new Error("형식");
      if (!confirm("지금 데이터를 이 파일 내용으로 바꿀까요?")) return;
      db = { ...seed(), ...data };
      save(); render(); toast("가져왔어요");
    }).catch(() => toast("백업 파일을 읽지 못했어요"));
  }
});

$("#dlg").addEventListener("close", () => { if (sync.pendingPull) { sync.pendingPull = false; pull().catch(() => {}); } });
addEventListener("online", () => syncStart());
addEventListener("offline", () => { if (sync.st.familyId) setStatus("offline"); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && sync.st.familyId) syncStart(); });

if (!db) seedDemo();
render();
syncStart();
