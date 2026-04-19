/* ================================================================
   NEBULA QUIZ SYSTEM — script.js (v2026.8 — CORS FIX + UPGRADE)
   ================================================================
   FIX v2026.8:
   1. [CORS FIX] Login/register/getUserInfo dùng GET thay POST
      → GAS redirect không break CORS với GET requests
   2. [CORS FIX] All data-read calls dùng GET
   3. [CORS FIX] All write-only calls dùng POST no-cors
   4. Code refactor: loại bỏ duplicate, tối ưu bundle size
   ================================================================ */
'use strict';

/* ─── CONFIG ─── */
const NB_API = "https://script.google.com/macros/s/AKfycbwO0a19WfLbY9lhhFkQsyaCKHPlXudji-CyAjTLtfbnUMaiFXXlwMJk38XLcGv7qzL5/exec";

window.API        = NB_API;
window.API_URL    = NB_API;
window.SCRIPT_URL = NB_API;

/* ─── LOCALSTORE HELPERS ─── */
const nb = {
  get:(k)=> localStorage.getItem(k) ?? '',
  set:(k,v)=> localStorage.setItem(k, String(v)),
  setMany:(obj)=>{ for(const[k,v] of Object.entries(obj)) localStorage.setItem(k,String(v)); },
  del:(k)=> localStorage.removeItem(k),
  clear:()=> localStorage.clear(),
  user:()=>({
    name:     (localStorage.getItem('studentName')||'Học sinh').trim(),
    username: localStorage.getItem('username')||'',
    role:     localStorage.getItem('userRole')||'student',
    school:   (localStorage.getItem('schoolName')||'').replace(/^'+/,''),
    cls:      (localStorage.getItem('className')||'').replace(/^'+/,''),
  }),
  isAdmin:  ()=> localStorage.getItem('userRole')==='admin',
  isLogged: ()=> !!localStorage.getItem('username'),
};
window.nb = nb;

/* ─── NAVIGATION ─── */
function nbGo(url){ window.location.href = url; }
window.nbGo = nbGo;

/* ─── AUTH GUARDS ─── */
function nbRequireLogin(redirect='login.html'){
  if(!nb.isLogged()){ window.location.replace(redirect); return false; }
  return true;
}
function nbRequireAdmin(redirect='index.html'){
  if(!nb.isAdmin()){ window.location.replace(redirect); return false; }
  return true;
}
function nbLogout(){
  nbConfirm({ title:'Đăng xuất?', text:'Phiên làm việc sẽ kết thúc.',
    icon:'question', confirmButtonText:'Đăng xuất'
  }).then(r=>{ if(r.isConfirmed){ nb.clear(); window.location.replace('index.html'); }});
}
window.nbRequireLogin = nbRequireLogin;
window.nbRequireAdmin = nbRequireAdmin;
window.nbLogout = nbLogout;

/* ─── API CALLS (CORS-SAFE) ─── */

/**
 * GET request — dùng cho mọi thao tác CẦN đọc response
 * GAS xử lý GET qua doGet(e), không bị CORS block
 */
async function nbGet(action, params={}){
  let qs=`?action=${encodeURIComponent(action)}`;
  for(const[k,v] of Object.entries(params)) qs+=`&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
 const r = await fetch(NB_API + qs, {
  redirect: 'follow',
  method: 'GET'
});
  return r.json();
}

/**
 * POST no-cors — dùng cho mọi thao tác CHỈ GHI, không cần đọc response
 */
async function nbPostSilent(data){
  try{
    await fetch(NB_API,{ method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(data) });
  }catch(e){ console.warn('nbPostSilent:',e); }
}

/**
 * POST cors — dùng khi backend có CORS headers đúng (fallback)
 */
async function nbPost(data){
  const r = await fetch(NB_API,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify(data)
  });
  return r.json();
}

async function nbPostForm(data){
  const fd = new URLSearchParams();
  for(const[k,v] of Object.entries(data)) fd.append(k,String(v));
  const r = await fetch(NB_API,{ method:'POST', body:fd });
  return r.json();
}

/* Legacy aliases */
async function callAPI(action, params={}){
  try{ return await nbGet(action, params); }
  catch(e){ console.error('callAPI',action,e); return null; }
}

async function postAPI(params){
  // ĐÃ SỬA: Dùng nbPostForm thay vì nbGet để tránh lỗi URI Too Long khi gửi text dài
  try{ return await nbPostForm(params); }
  catch(e){ console.error('postAPI',e); return {status:'error'}; }
}

window.callAPI = callAPI;
window.postAPI = postAPI;
window.nbGet = nbGet;
window.nbPost = nbPost;
window.nbPostForm = nbPostForm;
window.nbPostSilent = nbPostSilent;

/* ─── SWAL WRAPPERS ─── */
function nbToast(icon, title, timer=2800){
  if(typeof Swal==='undefined') return;
  const cfg = {
    success: { bg:'rgba(6,78,59,.92)',  border:'rgba(16,185,129,.35)', color:'#6ee7b7', icon:'✓' },
    error:   { bg:'rgba(69,10,10,.92)', border:'rgba(239,68,68,.35)',  color:'#fca5a5', icon:'✕' },
    warning: { bg:'rgba(69,39,0,.92)',  border:'rgba(245,158,11,.35)', color:'#fcd34d', icon:'⚠' },
    info:    { bg:'rgba(7,30,60,.92)',  border:'rgba(79,172,254,.35)', color:'#93c5fd', icon:'ℹ' },
  };
  const c=cfg[icon]||cfg.info;
  Swal.fire({
    html:`<div style="display:flex;align-items:center;gap:10px;font-size:.88rem;font-weight:600">
      <span style="font-size:1.1rem;line-height:1">${c.icon}</span>
      <span>${title}</span></div>`,
    timer, showConfirmButton:false, toast:true, position:'top-end',
    background:c.bg, color:c.color,
    customClass:{popup:'nb-toast-popup'},
    showClass:{popup:'nb-toast-in'},
    hideClass:{popup:'nb-toast-out'},
    backdrop:false,
    width:'auto',
  });
}
function nbAlert(icon, title, text=''){
  if(typeof Swal==='undefined') return Promise.resolve();
  const iconMap={
    success:'<div class="nb-swal-icon nb-icon-ok"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>',
    error:  '<div class="nb-swal-icon nb-icon-err"><svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>',
    warning:'<div class="nb-swal-icon nb-icon-warn"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></div>',
    info:   '<div class="nb-swal-icon nb-icon-info"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div>',
    question:'<div class="nb-swal-icon nb-icon-info"><svg viewBox="0 0 24 24"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg></div>',
  };
  return Swal.fire({
    html:`${iconMap[icon]||iconMap.info}<h3 class="nb-swal-title">${title}</h3>${text?`<p class="nb-swal-text">${text}</p>`:''}`,
    background:'rgba(8,14,30,0.97)',color:'#f1f5f9',
    confirmButtonText:'OK',
    customClass:{popup:'nb-swal-popup',confirmButton:'nb-swal-btn'},
    buttonsStyling:false,
    showClass:{popup:'animate__animated animate__zoomIn'},
    hideClass:{popup:'animate__animated animate__zoomOut'},
  });
}
function nbConfirm(opts={}){
  if(typeof Swal==='undefined')
    return Promise.resolve({ isConfirmed: confirm(opts.text||'?') });
  const icon=opts.icon||'question';
  const iconMap={
    question:'<div class="nb-swal-icon nb-icon-info"><svg viewBox="0 0 24 24"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg></div>',
    warning: '<div class="nb-swal-icon nb-icon-warn"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></div>',
    error:   '<div class="nb-swal-icon nb-icon-err"><svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>',
    success: '<div class="nb-swal-icon nb-icon-ok"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>',
  };
  const {title='',text='',html='',confirmButtonText='Xác nhận',cancelButtonText='Hủy',confirmButtonColor,...rest}=opts;
  return Swal.fire(Object.assign({
    html:`${iconMap[icon]||iconMap.question}<h3 class="nb-swal-title">${title}</h3>${html||text?`<p class="nb-swal-text">${html||text}</p>`:''}`,
    showCancelButton:true,
    cancelButtonText,
    confirmButtonText,
    background:'rgba(8,14,30,0.97)',color:'#f1f5f9',
    customClass:{
      popup:'nb-swal-popup',
      confirmButton:'nb-swal-btn nb-swal-btn-confirm'+(confirmButtonColor===undefined||confirmButtonColor?.includes('46')||confirmButtonColor?.includes('primary')?'':' nb-swal-btn-danger'),
      cancelButton:'nb-swal-btn nb-swal-btn-cancel',
    },
    buttonsStyling:false,
    showClass:{popup:'animate__animated animate__zoomIn'},
    hideClass:{popup:'animate__animated animate__zoomOut'},
  },rest));
}
function nbLoading(title='Đang xử lý...'){
  if(typeof Swal==='undefined') return;
  Swal.fire({
    html:`<div class="nb-swal-loading">
      <svg class="nb-spin" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
      <span>${title}</span></div>`,
    background:'rgba(8,14,30,0.97)', color:'#f1f5f9',
    allowOutsideClick:false, showConfirmButton:false,
    customClass:{popup:'nb-swal-popup'},
    showClass:{popup:'animate__animated animate__zoomIn'},
  });
}
function nbClose(){ if(typeof Swal!=='undefined') Swal.close(); }
window.nbToast   = nbToast;
window.nbAlert   = nbAlert;
window.nbConfirm = nbConfirm;
window.nbLoading = nbLoading;
window.nbClose   = nbClose;

/* ─── FORMAT HELPERS ─── */
function nbFmtTime(val){
  if(!val) return '—';
  try{
    let s=String(val).trim();
    if(/^\d{4}-\d{2}-\d{2}\s/.test(s)) s=s.replace(' ','T');
    else if(/^\d{2}\/\d{2}\/\d{4}\s/.test(s)){
      const[d,t]=s.split(' '),p=d.split('/');
      s=`${p[2]}-${p[1]}-${p[0]}T${t||'00:00:00'}`;
    }
    const dt=new Date(s);
    if(isNaN(dt)) return val;
    return dt.toLocaleString('vi-VN',{
      hour:'2-digit',minute:'2-digit',
      day:'2-digit',month:'2-digit',year:'numeric'
    });
  }catch(e){ return val; }
}
function nbParseDate(val){
  if(!val) return 0;
  try{
    let s=String(val).trim();
    if(/^\d{4}-\d{2}-\d{2}\s/.test(s)) s=s.replace(' ','T');
    else if(/^\d{2}\/\d{2}\/\d{4}\s/.test(s)){
      const[d,t]=s.split(' '),p=d.split('/');
      s=`${p[2]}-${p[1]}-${p[0]}T${t||'00:00:00'}`;
    }
    return new Date(s).getTime()||0;
  }catch(e){ return 0; }
}
function nbFmtScore(v){
  const n=parseFloat(v); if(isNaN(n)) return '—';
  const s=n.toFixed(1);
  return s.endsWith('.0')?s.slice(0,-2):s;
}
function nbEsc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window.nbFmtTime   = nbFmtTime;
window.nbParseDate = nbParseDate;
window.nbFmtScore  = nbFmtScore;
window.nbEsc       = nbEsc;

/* ─── ANSWER CHECK ─── */
function nbCheckAns(type, userAns, correctAns){
  if(userAns===undefined||userAns===null||userAns==='') return false;
  const norm  = s=>String(s).trim().toLowerCase().replace(/\s+/g,' ');
  const sort  = s=>String(s).split('|').map(norm).sort().join('|');
  const order = s=>String(s).split('|').map(norm).join('|');
  type=(type||'single').toLowerCase();
  if(type==='ordering')                      return order(userAns)===order(correctAns);
  if(type==='multiple'||type==='matching')   return sort(userAns) ===sort(correctAns);
  if(type==='fill'){
    const accepts = String(correctAns).split('|').map(norm);
    return accepts.includes(norm(userAns));
  }
  return norm(userAns)===norm(correctAns);
}
window.nbCheckAns = nbCheckAns;

/* ─── SHUFFLE ─── */
/* ─── DURATION SANITIZER ─── */
/* GAS có thể trả Date object khi cột duration bị format thành Date type */
function sanitizeDur(v){
  if(!v) return 45;
  // Nếu là Date string dạng "1900-02-13T..." — lấy số ngày từ base GAS 1899-12-30
  if(typeof v==='string' && /^\d{4}-\d{2}-\d{2}T/.test(v)){
    const d=new Date(v);
    if(!isNaN(d)){
      const base=new Date(Date.UTC(1899,11,30));
      const days=Math.round((d.getTime()-base.getTime())/86400000);
      if(days>0 && days<1440) return days;
    }
    return 45;
  }
  const n=parseInt(v,10);
  return (!isNaN(n) && n>0 && n<1440) ? n : 45;
}
window.sanitizeDur = sanitizeDur;

function nbShuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
window.nbShuffle = nbShuffle;

/* ─── PASSWORD STRENGTH ─── */
function nbPwStrength(pw){
  if(!pw||pw.length<6) return 'weak';
  let s=0;
  if(pw.length>=8)            s++;
  if(/[A-Z]/.test(pw))        s++;
  if(/[0-9]/.test(pw))        s++;
  if(/[^A-Za-z0-9]/.test(pw)) s++;
  return s<=1?'weak':s<=2?'medium':'strong';
}
window.nbPwStrength = nbPwStrength;

/* ─── EXPORT CSV ─── */
function nbExportCSV(data, filename='export.csv'){
  if(!data||!data.length){ nbToast('warning','Không có dữ liệu để xuất'); return; }
  const keys=Object.keys(data[0]);
  const rows=[keys.join(',')];
  data.forEach(r=> rows.push(keys.map(k=>`"${String(r[k]||'').replace(/"/g,'""')}"`).join(',')));
  const blob=new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
window.nbExportCSV = nbExportCSV;

/* ─── ANIMATE NUMBER ─── */
function nbAnimNum(elId, from, to, ms=900){
  const el=document.getElementById(elId); if(!el) return;
  let st=null;
  const step=ts=>{
    if(!st)st=ts;
    const p=Math.min((ts-st)/ms,1);
    const v=(p*(to-from)+from).toFixed(1);
    el.textContent=v.endsWith('.0')?v.slice(0,-2):v;
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
window.nbAnimNum = nbAnimNum;

/* ─── DEBOUNCE ─── */
function nbDebounce(fn,ms=300){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms); };
}
window.nbDebounce = nbDebounce;

/* ══════════════════════════════════════════════
   SESSION TIMEOUT MANAGER
   ══════════════════════════════════════════════ */
window.nbSessionInit = function(options={}){
  const TIMEOUT_MS  = options.timeout    || (nb.isAdmin() ? 2*60*60*1000 : 8*60*60*1000);
  const WARN_BEFORE = options.warnBefore || 5*60*1000;
  const STORAGE_KEY = 'nb_session_start';

  const path = window.location.pathname;
  if(path.includes('login.html') || path.includes('index.html')) return;
  if(!nb.isLogged()) return;

  if(!localStorage.getItem(STORAGE_KEY)){
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }

  let _warnShown=false, _toastEl=null, _toastTimer=null;

  function _getRemaining(){
    const start=parseInt(localStorage.getItem(STORAGE_KEY)||'0');
    return TIMEOUT_MS-(Date.now()-start);
  }
  function _extendSession(){
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    _warnShown=false; _destroyToast();
  }
  function _destroyToast(){
    if(_toastEl){ _toastEl.remove(); _toastEl=null; }
    clearInterval(_toastTimer);
  }
  function _forceLogout(){
    _destroyToast(); nb.clear();
    if(typeof Swal!=='undefined'){
      Swal.fire({
        icon:'info', title:'Phiên đã hết hạn',
        text:'Bạn đã bị đăng xuất do không hoạt động quá lâu.',
        confirmButtonText:'Đăng nhập lại',
        background:'rgba(10,15,30,0.97)', color:'#f1f5f9', allowOutsideClick:false,
      }).then(()=>{ window.location.replace('login.html'); });
    } else { window.location.replace('login.html'); }
  }
  function _showWarning(remainMs){
    if(_toastEl) return;
    const mins=Math.ceil(remainMs/60000);
    _toastEl=document.createElement('div');
    _toastEl.className='nb-session-toast';
    _toastEl.innerHTML=`
      <div class="toast-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        Phiên sắp hết hạn
      </div>
      <div class="toast-desc">Bạn sẽ bị đăng xuất sau <strong id="nb-session-countdown">${mins} phút</strong>.</div>
      <div class="nb-session-progress"><div class="nb-session-progress-bar" id="nb-session-bar"></div></div>
      <div class="nb-session-actions">
        <button class="nb-session-btn nb-session-btn-stay" onclick="window._nbExtendSession()">Ở lại</button>
        <button class="nb-session-btn nb-session-btn-out" onclick="window._nbForceLogout()">Đăng xuất</button>
      </div>`;
    document.body.appendChild(_toastEl);
    _toastTimer=setInterval(()=>{
      const rem=_getRemaining();
      if(rem<=0){ clearInterval(_toastTimer); _forceLogout(); return; }
      const el=document.getElementById('nb-session-countdown');
      const bar=document.getElementById('nb-session-bar');
      const s=Math.ceil(rem/1000);
      if(el) el.textContent=s>=60?`${Math.ceil(s/60)} phút`:`${s}s`;
      if(bar){ bar.style.width=`${Math.max(0,(rem/WARN_BEFORE)*100)}%`; bar.style.transitionDuration='1s'; }
    },1000);
  }

  window._nbExtendSession=_extendSession;
  window._nbForceLogout=_forceLogout;

  setInterval(()=>{
    const rem=_getRemaining();
    if(rem<=0){ _forceLogout(); return; }
    if(rem<=WARN_BEFORE&&!_warnShown){ _warnShown=true; _showWarning(rem); }
  },30000);

  const rem=_getRemaining();
  if(rem<=0){ _forceLogout(); return; }
  if(rem<=WARN_BEFORE){ _warnShown=true; _showWarning(rem); }

  ['click','keydown','touchstart','scroll'].forEach(evt=>{
    document.addEventListener(evt,nbDebounce(()=>{
      if(_getRemaining()>WARN_BEFORE+30000){
        localStorage.setItem(STORAGE_KEY,Date.now().toString());
      }
    },5000),{ passive:true });
  });
};

/* ══════════════════════════════════════════════
   PAGE: dashboard.html
   ══════════════════════════════════════════════ */
window.nbDashboardInit = function(){
  if(nb.get('userRole')!=='admin'){ location.replace('index.html'); return; }

  window.log = function(msg, type='ok'){
    const p=document.getElementById('debugPanel');
    if(!p) return;
    p.innerHTML+=`<div class="dl-${type}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    p.scrollTop=p.scrollHeight;
  };
  window.toggleDebug = function(){
    const p=document.getElementById('debugPanel');
    if(p) p.style.display=p.style.display==='block'?'none':'block';
  };
  window.setStatus = function(type,text){
    const el=document.getElementById('apiStatus');
    if(el){
      el.className=`api-status ${type}`;
      el.innerHTML=`<span class="dot"></span> ${text}`;
    }
  };
  window.logout = function(){
    nbConfirm({
      title:'Đăng xuất?', icon:'question',
      confirmButtonText:'Đăng xuất', confirmButtonColor:'#ef4444'
    }).then(r=>{ if(r.isConfirmed){ nb.clear(); location.replace('index.html'); }});
  };

  window.exportResults = function(){
    const data = window._nbResults || window.results || [];
    if(!data.length){ nbToast('warning','Chưa có dữ liệu kết quả để xuất!'); return; }
    const rows = data.map(r=>({
      'Học sinh': r.student||'', 'Trường': r.school||'',
      'Bài thi': r.testName||'', 'Điểm': r.score||'',
      'Tổng câu': r.total||'', 'Thời gian':nbFmtTime(r.time)
    }));
    nbExportCSV(rows, `ket-qua-${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`);
    nbToast('success',`Đã xuất ${rows.length} kết quả!`);
  };

  window.exportIspringResults = async function(){
    nbLoading('Đang tải kết quả iSpring...');
    try{
      const data = await callAPI('getIspringResults');
      nbClose();
      if(!data||!data.length){ nbToast('info','Chưa có kết quả iSpring'); return; }
      const rows = data.map(r=>({
        'Học sinh': r.student||'',
        'Bài thi': String(r.testName||'').replace('[iSpring] ',''),
        'Điểm': r.score||'', 'Thời gian':nbFmtTime(r.time)
      }));
      nbExportCSV(rows, `ispring-ket-qua-${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`);
      nbToast('success',`Đã xuất ${rows.length} kết quả iSpring!`);
    }catch(e){ nbClose(); nbAlert('error','Lỗi xuất dữ liệu',e.message); }
  };

  window.nbRenderDashChart = function(results){
    const canvas=document.getElementById('chartEl');
    if(!canvas||typeof Chart==='undefined') return;
    const s=[0,0,0];
    (results||[]).forEach(r=>{
      const v=parseFloat(r.score||0);
      const isIsp=(r.testName||'').toLowerCase().includes('ispring');
      if(isIsp){ if(v>=80)s[0]++; else if(v>=50)s[1]++; else s[2]++; }
      else     { if(v>=8) s[0]++; else if(v>=5) s[1]++; else s[2]++; }
    });
    if(window._nbChart) window._nbChart.destroy();
    window._nbChart=new Chart(canvas,{
      type:'doughnut',
      data:{
        labels:['Giỏi (≥8)','TB (5-7.9)','Yếu (<5)'],
        datasets:[{ data:s,
          backgroundColor:['rgba(16,185,129,.8)','rgba(59,130,246,.8)','rgba(239,68,68,.8)'],
          borderColor:['#10b981','#3b82f6','#ef4444'], borderWidth:2 }]
      },
      options:{
        maintainAspectRatio:false, cutout:'68%',
        plugins:{
          legend:{ position:'right', labels:{ color:'#94a3b8', font:{size:10}, usePointStyle:true, padding:12 }},
          tooltip:{ callbacks:{ label:(c)=>{
            const total=s.reduce((a,b)=>a+b,1);
            return ` ${c.label}: ${c.raw} (${((c.raw/total)*100).toFixed(0)}%)`;
          }}}
        }
      }
    });
  };

  /* Smart Auto-Refresh */
  const REFRESH_INTERVAL = 20;
  let _countdownVal=REFRESH_INTERVAL, _countdownTimer=null, _refreshPaused=false, _failStreak=0;

  function _updateCountdownUI(){
    const el=document.getElementById('refreshCountdown');
    if(el) el.textContent=_countdownVal;
  }
  function _startCountdown(){
    clearInterval(_countdownTimer);
    _countdownVal=REFRESH_INTERVAL; _updateCountdownUI();
    _countdownTimer=setInterval(async()=>{
      if(_refreshPaused) return;
      _countdownVal--; _updateCountdownUI();
      if(_countdownVal<=0){ _countdownVal=REFRESH_INTERVAL; _updateCountdownUI(); await _silentRefresh(); }
    },1000);
  }
  async function _silentRefresh(){
    try{
      const[tData,rData,pData]=await Promise.all([
        callAPI('getTests'), callAPI('getResults'), callAPI('getPendingUsers'),
      ]);
      _failStreak=0;
      const tStr=JSON.stringify((tData||[]).map(t=>t.id));
      if(tStr!==window._nbLastTestStr){
        window._nbLastTestStr=tStr;
        if(window.tests!==undefined){ window.tests=tData||[]; }
        if(window.renderTests) window.renderTests();
        const el=document.getElementById('cTests');
        if(el) el.innerText=(tData||[]).length;
      }
      const rLen=(rData||[]).length;
      if(rLen!==(window._nbResults||[]).length){
        const added=rLen-(window._nbResults||[]).length;
        window._nbResults=rData||[]; window.results=rData||[];
        if(window.renderResults) window.renderResults();
        const el=document.getElementById('cResults'); if(el) el.innerText=rLen;
        if(added>0) nbToast('info',`+${added} kết quả mới!`);
        if(window.nbRenderDashChart) window.nbRenderDashChart(rData);
      }
      const now=new Date();
      const syncBadge=document.getElementById('lastSyncBadge');
      if(syncBadge) syncBadge.textContent=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const pLen=(pData||[]).length;
      const oldPLen=(window._nbPending||[]).length;
      if(pLen!==oldPLen){
        window._nbPending=pData||[]; window.pending=pData||[];
        if(window.renderPending) window.renderPending();
        const el=document.getElementById('cPending'); if(el) el.innerText=pLen;
        if(pLen>oldPLen) nbToast('info',`+${pLen-oldPLen} yêu cầu đăng ký mới!`);
      }
      setStatus('ok','Trực tuyến');
    }catch(err){
      _failStreak++;
      setStatus('err','Mất kết nối');
      log('Auto-refresh lỗi: '+err.message,'err');
      if(_failStreak>=3){ _countdownVal=60; }
    }
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ _refreshPaused=true; }
    else{ _refreshPaused=false; _countdownVal=3; /* refresh quickly when tab becomes visible */ }
  });
  _startCountdown();
  window._nbResetCountdown=_startCountdown;
  window._nbSilentRefresh=_silentRefresh;
};

/* ══════════════════════════════════════════════
   PAGE: add-question.html
   ══════════════════════════════════════════════ */
window.nbAddQuestionInit = function(){
  window._aqEditMode  = false;
  window._aqOriginalQ = '';
  window._aqQCount    = 0;

  window.renderEditor = function(){
    const type=document.getElementById('qType').value;
    const list=document.getElementById('ansList');
    const addBtn=document.getElementById('addBtn');
    list.innerHTML='';
    if(addBtn) addBtn.style.display=['tf','fill'].includes(type)?'none':'flex';
    if(type==='tf'){
      list.innerHTML=`
        <div class="ans-row">
          <svg style="width:16px;height:16px;fill:rgba(79,172,254,.8);flex-shrink:0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <select id="tfCorrect" class="input-control" onchange="updateCorrectStr()">
            <option value="Đúng">✅ ĐÚNG (TRUE)</option>
            <option value="Sai">❌ SAI (FALSE)</option>
          </select>
        </div>`;
    } else if(type==='fill'){
      list.innerHTML=`
        <p style="font-size:.78rem;color:rgba(124,77,255,.85);margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <svg style="width:13px;height:13px;fill:currentColor;flex-shrink:0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          Có thể thêm nhiều đáp án (phân cách bằng |)
        </p>
        <div class="fill-ans-wrap" id="fillList">
          <div class="fill-ans-item">
            <svg style="color:rgba(0,230,118,.7)" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <input type="text" class="input-control fill-ans-input" placeholder="Đáp án đúng #1..." oninput="updateCorrectStr()">
            <button type="button" onclick="addFillAnswer()" class="btn-add-ans" style="padding:8px 12px;white-space:nowrap">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
          </div>
        </div>`;
    } else {
      addAnsRow(); addAnsRow();
    }
    updateCorrectStr();
  };

  window.addFillAnswer = function(){
    const list=document.getElementById('fillList');
    const div=document.createElement('div'); div.className='fill-ans-item';
    div.innerHTML=`
      <svg style="color:rgba(0,230,118,.7)" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      <input type="text" class="input-control fill-ans-input" placeholder="Đáp án #${list.children.length+1}..." oninput="updateCorrectStr()">
      <button type="button" class="btn-del-row" onclick="this.parentElement.remove();updateCorrectStr()">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>`;
    list.appendChild(div);
  };

  window.addAnsRow = window.addRow = function(data=null){
    const type=document.getElementById('qType').value;
    const list=document.getElementById('ansList');
    const div=document.createElement('div'); div.className='ans-row';
    const imgSrc=data?.img||data?.image||'';
    const imgThumbHtml=`
      <div class="ans-img-placeholder" title="Thêm ảnh đáp án" onclick="triggerAnsImgUpload(this)" style="${imgSrc?'display:none':''}">
        <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
      </div>
      <img class="ans-img-thumb" src="${nbEsc(imgSrc)}" style="${imgSrc?'':'display:none'}" onclick="triggerAnsImgUpload(this.previousElementSibling)" title="Đổi ảnh">
      <input type="hidden" class="ans-img-data" value="${nbEsc(imgSrc)}">`;
    let html='';
    if(type==='single'||type==='multiple'){
      const inputType=type==='single'?'radio':'checkbox';
      html=`
        <input type="${inputType}" name="ansMark" class="is-correct" ${data?.isCorrect?'checked':''} onchange="updateCorrectStr()" style="flex-shrink:0;width:18px;height:18px;accent-color:var(--primary);cursor:pointer">
        ${imgThumbHtml}
        <input type="text" class="ans-text input-control" placeholder="Nội dung đáp án..." value="${nbEsc(data?.text||data?.value||'')}" oninput="updateCorrectStr()">`;
    } else if(type==='matching'){
      html=`
        <input type="text" class="l-val input-control" placeholder="Vế A" value="${nbEsc(data?.left||'')}" oninput="updateCorrectStr()">
        <svg style="width:18px;height:18px;fill:rgba(79,172,254,.7);flex-shrink:0" viewBox="0 0 24 24"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg>
        <input type="text" class="r-val input-control" placeholder="Vế B" value="${nbEsc(data?.right||'')}" oninput="updateCorrectStr()">`;
    } else if(type==='ordering'){
      html=`
        <span style="color:rgba(79,172,254,.8);font-weight:800;flex-shrink:0;font-size:.9rem">#</span>
        ${imgThumbHtml}
        <input type="text" class="ord-val input-control" placeholder="Bước thực hiện..." value="${nbEsc(data?.text||data?.value||'')}" oninput="updateCorrectStr()">`;
    }
    div.innerHTML=html+`
      <button type="button" class="btn-del-row" onclick="this.closest('.ans-row').remove();updateCorrectStr()">
        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>`;
    list.appendChild(div);
  };

  /* ── Nén ảnh về kích thước nhỏ để tránh payload quá lớn khi gửi qua GAS ── */
  function _compressImg(dataUrl, maxW, maxH, quality){
    maxW=maxW||320; maxH=maxH||320; quality=quality||0.72;
    return new Promise(function(resolve){
      var img=new Image();
      img.onload=function(){
        var w=img.width, h=img.height;
        var ratio=Math.min(maxW/w, maxH/h, 1);
        w=Math.round(w*ratio); h=Math.round(h*ratio);
        var canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror=function(){ resolve(dataUrl); };
      img.src=dataUrl;
    });
  }

  window.triggerAnsImgUpload = function(placeholder){
    var input=document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange=function(){
      var file=input.files[0]; if(!file) return;
      if(file.size>3*1024*1024){ nbToast('warning','Ảnh quá lớn! Tối đa 3MB'); return; }
      var reader=new FileReader();
      reader.onload=function(e){
        _compressImg(e.target.result, 320, 320, 0.72).then(function(compressed){
          var row=placeholder.closest('.ans-row');
          var thumb=row.querySelector('.ans-img-thumb');
          var hidden=row.querySelector('.ans-img-data');
          if(thumb){ thumb.src=compressed; thumb.style.display='block'; }
          if(placeholder) placeholder.style.display='none';
          if(hidden) hidden.value=compressed;
          var kb=Math.round(compressed.length*0.75/1024);
          nbToast('success','Ảnh đã nén: ~'+kb+'KB');
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  window.updateCorrectStr = function(){
    const type=document.getElementById('qType').value;
    let result='';
    if(type==='tf'){
      result=document.getElementById('tfCorrect')?.value||'Đúng';
    } else if(type==='fill'){
      result=Array.from(document.querySelectorAll('.fill-ans-input'))
        .map(i=>i.value.trim()).filter(Boolean).join('|');
    } else {
      const parts=[];
      document.querySelectorAll('.ans-row').forEach(row=>{
        if(type==='single'||type==='multiple'){
          const mark=row.querySelector('.is-correct');
          const txt=row.querySelector('.ans-text')?.value.trim()||'';
          if(mark?.checked && txt) parts.push(txt);
        } else if(type==='matching'){
          const l=row.querySelector('.l-val')?.value.trim()||'';
          const r=row.querySelector('.r-val')?.value.trim()||'';
          if(l&&r) parts.push(`${l}-${r}`);
        } else if(type==='ordering'){
          const txt=row.querySelector('.ord-val')?.value.trim()||'';
          if(txt) parts.push(txt);
        }
      });
      result=parts.join('|');
    }
    const fc=document.getElementById('finalCorrect');
    if(fc) fc.value=result;
    calculatePreviewPoints();
  };

  window.toggleScoreUI = function(){
    const mode=document.getElementById('scoreMode')?.value;
    const boxEq=document.getElementById('boxTotalScore');
    const boxCust=document.getElementById('boxPoint');
    if(boxEq) boxEq.style.display=mode==='equal'?'block':'none';
    if(boxCust) boxCust.style.display=mode==='custom'?'block':'none';
  };
  window.calculatePreviewPoints = function(){
    const mode    = document.getElementById('scoreMode')?.value;
    const preview = document.getElementById('scorePreview');
    if(!preview) return;
    if(mode === 'custom'){
      const pts = parseFloat(document.getElementById('qPoint')?.value)||0;
      preview.innerText = `Câu này được: ${pts.toFixed(2)} điểm`;
      return;
    }
    const total = parseFloat(document.getElementById('totalScore')?.value)||0;
    // Edit: số câu không đổi | Thêm mới: +1 câu đang tạo
    const count = window._aqEditMode
      ? Math.max(window._aqQCount, 1)
      : (window._aqQCount + 1);
    const perQ = count > 0 ? (total / count) : 0;
    preview.innerText = `${perQ.toFixed(2)} đ/câu · ${count} câu · tổng ${total}đ`;
  };
  window.handleLinkInput = function(val){
    if(val.length>10) updateQPreview(val);
  };
  window.handleFile = function(input){
    const file=input.files[0]; if(!file) return;
    if(file.size>5*1024*1024){ nbToast('warning','Ảnh quá lớn! Tối đa 5MB'); return; }
    const reader=new FileReader();
    reader.onload=e=>{
      _compressImg(e.target.result,800,600,0.80).then(compressed=>{
        updateQPreview(compressed);
        document.getElementById('qUrl').value='Local File';
        const kb=Math.round(compressed.length*0.75/1024);
        nbToast('success','Ảnh câu hỏi đã nén: ~'+kb+'KB');
      });
    };
    reader.readAsDataURL(file);
  };
  window.updateQPreview = window.updatePreview = function(src){
    document.getElementById('qPrevBox').style.display='block';
    document.getElementById('qPrevImg').src=src;
    document.getElementById('qData').value=src;
  };
  window.clearMedia = function(){
    document.getElementById('qPrevBox').style.display='none';
    document.getElementById('qData').value='';
    document.getElementById('qUrl').value='';
    const fi=document.getElementById('fileInput'); if(fi) fi.value='';
  };

  window.fillEditData = function(data){
    document.getElementById('qText').value=data.question||'';
    const typeEl=document.getElementById('qType');
    if(typeEl) typeEl.value=data.type||'single';
    document.getElementById('testTime').value=data.testTime||15;
    document.getElementById('scoreMode').value=data.scoreMode||'equal';
    document.getElementById('totalScore').value=data.totalScore||10;
    document.getElementById('qPoint').value=data.points||1;
    toggleScoreUI();
    if(data.image) updateQPreview(data.image);
    const list=document.getElementById('ansList'); list.innerHTML='';
    let ansObj={items:[]};
    try{ ansObj=(typeof data.answer==='string')?JSON.parse(data.answer):data.answer; }catch(e){}
    if(data.type==='tf'){ renderEditor(); const tf=document.getElementById('tfCorrect'); if(tf) tf.value=data.correct||'Đúng'; }
    else if(data.type==='fill'){
      renderEditor();
      const fillList=document.getElementById('fillList');
      if(fillList&&data.correct){
        const answers=String(data.correct).split('|');
        fillList.innerHTML='';
        answers.forEach((ans,idx)=>{
          const d=document.createElement('div'); d.className='fill-ans-item';
          d.innerHTML=`
            <svg style="color:rgba(0,230,118,.7)" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <input type="text" class="input-control fill-ans-input" value="${nbEsc(ans)}" placeholder="Đáp án #${idx+1}" oninput="updateCorrectStr()">
            ${idx>0?`<button type="button" class="btn-del-row" onclick="this.parentElement.remove();updateCorrectStr()"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>`:''}`;
          fillList.appendChild(d);
        });
      }
    } else if(ansObj&&ansObj.items){
      const addBtn=document.getElementById('addBtn');
      if(addBtn) addBtn.style.display='flex';
      ansObj.items.forEach(it=>addAnsRow(it));
    }
    updateCorrectStr();
  };

  window.fetchQuestionStats = async function(testId){
    try{
      const data=await nbGet('getQuestions',{testId});
      window._aqQCount=Array.isArray(data)?data.length:0;
      if(window._aqQCount>0&&!window._aqEditMode){
        // Thêm mới: lấy settings từ đề hiện tại để đồng bộ
        const s=data[0];
        document.getElementById('testTime').value=s.testTime||15;
        document.getElementById('scoreMode').value=s.scoreMode||'equal';
        document.getElementById('totalScore').value=s.totalScore||10;
        toggleScoreUI();
      }
      // Cả 2 mode đều cần cập nhật preview điểm với count đúng
      calculatePreviewPoints();
    }catch(e){}
  };

  window.saveData = async function(){
    const btn=document.getElementById('saveBtn');
    const testData=JSON.parse(localStorage.getItem('currentTest'));
    const question=document.getElementById('qText').value.trim();
    const correct=document.getElementById('finalCorrect').value.trim();
    const type=document.getElementById('qType').value;
    if(!question) return nbAlert('error','Thiếu nội dung','Câu hỏi không được bỏ trống!');
    if(!correct&&type!=='fill')
      return nbAlert('warning','Thiếu đáp án','Vui lòng thiết lập ít nhất 1 đáp án đúng!');
    btn.disabled=true;
    btn.innerHTML=`<svg style="animation:spin .8s linear infinite;display:inline-block;width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> ĐANG ĐỒNG BỘ...`;

    /* ── Build answer payload ── */
    const payloadAnswers={items:[]};
    document.querySelectorAll('.ans-row').forEach(row=>{
      if(type==='single'||type==='multiple'){
        const txt=row.querySelector('.ans-text')?.value.trim()||'';
        const img=row.querySelector('.ans-img-data')?.value||'';
        if(txt) payloadAnswers.items.push({text:txt,isCorrect:!!row.querySelector('.is-correct')?.checked,img});
      } else if(type==='matching'){
        const l=row.querySelector('.l-val')?.value.trim()||'';
        const r=row.querySelector('.r-val')?.value.trim()||'';
        if(l&&r) payloadAnswers.items.push({left:l,right:r});
      } else if(type==='ordering'){
        const txt=row.querySelector('.ord-val')?.value.trim()||'';
        const img=row.querySelector('.ans-img-data')?.value||'';
        if(txt) payloadAnswers.items.push({text:txt,img});
      }
    });

    /* ── Nén ảnh câu hỏi nếu là base64 ── */
    let qImg=document.getElementById('qData').value||document.getElementById('qUrl').value||'';
    if(qImg.startsWith('data:image')){
      try{ qImg=await _compressImg(qImg,800,600,0.78); }catch(e){}
    }

    const testTime   = document.getElementById('testTime').value;
    const scoreMode  = document.getElementById('scoreMode').value;
    const totalScore = document.getElementById('totalScore').value;
    const answerJson = JSON.stringify(payloadAnswers);

    /* ── Kiểm tra kích thước payload ── */
    const payloadSize=new Blob([answerJson+qImg]).size;
    if(payloadSize>180*1024){
      btn.disabled=false;
      btn.innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg> ĐỒNG BỘ LÊN CLOUD`;
      return nbAlert('warning','Ảnh quá nặng',
        `Tổng dữ liệu ảnh ~${Math.round(payloadSize/1024)}KB, vượt giới hạn 180KB.\nHãy dùng link ảnh (URL) thay vì tải ảnh trực tiếp cho đáp án có nhiều ảnh.`);
    }

    const finalData={
      action:'saveQuestion', testId:testData.id,
      testTime, scoreMode, totalScore,
      points:document.getElementById('qPoint').value,
      type, question,
      oldQuestion:window._aqEditMode?window._aqOriginalQ:'',
      image:qImg,
      answer:answerJson,
      correct,
      updateAllSettings:true
    };

    try{
      /* Dùng nbPostForm (URLSearchParams) — reliable hơn no-cors cho payload có ảnh */
      await nbPostForm(finalData);
      nbToast('success','Đã đồng bộ lên Cloud!');
      nb.del('editQuestionData');
      setTimeout(()=>location.href='question-list.html',1800);
    }catch(err){
      nbAlert('error','Lỗi Cloud','Hệ thống bận, vui lòng thử lại!');
      btn.disabled=false;
      btn.innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> THỬ LẠI`;
    }
  };
};

/* ══════════════════════════════════════════════
   Auto-init theo trang
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function(){
  const path=window.location.pathname;
  if(path.includes('dashboard.html'))    nbDashboardInit();
  if(path.includes('add-question.html')) nbAddQuestionInit();
  if(!path.includes('login.html') && !path.includes('index.html')){
    nbSessionInit();
  }
});

/* ══════════════════════════════════════════════
   PAGE: login.html
   ══════════════════════════════════════════════ */
window.nbLgnInit = function(){
  const params      = new URLSearchParams(window.location.search);
  const roleFromUrl = params.get('role') || 'admin';
  let   isRegMode   = false;

  localStorage.removeItem('nb_session_start');

  function _setHeader(mode){
    const iconEl=document.getElementById('headerIcon');
    const textEl=document.getElementById('headerText');
    if(!iconEl||!textEl) return;
    if(mode==='register'){
      textEl.textContent='ĐĂNG KÝ MỚI';
      iconEl.innerHTML=`<path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>`;
    } else if(roleFromUrl==='student'){
      textEl.textContent='HỌC SINH';
      iconEl.innerHTML=`<path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>`;
    } else {
      textEl.textContent='QUẢN TRỊ VIÊN';
      iconEl.innerHTML=`<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5zm-1 3v4h2V8h-2zm0 6v2h2v-2h-2z"/>`;
    }
  }
  _setHeader(null);
  if(roleFromUrl==='student'){
    const regBtn=document.getElementById('regToggleBtn');
    if(regBtn) regBtn.classList.remove('hidden');
  }
  const userInput=document.getElementById('user');
  if(userInput) userInput.focus();

  document.addEventListener('keydown',(e)=>{
    if(e.key==='Enter') nbLgnHandle(isRegMode?'register':'login');
  });

  const regPassInput=document.getElementById('regPass');
  if(regPassInput){
    regPassInput.addEventListener('input',function(){
      const strength=typeof nbPwStrength==='function'?nbPwStrength(this.value):'';
      const bar=document.getElementById('regPwBar');
      const hint=document.getElementById('regPwHint');
      if(bar) bar.className='pw-bar '+strength;
      if(hint){
        const msgs={weak:'Yếu — thêm chữ hoa, số, ký tự đặc biệt',medium:'Trung bình — có thể mạnh hơn!',strong:'Mạnh ✓'};
        hint.textContent=this.value.length>0?(msgs[strength]||''):'';
      }
    });
  }

  window.nbLgnToggleForm = function(showReg){
    isRegMode=showReg;
    const box=document.getElementById('mainBox');
    box.classList.add('animate__animated','animate__flipInY');
    setTimeout(()=>{
      document.getElementById('loginForm').classList.toggle('hidden',showReg);
      document.getElementById('registerForm').classList.toggle('hidden',!showReg);
      _setHeader(showReg?'register':null);
      const focusId=showReg?'regFullName':'user';
      const el=document.getElementById(focusId);
      if(el) el.focus();
    },180);
    setTimeout(()=>box.classList.remove('animate__flipInY'),800);
  };
};

window.nbLgnTogglePw = function(inputId, btn){
  const input=document.getElementById(inputId); if(!input) return;
  const isText=input.type==='text';
  input.type=isText?'password':'text';
  btn.querySelector('svg').innerHTML=isText
    ?`<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>`
    :`<path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.42C21.12 14.9 22.29 13.26 23 11.5 21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.76 6.07 11.37 6 12 6zm-1.07.68L13 8.75c.57.26 1.03.72 1.28 1.28l2.07 2.07c.08-.3.14-.6.14-.93-.01-2.21-1.8-4-4-4-.32 0-.63.06-.93.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.45 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.76 2.24 5 5 5 .63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z"/>`;
};

/* ════════════════════════════════════════════════
   LOGIN HANDLER — CORS FIX: dùng GET thay POST
   GET không bị redirect CORS block bởi GAS
   ════════════════════════════════════════════════ */
window.nbLgnHandle = async function(action){
  const params      = new URLSearchParams(window.location.search);
  const roleFromUrl = params.get('role') || 'admin';

  const userVal = action==='login'
    ?(document.getElementById('user')?.value.trim()||'')
    :(document.getElementById('regUser')?.value.trim()||'');
  const passVal = action==='login'
    ?(document.getElementById('pass')?.value.trim()||'')
    :(document.getElementById('regPass')?.value.trim()||'');

  if(!userVal||!passVal){
    if(typeof Swal!=='undefined')
      Swal.fire({icon:'warning',title:'Thiếu thông tin!',text:'Vui lòng nhập đầy đủ các trường yêu cầu.',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
    return;
  }

  const btnId=action==='login'?'btnLogin':'btnReg';
  const currentBtn=document.getElementById(btnId);
  if(!currentBtn||currentBtn.disabled) return;
  currentBtn.disabled=true;
  const originalHtml=currentBtn.innerHTML;
  currentBtn.innerHTML=`<svg style="animation:spin .8s linear infinite;display:inline-block;width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> ĐANG XỬ LÝ...`;

  try{
    /* ── CORS FIX: dùng GET với query params thay vì POST ── */
    const getParams = {
      action,
      user: userVal,
      pass: passVal,
      role: roleFromUrl,
    };
    if(action==='register'){
      getParams.name   = document.getElementById('regFullName')?.value.trim()||'';
      getParams.class  = document.getElementById('regClass')?.value.trim()||'';
      getParams.school = document.getElementById('regSchool')?.value.trim()||'';
    }

    const result = await nbGet(action, getParams);

    if(result.status==='success'){
      if(action==='login'){
        localStorage.setItem('nb_session_start',Date.now().toString());
        nb.setMany({
          userRole:    result.role||'student',
          studentName: result.name,
          username:    userVal,
          schoolName:  result.school||'',
          className:   (result.class||'').replace(/^'+/,''),
          studentClass:(result.class||'').replace(/^'+/,''),
        });
        ['currentIspringName','currentTestId','currentTestName','currentTestDuration',
         'currentTest','quizAnswers','quizQuestions','lastScore','correctCount','quizMode'].forEach(k=>nb.del(k));
        if(typeof Swal!=='undefined'){
          const isAdmin=result.role==='admin';
          Swal.fire({
            html:`<div class="nb-login-success">
              <div class="nb-login-avatar">${result.name.charAt(0).toUpperCase()}</div>
              <div class="nb-login-welcome">Chào mừng trở lại!</div>
              <div class="nb-login-name">${result.name}</div>
              <div class="nb-login-role">${isAdmin?'👑 Quản trị viên':'🎓 Học sinh'}</div>
            </div>`,
            timer:2200, showConfirmButton:false,
            background:'rgba(8,14,30,0.97)', color:'#f1f5f9',
            customClass:{popup:'nb-swal-popup nb-login-popup'},
            showClass:{popup:'animate__animated animate__zoomIn'},
          });
        }
        setTimeout(()=>{
          window.location.href = result.role==='admin' ? 'dashboard.html' : 'name.html';
        },2200);
      } else {
        if(typeof Swal!=='undefined'){
          Swal.fire({
            html:`<div class="nb-swal-icon nb-icon-ok"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
              <h3 class="nb-swal-title">Gửi thành công!</h3>
              <p class="nb-swal-text">Yêu cầu đã được gửi. Hãy chờ quản trị viên phê duyệt.</p>`,
            background:'rgba(8,14,30,0.97)',color:'#f1f5f9',
            confirmButtonText:'Đã hiểu',
            customClass:{popup:'nb-swal-popup',confirmButton:'nb-swal-btn nb-swal-btn-confirm'},
            buttonsStyling:false,
            showClass:{popup:'animate__animated animate__zoomIn'},
          }).then(()=>{ if(typeof window.nbLgnToggleForm==='function') window.nbLgnToggleForm(false); });
        }
      }
    } else if(result.status==='pending'){
      if(typeof Swal!=='undefined')
        Swal.fire({
          html:`<div class="nb-swal-icon nb-icon-warn"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>
            <h3 class="nb-swal-title">Tài khoản đang chờ duyệt</h3>
            <p class="nb-swal-text">Quản trị viên sẽ phê duyệt tài khoản của bạn sớm nhất có thể.</p>`,
          background:'rgba(8,14,30,0.97)',color:'#f1f5f9',
          confirmButtonText:'Đã hiểu',
          customClass:{popup:'nb-swal-popup',confirmButton:'nb-swal-btn nb-swal-btn-confirm'},
          buttonsStyling:false,
          showClass:{popup:'animate__animated animate__zoomIn'},
        });
    } else {
      if(typeof Swal!=='undefined')
        Swal.fire({
          html:`<div class="nb-swal-icon nb-icon-err"><svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>
            <h3 class="nb-swal-title">Đăng nhập thất bại</h3>
            <p class="nb-swal-text">${result.message||'Sai tên đăng nhập hoặc mật khẩu!'}</p>`,
          background:'rgba(8,14,30,0.97)',color:'#f1f5f9',
          confirmButtonText:'Thử lại',
          customClass:{popup:'nb-swal-popup',confirmButton:'nb-swal-btn nb-swal-btn-danger'},
          buttonsStyling:false,
          showClass:{popup:'animate__animated animate__zoomIn'},
        });
      const box=document.getElementById('mainBox');
      if(box){ box.classList.add('shake'); setTimeout(()=>box.classList.remove('shake'),400); }
    }
  }catch(error){
    console.error('Login error:', error);
    if(typeof Swal!=='undefined')
      Swal.fire({
        html:`<div class="nb-swal-icon nb-icon-err"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></div>
          <h3 class="nb-swal-title">Lỗi kết nối</h3>
          <p class="nb-swal-text">Không thể liên lạc với máy chủ. Kiểm tra kết nối mạng và thử lại.</p>`,
        background:'rgba(8,14,30,0.97)',color:'#f1f5f9',
        confirmButtonText:'Thử lại',
        customClass:{popup:'nb-swal-popup',confirmButton:'nb-swal-btn nb-swal-btn-confirm'},
        buttonsStyling:false,
        showClass:{popup:'animate__animated animate__zoomIn'},
      });
  }finally{
    currentBtn.disabled=false;
    currentBtn.innerHTML=originalHtml;
  }
};

/* ══════════════════════════════════════════════
   PAGE: name.html
   ══════════════════════════════════════════════ */
window.nbNameInit = function(){
  if(!nb.isLogged()){
    nbAlert('error','Hết phiên làm việc','Vui lòng đăng nhập để tiếp tục.')
      .then(()=>{ location.replace('login.html'); });
    return;
  }

  const inputs={
    name:  document.getElementById('nameInput'),
    school:document.getElementById('schoolInput'),
    cls:   document.getElementById('classInput'),
  };

  const cached={
    name:   localStorage.getItem('studentName'),
    school: (localStorage.getItem('schoolName')||'').replace(/^'+/,''),
    cls:    (localStorage.getItem('className')||'').replace(/^'+/,''),
  };

  if(cached.name&&cached.school&&cached.cls){
    inputs.name.value  =cached.name;
    inputs.school.value=cached.school;
    inputs.cls.value   =cached.cls;
    [inputs.name,inputs.school,inputs.cls].forEach(i=>i.readOnly=true);
    return;
  }

  Object.values(inputs).forEach(el=>el.classList.add('nm-loading'));
  const username=nb.get('username');

  nbGet('getUserInfo',{username})
    .then(data=>{
      Object.values(inputs).forEach(el=>el.classList.remove('nm-loading'));
      if(data.status==='success'){
        const name  =data.name||'';
        const school=(data.school||'').replace(/^'+/,'');
        const cls   =(data.class||'').replace(/^'+/,'');
        inputs.name.value  =name;
        inputs.school.value=school;
        inputs.cls.value   =cls;
        if(name)  {inputs.name.readOnly  =true; nb.set('studentName',name);}
        if(school){inputs.school.readOnly=true; nb.set('schoolName',school);}
        if(cls)   {inputs.cls.readOnly   =true; nb.set('className',cls);}
      } else {
        inputs.name.placeholder  ='Nhập họ tên...';
        inputs.school.placeholder='Nhập tên trường...';
        inputs.cls.placeholder   ='Nhập lớp...';
      }
    })
    .catch(()=>{
      Object.values(inputs).forEach(el=>el.classList.remove('nm-loading'));
      nbToast('warning','Không tải được thông tin. Vui lòng nhập tay.');
      inputs.name.placeholder  ='Nhập họ tên...';
      inputs.school.placeholder='Nhập tên trường...';
      inputs.cls.placeholder   ='Nhập lớp...';
    });

  document.addEventListener('keydown',e=>{ if(e.key==='Enter') window.nbNameSubmit(); });
};

window.nbNameSubmit = function(){
  const name  =(document.getElementById('nameInput')?.value||'').trim();
  const school=(document.getElementById('schoolInput')?.value||'').trim();
  const cls   =(document.getElementById('classInput')?.value||'').trim();
  if(!name||!school||!cls){
    nbAlert('warning','Thông tin chưa đủ','Vui lòng điền đầy đủ họ tên, trường và lớp.');
    return;
  }
  nb.setMany({studentName:name,schoolName:school,className:cls});
  const box=document.querySelector('.nm-box');
  if(box){box.style.transition='.35s';box.style.opacity='0';box.style.transform='translateY(-12px)';}
  setTimeout(()=>{ location.href='select.html'; },360);
};

/* ══════════════════════════════════════════════
   PAGE: select.html
   ══════════════════════════════════════════════ */
window.nbSelectInit = function(){
  if(!nb.isLogged()){ location.replace('login.html'); return; }

  let _allTests=[], _ispringTests=[];

  /* Clear cache bài thi cũ khi vào trang select */
  ['currentTestId','currentTestName','currentTestDuration','currentTest',
   'currentIspringName','quizAnswers','quizQuestions','lastScore','correctCount','quizMode']
    .forEach(k=>nb.del(k));

  function _initUser(){
    const u=nb.user();
    const nameEl =document.getElementById('selNavName');
    const classEl=document.getElementById('selNavClass');
    const wlcEl  =document.getElementById('selWelcome');
    if(nameEl)  nameEl.textContent =u.name;
    if(classEl) classEl.textContent=u.cls?`Lớp: ${u.cls}`:(u.school||'');
    if(wlcEl)   wlcEl.innerHTML=`Bạn đã sẵn sàng chinh phục, <b style="color:var(--accent)">${u.name}</b>?`;
  }

  async function _loadTests(){
    const listEl=document.getElementById('selTestList');
    try{
      const data=await callAPI('getTests');
      _allTests=Array.isArray(data)?data:[];
      _renderTests();
    }catch(e){
      listEl.innerHTML=`<div class="sel-empty">
        <svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
        Không thể kết nối máy chủ!</div>`;
    }
  }

  async function _loadIspring(){
    try{
      const data=await callAPI('getIspring');
      if(Array.isArray(data)){
        _ispringTests=data
          .filter(t=>t.visible!==false&&t.name)
          .map(t=>({
            ...t,
            name:    t.name    ||t.nameIPS    ||'',
            path:    String(t.path||t.pathIPS||'').trim(),
            duration:sanitizeDur(t.duration||t.durationIPS||''),
            subject: t.subject ||t.typeIPS    ||'',
            desc:    t.desc    ||t.descriptionIPS||'',
          }));
      }
    }catch(e){ _ispringTests=[]; }
    _renderIspring();
  }

  function _renderTests(search=''){
    const listEl =document.getElementById('selTestList');
    const countEl=document.getElementById('selSysCount');
    const filtered=_allTests.filter(t=>t.name.toLowerCase().includes(search.toLowerCase()));
    if(countEl) countEl.textContent=filtered.length+' đề';
    if(!filtered.length){
      listEl.innerHTML=`<div class="sel-empty">
        <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        ${search?'Không có đề thi phù hợp':'Chưa có đề thi nào'}</div>`;
      return;
    }
    listEl.innerHTML=filtered.map((t,i)=>`
      <div class="sel-card animate__animated animate__fadeInUp" style="animation-delay:${i*.04}s"
        onclick='window._nbConfirmLaunch(${JSON.stringify(JSON.stringify(t))})'>
        <div style="min-width:0;flex:1">
          <span class="sel-card-name">${nbEsc(t.name)}</span>
          <div class="sel-card-meta">
            <span><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>${sanitizeDur(t.duration)}p</span>
            <span><svg viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>${t.qCount||'?'} câu</span>
            ${t.maxScore?`<span><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${t.maxScore}đ</span>`:''}
            ${t.desc?`<span class="sel-card-desc"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM14 6l-1-2H5v17h2v-7h5l1 2h7V6h-6zm4 8h-4l-1-2H7V6h5l1 2h5v6z"/></svg>${nbEsc(t.desc)}</span>`:''}
          </div>
        </div>
        <div class="sel-play-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
      </div>`).join('');
  }

  function _renderIspring(search=''){
    const listEl =document.getElementById('selIspringList');
    const countEl=document.getElementById('selIspCount');
    const filtered=_ispringTests.filter(t=>t.name.toLowerCase().includes(search.toLowerCase()));
    if(countEl) countEl.textContent=filtered.length+' bài';
    if(!filtered.length){
      listEl.innerHTML=`<div class="sel-empty">
        <svg viewBox="0 0 24 24"><path d="M12 2.5s4.5 2.04 4.5 10.5c0 2.49-1.04 5.57-1.6 7H9.1c-.56-1.43-1.6-4.51-1.6-7C7.5 4.54 12 2.5 12 2.5zm2 13.5h-4l-1 4h6l-1-4zm-2-9c-.83 0-1.5.67-1.5 1.5S11.17 10 12 10s1.5-.67 1.5-1.5S12.83 7 12 7z"/></svg>
        ${search?'Không tìm thấy bài iSpring phù hợp':'Chưa có bài thi iSpring'}</div>`;
      return;
    }
    listEl.innerHTML=filtered.map((t,i)=>`
      <div class="sel-card sel-card-isp animate__animated animate__fadeInUp" style="animation-delay:${i*.04}s"
        onclick='window._nbLaunchIspring(${JSON.stringify(JSON.stringify(t))})'>
        <div style="min-width:0;flex:1">
          <span class="sel-card-name">
            ${nbEsc(t.name)}
            <span class="sel-isp-badge">iSpring</span>
          </span>
          <div class="sel-card-meta">
            ${sanitizeDur(t.duration)?`<span><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>${sanitizeDur(t.duration)}p</span>`:''}
            ${t.subject?`<span>${nbEsc(t.subject)}</span>`:''}
            ${t.desc?`<span>${nbEsc(t.desc)}</span>`:''}
          </div>
        </div>
        <div class="sel-play-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
      </div>`).join('');
  }

  window._nbRenderAll = window.nbRenderAll = function(){
    const q=(document.getElementById('selSearch')?.value||'').toLowerCase();
    _renderTests(q);
    _renderIspring(q);
  };

  window._nbLaunchIspring = function(testJson){
    const test=JSON.parse(testJson);
    if(!test.path){
      nbAlert('warning','Thiếu đường dẫn','Bài thi này chưa có path. Liên hệ admin.');
      return;
    }
    Swal.fire({
      title:'Mở bài thi iSpring?',
      html:`<div style="text-align:left;font-size:.9rem;line-height:2;color:rgba(255,255,255,.8)">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08)">
          <svg width="16" height="16" fill="var(--ispring)" viewBox="0 0 24 24"><path d="M12 2.5s4.5 2.04 4.5 10.5c0 2.49-1.04 5.57-1.6 7H9.1c-.56-1.43-1.6-4.51-1.6-7C7.5 4.54 12 2.5 12 2.5z"/></svg>
          <span>Bài thi: <b style="color:var(--ispring)">${nbEsc(test.name)}</b></span>
        </div>
        ${test.duration?`<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">⏱ Thời gian: <b>${sanitizeDur(test.duration)} phút</b></div>`:''}
        ${test.subject?`<div style="padding:8px 0">📚 Môn học: <b>${nbEsc(test.subject)}</b></div>`:''}
        </div>`,
      icon:'question', showCancelButton:true,
      confirmButtonText:'MỞ BÀI THI', cancelButtonText:'HỦY',
      confirmButtonColor:'rgba(249,115,22,.9)',
      background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
    }).then(res=>{
      if(res.isConfirmed){
        nb.set('currentIspringName',test.name);
        location.href=`player.html?path=${encodeURIComponent(test.path)}`;
      }
    });
  };

  window._nbSelectLogout = function(){
    nbConfirm({
      title:'Đăng xuất?', text:'Hành động này sẽ kết thúc phiên làm việc.',
      icon:'question', confirmButtonText:'ĐĂNG XUẤT', confirmButtonColor:'#ff4757',
    }).then(r=>{ if(r.isConfirmed){ nb.clear(); location.href='index.html'; }});
  };

  _initUser();
  Promise.all([_loadTests(), _loadIspring()]);
};

/* Auto-init */
document.addEventListener('DOMContentLoaded', function(){
  const path=window.location.pathname;
  if(path.includes('name.html'))   nbNameInit();
  if(path.includes('select.html')) nbSelectInit();
});

/* ══════════════════════════════════════════════
   PAGE: result.html
   ══════════════════════════════════════════════ */
window.nbResultInit = function(){
  let _quizData    ={questions:[],answers:{}};
  let _reviewLoaded=false;

  const name     =nb.get('studentName')    ||'Người dùng';
  const school   =(nb.get('schoolName')    ||'Tự do').replace(/^'+/,'');
  const cls      =nb.get('className')      ||'';
  const testName =nb.get('currentTestName')||'Bài thi';
  const score    =parseFloat(nb.get('lastScore')||'0');
  const correct  =nb.get('correctCount')   ||'0/0';

  const _set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  _set('resName',   name);
  _set('resSchool', school+(cls?' · '+cls:''));
  _set('resCorrect',correct);
  _set('resTestName',testName);

  const titleEl =document.getElementById('resTitle');
  const trophyEl=document.getElementById('resTrophy');
  const totalScoreBase=parseFloat(nb.get('quizTotalScore')||10)||10;
  const pct=totalScoreBase>0?(score/totalScoreBase):0;
  if(pct>=0.8)      {if(titleEl)titleEl.textContent='XUẤT SẮC!';    if(trophyEl)trophyEl.textContent='👑';}
  else if(pct>=0.5) {if(titleEl)titleEl.textContent='TỐT LẮM!';     if(trophyEl)trophyEl.textContent='🚀';}
  else              {if(titleEl)titleEl.textContent='CỐ GẮNG LÊN!'; if(trophyEl)trophyEl.textContent='🎯';}

  _animateScore(score);

  try{
    _quizData.answers  =JSON.parse(nb.get('quizAnswers')  ||'{}');
    _quizData.questions=JSON.parse(nb.get('quizQuestions')||'[]');
  }catch(e){ _quizData.answers={}; _quizData.questions=[]; }

  window.nbOpenReview = async function(){
    const modal=document.getElementById('resModal');
    if(modal) modal.classList.add('open');
    if(_reviewLoaded) return;
    const listEl=document.getElementById('resQList');
    if(!_quizData.questions||_quizData.questions.length===0){
      const tid=nb.get('currentTestId');
      if(!tid){
        if(listEl) listEl.innerHTML=`<div class="res-empty"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>Không tìm thấy dữ liệu đề thi.</div>`;
        return;
      }
      if(listEl) listEl.innerHTML=`<div class="res-empty"><svg style="animation:spin .8s linear infinite" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg><p>Đang tải câu hỏi...</p></div>`;
      try{
        const data=await nbGet('getQuestions',{testId:tid});
        _quizData.questions=Array.isArray(data)?data:[];
      }catch(e){
        if(listEl) listEl.innerHTML=`<div class="res-empty" style="color:var(--danger)">Lỗi kết nối máy chủ.</div>`;
        return;
      }
    }
    if(!_quizData.questions.length){
      if(listEl) listEl.innerHTML=`<div class="res-empty">Không có câu hỏi.</div>`;
      return;
    }
    _renderReview();
    _reviewLoaded=true;
  };

  window.nbCloseReview=function(){
    const modal=document.getElementById('resModal');
    if(modal) modal.classList.remove('open');
  };
  window.nbToggleQ=function(i){
    document.getElementById('rqi'+i)?.classList.toggle('open');
  };

  function _renderReview(){
    let cOk=0,cErr=0,cSkip=0;
    const SVG={
      check:`<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
      times:`<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
      minus:`<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>`,
      star: `<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
      pen:  `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
      list: `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
      link: `<svg viewBox="0 0 24 24"><path d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm1-4H8v2h8v-2z"/></svg>`,
    };
    const rows=_quizData.questions.map((q,i)=>{
      const userAns   =String(_quizData.answers[q.question]||'');
      const correctAns=String(q.correct||q.correctAnswer||'').trim();
      const type      =String(q.type||'single').toLowerCase();
      const isCorrect =nbCheckAns(type,userAns,correctAns);
      const status    =!userAns?'skip':(isCorrect?'ok':'err');
      if(status==='ok')cOk++; else if(status==='err')cErr++; else cSkip++;
      const pts=parseFloat(q.points)||0;
      const ptsHtml=pts>0?`<div class="res-q-pts">${isCorrect?'+'+pts:'0'}đ</div>`:'';
      const imgHtml=(q.image&&q.image.length>10)?`<img src="${nbEsc(q.image)}" class="res-q-img" onerror="this.style.display='none'">`:'';
      const badgeSvg=status==='ok'?SVG.check:(status==='err'?SVG.times:SVG.minus);
      return `<div class="res-q-item q-${status}" id="rqi${i}">
        <div class="res-q-head" onclick="nbToggleQ(${i})">
          <div class="res-q-badge q-${status}">${badgeSvg}</div>
          <div class="res-q-text">Câu ${i+1}: ${nbEsc(q.question)}</div>
          ${ptsHtml}
        </div>
        <div class="res-q-detail">
          <div class="res-detail-inner">${imgHtml}${_buildDetail(q,userAns,correctAns,status,type,SVG)}</div>
        </div>
      </div>`;
    });
    const chipsEl=document.getElementById('resChips');
    if(chipsEl) chipsEl.innerHTML=`
      <div class="res-chip res-chip-ok">${cOk}<small>Đúng</small></div>
      <div class="res-chip res-chip-err">${cErr}<small>Sai</small></div>
      <div class="res-chip res-chip-skip">${cSkip}<small>Bỏ qua</small></div>`;
    const listEl=document.getElementById('resQList');
    if(listEl) listEl.innerHTML=rows.join('');
  }

  function _buildDetail(q,userAns,correctAns,status,type,SVG){
    let html='<div class="res-detail-lbl">Chi tiết đáp án</div>';
    if(type==='single'||type==='mcq'||type==='tf'||type==='multiple'){
      const opts=_getOpts(q,type);
      if(opts.length){
        const uArr=userAns?userAns.split('|').map(s=>s.trim()):[];
        const cArr=correctAns?correctAns.split('|').map(s=>s.trim()):[];
        opts.forEach(opt=>{
          const chosen=uArr.includes(opt.trim());
          const right =cArr.includes(opt.trim());
          let cls='',svg=`<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>`;
          if(right){cls='opt-ok';svg=SVG.check;}
          else if(chosen&&!right){cls='opt-err';svg=SVG.times;}
          html+=`<div class="res-opt ${cls}">${svg}${nbEsc(opt)}</div>`;
        });
        return html;
      }
      html+=`<div class="res-opt opt-ok">${SVG.star}Đáp án đúng: ${nbEsc(correctAns||'—')}</div>`;
      if(userAns) html+=`<div class="res-opt ${status==='ok'?'opt-ok':'opt-err'}">${SVG.pen}Bài làm: ${nbEsc(userAns)}</div>`;
      return html;
    }
    if(type==='ordering'){
      html+=`<div class="res-opt ${status==='ok'?'opt-ok':'opt-err'}" style="margin-bottom:6px">${SVG.list}Thứ tự bạn chọn: ${nbEsc(userAns?userAns.replace(/\|/g,' → '):'(Chưa sắp xếp)')}</div>`;
      if(status!=='ok') html+=`<div class="res-opt opt-ok">${SVG.star}Đáp án đúng: ${nbEsc(correctAns.replace(/\|/g,' → '))}</div>`;
      return html;
    }
    if(type==='matching'){
      html+=`<div class="res-opt ${status==='ok'?'opt-ok':'opt-err'}" style="margin-bottom:6px">${SVG.link}Bạn ghép: ${nbEsc(userAns?userAns.replace(/\|/g,' | '):'(Chưa ghép)')}</div>`;
      if(status!=='ok') html+=`<div class="res-opt opt-ok">${SVG.star}Đáp án đúng: ${nbEsc(correctAns.replace(/\|/g,' | '))}</div>`;
      return html;
    }
    const fCls=status==='ok'?'opt-ok':'opt-err';
    const fSvg=status==='ok'?SVG.check:SVG.times;
    html+=`<div class="res-opt ${fCls}" style="margin-bottom:6px">${fSvg}Bài làm: ${nbEsc(userAns||'(Trống)')}</div>`;
    html+=`<div class="res-opt opt-ok">${SVG.star}Đáp án đúng: ${nbEsc(correctAns||'—')}</div>`;
    return html;
  }

  function _getOpts(q,type){
    if(type==='tf') return ['Đúng','Sai'];
    try{
      const det=q.details||(typeof q.answer==='string'?JSON.parse(q.answer):(q.answer||{}));
      const items=det.items||det.options||[];
      return items.map(o=>typeof o==='object'&&o?(o.text||JSON.stringify(o)):String(o));
    }catch(e){ return []; }
  }

  function _animateScore(end){
    const el=document.getElementById('resScoreVal'); if(!el) return;
    let st=null; const dur=1300;
    const step=ts=>{
      if(!st)st=ts;
      const p=Math.min((ts-st)/dur,1);
      const v=(p*end).toFixed(1);
      el.textContent=v.endsWith('.0')?v.slice(0,-2):v;
      if(p<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
};

/* Auto-init */
document.addEventListener('DOMContentLoaded', function(){
  const path=window.location.pathname;
  if(path.includes('result.html')) nbResultInit();
  if(path.includes('quiz.html'))   nbQuizInit();
});

/* ══════════════════════════════════════════════
   PAGE: quiz.html — Quiz engine (Train + Test)
   ══════════════════════════════════════════════ */
window.nbQuizInit = function(){
  /* ── State ── */
  let questions=[], currentIdx=0, timeLeft=0, timerInterval=null;
  let isSubmitting=false, quizMode='train';
  let userAnswers={}, trainFeedback={};

  const API=window.API;

  /* ── INIT ── */
  (async function init(){
    localStorage.removeItem('quizAnswers');
    localStorage.removeItem('quizQuestions');
    localStorage.removeItem('quiz_submitted');
    const testId=localStorage.getItem('currentTestId');
    if(!testId){ location.href='select.html'; return; }
    quizMode=localStorage.getItem('quizMode')||'train';
    const studentName=nb.get('studentName')||'Thí sinh';
    const schoolName =(nb.get('schoolName')||'').replace(/^'+/,'');
    const infoEl=document.getElementById('studentInfo');
    if(infoEl) infoEl.textContent=schoolName?`${studentName} · ${schoolName}`:studentName;
    const badge=document.getElementById('qzModeBadge');
    if(badge){
      if(quizMode==='train'){
        badge.innerHTML=`<svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg> LUYỆN TẬP`;
        badge.className='qz-mode-badge badge-train';
        document.body.classList.add('mode-train');
      } else {
        badge.innerHTML=`<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg> KIỂM TRA`;
        badge.className='qz-mode-badge badge-test';
        document.body.classList.add('mode-test');
      }
    }
    document.body.setAttribute('data-mode', quizMode); /* CSS train/test tint */
    await loadQuestions(testId);
  })();

  /* ── LOAD QUESTIONS ── */
  async function loadQuestions(testId){
    const card=document.getElementById('qzCard');
    try{
      const res=await fetch(`${API}?action=getQuestions&testId=${encodeURIComponent(testId)}`);
      const data=await res.json();
      if(!Array.isArray(data)||!data.length){
        if(card) card.innerHTML=`<div class="qz-empty">
          <svg viewBox="0 0 24 24"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
          <p>Đề thi chưa có câu hỏi</p>
          <button onclick="location.href='select.html'" class="qz-btn-back">Quay lại</button></div>`;
        const timerEl=document.getElementById('timer');
        if(timerEl) timerEl.textContent=quizMode==='train'?'∞':'0:00';
        return;
      }
      let rawQ=data.map(q=>{
        let details={items:[]};
        try{ details=typeof q.answer==='string'?JSON.parse(q.answer):(q.answer||{items:[]}); }catch(e){}
        const correct=(q.correct||q.correctAnswer||q.correctanswer||'').toString().trim();
        return{...q,details,correct,points:parseFloat(q.points)||0};
      });
      if(quizMode==='test') rawQ=_shuffle(rawQ);
      questions=rawQ.map(q=>{ if(q.details?.items) q.details.items=_shuffle(q.details.items); return q; });
      const durStorage=parseInt(localStorage.getItem('currentTestDuration')||'0');
      const durData   =parseInt(data[0]?.testTime||'0');
      const minutes   =durStorage>0?durStorage:(durData>0?durData:20);
      timeLeft=minutes*60;
      const titleEl=document.getElementById('qzTitle');
      if(titleEl) titleEl.textContent=localStorage.getItem('currentTestName')||'Bài thi Nebula';
      /* Store totalScore for result page normalization */
      const totalScore=parseFloat(data[0]?.totalScore||10);
      localStorage.setItem('quizTotalScore',totalScore);
      renderGrid();
      showQuestion(0);
      if(quizMode==='test') startTimer();
      else{ const t=document.getElementById('timer'); if(t) t.textContent='∞'; }
    }catch(e){
      if(typeof Swal!=='undefined')
        Swal.fire({title:'Lỗi kết nối',text:'Không tải được câu hỏi.',icon:'error',confirmButtonText:'Quay lại',
          background:'rgba(10,15,30,0.97)',color:'#f1f5f9'}).then(()=>location.href='select.html');
    }
  }

  /* ── SHOW QUESTION ── */
  function showQuestion(idx){
    if(idx<0||idx>=questions.length) return;
    currentIdx=idx;
    window.__qzCurrentIdx=idx; /* expose for nav buttons */
    const q=questions[idx];
    const type=(q.type||'single').toLowerCase();
    const counter=document.getElementById('qzCounter');
    if(counter) counter.textContent=`Câu ${idx+1} / ${questions.length}`;
    const qText=document.getElementById('qzQuestion');
    if(qText) qText.textContent=q.question;
    const imgWrap=document.getElementById('qzImageWrap');
    const imgEl=document.getElementById('qzImage');
    if(imgWrap&&imgEl){
      if(q.image&&q.image.length>10){ imgEl.src=q.image; imgWrap.style.display='block'; }
      else imgWrap.style.display='none';
    }
    const prog=document.getElementById('qzProgress');
    if(prog) prog.style.width=`${(idx+1)/questions.length*100}%`;
    const fbEl=document.getElementById('qzFeedback');
    if(fbEl){ fbEl.style.display='none'; fbEl.innerHTML=''; fbEl.className='qz-feedback'; }
    renderAnswers(q,idx,type);
    const prevBtn=document.getElementById('qzPrev');
    if(prevBtn) prevBtn.style.visibility=idx===0?'hidden':'visible';
    const nextBtn=document.getElementById('qzNext');
    const isLast=idx===questions.length-1;
    if(nextBtn){
      nextBtn.innerHTML=isLast
        ?`Hoàn thành <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
        :`Tiếp theo <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;
      nextBtn.className=`qz-btn qz-btn-next${isLast?' qz-btn-finish':''}`;
    }
    document.querySelectorAll('.qz-grid-num').forEach((el,i)=>el.classList.toggle('current',i===idx));
    updateStat();
    if(quizMode==='train'&&trainFeedback[idx]) showTrainFeedback(idx);
    const card=document.getElementById('qzCard');
    if(card) card.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  /* ── RENDER ANSWERS ── */
  function renderAnswers(q,idx,type){
    const box=document.getElementById('qzAnswers');
    const items=q.details?.items||[];
    const saved=userAnswers[idx];
    box.innerHTML='';

    if(['single','mcq','tf'].includes(type)){
      const opts=type==='tf'?['Đúng','Sai']:items.map(o=>typeof o==='object'?o.text:o);
      opts.forEach(txt=>{
        const lbl=document.createElement('label');
        lbl.className='qz-option'+(saved===txt?' selected':'');
        lbl.innerHTML=`<input type="radio" name="ans${idx}" value="${_esc(txt)}" ${saved===txt?'checked':''}><span class="qz-opt-dot"></span><span class="qz-opt-text">${txt}</span>`;
        lbl.querySelector('input').addEventListener('change',()=>{
          saveAnswer(idx,txt);
          box.querySelectorAll('.qz-option').forEach(l=>l.classList.remove('selected'));
          lbl.classList.add('selected');
          if(quizMode==='train') showTrainFeedback(idx);
        });
        box.appendChild(lbl);
      });
    } else if(type==='multiple'){
      const savedArr=saved?saved.split('|'):[];
      items.forEach(opt=>{
        const txt=typeof opt==='object'?opt.text:opt;
        const lbl=document.createElement('label');
        const chk=savedArr.includes(txt);
        lbl.className='qz-option qz-option-check'+(chk?' selected':'');
        lbl.innerHTML=`<input type="checkbox" name="chk${idx}" value="${_esc(txt)}" ${chk?'checked':''}><span class="qz-opt-box"></span><span class="qz-opt-text">${txt}</span>`;
        lbl.querySelector('input').addEventListener('change',()=>{
          const checked=Array.from(box.querySelectorAll(`input[name="chk${idx}"]:checked`)).map(el=>el.value);
          saveAnswer(idx,checked.sort().join('|'));
          lbl.classList.toggle('selected',lbl.querySelector('input').checked);
          if(quizMode==='train') showTrainFeedback(idx);
        });
        box.appendChild(lbl);
      });
    } else if(type==='fill'){
      const wrap=document.createElement('div');
      wrap.className='qz-fill-wrap';
      const inp=document.createElement('input');
      inp.type='text'; inp.className='qz-fill-input';
      inp.placeholder='Nhập đáp án của bạn...';
      inp.value=saved||'';
      inp.setAttribute('autocomplete','off');
      inp.setAttribute('autocorrect','off');
      inp.setAttribute('spellcheck','false');
      /* FIX: only trigger feedback on Enter or blur, not every keystroke */
      inp.addEventListener('input',()=>{ saveAnswer(idx,inp.value.trim()); });
      inp.addEventListener('keydown',(e)=>{
        if(e.key==='Enter'){ e.preventDefault(); inp.blur(); }
      });
      inp.addEventListener('blur',()=>{
        saveAnswer(idx,inp.value.trim());
        if(quizMode==='train'&&inp.value.trim()) showTrainFeedback(idx);
      });
      wrap.appendChild(inp);
      /* Show a hint about multiple accepted answers in train mode */
      if(quizMode==='train'&&q.correct){
        const hint=document.createElement('div');
        hint.className='qz-fill-hint';
        const acceptCount=(q.correct.match(/\|/g)||[]).length+1;
        hint.textContent=acceptCount>1?`Có ${acceptCount} đáp án được chấp nhận. Nhập và nhấn Enter để kiểm tra.`:'Nhập đáp án và nhấn Enter để kiểm tra.';
        wrap.appendChild(hint);
      }
      box.appendChild(wrap);
    } else if(type==='ordering'){
      const list=document.createElement('div');
      list.className='qz-drag-list'; list.id=`sortList${idx}`;
      const savedItems=saved?saved.split('|'):_shuffle(items.map(it=>typeof it==='object'?it.text:it));
      savedItems.forEach(item=>{
        const div=document.createElement('div'); div.className='qz-drag-item';
        div.innerHTML=`<svg class="qz-drag-handle" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg><span>${item}</span>`;
        list.appendChild(div);
      });
      box.appendChild(list);
      if(typeof Sortable!=='undefined'){
        Sortable.create(list,{
          animation:150,handle:'.qz-drag-handle',
          onEnd:()=>{
            const order=Array.from(list.querySelectorAll('span')).map(s=>s.textContent.trim()).join('|');
            saveAnswer(idx,order);
            if(quizMode==='train') showTrainFeedback(idx);
          }
        });
      }
    } else if(type==='matching'){
      const container=document.createElement('div'); container.className='qz-match-wrap';
      items.forEach((item,i)=>{
        const row=document.createElement('div'); row.className='qz-match-row';
        row.innerHTML=`<div class="qz-match-left">${item.left||''}</div><div class="qz-match-arrow">→</div><div class="qz-match-zone" id="zone_${idx}_${i}"></div>`;
        container.appendChild(row);
      });
      const pool=document.createElement('div'); pool.className='qz-match-pool'; pool.id=`pool${idx}`;
      _shuffle(items.map(it=>it.right)).forEach(text=>{
        const div=document.createElement('div'); div.className='qz-drag-item'; div.textContent=text;
        pool.appendChild(div);
      });
      container.appendChild(pool);
      box.appendChild(container);
      if(typeof Sortable!=='undefined'){
        Sortable.create(pool,{group:`match${idx}`,animation:150});
        items.forEach((_,i)=>{
          const zone=document.getElementById(`zone_${idx}_${i}`);
          if(zone) Sortable.create(zone,{
            group:`match${idx}`,animation:150,
            onAdd:(evt)=>{
              if(zone.children.length>1) pool.appendChild(zone.children[1]===evt.item?zone.children[0]:zone.children[1]);
              const pairs=[];
              document.querySelectorAll(`[id^="zone_${idx}_"]`).forEach(z=>{
                const left=z.closest('.qz-match-row').querySelector('.qz-match-left').textContent.trim();
                const right=z.firstElementChild?.textContent?.trim()||'';
                if(right) pairs.push(`${left}-${right}`);
              });
              saveAnswer(idx,pairs.sort().join('|'));
              if(quizMode==='train') showTrainFeedback(idx);
            }
          });
        });
      }
    }
  }

  /* ── TRAIN FEEDBACK ── */
  function showTrainFeedback(idx){
    const q=questions[idx];
    const type=(q.type||'single').toLowerCase();
    const ans=userAnswers[idx]||'';
    const correct=q.correct||'';
    const fbEl=document.getElementById('qzFeedback');
    if(!fbEl) return;
    if(!ans){ fbEl.style.display='none'; return; }
    const isOk=nbCheckAns(type,ans,correct);
    trainFeedback[idx]=true;
    updateGrid(idx);
    fbEl.style.display='flex';
    fbEl.className='qz-feedback '+(isOk?'fb-correct':'fb-wrong');
    const correctDisplay=type==='fill'?String(correct).replace(/\|/g,' / '):String(correct).replace(/\|/g,' · ');
    fbEl.innerHTML=isOk
      ?`<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><span><b>Chính xác!</b> Tuyệt vời!</span>`
      :`<svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg><span><b>Chưa đúng.</b> Đáp án: <em>${_escHtml(correctDisplay)}</em></span>`;
    /* Highlight options */
    if(['single','mcq','tf','multiple'].includes(type)){
      const cArr=correct.split('|').map(s=>s.trim().toLowerCase());
      document.getElementById('qzAnswers')?.querySelectorAll('.qz-option').forEach(lbl=>{
        const val=(lbl.querySelector('input')?.value||'').trim().toLowerCase();
        const isCorrectOpt=cArr.includes(val);
        const userPicked=lbl.classList.contains('selected');
        lbl.classList.remove('opt-correct','opt-wrong');
        if(isCorrectOpt) lbl.classList.add('opt-correct');
        else if(userPicked&&!isCorrectOpt) lbl.classList.add('opt-wrong');
      });
    }
    /* For fill: color the input */
    if(type==='fill'){
      const fillInp=document.getElementById('qzAnswers')?.querySelector('.qz-fill-input');
      if(fillInp){
        fillInp.style.borderColor=isOk?'var(--accent)':'var(--danger)';
        fillInp.style.background=isOk?'rgba(0,255,204,.07)':'rgba(255,71,87,.07)';
      }
    }
  }

  /* ── SAVE ANSWER ── */
  function saveAnswer(idx,val){
    userAnswers[idx]=val;
    updateGrid(idx);
    updateStat();
  }

  /* ── RENDER GRID ── */
  function renderGrid(){
    const grid=document.getElementById('qzGrid');
    if(!grid) return;
    grid.innerHTML='';
    questions.forEach((_,i)=>{
      const btn=document.createElement('button');
      btn.className='qz-grid-num'; btn.textContent=i+1;
      btn.setAttribute('data-idx',i);
      btn.onclick=()=>showQuestion(i);
      grid.appendChild(btn);
    });
  }

  function updateGrid(idx){
    const btn=document.querySelector(`.qz-grid-num[data-idx="${idx}"]`);
    if(!btn) return;
    const val=userAnswers[idx];
    const answered=val!==undefined&&val!=='';
    btn.classList.toggle('answered',answered);
    if(quizMode==='train'&&trainFeedback[idx]&&answered){
      const q=questions[idx];
      const ok=nbCheckAns((q.type||'single').toLowerCase(),val,q.correct||'');
      btn.classList.toggle('correct',ok);
      btn.classList.toggle('wrong',!ok);
    }
  }

  function updateStat(){
    const done=Object.values(userAnswers).filter(v=>v!==undefined&&v!=='').length;
    const el=document.getElementById('qzStat');
    if(el) el.textContent=`${done}/${questions.length} câu`;
  }

  /* ── NAVIGATION ── */
  window.qzChangeTo=function(idx){ if(idx>=0&&idx<questions.length) showQuestion(idx); };
  window.qzHandleNext=function(){
    if(currentIdx===questions.length-1) window.qzCheckBeforeSubmit();
    else showQuestion(currentIdx+1);
  };

  /* ── TIMER ── */
  function startTimer(){
    updateTimerDisplay();
    timerInterval=setInterval(()=>{
      timeLeft--;
      updateTimerDisplay();
      if(timeLeft<=0){ clearInterval(timerInterval); submitQuiz(); }
    },1000);
  }
  function updateTimerDisplay(){
    const m=Math.floor(timeLeft/60),s=timeLeft%60;
    const el=document.getElementById('timer');
    if(el){
      el.textContent=`${m}:${s<10?'0':''}${s}`;
      el.classList.toggle('timer-warning',timeLeft<=60&&timeLeft>0);
    }
  }

  /* ── SUBMIT ── */
  window.qzCheckBeforeSubmit=function(){
    const done=Object.values(userAnswers).filter(v=>v!==undefined&&v!=='').length;
    const skipped=questions.length-done;
    const statusHtml=skipped>0
      ?`<div style="color:#ff4757;font-weight:700;margin-top:10px;padding:10px 14px;background:rgba(255,71,87,.08);border-radius:10px;border:1px solid rgba(255,71,87,.2)">⚠️ Còn <b>${skipped}</b> câu chưa trả lời</div>`
      :`<div style="color:#00e676;font-weight:700;margin-top:10px;padding:10px 14px;background:rgba(0,230,118,.08);border-radius:10px;border:1px solid rgba(0,230,118,.2)">✅ Đã hoàn thành tất cả ${questions.length} câu</div>`;
    if(typeof Swal==='undefined'){ submitQuiz(); return; }
    Swal.fire({
      title:quizMode==='train'?'Kết thúc luyện tập?':'Nộp bài thi?',
      html:`<div style="font-size:.9rem;line-height:1.8;color:rgba(255,255,255,.8)">
        <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:4px">Đã làm: <b style="color:#fff">${done}/${questions.length}</b> câu</div>${statusHtml}</div>`,
      icon:'question',showCancelButton:true,
      confirmButtonText:quizMode==='train'?'✓ Kết thúc':'✓ Nộp bài',
      cancelButtonText:'← Làm tiếp',
      background:'rgba(10,15,30,0.97)',color:'#f1f5f9'
    }).then(r=>{ if(r.isConfirmed) submitQuiz(); });
  };

  async function submitQuiz(){
    if(isSubmitting) return;
    isSubmitting=true;
    clearInterval(timerInterval);
    if(typeof Swal!=='undefined')
      Swal.fire({title:'Đang chấm điểm...',allowOutsideClick:false,background:'rgba(10,15,30,0.97)',color:'#f1f5f9',didOpen:()=>Swal.showLoading()});
    let scoreCount=0, totalScoreAchieved=0;
    const quizAnswersMap={};
    const totalScoreBase=parseFloat(questions[0]?.totalScore)||10;
    questions.forEach((q,i)=>{
      const type=(q.type||'single').toLowerCase();
      const correctAns=q.correct||'';
      const pts=q.points>0?q.points:(totalScoreBase/questions.length);
      let studentAns='';
      if(type==='fill'){
        studentAns=userAnswers[i]||'';
      } else if(['single','mcq','tf'].includes(type)){
        studentAns=document.querySelector(`input[name="ans${i}"]:checked`)?.value.trim()||userAnswers[i]||'';
      } else {
        studentAns=userAnswers[i]||'';
      }
      const isOk=nbCheckAns(type,studentAns,correctAns);
      quizAnswersMap[q.question]=studentAns;
      if(isOk){ scoreCount++; totalScoreAchieved+=pts; }
    });
    const hasValidPoints=questions.some(q=>q.points>0);
    const rawScore=hasValidPoints?totalScoreAchieved:(scoreCount/questions.length)*totalScoreBase;
    const finalScore=parseFloat(rawScore.toFixed(2));
    localStorage.setItem('lastScore',finalScore);
    localStorage.setItem('correctCount',`${scoreCount}/${questions.length}`);
    localStorage.setItem('quizAnswers',JSON.stringify(quizAnswersMap));
    localStorage.setItem('quizQuestions',JSON.stringify(questions));
    localStorage.setItem('quizTotalScore',totalScoreBase);
    localStorage.setItem('quiz_submitted','true');
    if(quizMode==='train'){ window.location.replace('result.html'); return; }
    try{
      await fetch(API,{
        method:'POST',mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({
          action:'submitResult',
          student:nb.get('studentName')||'Thí sinh',
          school:(nb.get('schoolName')||'').replace(/^'+/,''),
          testName:localStorage.getItem('currentTestName')||'Bài thi',
          score:finalScore, total:`${scoreCount}/${questions.length}`,
          answers:quizAnswersMap
        })
      });
      await new Promise(r=>setTimeout(r,500));
    }catch(e){ console.warn('Submit:',e.message); }
    window.location.replace('result.html');
  }

  /* ── HELPERS ── */
  function _shuffle(arr){
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function _esc(s){ return String(s||'').replace(/"/g,'&quot;'); }
  function _escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* expose for HTML inline calls */
  window.saveAnswer=saveAnswer;
  Object.defineProperty(window,'_qzIdx',{get:()=>currentIdx,configurable:true});
};

/* ══════════════════════════════════════════════
   PAGE: player.html — iSpring SCORM player
   ══════════════════════════════════════════════ */
window.nbPlayerInit = function(){
  /* ════════════════════════════════════════════════════════════
     iSPRING SCORM PLAYER
     ────────────────────────────────────────────────────────────
     CÁCH HOẠT ĐỘNG:
     1. iSpring chạy trong <iframe>
     2. iSpring gọi window.parent.API.LMSSetValue('cmi.core.score.raw', '36')
        → SCORM API của ta bắt được score=36, max=45
     3. iSpring gọi LMSFinish() → _triggerDone()
     4. Dialog hiển thị kết quả (read-only, không nhập tay)
     5. saveResult() → GAS + localStorage → result.html → dashboard

     ⚠️ YÊU CẦU: Phải mở qua HTTP (không phải file://).
        Thêm nebula-bridge.js vào quiz để nhận điểm tự động.
     ════════════════════════════════════════════════════════════ */

  const p     = new URLSearchParams(location.search);
  const path  = (p.get('path')||'').trim();
  const sName  = (localStorage.getItem('studentName')||'Ẩn danh').trim();
  const sSchool= (localStorage.getItem('schoolName') ||'').replace(/^'+/,'');
  const sCls   = (localStorage.getItem('className')  ||'').replace(/^'+/,'');
  const iName  = localStorage.getItem('currentIspringName')||'';

  /* ── State ── */
  let state='idle', doneF=false, saveF=false;
  /* SCORM data — được cập nhật bởi LMSSetValue/SetValue */
  let scormScore    = 0;    /* cmi.core.score.raw / cmi.score.raw */
  let scormMax      = 0;    /* cmi.core.score.max / cmi.score.max */
  let scormStatus   = '';   /* passed/failed/completed */
  let scormReported = false;/* true khi iSpring đã gọi SetValue score ít nhất 1 lần */
  /* DOM scrape fallback */
  let domScore    = 0;
  let domCorrect  = 0;
  let domTotal    = 0;
  let domFound    = false;

  const $ = id => document.getElementById(id);
  const pg = v => { const e=$('pl-pgf'); if(e) e.style.width=v+'%'; };

  /* ── Kiểm tra file:// protocol ── */
  const isFileProt = location.protocol === 'file:';

  function setExit(mode){
    const btn=$('pl-exit'); if(!btn) return;
    btn.className=mode;
    if(mode==='locked')
      btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg> Thoát';
    else if(mode==='ready')
      btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg> Thoát';
    else
      btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Đóng';
  }

  function showError(title,msg){
    const ld=$('pl-loading'); if(ld) ld.style.display='none';
    const et=$('pl-err-title'), em=$('pl-err-msg');
    if(et) et.textContent=title;
    if(em) em.textContent=msg;
    const ep=$('pl-error'); if(ep) ep.classList.add('open');
  }

  /* ════════════════════════════════════════════════════════════
     SCORM 1.2 API
     iSpring gọi: window.parent.API.LMSSetValue(key, value)
     ════════════════════════════════════════════════════════════ */
  function mkScorm12(){
    const _d={};
    return {
      LMSInitialize: ()=>{
        console.log('[SCORM12] LMSInitialize');
        return 'true';
      },
      LMSFinish: ()=>{
        console.log('[SCORM12] LMSFinish — score:', scormScore, '/', scormMax, 'status:', scormStatus);
        _triggerDone();
        return 'true';
      },
      LMSGetLastError: ()=>'0',
      LMSGetErrorString: ()=>'No error',
      LMSGetDiagnostic: ()=>'',
      LMSGetValue: (k)=>{
        if(k==='cmi.core.lesson_status')             return 'not attempted';
        if(k==='cmi.core.lesson_mode')               return 'normal';
        if(k==='cmi.core.score.raw')                 return String(scormScore);
        if(k==='cmi.core.score.min')                 return '0';
        if(k==='cmi.core.score.max')                 return String(scormMax||'100');
        if(k==='cmi.core.session_time')              return '';
        if(k==='cmi.core.total_time')                return '0000:00:00.0';
        if(k==='cmi.suspend_data')                   return '';
        if(k==='cmi.launch_data')                    return '';
        if(k==='cmi.core.student_id')                return localStorage.getItem('username')||'student';
        if(k==='cmi.core.student_name')              return sName;
        if(k==='cmi.student_data.mastery_score')     return '50';
        if(k==='cmi.student_data.max_time_allowed')  return '';
        if(k==='cmi.student_data.time_limit_action') return 'continue,no message';
        return _d[k]||'';
      },
      LMSSetValue: (k,v)=>{
        _d[k]=v;
        console.log('[SCORM12] SetValue', k, '=', v);
        if(k==='cmi.core.score.raw'){
          const n=parseFloat(v);
          if(!isNaN(n)){ scormScore=n; scormReported=true; }
        }
        if(k==='cmi.core.score.max'){
          const n=parseFloat(v); if(!isNaN(n)&&n>0) scormMax=n;
        }
        if(k==='cmi.core.lesson_status'){
          scormStatus=String(v).toLowerCase();
          if(['passed','completed','failed'].includes(scormStatus)) _triggerDone();
        }
        if(k==='cmi.core.exit'&&scormStatus) _triggerDone();
        return 'true';
      },
      LMSCommit: ()=>{
        if(['passed','completed','failed'].includes(scormStatus)) _triggerDone();
        return 'true';
      }
    };
  }

  /* ════════════════════════════════════════════════════════════
     SCORM 2004 API
     ════════════════════════════════════════════════════════════ */
  function mkScorm2004(){
    const _d={};
    return {
      Initialize: ()=>{
        console.log('[SCORM2004] Initialize');
        return 'true';
      },
      Terminate: ()=>{
        console.log('[SCORM2004] Terminate — score:', scormScore, '/', scormMax);
        _triggerDone();
        return 'true';
      },
      GetLastError: ()=>'0',
      GetErrorString: ()=>'No error',
      GetDiagnostic: ()=>'',
      GetValue: (k)=>{
        if(k==='cmi.completion_status')    return 'not attempted';
        if(k==='cmi.success_status')       return 'unknown';
        if(k==='cmi.entry')                return 'ab-initio';
        if(k==='cmi.score.raw')            return String(scormScore);
        if(k==='cmi.score.min')            return '0';
        if(k==='cmi.score.max')            return String(scormMax||'100');
        if(k==='cmi.score.scaled')         return scormMax>0?String(scormScore/scormMax):'';
        if(k==='cmi.suspend_data')         return '';
        if(k==='cmi.launch_data')          return '';
        if(k==='cmi.learner_id')           return localStorage.getItem('username')||'student';
        if(k==='cmi.learner_name')         return sName;
        if(k==='cmi.mode')                 return 'normal';
        if(k==='cmi.completion_threshold') return '0.5';
        if(k==='cmi.scaled_passing_score') return '0.5';
        return _d[k]||'';
      },
      SetValue: (k,v)=>{
        _d[k]=v;
        console.log('[SCORM2004] SetValue', k, '=', v);
        if(k==='cmi.score.raw'){
          const n=parseFloat(v);
          if(!isNaN(n)){ scormScore=n; scormReported=true; }
        }
        if(k==='cmi.score.max'){
          const n=parseFloat(v); if(!isNaN(n)&&n>0) scormMax=n;
        }
        /* score.scaled: chỉ dùng khi không có raw */
        if(k==='cmi.score.scaled'&&!scormReported){
          const n=parseFloat(v);
          if(!isNaN(n)&&n>=0&&n<=1){ scormScore=Math.round(n*100); scormReported=true; }
        }
        if(k==='cmi.success_status'){
          scormStatus=String(v).toLowerCase();
          if(['passed','failed'].includes(scormStatus)) _triggerDone();
        }
        if(k==='cmi.completion_status'){
          const cs=String(v).toLowerCase();
          if(!scormStatus||scormStatus==='unknown') scormStatus=cs;
          if(cs==='completed') _triggerDone();
        }
        if(k==='cmi.exit'&&scormStatus) _triggerDone();
        return 'true';
      },
      Commit: ()=>{
        if(['passed','completed','failed'].includes(scormStatus)) _triggerDone();
        return 'true';
      }
    };
  }

  /* ── Tạo instance SCORM và expose lên window.parent ── */
  const _scorm12   = mkScorm12();
  const _scorm2004 = mkScorm2004();

  /* player.html chính là parent của iframe → đặt API ở đây */
  window.API         = _scorm12;
  window.API_1484_11 = _scorm2004;

  /* Phòng trường hợp player.html cũng được nhúng trong frame khác */
  try{
    if(window.parent&&window.parent!==window){
      window.parent.API         = _scorm12;
      window.parent.API_1484_11 = _scorm2004;
    }
  }catch(e){}

  const _GAS_URL = NB_API;

  /* Override window.close để bắt nút đóng của iSpring */
  window.close=function(){ _triggerDone(); };
  try{ if(window.top&&window.top!==window) window.top.close=window.close; }catch(e){}

  /* ════════════════════════════════════════════════════════════
     postMessage — bắt message từ iSpring / nebula-bridge.js
     Hoạt động cross-origin (cả file:// lẫn HTTP)
     ════════════════════════════════════════════════════════════ */
  window.addEventListener('message',function(ev){
    if(!ev.data) return;
    const d=ev.data;
    try{
      /* ── NEBULA BRIDGE: kết quả từ nebula-bridge.js ──
         nebula-bridge.js trong quiz gửi khi quiz hoàn thành.
         Đây là nguồn dữ liệu chính xác nhất — xử lý ngay lập tức. */
      if(typeof d==='object' && d!==null && d.nebula_ispring_done===true){
        const pct = Math.min(100,Math.max(0,Math.round(parseFloat(d.score)||0)));
        const cor = parseInt(d.correct)||0;
        const tot = parseInt(d.total)  ||0;
        const st  = String(d.status||'completed').toLowerCase();
        console.log('[Nebula] Bridge postMessage:', {pct,cor,tot,st});
        /* Đã có đủ dữ liệu — lưu ngay và chuyển sang result.html */
        if(!doneF){
          doneF=true; state='done';
          clearInterval(_urlTimer); clearInterval(_pgTimer); clearMutObs(); _stopScan();
          setExit('done'); pg(100);
          scormReported=true; scormScore=pct; scormMax=100;
          scormStatus=st;
          domCorrect=cor; domTotal=tot;
          _autoSaveAndGo(pct,cor,tot,st);
        }
        return;
      }

      /* ── Standard iSpring postMessage ── */
      if(typeof d==='string'){
        const s=d.trim().toLowerCase();
        if(/^(completed|passed|failed)$/.test(s)){
          if(!scormStatus) scormStatus=s;
          _triggerDone(); return;
        }
        if(['close','exit','quit','finished','done','quizfinished'].includes(s)){
          _triggerDone(); return;
        }
        const mS=s.match(/(?:score|result|points)[:\s]+([\d.]+)/);
        if(mS&&!scormReported){ scormScore=parseFloat(mS[1])||0; }
      } else if(typeof d==='object'&&d!==null){
        if(d.score!==undefined&&!scormReported){
          scormScore=parseFloat(d.score)||0; scormReported=true;
        }
        if(d.maxScore!==undefined&&!scormMax)  scormMax=parseFloat(d.maxScore)||0;
        if(d.totalScore!==undefined&&!scormMax) scormMax=parseFloat(d.totalScore)||0;
        if(d.correct!==undefined) domCorrect=parseInt(d.correct)||0;
        if(d.total!==undefined)   domTotal  =parseInt(d.total)  ||0;
        if(d.status) scormStatus=String(d.status).toLowerCase();
        const act=(d.action||d.type||d.event||d.message||'').toString().toLowerCase();
        if(['lmsfinish','terminate','close','quizfinished','finished','done',
            'iscomplete','quiz_complete','result'].includes(act)||
           ['passed','completed','failed'].includes(scormStatus)){
          _triggerDone();
        }
      }
    }catch(e){}
  },false);

  /* Hàm lưu + chuyển trang KHÔNG qua dialog (dùng khi bridge cung cấp đủ dữ liệu) */
  function _autoSaveAndGo(pct,cor,tot,st){
    showResult(pct,st);
    _doSaveAndGo(pct,cor,tot,st);
  }

  /* ════════════════════════════════════════════════════════════
     DOM TEXT SCRAPER — chỉ hoạt động khi same-origin (HTTP)
     Pattern từ iSpring: "Your Score: 2% (1 points)"
                          "Passing Score: 100% (45 points)"
     ════════════════════════════════════════════════════════════ */

  function _getIframeText(){
    try{
      const fr=$('pl-frame'); if(!fr) return '';
      const iDoc=fr.contentDocument||(fr.contentWindow&&fr.contentWindow.document);
      if(!iDoc||!iDoc.body) return '';
      return (iDoc.body.innerText||iDoc.body.textContent||'').replace(/\s+/g,' ').trim();
    }catch(e){ return ''; }
  }

  function _parseIspringText(text){
    if(!text||text.length<4) return null;
    let score=0, correct=0, total=0, patternFound=false;

    /* Xóa dòng Passing Score trước để không nhầm với Your Score */
    const clean=text
      .replace(/passing\s+score[^\n\r]*/gi,'')
      .replace(/điểm\s+qua[^\n\r]*/gi,'')
      .replace(/required\s+score[^\n\r]*/gi,'');

    /* Pattern 1: "Your Score: 2% (1 points)" + "Passing Score: 100% (45 points)" */
    const yourM = text.match(/your\s+score[^(]*/i);  /* xác nhận có dòng Your Score */
    const yourPtsM = text.match(/your\s+score[^(]*\(([\d.]+)\s+points?\)/i);
    const passM    = text.match(/passing\s+score[^(]*\(([\d.]+)\s+points?\)/i);

    if(yourPtsM&&passM){
      const got=parseFloat(yourPtsM[1]);
      const max=parseFloat(passM[1]);
      if(!isNaN(got)&&!isNaN(max)&&max>0&&got<=max){
        correct=Math.round(got);
        total  =Math.round(max);
        score  =Math.round((got/max)*100);
        patternFound=true;
      }
    }

    /* Pattern 2: Your Score: X% (không có points) */
    if(!patternFound){
      const pats=[
        /your\s+score\s*[:：]\s*([\d.]+)\s*%/i,
        /score\s+achieved\s*[:：]\s*([\d.]+)\s*%/i,
        /điểm\s+của\s+bạn\s*[:：]\s*([\d.]+)\s*%/i,
        /(?:score|điểm)\s*[:：]\s*([\d.]+)\s*%/i,
      ];
      for(const pat of pats){
        const m=clean.match(pat);
        if(m){
          const n=parseFloat(m[1]);
          if(!isNaN(n)&&n>=0&&n<=100){ score=Math.round(n); patternFound=!!yourM; break; }
        }
      }
    }

    /* Pattern 3: "X/Y" hoặc "X of Y" */
    if(correct===0||total===0){
      const fracs=[...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
      for(const m of fracs){
        const a=parseInt(m[1]), b=parseInt(m[2]);
        if(a>=0&&b>0&&a<=b&&b<=999&&b>=5){
          correct=a; total=b;
          if(!score) score=Math.round((a/b)*100);
          patternFound=true; break;
        }
      }
    }

    /* Có total từ passM mà chưa có correct */
    if(!correct&&score>=0&&passM&&total>0) correct=Math.round((score/100)*total);

    /* found=true nếu tìm thấy result screen (kể cả score=0) */
    return (patternFound||total>0) ? {score,correct,total} : null;
  }

  let _scanTimer=null;
  function _startScan(){
    if(_scanTimer) return;
    _scanTimer=setInterval(()=>{
      if(state!=='doing'){ clearInterval(_scanTimer); _scanTimer=null; return; }
      const txt=_getIframeText();
      if(!txt) return; /* file:// blocked — skip silently */
      const r=_parseIspringText(txt);
      if(r){
        /* Cập nhật DOM data nếu tốt hơn */
        if(r.total>domTotal)   domTotal  =r.total;
        if(r.correct>domCorrect) domCorrect=r.correct;
        if(r.score>0&&!domFound){ domScore=r.score; domFound=true; }
        else if(domFound) domScore=r.score; /* kể cả 0 */
        _checkResultScreen();
      }
    },800);
  }
  function _stopScan(){ clearInterval(_scanTimer); _scanTimer=null; }

  function _checkResultScreen(){
    try{
      const fr=$('pl-frame');
      const iDoc=fr&&(fr.contentDocument||(fr.contentWindow&&fr.contentWindow.document));
      if(!iDoc) return;
      const sels=['.qp-result-slide','.result-slide','.slide-result','.quiz-result',
                  '.quiz-results','[class*="result-slide"]','[class*="resultSlide"]',
                  '[data-slide-type="result"]','[data-slide-type="finish"]'];
      for(const s of sels){ if(iDoc.querySelector(s)){ _triggerDone(); return; } }
      const title=(iDoc.title||'').toLowerCase();
      if(/result|finish|complet|pass|fail|score|kết\s*quả/i.test(title)) _triggerDone();
    }catch(e){}
  }

  /* ════════════════════════════════════════════════════════════
     _triggerDone — Tổng hợp dữ liệu từ SCORM + DOM
     ════════════════════════════════════════════════════════════ */
  function _triggerDone(){
    if(doneF) return;
    doneF=true; state='done';
    clearInterval(_urlTimer); clearInterval(_pgTimer); clearMutObs(); _stopScan();
    setExit('done'); pg(100);

    /* Scale score nếu SCORM gửi scaled 0-1 */
    if(scormScore>0&&scormScore<=1&&!scormMax) scormScore=Math.round(scormScore*100);

    /* Ưu tiên: SCORM > DOM text
       - scormReported=true → SCORM đã gửi điểm (kể cả 0)
       - scormMax > 0 → biết số câu tổng (raw=số câu đúng)   */
    let finalPct, finalCorrect, finalTotal, src;

    if(scormReported){
      if(scormMax>0){
        /* Tốt nhất: có cả raw và max */
        finalCorrect = Math.round(scormScore);
        finalTotal   = Math.round(scormMax);
        finalPct     = Math.min(100,Math.round((scormScore/scormMax)*100));
        src='scorm_full';
      } else {
        /* Chỉ có raw (thường là % trực tiếp) */
        finalPct     = Math.min(100,Math.max(0,Math.round(scormScore)));
        finalCorrect = domCorrect||0;
        finalTotal   = domTotal  ||0;
        src='scorm_pct';
      }
    } else if(domFound){
      /* Fallback: DOM text scrape (chỉ hoạt động qua HTTP) */
      finalPct     = domScore;
      finalCorrect = domCorrect;
      finalTotal   = domTotal;
      src='dom';
    } else if(isFileProt){
      /* file:// và không có dữ liệu → hiện hướng dẫn */
      src='file_blocked';
      finalPct=0; finalCorrect=0; finalTotal=0;
    } else {
      /* HTTP nhưng iSpring không gửi SCORM */
      src='none';
      finalPct=0; finalCorrect=0; finalTotal=0;
    }

    console.log('[Nebula] Kết quả iSpring:', {src,finalPct,finalCorrect,finalTotal,scormReported,scormScore,scormMax});
    showScoreConfirm({pct:finalPct, correct:finalCorrect, total:finalTotal, src});
  }

  function onDone(){ _triggerDone(); }

  /* ════════════════════════════════════════════════════════════
     DOM OBSERVER — attach vào iframe (chỉ hoạt động HTTP)
     ════════════════════════════════════════════════════════════ */
  let _mutObs=null;
  function watchIframeDom(){
    const fr=$('pl-frame'); if(!fr) return;
    clearMutObs();
    function tryAttach(){
      try{
        const iDoc=fr.contentDocument||(fr.contentWindow&&fr.contentWindow.document);
        if(!iDoc||!iDoc.body) return false;
        try{
          fr.contentWindow.close=function(){
            const r=_parseIspringText(_getIframeText());
            if(r){ if(r.total>domTotal) domTotal=r.total; if(r.score>=0) domScore=r.score; domFound=true; }
            _triggerDone();
          };
        }catch(e){}
        iDoc.addEventListener('click',function(e){
          if(state!=='doing') return;
          const t=e.target&&e.target.closest('button,a,[role="button"],[class*="btn"],[class*="close"],[class*="exit"]');
          if(!t) return;
          const txt=(t.textContent||t.title||t.getAttribute('aria-label')||'').trim();
          const cls=(t.className||'').toLowerCase();
          if(/^(close|exit|quit|đóng|thoát|finish|done|hoàn\s*thành|kết\s*thúc)$/i.test(txt)||
             /close|exit|finish|done|quit/i.test(cls)){
            const r=_parseIspringText(_getIframeText());
            if(r){ domTotal=r.total||domTotal; domScore=r.score; domCorrect=r.correct||domCorrect; domFound=true; }
            setTimeout(()=>_triggerDone(),80);
          }
        },true);
        _mutObs=new MutationObserver(()=>_checkResultScreen());
        _mutObs.observe(iDoc.documentElement||iDoc,{subtree:false,childList:true,attributes:true,attributeFilter:['class','id']});
        if(iDoc.body) _mutObs.observe(iDoc.body,{subtree:true,childList:true});
        return true;
      }catch(e){ return false; }
    }
    if(!tryAttach()){
      const t=setInterval(()=>{ if(tryAttach()) clearInterval(t); },600);
      setTimeout(()=>clearInterval(t),12000);
    }
    window.addEventListener('pagehide',()=>{ _stopScan(); clearMutObs(); },{once:true});
  }
  function clearMutObs(){ if(_mutObs){ _mutObs.disconnect(); _mutObs=null; } }

  let _urlTimer=null;
  function watchUrl(){
    clearInterval(_urlTimer);
    _urlTimer=setInterval(()=>{
      if(state!=='doing'){ clearInterval(_urlTimer); return; }
      try{
        const href=$('pl-frame').contentWindow.location.href;
        if(/result|summary|finish|complete|score/i.test(href)){
          clearInterval(_urlTimer);
          const m=href.match(/[?&]score[=:]([\d.]+)/i);
          if(m&&!scormReported){ scormScore=parseFloat(m[1])||0; scormReported=true; }
          _triggerDone();
        }
      }catch(e){}
    },1500);
  }

  let _pgTimer=null,_pgElapsed=0;
  function startAutoCheck(){
    clearInterval(_pgTimer); _pgElapsed=0;
    _pgTimer=setInterval(()=>{ _pgElapsed+=5; if(state==='doing') pg(Math.min(30+_pgElapsed/3,90)); },5000);
  }

  /* ════════════════════════════════════════════════════════════
     BOOT — Load iSpring vào iframe
     ════════════════════════════════════════════════════════════ */
  (function boot(){
    const sEl=$('pl-student'); if(sEl) sEl.textContent=sName;
    const nEl=$('pl-load-name'); if(nEl) nEl.textContent=iName;

    if(!path){
      showError('Không có đường dẫn','Quay lại chọn bài iSpring.');
      return;
    }

    const nm=iName||path.split('/').slice(-2,-1)[0]||'iSpring';
    const titleEl=$('pl-name'); if(titleEl) titleEl.textContent=nm;
    document.title='Nebula | '+nm;

    const fr=$('pl-frame');
    fr.src=path;

    fr.addEventListener('load',function onLoad(){
      const ld=$('pl-loading'); if(ld) ld.style.display='none';
      state='doing'; setExit('ready'); pg(30);
      const sb=$('pl-submit-btn'); if(sb) sb.style.display='flex';

      /* Inject SCORM vào iframe.contentWindow (same-origin / HTTP) */
      try{
        const fw=fr.contentWindow;
        if(fw){
          fw.API         = _scorm12;
          fw.API_1484_11 = _scorm2004;
          /* Nếu iSpring có nested iframe bên trong */
          try{
            Array.from(fw.document.querySelectorAll('iframe')).forEach(function(nf){
              try{ nf.contentWindow.API=_scorm12; nf.contentWindow.API_1484_11=_scorm2004; }catch(e){}
            });
          }catch(e){}
        }
      }catch(e){
        /* file:// blocked — SCORM qua window.parent.API vẫn hoạt động nếu same-origin */
      }

      startAutoCheck(); watchUrl(); watchIframeDom(); _startScan();
    });

    fr.addEventListener('error',function(){
      showError('Không tải được bài','Đường dẫn không tồn tại hoặc bị chặn.');
    });
  })();

  /* Helpers để tính đường dẫn tương đối đến nebula-bridge.js */
  function _getRelBridgePath(){
    try{
      var p=path||''; // path = iSpring quiz path từ URL params
      var depth=(p.match(/\//g)||[]).length;
      var rel=''; for(var i=0;i<depth;i++) rel+='../';
      return rel+'nebula-bridge.js';
    }catch(e){ return '../../nebula-bridge.js'; }
  }
  function _getQuizIndexPath(){
    return path||'quiz/index.html';
  }

  /* ════════════════════════════════════════════════════════════
     DIALOG KẾT QUẢ — Hoàn toàn READ-ONLY
     Nguồn: scorm_full > scorm_pct > dom > file_blocked > none
     ════════════════════════════════════════════════════════════ */
  function showScoreConfirm(d){
    const st  = scormStatus||'completed';
    const pct = Math.min(100,Math.max(0,Math.round(d.pct||0)));
    const cor = d.correct||0;
    const tot = d.total  ||0;
    const src = d.src    ||'none';
    const autoOk = (src==='scorm_full'||src==='scorm_pct'||src==='dom');

    if(typeof Swal==='undefined'){
      if(autoOk){ showResult(pct,st); _doSaveAndGo(pct,cor,tot,st); }
      else { doneF=false; state='doing'; setExit('ready'); }
      return;
    }

    const scoreColor = pct>=80?'#10b981':pct>=50?'#3b82f6':'#ef4444';
    const emoji      = pct>=80?'🏆':pct>=50?'🚀':'🎯';

    /* Badge nguồn dữ liệu */
    const srcBadge = autoOk
      ?`<div class="nb-sc-src nb-sc-src-ok">✓ ${
          src==='scorm_full'?'SCORM đầy đủ (điểm + số câu)':
          src==='scorm_pct' ?'SCORM % (điểm tự động)':
                             'Đọc từ màn hình kết quả iSpring'
        }</div>`
      :`<div class="nb-sc-src nb-sc-src-warn">⚠ iSpring chưa kết nối với Nebula</div>`;

    const corrHtml = (cor>0&&tot>0)
      ?`<div class="nb-sc-stat-row">
           <span class="nb-sc-stat-lbl">Câu đúng</span>
           <span class="nb-sc-stat-val">${cor} / ${tot} câu</span>
         </div>` : '';

    /* Hướng dẫn cài bridge khi chưa tự động */
    const relBridge = _getRelBridgePath();
    const bridgeGuide = autoOk ? '' :
      `<div class="nb-sc-install-guide">
         <p style="margin:0 0 8px"><strong>Kết nối tự động bằng 1 bước:</strong></p>
         <p style="margin:0 0 5px;font-size:.73rem">Thêm vào <code>${path||'quiz/index.html'}</code> trước <code>&lt;/body&gt;</code>:</p>
         <div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.35);
           border-radius:8px;padding:8px 10px;margin:6px 0">
           <code style="flex:1;font-size:.69rem;color:#7dd3fc;word-break:break-all;
             font-family:Fira Mono,Courier New,monospace">
             &lt;script src="${relBridge}"&gt;&lt;/script&gt;
           </code>
           <button onclick="navigator.clipboard&&navigator.clipboard.writeText('<script src=\'${relBridge}\'></script>')"
             style="border:none;background:rgba(79,172,254,.2);color:var(--primary);
             border-radius:6px;padding:4px 8px;font-size:.65rem;cursor:pointer;
             white-space:nowrap">📋 Copy</button>
         </div>
         <p style="margin:4px 0 0;font-size:.7rem;color:rgba(16,185,129,.8)">
           ✓ Sau đó điểm tự động trả về — không cần thao tác thêm.
         </p>
       </div>`;

    Swal.fire({
      html:`<div class="nb-sc-wrap">
        <div class="nb-sc-header">
          <span class="nb-sc-emoji">${autoOk?emoji:'🔗'}</span>
          <div class="nb-sc-title">${autoOk?'Kết quả bài thi iSpring':'Cần kết nối Nebula Bridge'}</div>
          <div class="nb-sc-quiz">${iName||'Bài thi'}</div>
        </div>
        ${srcBadge}
        ${autoOk
          ?`<div class="nb-sc-score-big" style="color:${scoreColor}">
               ${pct}<span class="nb-sc-score-denom">/100</span>
             </div>
             ${corrHtml}
             <div class="nb-sc-lock">🔒 Điểm do hệ thống xác định</div>`
          : bridgeGuide
        }
      </div>`,
      background:'rgba(8,14,30,0.97)', color:'#f1f5f9',
      confirmButtonText: autoOk?'✓ Lưu & Xem kết quả':'Đã hiểu, sẽ cài ngay',
      showCancelButton:  autoOk,
      cancelButtonText:  '↺ Làm lại bài',
      customClass:{popup:'nb-swal-popup nb-score-popup',
        confirmButton:'nb-swal-btn nb-swal-btn-confirm',
        cancelButton:'nb-swal-btn nb-swal-btn-cancel'},
      buttonsStyling:false, allowOutsideClick:false,
      showClass:{popup:'animate__animated animate__zoomIn'},
    }).then(res=>{
      if(res.isConfirmed&&autoOk){
        showResult(pct,st);
        _doSaveAndGo(pct,cor,tot,st);
      } else if(autoOk&&!res.isConfirmed){
        _doRetry();
      } else {
        /* bridge chưa cài → reset về playing state */
        doneF=false; state='doing'; setExit('ready');
        pg(Math.min(30+_pgElapsed/3,90));
      }
    });
  }


  function _doSaveAndGo(pct,correct,total,st){
    saveResult(pct,correct,total,st)
      .then(()=>setTimeout(()=>location.href='result.html',1800));
  }

  /* "Nộp kết quả" header button */
  window._plManualScore=function(){
    if(state==='doing'||state==='idle'){
      /* Lấy DOM text lần cuối trước khi kết thúc */
      const txt=_getIframeText();
      if(txt){
        const r=_parseIspringText(txt);
        if(r){
          domScore=r.score; domCorrect=r.correct||domCorrect;
          domTotal=r.total||domTotal; domFound=true;
        }
      }
      _triggerDone();
    } else if(state==='done'){
      location.href='result.html';
    }
  };

  /* ════════════════════════════════════════════════════════════
     showResult — cập nhật result panel trong player.html
     ════════════════════════════════════════════════════════════ */
  function showResult(sc,st){
    const panel=$('pl-result');
    if(panel){ panel.classList.add('open'); panel.scrollTop=0; }
    const tr=$('pl-trophy'), ti=$('pl-result-title');
    if(sc>=80){ if(tr)tr.textContent='👑'; if(ti)ti.textContent='XUẤT SẮC!'; }
    else if(sc>=50){ if(tr)tr.textContent='🚀'; if(ti)ti.textContent='TỐT LẮM!'; }
    else{ if(tr)tr.textContent='🎯'; if(ti)ti.textContent='CỐ GẮNG LÊN!'; }
    const cx=sCls?' · '+sCls:'';
    const sv=(id,v)=>{ const e=$('pl-r-'+id); if(e)e.textContent=v; };
    sv('name',sName); sv('school',sSchool+cx); sv('test',iName||'Bài thi iSpring');
    const stEl=$('pl-r-status');
    const stMap={passed:'Đạt ✓',completed:'Hoàn thành ✓',failed:'Chưa đạt ✗',incomplete:'Chưa xong'};
    if(stEl){
      stEl.textContent=stMap[st]||'Hoàn thành';
      stEl.className='pl-info-val '+(['passed','completed'].includes(st)?'ok':st==='failed'?'bad':'warn');
    }
    animNum('pl-score-num',0,sc,1100);
    setTimeout(()=>{
      const fg=$('pl-ring-fg'); if(!fg) return;
      const C=2*Math.PI*56;
      fg.style.strokeDashoffset=String(C-(sc/100)*C);
    },80);
  }

  /* ════════════════════════════════════════════════════════════
     saveResult — lưu GAS + localStorage
     ════════════════════════════════════════════════════════════ */
  async function saveResult(sc,correct,total,st){
    if(saveF) return; saveF=true;
    const syncEl=$('pl-sync');
    const tn='[iSpring] '+(iName||path.split('/').slice(-2,-1)[0]||'Bài tập');
    const totalStr=correct>0&&total>0?`${correct}/${total}`:sc>0?`${sc}/100`:'—';
    function syncUI(cls,html){ if(syncEl){ syncEl.className=cls; syncEl.innerHTML=html; } }
    syncUI('saving','<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Đang lưu...');
    /* Lưu localStorage để result.html đọc */
    const ls=localStorage;
    ls.setItem('lastScore',     sc);
    ls.setItem('quizMode',      'ispring');
    ls.setItem('quizTotalScore','100');
    ls.setItem('currentTestName', tn.replace(/^\[iSpring\]\s*/,''));
    ls.setItem('ispringStatus', st||'completed');
    ls.setItem('correctCount',  totalStr);
    ls.setItem('ispCorrect',    String(correct||0));
    ls.setItem('ispTotal',      String(total||0));
    ls.setItem('studentName',   sName);
    ls.setItem('schoolName',    sSchool);
    ls.setItem('className',     sCls);
    try{
      await fetch(_GAS_URL,{ method:'POST', mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({
          action:'submitResult', student:sName, school:sSchool,
          testName:tn, score:sc, total:totalStr,
          answers:JSON.stringify({
            status:st, source:'iSpring SCORM',
            score:sc, correct, totalQuestions:total,
            student:sName, school:sSchool, class:sCls,
            timestamp:new Date().toISOString()
          })
        })
      });
      syncUI('ok','<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Đã lưu kết quả!');
      _loadDistribution(sc,tn);
    }catch(e){
      saveF=false;
      syncUI('err','<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Lưu thất bại. <u style="cursor:pointer" onclick="window._plRetrySave()">Thử lại</u>');
    }
  }

  async function _loadDistribution(myScore,testName){
    const wrap=$('pl-dist-wrap'), barsEl=$('pl-dist-bars'), legendEl=$('pl-dist-legend');
    if(!wrap) return;
    try{
      await new Promise(r=>setTimeout(r,2200));
      const all=await nbGet('getIspringResults');
      if(!Array.isArray(all)||!all.length){ wrap.style.display='block'; if(legendEl)legendEl.textContent='Chưa đủ dữ liệu.'; return; }
      const norm=s=>String(s||'').replace(/\[iSpring\]\s*/i,'').trim().toLowerCase();
      const tN=norm(testName);
      const pool=(all.filter(r=>norm(r.testName)===tN).length>=2)?all.filter(r=>norm(r.testName)===tN):all;
      const bk=[0,0,0,0];
      pool.forEach(r=>{ const s=parseFloat(r.score||0); if(s<50)bk[0]++; else if(s<70)bk[1]++; else if(s<85)bk[2]++; else bk[3]++; });
      const tot=pool.length||1, mxB=Math.max(...bk,1);
      const myBk=myScore<50?0:myScore<70?1:myScore<85?2:3;
      const cols=['pl-dist-bar-fail','pl-dist-bar-below','pl-dist-bar-good','pl-dist-bar-great'];
      const lbls=['0–49','50–69','70–84','85–100'];
      if(barsEl) barsEl.innerHTML=bk.map((c,i)=>`<div class="pl-dist-bar ${cols[i]}${i===myBk?' pl-dist-bar-mine':''}" style="height:${Math.round((c/mxB)*50)+4}px" title="${lbls[i]}: ${c} người"></div>`).join('');
      if(legendEl){ const mc=bk[myBk]; legendEl.innerHTML=`Tổng ${tot} lượt · Nhóm bạn (${lbls[myBk]}): ${mc} người (${Math.round((mc/tot)*100)}%)`; }
      wrap.style.display='block';
    }catch(e){}
  }

  window._plRetrySave=()=>{ saveF=false; saveResult(0,0,0,'completed'); };
  window._plGoResult =()=>{ location.href='result.html'; };
  window._plExit=function(){
    if(state==='done'){ location.href='select.html'; return; }
    if(state==='doing'){ const d=$('pl-dlg'); if(d)d.classList.add('open'); }
  };
  window._plCloseDlg =()=>{ const d=$('pl-dlg'); if(d)d.classList.remove('open'); };
  window._plForceExit=()=>{ location.href='select.html'; };
  window._plGoSel    =()=>{ location.href='select.html'; };
  window._plGoHist   =()=>{ location.href='history.html'; };

  /* ════════════════════════════════════════════════════════════
     _doRetry — Reset hoàn toàn iSpring để làm lại
     Xóa storage iSpring, tạo iframe mới, bust cache URL
     ════════════════════════════════════════════════════════════ */
  function _doRetry(){
    /* Reset tất cả state */
    state='idle'; doneF=false; saveF=false;
    scormScore=0; scormMax=0; scormStatus=''; scormReported=false;
    domScore=0; domCorrect=0; domTotal=0; domFound=false;
    clearMutObs(); clearInterval(_urlTimer); clearInterval(_pgTimer); _stopScan();

    const rp=$('pl-result'); if(rp) rp.classList.remove('open');
    const ld=$('pl-loading'); if(ld) ld.style.display='';
    setExit('locked'); pg(0);

    /* Xóa storage của iSpring, giữ lại Nebula keys */
    const NEBULA=/^(studentName|username|schoolName|className|userRole|lastScore|quizMode|quizTotalScore|currentTestName|ispringStatus|correctCount|ispCorrect|ispTotal|quizAnswers|quizQuestions|currentTestId|currentIspringName|nb_session_start)$/;
    [localStorage, sessionStorage].forEach(function(store){
      try{
        const keys=[];
        for(let i=0;i<store.length;i++) keys.push(store.key(i));
        keys.forEach(k=>{ if(k&&!NEBULA.test(k)) store.removeItem(k); });
      }catch(e){}
    });

    /* SCORM instance mới */
    const s12=mkScorm12(), s04=mkScorm2004();
    window.API=s12; window.API_1484_11=s04;
    try{ if(window.parent&&window.parent!==window){ window.parent.API=s12; window.parent.API_1484_11=s04; } }catch(e){}

    /* Destroy iframe cũ → tạo mới (JS context mới hoàn toàn) */
    const wrap=$('pl-wrap');
    const oldFr=$('pl-frame'); if(oldFr) oldFr.remove();
    const fr=document.createElement('iframe');
    fr.id='pl-frame';
    fr.setAttribute('allow','fullscreen');
    fr.setAttribute('allowfullscreen','');
    if(wrap) wrap.appendChild(fr);

    /* Cache-bust URL */
    const sep=path.includes('?')?'&':'?';
    const freshUrl=path.replace(/[?&]_t=\d+/,'')+sep+'_t='+Date.now();

    setTimeout(function(){
      fr.src=freshUrl;
      fr.addEventListener('load',function once(){
        fr.removeEventListener('load',once);
        const ld2=$('pl-loading'); if(ld2) ld2.style.display='none';
        try{ const fw=fr.contentWindow; if(fw){ fw.API=s12; fw.API_1484_11=s04; } }catch(e){}
        state='doing'; setExit('ready'); pg(30);
        const sb=$('pl-submit-btn'); if(sb) sb.style.display='flex';
        startAutoCheck(); watchUrl(); watchIframeDom(); _startScan();
      });
    },300);
  }

  window._plRetry=_doRetry;

  history.pushState(null,'',location.href);
  window.addEventListener('popstate',function(){
    history.pushState(null,'',location.href);
    if(state==='doing'){ const d=$('pl-dlg'); if(d)d.classList.add('open'); }
    else if(state==='done') location.href='select.html';
  });
};

/* ── Auto-init ── */
document.addEventListener('DOMContentLoaded',function(){
  if(window.location.pathname.includes('player.html')) window.nbPlayerInit();
});

/* ── animNum helper ── */
if(typeof animNum==='undefined'){
  window.animNum=function(id,from,to,ms){
    const el=document.getElementById(id); if(!el) return;
    let st=null;
    (function step(ts){
      if(!st) st=ts;
      const p=Math.min((ts-st)/ms,1);
      const v=(p*(to-from)+from).toFixed(1);
      el.textContent=v.endsWith('.0')?v.slice(0,-2):v;
      if(p<1) requestAnimationFrame(step);
    })(performance.now());
  };
}

/* ── Auto-init login ── */
document.addEventListener('DOMContentLoaded',function(){
  if(typeof nbLgnInit==='function' && window.location.pathname.includes('login.html')){
    nbLgnInit();
  }
});
