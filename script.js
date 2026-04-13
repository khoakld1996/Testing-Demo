/* ================================================================
   NEBULA QUIZ SYSTEM — script.js  (v2026.2)
   JS tập trung cho toàn dự án.
   Dùng `defer` hoặc đặt cuối <body>.
   ================================================================ */
'use strict';

/* ─── CONFIG ─── */
const NB_API = "https://script.google.com/macros/s/AKfycbxR9imqpVxYMB4M7CmV_C-ZiVO9nhRJTGwz44O0dlz0_Ru1dbBuToiOj8ciUE0TgSWT/exec";

/* Backward-compat aliases */
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

/* ─── API CALLS ─── */
async function nbGet(action, params={}){
  let qs=`?action=${encodeURIComponent(action)}`;
  for(const[k,v] of Object.entries(params)) qs+=`&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  const r = await fetch(NB_API + qs);
  return r.json();
}
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
async function nbPostSilent(data){
  try{
    await fetch(NB_API,{ method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(data) });
  }catch(e){ console.warn('nbPostSilent:',e); }
}
async function callAPI(action){
  try{ const r=await fetch(`${NB_API}?action=${action}`); return await r.json(); }
  catch(e){ console.error('callAPI',action,e); return null; }
}
async function postAPI(params){
  try{
    const qs=new URLSearchParams(params).toString();
    const r=await fetch(`${NB_API}?${qs}`);
    return await r.json();
  }catch(e){ console.error('postAPI',e); return {status:'error'}; }
}
window.callAPI = callAPI;
window.postAPI = postAPI;
window.nbGet = nbGet;
window.nbPost = nbPost;
window.nbPostForm = nbPostForm;
window.nbPostSilent = nbPostSilent;

/* ─── SWAL WRAPPERS — Modern Toast Style ─── */
function nbToast(icon, title, timer=2500){
  if(typeof Swal==='undefined') return;
  const iconColors = {
    success: 'var(--success)',
    error:   'var(--danger)',
    warning: 'var(--warning)',
    info:    'var(--primary)',
  };
  Swal.fire({
    icon, title, timer,
    showConfirmButton:false,
    toast:true,
    position:'top-end',
    background:'rgba(10,15,30,0.97)',
    color:'#f1f5f9',
    iconColor: iconColors[icon] || 'var(--primary)',
    customClass:{ popup:'swal2-toast' },
    showClass:{ popup:'animate__animated animate__fadeInRight' },
    hideClass:{ popup:'animate__animated animate__fadeOutRight' },
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
window.nbToast = nbToast;
window.nbAlert = nbAlert;
window.nbConfirm = nbConfirm;
window.nbLoading = nbLoading;
window.nbClose = nbClose;

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
window.nbFmtTime = nbFmtTime;
window.nbParseDate = nbParseDate;
window.nbFmtScore = nbFmtScore;
window.nbEsc = nbEsc;

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
function nbPwErrors(pw){
  const e=[];
  if(!pw||pw.length<8)      e.push('Ít nhất 8 ký tự');
  if(!/[A-Za-z]/.test(pw))  e.push('Phải có chữ cái');
  if(!/[0-9]/.test(pw))     e.push('Phải có số');
  return e;
}
window.nbPwStrength = nbPwStrength;
window.nbPwErrors   = nbPwErrors;

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

/* ─── AUTO REFRESH ─── */
let _nbRefreshTimer=null;
function nbStartAutoRefresh(fn, ms=30000){
  clearInterval(_nbRefreshTimer);
  _nbRefreshTimer=setInterval(fn, ms);
}
function nbStopAutoRefresh(){ clearInterval(_nbRefreshTimer); }
window.nbStartAutoRefresh = nbStartAutoRefresh;
window.nbStopAutoRefresh  = nbStopAutoRefresh;

/* ─── DEBOUNCE ─── */
function nbDebounce(fn,ms=300){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms); };
}
window.nbDebounce = nbDebounce;

/* ══════════════════════════════════════════════
   SESSION TIMEOUT MANAGER
   – Admin: timeout 2h, cảnh báo trước 5 phút
   – Student: timeout 8h
   – Lưu timestamp login vào localStorage
   – Hiện toast đếm ngược, nút "Ở lại" / "Đăng xuất"
   ══════════════════════════════════════════════ */
window.nbSessionInit = function(options={}){
  const TIMEOUT_MS    = options.timeout    || (nb.isAdmin() ? 2*60*60*1000  : 8*60*60*1000);
  const WARN_BEFORE   = options.warnBefore || 5*60*1000;  // cảnh báo trước 5 phút
  const STORAGE_KEY   = 'nb_session_start';
  const EXTEND_KEY    = 'nb_session_extended';

  /* Không áp dụng cho trang login / index */
  const path = window.location.pathname;
  if(path.includes('login.html') || path.includes('index.html')) return;
  if(!nb.isLogged()) return;

  /* Khởi tạo timestamp lần đầu */
  if(!localStorage.getItem(STORAGE_KEY)){
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }

  let _warnShown = false;
  let _toastEl   = null;
  let _toastTimer = null;

  function _getRemaining(){
    const start = parseInt(localStorage.getItem(STORAGE_KEY)||'0');
    return TIMEOUT_MS - (Date.now() - start);
  }

  function _extendSession(){
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    localStorage.setItem(EXTEND_KEY, Date.now().toString());
    _warnShown = false;
    _destroyToast();
  }

  function _destroyToast(){
    if(_toastEl){ _toastEl.remove(); _toastEl=null; }
    clearInterval(_toastTimer);
  }

  function _forceLogout(){
    _destroyToast();
    nb.clear();
    if(typeof Swal!=='undefined'){
      Swal.fire({
        icon:'info', title:'Phiên đã hết hạn',
        text:'Bạn đã bị đăng xuất do không hoạt động quá lâu.',
        confirmButtonText:'Đăng nhập lại',
        background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
        allowOutsideClick:false,
      }).then(()=>{ window.location.replace('login.html'); });
    } else {
      window.location.replace('login.html');
    }
  }

  function _showWarning(remainMs){
    if(_toastEl) return;
    const mins = Math.ceil(remainMs/60000);
    _toastEl = document.createElement('div');
    _toastEl.className = 'nb-session-toast';
    _toastEl.innerHTML = `
      <div class="toast-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        Phiên sắp hết hạn
      </div>
      <div class="toast-desc">Bạn sẽ bị đăng xuất sau <strong id="nb-session-countdown">${mins} phút</strong> do không hoạt động.</div>
      <div class="nb-session-progress"><div class="nb-session-progress-bar" id="nb-session-bar"></div></div>
      <div class="nb-session-actions">
        <button class="nb-session-btn nb-session-btn-stay" onclick="window._nbExtendSession()">
          Ở lại
        </button>
        <button class="nb-session-btn nb-session-btn-out" onclick="window._nbForceLogout()">
          Đăng xuất
        </button>
      </div>`;
    document.body.appendChild(_toastEl);

    /* Countdown display */
    _toastTimer = setInterval(()=>{
      const rem = _getRemaining();
      if(rem <= 0){ clearInterval(_toastTimer); _forceLogout(); return; }
      const el = document.getElementById('nb-session-countdown');
      const bar = document.getElementById('nb-session-bar');
      const s = Math.ceil(rem/1000);
      if(el) el.textContent = s >= 60 ? `${Math.ceil(s/60)} phút` : `${s}s`;
      if(bar) bar.style.width = `${Math.max(0,(rem/WARN_BEFORE)*100)}%`;
      bar.style.transitionDuration = '1s';
    }, 1000);
  }

  window._nbExtendSession = _extendSession;
  window._nbForceLogout   = _forceLogout;

  /* Poll mỗi 30s */
  setInterval(()=>{
    const rem = _getRemaining();
    if(rem <= 0){ _forceLogout(); return; }
    if(rem <= WARN_BEFORE && !_warnShown){
      _warnShown = true;
      _showWarning(rem);
    }
  }, 30000);

  /* Kiểm tra ngay khi load */
  const rem = _getRemaining();
  if(rem <= 0){ _forceLogout(); return; }
  if(rem <= WARN_BEFORE){ _warnShown = true; _showWarning(rem); }

  /* Reset timer khi user tương tác */
  ['click','keydown','touchstart','scroll'].forEach(evt=>{
    document.addEventListener(evt, nbDebounce(()=>{
      if(_getRemaining() > WARN_BEFORE + 30000){
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      }
    }, 5000), { passive:true });
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
      confirmButtonText:'Đăng xuất',
      confirmButtonColor:'#ef4444'
    }).then(r=>{ if(r.isConfirmed){ nb.clear(); location.replace('index.html'); }});
  };

  /* ── FIX: Export kết quả ── */
  window.exportResults = function(){
    /* Lấy từ cả window._nbResults và biến results trong scope */
    const data = window._nbResults || window.results || [];
    if(!data.length){ nbToast('warning','Chưa có dữ liệu kết quả để xuất!'); return; }
    const rows = data.map(r=>({
      'Học sinh': r.student||'',
      'Trường':   r.school||'',
      'Lớp':      r.class||r.className||'',
      'Bài thi':  r.testName||'',
      'Điểm':     r.score||'',
      'Tổng câu': r.total||'',
      'Thời gian':nbFmtTime(r.time)
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
        'Bài thi':  String(r.testName||'').replace('[iSpring] ',''),
        'Điểm':     r.score||'',
        'Thời gian':nbFmtTime(r.time)
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

  /* ── Smart Auto-Refresh ── */
  const REFRESH_INTERVAL = 30;
  let   _countdownVal    = REFRESH_INTERVAL;
  let   _countdownTimer  = null;
  let   _refreshPaused   = false;
  let   _failStreak      = 0;

  function _updateCountdownUI(){
    const el = document.getElementById('refreshCountdown');
    if(el) el.textContent = _countdownVal;
  }

  function _startCountdown(){
    clearInterval(_countdownTimer);
    _countdownVal = REFRESH_INTERVAL;
    _updateCountdownUI();
    _countdownTimer = setInterval(async ()=>{
      if(_refreshPaused) return;
      _countdownVal--;
      _updateCountdownUI();
      if(_countdownVal <= 0){
        _countdownVal = REFRESH_INTERVAL;
        _updateCountdownUI();
        await _silentRefresh();
      }
    }, 1000);
  }

  async function _silentRefresh(){
    try{
      const [tData, rData, pData] = await Promise.all([
        callAPI('getTests'),
        callAPI('getResults'),
        callAPI('getPendingUsers'),
      ]);
      _failStreak = 0;

      const tStr = JSON.stringify((tData||[]).map(t=>t.id));
      if(tStr !== window._nbLastTestStr){
        window._nbLastTestStr = tStr;
        if(window.tests !== undefined){ window.tests = tData || []; }
        if(window.renderTests) window.renderTests();
        const el=document.getElementById('cTests');
        if(el) el.innerText=(tData||[]).length;
      }

      const rLen = (rData||[]).length;
      if(rLen !== (window._nbResults||[]).length){
        const added = rLen - (window._nbResults||[]).length;
        window._nbResults = rData || [];
        window.results    = rData || [];
        if(window.renderResults) window.renderResults();
        const el=document.getElementById('cResults');
        if(el) el.innerText=rLen;
        if(added > 0) nbToast('info', `+${added} kết quả mới!`);
        if(window.nbRenderDashChart) window.nbRenderDashChart(rData);
        const syncBadge = document.getElementById('lastSyncBadge');
        if(syncBadge){
          const now = new Date();
          syncBadge.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
        }
      }

      const pLen = (pData||[]).length;
      const oldPLen = (window._nbPending||[]).length;
      if(pLen !== oldPLen){
        window._nbPending = pData || [];
        window.pending    = pData || [];
        if(window.renderPending) window.renderPending();
        const el=document.getElementById('cPending');
        if(el) el.innerText=pLen;
        if(pLen > oldPLen){
          nbToast('info', `+${pLen - oldPLen} yêu cầu đăng ký mới!`);
        }
      }

      setStatus('ok','Trực tuyến');
    }catch(err){
      _failStreak++;
      setStatus('err','Mất kết nối');
      log('Auto-refresh lỗi: '+err.message,'err');
      if(_failStreak >= 3){ _countdownVal = 60; }
    }
  }

  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){
      _refreshPaused = true;
    } else {
      _refreshPaused = false;
      if(_countdownVal < REFRESH_INTERVAL - 15) _silentRefresh();
    }
  });

  _startCountdown();
  window._nbResetCountdown = _startCountdown;
};

/* ══════════════════════════════════════════════
   PAGE: add-question.html
   ══════════════════════════════════════════════ */
window.nbAddQuestionInit = function(){
  window._aqEditMode  = false;
  window._aqOriginalQ = '';
  window._aqQCount    = 0;

  /* SVG icons dùng nội bộ */
  const SVG = {
    check:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    trash:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
    arrows:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg>`,
    image:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
    plus:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
    times:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    fingerprint:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 6.07c1.5.77 2.76 1.86 3.75 3.28.16.23.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z"/></svg>`,
  };

  window.renderEditor = function(){
    const type = document.getElementById('qType').value;
    const list = document.getElementById('ansList');
    const addBtn= document.getElementById('addBtn');
    list.innerHTML='';
    if(addBtn) addBtn.style.display=['tf','fill'].includes(type)?'none':'flex';

    if(type==='tf'){
      list.innerHTML=`
        <div class="ans-row">
          <svg style="width:16px;height:16px;fill:rgba(79,172,254,.8);flex-shrink:0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <select id="tfCorrect" class="input-control" onchange="updateCorrectStr()">
            <option value="Đúng">✅ LỰA CHỌN: ĐÚNG (TRUE)</option>
            <option value="Sai">❌ LỰA CHỌN: SAI (FALSE)</option>
          </select>
        </div>`;
    } else if(type==='fill'){
      list.innerHTML=`
        <p style="font-size:.78rem;color:rgba(124,77,255,.85);margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <svg style="width:13px;height:13px;fill:currentColor;flex-shrink:0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          Có thể thêm nhiều đáp án được chấp nhận (phân cách bằng |)
        </p>
        <div class="fill-ans-wrap" id="fillList">
          <div class="fill-ans-item">
            <svg style="color:rgba(0,230,118,.7)" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <input type="text" class="input-control fill-ans-input"
              placeholder="Đáp án đúng #1..." oninput="updateCorrectStr()">
            <button type="button" onclick="addFillAnswer()"
              class="btn-add-ans" style="padding:8px 12px;white-space:nowrap">
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
    const div=document.createElement('div');
    div.className='fill-ans-item';
    div.innerHTML=`
      <svg style="color:rgba(0,230,118,.7)" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      <input type="text" class="input-control fill-ans-input"
        placeholder="Đáp án đúng #${list.children.length+1}..." oninput="updateCorrectStr()">
      <button type="button" class="btn-del-row" onclick="this.parentElement.remove();updateCorrectStr()">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>`;
    list.appendChild(div);
  };

  window.addAnsRow = window.addRow = function(data=null){
    const type=document.getElementById('qType').value;
    const list=document.getElementById('ansList');
    const div=document.createElement('div');
    div.className='ans-row';

    const imgSrc = data?.img||data?.image||'';
    const imgThumbHtml = `
      <div class="ans-img-placeholder" title="Thêm ảnh đáp án"
        onclick="triggerAnsImgUpload(this)"
        style="${imgSrc?'display:none':''}">
        <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
      </div>
      <img class="ans-img-thumb" src="${nbEsc(imgSrc)}"
        style="${imgSrc?'':'display:none'}"
        onclick="triggerAnsImgUpload(this.previousElementSibling)"
        title="Đổi ảnh">
      <input type="hidden" class="ans-img-data" value="${nbEsc(imgSrc)}">`;

    let html='';
    if(type==='single'||type==='multiple'){
      const inputType=type==='single'?'radio':'checkbox';
      html=`
        <input type="${inputType}" name="ansMark" class="is-correct"
          ${data?.isCorrect?'checked':''} onchange="updateCorrectStr()" style="flex-shrink:0;width:18px;height:18px;accent-color:var(--primary);cursor:pointer">
        ${imgThumbHtml}
        <input type="text" class="ans-text input-control"
          placeholder="Nội dung đáp án..." value="${nbEsc(data?.text||data?.value||'')}"
          oninput="updateCorrectStr()">`;
    } else if(type==='matching'){
      html=`
        <input type="text" class="l-val input-control" placeholder="Vế A"
          value="${nbEsc(data?.left||'')}" oninput="updateCorrectStr()">
        <svg style="width:18px;height:18px;fill:rgba(79,172,254,.7);flex-shrink:0" viewBox="0 0 24 24"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg>
        <input type="text" class="r-val input-control" placeholder="Vế B"
          value="${nbEsc(data?.right||'')}" oninput="updateCorrectStr()">`;
    } else if(type==='ordering'){
      html=`
        <span style="color:rgba(79,172,254,.8);font-weight:800;flex-shrink:0;font-size:.9rem">#</span>
        ${imgThumbHtml}
        <input type="text" class="ord-val input-control"
          placeholder="Bước thực hiện..." value="${nbEsc(data?.text||data?.value||'')}"
          oninput="updateCorrectStr()">`;
    }

    div.innerHTML=html+`
      <button type="button" class="btn-del-row"
        onclick="this.closest('.ans-row').remove();updateCorrectStr()">
        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>`;
    list.appendChild(div);
  };

  window.triggerAnsImgUpload = function(placeholder){
    const input=document.createElement('input');
    input.type='file'; input.accept='image/*';
    input.onchange=function(){
      const file=input.files[0]; if(!file) return;
      if(file.size>500*1024){ nbToast('warning','Ảnh quá lớn! Tối đa 500KB'); return; }
      const reader=new FileReader();
      reader.onload=e=>{
        const row=placeholder.closest('.ans-row');
        const thumb=row.querySelector('.ans-img-thumb');
        const hidden=row.querySelector('.ans-img-data');
        if(thumb){ thumb.src=e.target.result; thumb.style.display='block'; }
        if(placeholder) placeholder.style.display='none';
        if(hidden) hidden.value=e.target.result;
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
          const txt =row.querySelector('.ans-text')?.value.trim()||'';
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
    const total=parseFloat(document.getElementById('totalScore')?.value)||0;
    let count=window._aqEditMode?window._aqQCount:(window._aqQCount+1);
    const preview=document.getElementById('scorePreview');
    if(preview) preview.innerText=`Dự kiến: ${(total/(count||1)).toFixed(2)} điểm/câu`;
  };

  window.handleLinkInput = function(val){
    if(val.length>10) updateQPreview(val);
  };
  window.handleFile = function(input){
    const file=input.files[0]; if(!file) return;
    if(file.size>500*1024){ nbToast('warning','Ảnh quá lớn! Tối đa 500KB'); return; }
    const reader=new FileReader();
    reader.onload=e=>{ updateQPreview(e.target.result); document.getElementById('qUrl').value='Local File'; };
    reader.readAsDataURL(file);
  };
  window.updateQPreview = function(src){
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
  window.updatePreview = window.updateQPreview;

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

    const list=document.getElementById('ansList');
    list.innerHTML='';
    let ansObj={items:[]};
    try{ ansObj=(typeof data.answer==='string')?JSON.parse(data.answer):data.answer; }catch(e){}

    if(data.type==='tf'){
      renderEditor();
      const tf=document.getElementById('tfCorrect');
      if(tf) tf.value=data.correct||'Đúng';
    } else if(data.type==='fill'){
      renderEditor();
      const fillList=document.getElementById('fillList');
      if(fillList&&data.correct){
        const answers=String(data.correct).split('|');
        fillList.innerHTML='';
        answers.forEach((ans,idx)=>{
          const d=document.createElement('div');
          d.className='fill-ans-item';
          d.innerHTML=`
            <svg style="color:rgba(0,230,118,.7)" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <input type="text" class="input-control fill-ans-input"
              value="${nbEsc(ans)}" placeholder="Đáp án #${idx+1}" oninput="updateCorrectStr()">
            ${idx>0?`<button type="button" class="btn-del-row" onclick="this.parentElement.remove();updateCorrectStr()">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>`:''}`;
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
      const resp=await fetch(`${NB_API}?action=getQuestions&testId=${encodeURIComponent(testId)}`);
      const data=await resp.json();
      window._aqQCount=Array.isArray(data)?data.length:0;
      if(window._aqQCount>0&&!window._aqEditMode){
        const s=data[0];
        document.getElementById('testTime').value=s.testTime||15;
        document.getElementById('scoreMode').value=s.scoreMode||'equal';
        document.getElementById('totalScore').value=s.totalScore||10;
      }
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
    btn.innerHTML=`
      <svg style="animation:spin .8s linear infinite;display:inline-block;width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
      </svg> ĐANG ĐỒNG BỘ...`;

    const payloadAnswers={items:[]};
    document.querySelectorAll('.ans-row').forEach(row=>{
      if(type==='single'||type==='multiple'){
        const txt=row.querySelector('.ans-text')?.value.trim()||'';
        const img=row.querySelector('.ans-img-data')?.value||'';
        if(txt) payloadAnswers.items.push({ text:txt, isCorrect:!!row.querySelector('.is-correct')?.checked, img });
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

    const finalData={
      action:'saveQuestion',
      testId:testData.id,
      testTime:document.getElementById('testTime').value,
      scoreMode:document.getElementById('scoreMode').value,
      totalScore:document.getElementById('totalScore').value,
      points:document.getElementById('qPoint').value,
      type, question,
      oldQuestion:window._aqEditMode?window._aqOriginalQ:'',
      image:document.getElementById('qData').value||document.getElementById('qUrl').value,
      answer:JSON.stringify(payloadAnswers),
      correct
    };

    try{
      await fetch(NB_API,{ method:'POST', mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify(finalData) });
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
  /* Session timeout cho tất cả trang trừ login/index */
  if(!path.includes('login.html') && !path.includes('index.html')){
    nbSessionInit();
  }
});

/* ══════════════════════════════════════════════
   PAGE: login.html
   ══════════════════════════════════════════════ */
window.nbLgnInit = function(){
  const params       = new URLSearchParams(window.location.search);
  const roleFromUrl  = params.get('role') || 'admin';
  let   isRegMode    = false;
  let   isSubmitting = false;

  /* Reset session timer khi vào login page */
  localStorage.removeItem('nb_session_start');

  function _setHeader(mode){
    const iconEl = document.getElementById('headerIcon');
    const textEl = document.getElementById('headerText');
    if(!iconEl || !textEl) return;
    if(mode === 'register'){
      textEl.textContent = 'ĐĂNG KÝ MỚI';
      iconEl.innerHTML = `<path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>`;
    } else if(roleFromUrl === 'student'){
      textEl.textContent = 'HỌC SINH';
      iconEl.innerHTML = `<path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>`;
    } else {
      textEl.textContent = 'QUẢN TRỊ VIÊN';
      iconEl.innerHTML = `<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5zm-1 3v4h2V8h-2zm0 6v2h2v-2h-2z"/>`;
    }
  }

  _setHeader(null);
  if(roleFromUrl === 'student'){
    const regBtn = document.getElementById('regToggleBtn');
    if(regBtn) regBtn.classList.remove('hidden');
  }
  const userInput = document.getElementById('user');
  if(userInput) userInput.focus();

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !isSubmitting)
      nbLgnHandle(isRegMode ? 'register' : 'login');
  });

  const regPassInput = document.getElementById('regPass');
  if(regPassInput){
    regPassInput.addEventListener('input', function(){
      const strength = typeof nbPwStrength === 'function' ? nbPwStrength(this.value) : '';
      const bar  = document.getElementById('regPwBar');
      const hint = document.getElementById('regPwHint');
      if(bar) bar.className = 'pw-bar ' + strength;
      if(hint){
        const msgs = { weak:'Yếu — thêm chữ hoa, số, ký tự đặc biệt', medium:'Trung bình — có thể mạnh hơn!', strong:'Mạnh ✓' };
        hint.textContent = this.value.length > 0 ? (msgs[strength] || '') : '';
      }
    });
  }

  window.nbLgnToggleForm = function(showReg){
    if(isSubmitting) return;
    isRegMode = showReg;
    const box = document.getElementById('mainBox');
    box.classList.add('animate__animated','animate__flipInY');
    setTimeout(() => {
      document.getElementById('loginForm').classList.toggle('hidden', showReg);
      document.getElementById('registerForm').classList.toggle('hidden', !showReg);
      _setHeader(showReg ? 'register' : null);
      const focusId = showReg ? 'regFullName' : 'user';
      const el = document.getElementById(focusId);
      if(el) el.focus();
    }, 180);
    setTimeout(() => box.classList.remove('animate__flipInY'), 800);
  };
};

/* ── Toggle hiện/ẩn password ── */
window.nbLgnTogglePw = function(inputId, btn){
  const input = document.getElementById(inputId);
  if(!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.querySelector('svg').innerHTML = isText
    ? `<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>`
    : `<path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.42C21.12 14.9 22.29 13.26 23 11.5 21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.76 6.07 11.37 6 12 6zm-1.07.68L13 8.75c.57.26 1.03.72 1.28 1.28l2.07 2.07c.08-.3.14-.6.14-.93-.01-2.21-1.8-4-4-4-.32 0-.63.06-.93.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.45 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.76 2.24 5 5 5 .63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z"/>`;
};

/* ── Xử lý đăng nhập / đăng ký ── */
window.nbLgnHandle = async function(action){
  const params      = new URLSearchParams(window.location.search);
  const roleFromUrl = params.get('role') || 'admin';
  const SURL        = window.SCRIPT_URL || window.API_URL || NB_API;

  const userVal = action === 'login'
    ? (document.getElementById('user')?.value.trim() || '')
    : (document.getElementById('regUser')?.value.trim() || '');
  const passVal = action === 'login'
    ? (document.getElementById('pass')?.value.trim() || '')
    : (document.getElementById('regPass')?.value.trim() || '');

  if(!userVal || !passVal){
    if(typeof Swal !== 'undefined')
      Swal.fire({ icon:'warning', title:'Thiếu thông tin!', text:'Vui lòng nhập đầy đủ các trường yêu cầu.',
        background:'rgba(10,15,30,0.97)', color:'#f1f5f9' });
    return;
  }

  const btnId = action === 'login' ? 'btnLogin' : 'btnReg';
  const currentBtn = document.getElementById(btnId);
  if(!currentBtn || currentBtn.disabled) return;

  currentBtn.disabled = true;
  const originalHtml  = currentBtn.innerHTML;
  currentBtn.innerHTML = `
    <svg style="animation:spin .8s linear infinite;display:inline-block;width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24">
      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
    </svg> ĐANG XỬ LÝ...`;

  try {
    const formData = new URLSearchParams();
    formData.append('action', action);
    formData.append('user',   userVal);
    formData.append('pass',   passVal);
    formData.append('role',   roleFromUrl);
    if(action === 'register'){
      formData.append('name',   document.getElementById('regFullName')?.value.trim() || '');
      formData.append('class',  document.getElementById('regClass')?.value.trim() || '');
      formData.append('school', document.getElementById('regSchool')?.value.trim() || '');
    }

    const response = await fetch(SURL, { method:'POST', body:formData });
    const result   = await response.json();

    if(result.status === 'success'){
      if(action === 'login'){
        /* Lưu session start time */
        localStorage.setItem('nb_session_start', Date.now().toString());
        nb.setMany({
          userRole:     result.role || 'student',
          studentName:  result.name,
          username:     userVal,
          schoolName:   result.school || '',
          className:    (result.class || '').replace(/^'+/, ''),
          studentClass: (result.class || '').replace(/^'+/, ''),
        });
        if(typeof Swal !== 'undefined'){
          Swal.fire({
            icon:'success',
            title:`Chào mừng, ${result.name}!`,
            html:`<span style="color:var(--primary);font-weight:700">${result.role==='admin'?'Quản trị viên':'Học sinh'}</span> đã đăng nhập thành công.`,
            timer:2000, showConfirmButton:false,
            background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
          });
        }
        setTimeout(() => {
          window.location.href = result.role === 'admin' ? 'dashboard.html' : 'name.html';
        }, 2000);
      } else {
        if(typeof Swal !== 'undefined'){
          Swal.fire({
            icon:'success', title:'Gửi thành công!',
            text:'Yêu cầu đã được gửi. Hãy chờ quản trị viên phê duyệt.',
            background:'rgba(10,15,30,0.97)', color:'#f1f5f9',
          }).then(() => {
            if(typeof window.nbLgnToggleForm === 'function') window.nbLgnToggleForm(false);
          });
        }
      }
    } else {
      if(typeof Swal !== 'undefined')
        Swal.fire({ icon:'error', title:'Thất bại', text: result.message || 'Sai tên đăng nhập hoặc mật khẩu!',
          background:'rgba(10,15,30,0.97)', color:'#f1f5f9' });
      const box = document.getElementById('mainBox');
      if(box){ box.classList.add('shake'); setTimeout(()=>box.classList.remove('shake'), 400); }
    }
  } catch(error){
    if(typeof Swal !== 'undefined')
      Swal.fire({ icon:'error', title:'Lỗi kết nối', text:'Không thể liên lạc với máy chủ. Vui lòng thử lại!',
        background:'rgba(10,15,30,0.97)', color:'#f1f5f9' });
  } finally {
    currentBtn.disabled = false;
    currentBtn.innerHTML = originalHtml;
  }
};
