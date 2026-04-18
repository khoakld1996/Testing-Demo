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
  const iconColors = {
    success:'var(--success)', error:'var(--danger)',
    warning:'var(--warning)', info:'var(--primary)',
  };
  Swal.fire({
    icon, title, timer,
    showConfirmButton:false, toast:true, position:'top-end',
    background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
    iconColor: iconColors[icon]||'var(--primary)',
    customClass:{ popup:'swal2-toast' },
  });
}
function nbAlert(icon, title, text=''){
  if(typeof Swal==='undefined') return Promise.resolve();
  return Swal.fire({
    icon, title, text,
    background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
    confirmButtonText:'OK',
  });
}
function nbConfirm(opts={}){
  if(typeof Swal==='undefined')
    return Promise.resolve({ isConfirmed: confirm(opts.text||'?') });
  return Swal.fire(Object.assign({
    showCancelButton:true, cancelButtonText:'Hủy',
    background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
  }, opts));
}
function nbLoading(title='Đang xử lý...'){
  if(typeof Swal==='undefined') return;
  Swal.fire({
    title,
    html:`<div style="display:flex;align-items:center;justify-content:center;padding:10px 0">
      <svg style="animation:spin .8s linear infinite;display:inline-block" width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
      </svg>
    </div>`,
    background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
    allowOutsideClick:false, showConfirmButton:false,
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
      if(v>=8)s[0]++; else if(v>=5)s[1]++; else s[2]++;
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
  const REFRESH_INTERVAL = 30;
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
        const syncBadge=document.getElementById('lastSyncBadge');
        if(syncBadge){
          const now=new Date();
          syncBadge.textContent=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
        }
      }
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
    else{ _refreshPaused=false; if(_countdownVal<REFRESH_INTERVAL-15) _silentRefresh(); }
  });
  _startCountdown();
  window._nbResetCountdown=_startCountdown;
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
        /* Clear iSpring + quiz state khi đăng nhập mới */
        ['currentIspringName','currentTestId','currentTestName','currentTestDuration',
         'currentTest','quizAnswers','quizQuestions','lastScore','correctCount','quizMode'].forEach(k=>nb.del(k));
        if(typeof Swal!=='undefined'){
          Swal.fire({
            icon:'success', title:`Chào mừng, ${result.name}!`,
            html:`<span style="color:var(--primary);font-weight:700">${result.role==='admin'?'Quản trị viên':'Học sinh'}</span> đã đăng nhập thành công.`,
            timer:2000, showConfirmButton:false,
            background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
          });
        }
        setTimeout(()=>{
          window.location.href = result.role==='admin' ? 'dashboard.html' : 'name.html';
        },2000);
      } else {
        if(typeof Swal!=='undefined'){
          Swal.fire({
            icon:'success', title:'Gửi thành công!',
            text:'Yêu cầu đã được gửi. Hãy chờ quản trị viên phê duyệt.',
            background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
          }).then(()=>{ if(typeof window.nbLgnToggleForm==='function') window.nbLgnToggleForm(false); });
        }
      }
    } else if(result.status==='pending'){
      if(typeof Swal!=='undefined')
        Swal.fire({icon:'info',title:'Tài khoản chờ duyệt',text:'Tài khoản của bạn đang chờ quản trị viên phê duyệt. Vui lòng kiên nhẫn!',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
    } else {
      if(typeof Swal!=='undefined')
        Swal.fire({icon:'error',title:'Thất bại',text:result.message||'Sai tên đăng nhập hoặc mật khẩu!',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
      const box=document.getElementById('mainBox');
      if(box){ box.classList.add('shake'); setTimeout(()=>box.classList.remove('shake'),400); }
    }
  }catch(error){
    console.error('Login error:', error);
    if(typeof Swal!=='undefined')
      Swal.fire({icon:'error',title:'Lỗi kết nối',text:'Không thể liên lạc với máy chủ. Vui lòng kiểm tra lại đường dẫn Apps Script và thử lại!',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
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
  if(score>=8)      {if(titleEl)titleEl.textContent='XUẤT SẮC!';    if(trophyEl)trophyEl.textContent='👑';}
  else if(score>=5) {if(titleEl)titleEl.textContent='TỐT LẮM!';     if(trophyEl)trophyEl.textContent='🚀';}
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
});

/* ══════════════════════════════════════════════
   PAGE: player.html — iSpring SCORM player
   ══════════════════════════════════════════════ */
window.nbPlayerInit = function(){
  const p    = new URLSearchParams(location.search);
  const path = (p.get('path')||'').trim();

  const sName  = (localStorage.getItem('studentName')||'Ẩn danh').trim();
  const sSchool= (localStorage.getItem('schoolName') ||'').replace(/^'+/,'');
  const sCls   = (localStorage.getItem('className')  ||'').replace(/^'+/,'');
  const iName  = localStorage.getItem('currentIspringName')||'';

  let state='idle', doneF=false, saveF=false, score=0, status='';

  const $   = id => document.getElementById(id);
  const pg  = v  => { const e=$('pl-pgf'); if(e) e.style.width=v+'%'; };
  const hide= id => { const e=$('pl-'+id); if(e) e.style.display='none'; };

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
    hide('loading');
    const et=$('pl-err-title'), em=$('pl-err-msg');
    if(et) et.textContent=title;
    if(em) em.textContent=msg;
    const ep=$('pl-error'); if(ep) ep.classList.add('open');
  }

  function mkScorm12(){
    const _data={};
    return {
      LMSInitialize:()=>'true',
      LMSFinish:()=>{ onDone(); return 'true'; },
      LMSGetLastError:()=>'0',
      LMSGetErrorString:()=>'No error',
      LMSGetDiagnostic:()=>'',
      LMSGetValue:(k)=>{
        if(k==='cmi.core.lesson_status')        return 'not attempted';
        if(k==='cmi.core.lesson_mode')          return 'normal';
        if(k==='cmi.core.score.raw')            return '';
        if(k==='cmi.core.score.min')            return '0';
        if(k==='cmi.core.score.max')            return '100';
        if(k==='cmi.core.session_time')         return '';
        if(k==='cmi.core.total_time')           return '0000:00:00.0';
        if(k==='cmi.suspend_data')              return '';
        if(k==='cmi.launch_data')               return '';
        if(k==='cmi.core.student_id')           return localStorage.getItem('username')||'student';
        if(k==='cmi.core.student_name')         return sName;
        if(k==='cmi.student_data.mastery_score')return '50';
        if(k==='cmi.student_data.max_time_allowed') return '';
        if(k==='cmi.student_data.time_limit_action') return 'continue,no message';
        return _data[k]||'';
      },
      LMSSetValue:(k,v)=>{
        _data[k]=v;
        if(k==='cmi.core.score.raw'){ const n=parseFloat(v); if(!isNaN(n)) score=n; }
        if(k==='cmi.core.lesson_status'){
          status=String(v).toLowerCase();
          if(['passed','completed','failed'].includes(status)) onDone();
        }
        if(k==='cmi.core.exit'){ if(status) onDone(); }
        return 'true';
      },
      LMSCommit:()=>{ if(['passed','completed','failed'].includes(status)) onDone(); return 'true'; }
    };
  }

  function mkScorm2004(){
    const _data={};
    return {
      Initialize:()=>'true',
      Terminate:()=>{ onDone(); return 'true'; },
      GetLastError:()=>'0',
      GetErrorString:()=>'No error',
      GetDiagnostic:()=>'',
      GetValue:(k)=>{
        if(k==='cmi.completion_status')  return 'not attempted';
        if(k==='cmi.success_status')     return 'unknown';
        if(k==='cmi.entry')              return 'ab-initio';
        if(k==='cmi.score.raw')          return '';
        if(k==='cmi.score.min')          return '0';
        if(k==='cmi.score.max')          return '100';
        if(k==='cmi.score.scaled')       return '';
        if(k==='cmi.suspend_data')       return '';
        if(k==='cmi.launch_data')        return '';
        if(k==='cmi.learner_id')         return localStorage.getItem('username')||'student';
        if(k==='cmi.learner_name')       return sName;
        if(k==='cmi.mode')               return 'normal';
        if(k==='cmi.completion_threshold') return '0.5';
        if(k==='cmi.scaled_passing_score') return '0.5';
        return _data[k]||'';
      },
      SetValue:(k,v)=>{
        _data[k]=v;
        if(k==='cmi.score.raw'||k==='cmi.score.scaled'){
          let n=parseFloat(v);
          if(!isNaN(n)) score=(k==='cmi.score.scaled'&&n<=1&&n>=0)?n*100:n;
        }
        if(k==='cmi.success_status'){
          status=String(v).toLowerCase();
          if(['passed','failed'].includes(status)) onDone();
        }
        if(k==='cmi.completion_status'){
          const cs=String(v).toLowerCase();
          if(!status||status==='unknown'||status==='not attempted') status=cs;
          if(cs==='completed') onDone();
        }
        if(k==='cmi.exit'){ if(status) onDone(); }
        return 'true';
      },
      Commit:()=>{ onDone(); return 'true'; }
    };
  }

  window.API         = mkScorm12();
  window.API_1484_11 = mkScorm2004();

  window.close=function(){
    if(state==='doing'||state==='idle'){ onDone(); }
    else if(state==='done'){ location.href='select.html'; }
  };

  try{ if(window.top&&window.top!==window) window.top.close=window.close; }catch(e){}

  window.addEventListener('message',function(ev){
    if(!ev.data) return;
    const d=ev.data;
    try{
      if(typeof d==='string'){
        const s=d.trim().toLowerCase();
        if(['close','exit','quit','finished','done','quizfinished','courseclose'].includes(s)||
           /^(completed|passed|failed|incomplete)$/.test(s)){
          if(/^(completed|passed|failed)$/.test(s)) status=s;
          onDone(); return;
        }
        const mScore=s.match(/^(?:score|result|points)[:\s]+([\d.]+)/);
        if(mScore){ score=parseFloat(mScore[1])||score; }
      } else if(typeof d==='object'&&d!==null){
        if(typeof d.score==='number') score=d.score;
        else if(d.score!==undefined) score=parseFloat(d.score)||score;
        if(d.status) status=String(d.status).toLowerCase();
        const act=(d.action||d.type||d.event||'').toLowerCase();
        if(['lmsfinish','terminate','close','exit','quit','quizfinished',
            'finished','done','courseclose','scormclose'].includes(act)||
           ['passed','completed','failed'].includes(status)){
          onDone();
        }
      }
    }catch(e){}
  },false);

  let _mutObs=null;
  function watchIframeDom(){
    const fr=$('pl-frame'); if(!fr) return;
    clearMutObs();
    function tryAttach(){
      try{
        const iDoc=fr.contentDocument||fr.contentWindow&&fr.contentWindow.document;
        if(!iDoc||!iDoc.body) return false;
        try{
          fr.contentWindow.close=function(){ onDone(); };
          if(fr.contentWindow.top&&fr.contentWindow.top!==window){
            fr.contentWindow.top.close=function(){ onDone(); };
          }
        }catch(e){}
        iDoc.addEventListener('click',function(e){
          if(state!=='doing') return;
          const t=e.target&&e.target.closest('button,a,[role="button"]');
          if(!t) return;
          const txt=(t.textContent||t.title||t.getAttribute('aria-label')||'').toLowerCase();
          if(/^(close|exit|quit|đóng|thoát|finish|done|завершить|закрыть)$/i.test(txt.trim())||
             /close|exit|finish/i.test(t.className)||
             /close|exit|finish/i.test(t.id)){
            e.preventDefault&&e.preventDefault();
            setTimeout(()=>onDone(),50);
          }
        },true);
        _mutObs=new MutationObserver(function(){
          try{
            const title=(iDoc.title||'').toLowerCase();
            if(/result|summary|finish|complete|pass|fail|score/i.test(title)) onDone();
          }catch(e){}
        });
        _mutObs.observe(iDoc,{subtree:true,childList:true,attributes:false});
        return true;
      }catch(e){ return false; }
    }
    if(!tryAttach()){
      const t=setInterval(()=>{ if(tryAttach()) clearInterval(t); },500);
      setTimeout(()=>clearInterval(t),10000);
    }
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
          if(m){ const n=parseFloat(m[1]); if(!isNaN(n)) score=n; }
          onDone();
        }
      }catch(e){}
    },1500);
  }

  let _pgTimer=null,_pgElapsed=0;
  function startAutoCheck(){
    clearInterval(_pgTimer); _pgElapsed=0;
    _pgTimer=setInterval(()=>{
      _pgElapsed+=5;
      if(state==='doing') pg(Math.min(30+_pgElapsed/3,90));
    },5000);
  }

  (function boot(){
    const sEl=$('pl-student'); if(sEl) sEl.textContent=sName;
    const nEl=$('pl-load-name'); if(nEl) nEl.textContent=iName;
    if(!path){ showError('Không có đường dẫn','Quay lại chọn bài iSpring.'); return; }
    const nm=iName||path.split('/').slice(-2,-1)[0]||'iSpring';
    const titleEl=$('pl-name'); if(titleEl) titleEl.textContent=nm;
    document.title='Nebula | '+nm;
    const fr=$('pl-frame');
    fr.src=path;
    fr.addEventListener('load',function onLoad(){
      const ld=$('pl-loading'); if(ld) ld.style.display='none';
      state='doing'; setExit('ready'); pg(30);
      startAutoCheck(); watchUrl(); watchIframeDom();
    });
    fr.addEventListener('error',function(){
      showError('Không tải được bài','Đường dẫn không tồn tại hoặc bị chặn.');
    });
  })();

  function onDone(){
    if(doneF) return;
    doneF=true; state='done';
    clearInterval(_urlTimer); clearInterval(_pgTimer); clearMutObs();
    setExit('done'); pg(100);
    if(score>0&&score<=1) score=Math.round(score*100);
    showResult(score,status||'completed');
    saveResult(score,status||'completed');
  }

  function showResult(sc,st){
    const panel=$('pl-result');
    if(panel){ panel.classList.add('open'); panel.scrollTop=0; }
    const tr=$('pl-trophy'),ti=$('pl-result-title');
    if(sc>=80){ if(tr)tr.textContent='👑'; if(ti)ti.textContent='XUẤT SẮC!'; }
    else if(sc>=50){ if(tr)tr.textContent='🚀'; if(ti)ti.textContent='TỐT LẮM!'; }
    else{ if(tr)tr.textContent='🎯'; if(ti)ti.textContent='CỐ GẮNG LÊN!'; }
    const cx=sCls?' · '+sCls:'';
    const sv=(id,v)=>{ const e=$('pl-r-'+id); if(e) e.textContent=v; };
    sv('name',  sName);
    sv('school',sSchool+cx);
    sv('test',  iName||'Bài thi iSpring');
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

  async function saveResult(sc,st){
    if(saveF) return; saveF=true;
    const syncEl=$('pl-sync');
    const tn='[iSpring] '+(iName||path.split('/').slice(-2,-1)[0]||'Bài tập');
    function syncUI(cls,html){ if(syncEl){ syncEl.className=cls; syncEl.innerHTML=html; } }
    syncUI('saving','<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Đang lưu kết quả...');
    try{
      /* Dùng no-cors POST cho write-only operations */
      await nbPostSilent({
        action:'submitResult', student:sName, school:sSchool,
        testName:tn, score:sc, total:sc+'/100',
        answers:JSON.stringify({status:st,source:'iSpring SCORM',score:sc,
          student:sName,school:sSchool,class:sCls,timestamp:new Date().toISOString()})
      });
      syncUI('ok','<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Đã lưu kết quả!');
      /* Load distribution chart after save — dùng GET để đọc lịch sử */
      _loadDistribution(sc, tn);
    }catch(e){
      saveF=false;
      syncUI('err','<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Lưu thất bại. <u style="cursor:pointer" onclick="window._plRetrySave()">Thử lại</u>');
    }
  }

  async function _loadDistribution(myScore, testName){
    const wrap=$('pl-dist-wrap');
    const barsEl=$('pl-dist-bars');
    const legendEl=$('pl-dist-legend');
    if(!wrap) return;
    try{
      /* Chờ 2s để GAS ghi xong rồi đọc lại */
      await new Promise(r=>setTimeout(r,2200));
      const allResults = await nbGet('getIspringResults');
      if(!Array.isArray(allResults)||!allResults.length){ wrap.style.display='block'; if(legendEl) legendEl.textContent='Chưa đủ dữ liệu phân bố.'; return; }
      /* Lọc cùng bài thi */
      const norm = s=>String(s||'').replace(/\[iSpring\]\s*/i,'').trim().toLowerCase();
      const tNorm = norm(testName);
      const forThis = allResults.filter(r=>norm(r.testName)===tNorm);
      const pool = forThis.length>=2 ? forThis : allResults;
      /* Tính phân bố 4 nhóm: 0-49, 50-69, 70-84, 85-100 */
      const buckets=[0,0,0,0];
      pool.forEach(r=>{
        const s=parseFloat(r.score||0);
        if(s<50) buckets[0]++;
        else if(s<70) buckets[1]++;
        else if(s<85) buckets[2]++;
        else buckets[3]++;
      });
      const total=pool.reduce((a,b)=>a+1,0)||1;
      const maxB=Math.max(...buckets,1);
      const colors=['pl-dist-bar-fail','pl-dist-bar-below','pl-dist-bar-good','pl-dist-bar-great'];
      const labels=['0–49','50–69','70–84','85–100'];
      /* Xác định bucket của mình */
      const myBucket = myScore<50?0:myScore<70?1:myScore<85?2:3;
      if(barsEl){
        barsEl.innerHTML=buckets.map((cnt,i)=>{
          const h=Math.round((cnt/maxB)*50)+4;
          const isMine=i===myBucket;
          const pct=Math.round((cnt/total)*100);
          return `<div class="pl-dist-bar ${colors[i]}${isMine?' pl-dist-bar-mine':''}"
            style="height:${h}px" data-count="${cnt} người (${pct}%)" title="${labels[i]}: ${cnt} người"></div>`;
        }).join('');
      }
      if(legendEl){
        const myBucketCount=buckets[myBucket];
        const myPct=Math.round((myBucketCount/total)*100);
        legendEl.innerHTML=`Tổng ${total} lượt thi · Nhóm điểm của bạn (${labels[myBucket]}): ${myBucketCount} người (${myPct}%)`;
      }
      wrap.style.display='block';
    }catch(e){ /* Silent fail — distribution là thông tin thêm, không critical */ }
  }

  window._plRetrySave=()=>{ saveF=false; saveResult(score,status||'completed'); };
  window._plExit=function(){
    if(state==='done'){ location.href='select.html'; return; }
    if(state==='doing'){ const d=$('pl-dlg'); if(d) d.classList.add('open'); }
  };
  window._plCloseDlg =()=>{ const d=$('pl-dlg'); if(d) d.classList.remove('open'); };
  window._plForceExit=()=>{ location.href='select.html'; };
  window._plGoSel    =()=>{ location.href='select.html'; };
  window._plGoHist   =()=>{ location.href='history.html'; };

  window._plRetry=function(){
    state='idle'; doneF=false; saveF=false; score=0; status='';
    clearMutObs();
    const rp=$('pl-result'); if(rp) rp.classList.remove('open');
    const ld=$('pl-loading'); if(ld) ld.style.display='';
    setExit('locked'); pg(0);
    window.API         =mkScorm12();
    window.API_1484_11 =mkScorm2004();
    const fr=$('pl-frame');
    fr.src='';
    setTimeout(()=>{
      fr.src=path;
      fr.addEventListener('load',function once(){
        fr.removeEventListener('load',once);
        const ld=$('pl-loading'); if(ld) ld.style.display='none';
        state='doing'; setExit('ready'); pg(30);
        startAutoCheck(); watchUrl(); watchIframeDom();
      });
    },200);
  };

  history.pushState(null,'',location.href);
  window.addEventListener('popstate',function(){
    history.pushState(null,'',location.href);
    if(state==='doing'){ const d=$('pl-dlg'); if(d) d.classList.add('open'); }
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
