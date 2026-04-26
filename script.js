/* ================================================================
 * NEBULA QUIZ v3.2 — script.js
 * FIXES: iSpring double-call, Vietnamese input, session timeout,
 *        score mismatch, battle room creation, result pagination+charts
 * ================================================================ */

// ── CONFIG ────────────────────────────────────────────────────────
window.SCRIPT_URL = window.SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwsV_uD6G7blx76W723IapI19H5ZJc3UkrBZeNx8GT0FVij7moKor35QC8NL1nUfl-q/exec';
window.API = window.SCRIPT_URL;

const NB_SESSION_HOURS = 8; // auto-logout after 8 hours

// ── RANK TIERS ────────────────────────────────────────────────────
const NB_TIERS = [
  {name:'Sắt',      icon:'⚙️', color:'#a8a29e', minRp:0    },
  {name:'Đồng',     icon:'🥉', color:'#cd7f32', minRp:100  },
  {name:'Bạc',      icon:'🥈', color:'#cbd5e1', minRp:300  },
  {name:'Vàng',     icon:'🥇', color:'#fbbf24', minRp:600  },
  {name:'Bạch Kim', icon:'💠', color:'#38bdf8', minRp:1000 },
  {name:'Kim Cương',icon:'💎', color:'#818cf8', minRp:1500 },
  {name:'Tinh Anh', icon:'🔱', color:'#e879f9', minRp:2200 },
  {name:'Thách Đấu',icon:'🏆', color:'#fde047', minRp:3000 }
];
function nbGetTier(rp){ let t=NB_TIERS[0]; for(const x of NB_TIERS){if(rp>=x.minRp)t=x;} return t; }

// ── STORAGE ───────────────────────────────────────────────────────
const nb = {
  get:     k     => localStorage.getItem(k),
  set:     (k,v) => localStorage.setItem(k, String(v)),
  del:     k     => localStorage.removeItem(k),
  json:    (k,d) => { try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d??null;} },
  setJson: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
};
window.nb = nb;

// ── SESSION ───────────────────────────────────────────────────────
function nbCheckSession(){
  const u = nb.json('currentUser', null);
  const ts = parseInt(nb.get('loginTime')||'0');
  if(!u || !ts) return false;
  const elapsed = (Date.now() - ts) / 3600000; // hours
  if(elapsed > NB_SESSION_HOURS){
    localStorage.clear();
    if(!location.pathname.includes('index') && !location.pathname.includes('login')){
      nbToast('warning','Phiên đăng nhập hết hạn','Vui lòng đăng nhập lại');
      setTimeout(()=>{ location.href='index.html'; }, 1800);
    }
    return false;
  }
  // Renew timestamp on activity
  nb.set('loginTime', Date.now());
  return true;
}

// ── AUTH ──────────────────────────────────────────────────────────
function nbCurrentUser()  { return nb.json('currentUser',null); }
function nbIsLoggedIn()   { return !!nbCurrentUser(); }
function nbIsAdmin()      { const u=nbCurrentUser(); return u&&(u.role==='admin'||u.role==='super_admin'); }
function nbIsSuperAdmin() { const u=nbCurrentUser(); return u&&u.role==='super_admin'; }
function nbStudentName()  { return nb.get('studentName')||nbCurrentUser()?.name||''; }
function nbSchool()       { return (nb.get('schoolName')||'').replace(/^'+/,''); }
function nbClass()        { return (nb.get('className')||'').replace(/^'+/,''); }
function nbEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
window.nbEsc=nbEsc;
window.sanitizeDur=d=>{ const n=parseInt(d)||0; return (n>0&&n<1440)?n:0; };

function nbLogout(){
  if(typeof Swal!=='undefined'){
    Swal.fire({title:'Đăng xuất?',icon:'question',showCancelButton:true,
      confirmButtonText:'Đăng xuất',cancelButtonText:'Hủy',
      background:'rgba(10,15,30,0.97)',color:'#f1f5f9'
    }).then(r=>{ if(r.isConfirmed){localStorage.clear();location.href='index.html';} });
  }else{ localStorage.clear(); location.href='index.html'; }
}
window.nbLogout=nbLogout;

// ── TOAST NOTIFICATIONS ───────────────────────────────────────────
function nbToast(type, title, text, dur=3000){
  // Remove existing
  document.querySelectorAll('.nb-toast').forEach(el=>el.remove());
  const colors = {
    success:{ bg:'rgba(0,230,118,.12)', border:'rgba(0,230,118,.3)', color:'#00e676', icon:'✓' },
    error:  { bg:'rgba(239,68,68,.12)', border:'rgba(239,68,68,.3)', color:'#ef4444', icon:'✕' },
    warning:{ bg:'rgba(249,115,22,.12)', border:'rgba(249,115,22,.3)', color:'#f97316', icon:'⚠' },
    info:   { bg:'rgba(79,172,254,.1)', border:'rgba(79,172,254,.25)', color:'#4facfe', icon:'ℹ' },
  };
  const c = colors[type]||colors.info;
  const t = document.createElement('div');
  t.className = 'nb-toast';
  t.innerHTML = `
    <div class="nb-toast-icon" style="color:${c.color}">${c.icon}</div>
    <div class="nb-toast-body"><div class="nb-toast-title">${nbEsc(title)}</div>${text?`<div class="nb-toast-text">${nbEsc(text)}</div>`:''}</div>
    <button class="nb-toast-close" onclick="this.closest('.nb-toast').remove()">×</button>`;
  t.style.cssText=`background:${c.bg};border:1px solid ${c.border};`;
  document.body.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),400); }, dur);
}
window.nbToast=nbToast;

// ── SWAL HELPER ───────────────────────────────────────────────────
async function nbAlert(type,title,text,timer=2400){
  if(typeof Swal!=='undefined'){
    return Swal.fire({icon:type,title,text,timer,showConfirmButton:false,
      background:'rgba(8,14,26,0.98)',color:'#f1f5f9',
      customClass:{popup:'nb-swal-popup',title:'nb-swal-title'}});
  }
  nbToast(type,title,text);
}
window.nbAlert=nbAlert;

// ── HTTP ──────────────────────────────────────────────────────────
async function gasGet(params={}){
  const url = window.SCRIPT_URL+'?'+new URLSearchParams(params).toString();
  const r = await fetch(url, {cache:'no-store'});
  return r.json();
}

// GAS POST — no-cors, fire-and-forget
async function gasPost(data={}){
  try{
    await fetch(window.SCRIPT_URL,{
      method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(data)
    });
  }catch(e){ console.warn('gasPost error:',e); }
}

// GAS POST that NEEDS a response — use GET with encoded body
async function gasCall(data={}){
  try{
    const url = window.SCRIPT_URL+'?action='+encodeURIComponent(data.action||'')
      +'&_d='+encodeURIComponent(JSON.stringify(data));
    const r = await fetch(url, {cache:'no-store'});
    return r.json();
  }catch(e){
    console.warn('gasCall error:',e);
    // fallback: POST no-cors, return optimistic
    await gasPost(data);
    return {status:'ok'};
  }
}

// ── PARSE JSON SAFE ───────────────────────────────────────────────
function _pj(s,d){ try{return JSON.parse(typeof s==='string'?s:JSON.stringify(s))||d;}catch{return d;} }

// =================================================================
// PAGE: LOGIN
// =================================================================
async function nbLgnInit(){
  // Check already logged in
  if(nbIsLoggedIn()&&nbCheckSession()){
    const u=nbCurrentUser();
    if(u.role==='admin'||u.role==='super_admin') location.href='dashboard.html';
    else location.href='name.html';
    return;
  }
  const role=new URLSearchParams(location.search).get('role')||'student';
  nb.set('loginRole',role);
  if(role==='admin'){
    document.getElementById('regToggleBtn')?.classList?.add('hidden');
    const ht=document.getElementById('headerText');if(ht)ht.textContent='QUẢN TRỊ VIÊN';
  }else{
    document.getElementById('regToggleBtn')?.classList?.remove('hidden');
  }
  const enter=e=>{if(e.key==='Enter')nbLgnHandle('login');};
  document.getElementById('user')?.addEventListener('keydown',enter);
  document.getElementById('pass')?.addEventListener('keydown',enter);
  document.getElementById('regPass')?.addEventListener('input',function(){nbLgnPwStrength(this.value);});
}

async function nbLgnHandle(action){
  if(action==='login'){
    const user=document.getElementById('user')?.value?.trim()?.toLowerCase();
    const pass=document.getElementById('pass')?.value?.trim();
    if(!user||!pass){nbToast('warning','Thiếu thông tin','Nhập tài khoản và mật khẩu');return;}
    const btn=document.getElementById('btnLogin');
    if(btn){btn.disabled=true;btn.textContent='Đang xác thực...';}
    let res;
    try{res=await gasGet({action:'login',user,pass});}
    catch(e){res={status:'error',message:'Lỗi kết nối'};}
    if(btn){btn.disabled=false;btn.innerHTML='Đăng nhập <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M10 17v-3H3v-4h7V7l5 5-5 5zm4-15c1.1 0 2 .9 2 2v3h-2V4H5v16h9v-3h2v3c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h9z"/></svg>';}
    if(res?.status==='pending'){nbToast('info','Chờ duyệt','Tài khoản đang chờ admin xét duyệt');return;}
    if(res?.status==='locked'){nbToast('error','Bị khóa','Tài khoản đã bị khóa, liên hệ admin');return;}
    if(res?.status!=='success'){nbToast('error','Thất bại',res?.message||'Sai tài khoản hoặc mật khẩu');return;}
    const role=nb.get('loginRole')||'student';
    const isAdmin=res.role==='admin'||res.role==='super_admin';
    if(role==='admin'&&!isAdmin){nbToast('error','Không có quyền','Tài khoản này không phải admin');return;}
    nb.setJson('currentUser',{username:res.username||user,name:res.name||'',school:res.school||'',class:res.class||'',role:res.role||'student'});
    nb.set('studentName',res.name||''); nb.set('schoolName',res.school||''); nb.set('className',res.class||'');
    nb.set('loginTime',Date.now());
    // Show success popup before redirect
    const destUrl=isAdmin?'dashboard.html':'name.html';
    if(typeof Swal!=='undefined'){
      await Swal.fire({
        icon:'success',
        title:'Đăng nhập thành công!',
        html:`<div style="font-size:.9rem;line-height:1.6">
          Xin chào, <b style="color:var(--primary)">${nbEsc(res.name||user)}</b>!<br>
          <span style="color:#64748b;font-size:.78rem">${isAdmin?'Quản trị viên':'Học sinh'} · @${nbEsc(res.username||user)}</span>
        </div>`,
        timer:1600,showConfirmButton:false,
        background:'rgba(8,14,26,0.98)',color:'#f1f5f9',
        customClass:{popup:'nb-swal-popup'}
      });
    }else{
      nbToast('success','Đăng nhập thành công!',`Xin chào ${res.name||user}`);
    }
    location.href=destUrl;
  }else{
    const name=document.getElementById('regFullName')?.value?.trim();
    const cls=document.getElementById('regClass')?.value?.trim();
    const sch=document.getElementById('regSchool')?.value?.trim();
    const user=document.getElementById('regUser')?.value?.trim()?.toLowerCase();
    const pass=document.getElementById('regPass')?.value?.trim();
    if(!name||!user||!pass||!sch){nbToast('warning','Thiếu thông tin','Điền đầy đủ thông tin');return;}
    if(pass.length<6){nbToast('warning','Mật khẩu yếu','Tối thiểu 6 ký tự');return;}
    const btn=document.getElementById('btnReg');
    if(btn){btn.disabled=true;btn.textContent='Đang gửi...';}
    try{await gasPost({action:'register',name,class:cls,school:sch,user,pass});}catch(e){}
    if(btn){btn.disabled=false;btn.textContent='Gửi yêu cầu';}
    nbToast('success','Đã gửi!','Admin sẽ xét duyệt tài khoản sớm');
    setTimeout(()=>nbLgnToggleForm(false),2000);
  }
}

function nbLgnToggleForm(showReg){
  document.getElementById('loginForm')?.classList?.toggle('hidden',showReg);
  document.getElementById('registerForm')?.classList?.toggle('hidden',!showReg);
  const ht=document.getElementById('headerText');if(ht)ht.textContent=showReg?'ĐĂNG KÝ':'ĐĂNG NHẬP';
}
function nbLgnTogglePw(id,btn){
  const el=document.getElementById(id);if(!el)return;
  const show=el.type==='password';el.type=show?'text':'password';
  btn.innerHTML=show?'<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>':'<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
}
function nbLgnPwStrength(pw){
  const bar=document.getElementById('regPwBar'),hint=document.getElementById('regPwHint');
  if(!bar||!hint)return;
  let s=0;if(pw.length>=8)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^a-zA-Z0-9]/.test(pw))s++;
  const lv=[{l:'Rất yếu',c:'#ef4444',w:'20%'},{l:'Yếu',c:'#f97316',w:'40%'},{l:'Trung bình',c:'#eab308',w:'60%'},{l:'Mạnh',c:'#22c55e',w:'80%'},{l:'Rất mạnh',c:'#10b981',w:'100%'}];
  const v=lv[s]||lv[0];
  bar.style.cssText=`width:${v.w};background:${v.c};height:3px;border-radius:2px;transition:.3s`;
  hint.style.color=v.c;hint.textContent=pw?v.l:'';
}

// =================================================================
// PAGE: NAME
// =================================================================
function nbNameInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  nbCheckSession();
  const u=nbCurrentUser();
  const f=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||'';};
  f('nameInput', u.name||nb.get('studentName')||'');
  f('schoolInput',u.school||nbSchool()||'');
  f('classInput', u.class||nbClass()||'');
}
function nbNameSubmit(){
  const name=document.getElementById('nameInput')?.value?.trim();
  const school=document.getElementById('schoolInput')?.value?.trim();
  const cls=document.getElementById('classInput')?.value?.trim();
  if(!name){nbToast('warning','Thiếu tên','Vui lòng nhập họ và tên');return;}
  nb.set('studentName',name);nb.set('schoolName',school||'');nb.set('className',cls||'');
  const u=nbCurrentUser();if(u)nb.setJson('currentUser',{...u,name,school,class:cls});
  location.href='select.html';
}

// =================================================================
// PAGE: SELECT
// =================================================================
let _selTests=[],_selIspring=[];
async function nbSelectInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  nbCheckSession();
  const u=nbCurrentUser();
  const f=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v||'';};
  f('selNavName',u.name||nbStudentName());f('selNavClass',u.class||nbClass());
  f('selWelcome',`Chào ${u.name||'bạn'}! Chọn bài thi để bắt đầu 🚀`);
  const [tr,ir]=await Promise.all([gasGet({action:'getTests'}),gasGet({action:'getIspring'})]);
  _selTests=Array.isArray(tr)?tr:[];
  _selIspring=Array.isArray(ir)?ir.filter(x=>x.visible!==false):[];
  _nbRenderAll();
}

// Global maps to avoid JSON-in-onclick escaping issues
window._nbTestMap={};
window._nbIspMap={};

window._nbRenderAll=function(){
  const q=(document.getElementById('selSearch')?.value||'').toLowerCase();
  const f=x=>!q||String(x.name||'').toLowerCase().includes(q)||(x.desc||'').toLowerCase().includes(q);
  const t=_selTests.filter(f),isp=_selIspring.filter(f);
  const _cnt=(id,n,u)=>{const e=document.getElementById(id);if(e)e.textContent=`${n} ${u}`;};
  _cnt('selSysCount',t.length,'đề');_cnt('selIspCount',isp.length,'bài');
  // Rebuild lookup maps
  t.forEach(x=>{window._nbTestMap[x.id]=x;});
  isp.forEach(x=>{window._nbIspMap[x.id]=x;});
  const tEl=document.getElementById('selTestList');
  if(tEl){ tEl.innerHTML=!t.length?'<div class="sel-empty">Chưa có bài thi</div>':
    t.map(x=>`<div class="sel-test-item" onclick="_nbConfirmLaunch('${x.id}')" tabindex="0">
      <div class="sel-test-main">
        <div class="sel-test-name">${nbEsc(x.name)}</div>
        ${x.desc?`<div class="sel-test-desc">${nbEsc(x.desc)}</div>`:''}
        <div class="sel-test-meta"><span>⏱ ${x.duration||45}p</span><span>❓ ${x.qCount||0} câu</span><span>📊 ${x.maxScore||10} điểm</span></div>
      </div>
      <svg class="sel-chevron" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
    </div>`).join('');
  }
  const iEl=document.getElementById('selIspringList');
  if(iEl){ iEl.innerHTML=!isp.length?'<div class="sel-empty">Chưa có bài iSpring</div>':
    isp.map(x=>`<div class="sel-test-item sel-isp-item" onclick="_nbLaunchIspring('${x.id}')" tabindex="0">
      <div class="sel-isp-badge-icon"><svg viewBox="0 0 24 24"><path d="M12 2.5s4.5 2.04 4.5 10.5c0 2.49-1.04 5.57-1.6 7H9.1c-.56-1.43-1.6-4.51-1.6-7C7.5 4.54 12 2.5 12 2.5z"/></svg></div>
      <div class="sel-test-main">
        <div class="sel-test-name">${nbEsc(x.name)}</div>
        ${x.desc?`<div class="sel-test-desc">${nbEsc(x.desc)}</div>`:''}
        <div class="sel-test-meta"><span>⏱ ${x.duration||45}p</span>${x.subject?`<span>📚 ${nbEsc(x.subject)}</span>`:''}</div>
      </div>
      <svg class="sel-chevron" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
    </div>`).join('');
  }
};

// FIX: look up test by id from global map — no JSON in onclick
window._nbConfirmLaunch=function(testId){
  const t=window._nbTestMap[testId];
  if(!t){nbToast('error','Lỗi','Không tìm thấy bài thi');return;}
  if(!t.qCount){nbToast('info','Đề trống','Đề thi chưa có câu hỏi');return;}
  if(typeof Swal==='undefined'){_startQuiz(t,'train');return;}
  Swal.fire({
    title:'Bắt đầu bài thi?',
    html:`<div class="swal-launch-body">
      <div class="swal-launch-row"><span>📝 <b class="swal-highlight">${nbEsc(t.name)}</b></span></div>
      <div class="swal-launch-row"><span>⏳ ${t.duration}p &nbsp;·&nbsp; ❓ ${t.qCount} câu &nbsp;·&nbsp; 📊 ${t.maxScore} điểm</span></div>
      <div class="swal-mode-wrap">
        <label class="swal-mode-label">Chế độ làm bài:</label>
        <select id="swal-mode-select" class="swal-mode-sel">
          <option value="train" selected>🎓 LUYỆN TẬP — Xem đáp án ngay</option>
          <option value="test">⏱️ KIỂM TRA — Tính giờ, chấm cuối bài</option>
        </select>
      </div></div>`,
    icon:'question',showCancelButton:true,
    confirmButtonText:'▶ BẮT ĐẦU',cancelButtonText:'Để sau',
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',
    customClass:{popup:'nb-swal-popup'},
    preConfirm:()=>document.getElementById('swal-mode-select').value
  }).then(r=>{if(r.isConfirmed)_startQuiz(t,r.value||'train');});
};

// FIX: defined _nbLaunchIspring — was missing, causing iSpring player to never load
window._nbLaunchIspring=function(ispId){
  const x=window._nbIspMap[ispId];
  if(!x){nbToast('error','Lỗi','Không tìm thấy bài iSpring');return;}
  if(!x.path){nbToast('error','Lỗi','Bài iSpring chưa có đường dẫn');return;}
  nb.set('currentIspringName',x.name||'Bài thi iSpring');
  nb.set('currentIspringId',x.id||'');
  nb.set('quizMode','ispring');
  location.href='player.html?path='+encodeURIComponent(x.path);
};

function _startQuiz(t,mode){
  nb.set('currentTestId',t.id);nb.set('currentTestName',t.name);
  nb.set('currentTestDuration',t.duration||45);nb.setJson('currentTest',t);
  nb.set('quizMode',mode);
  nb.set('quizTotalScore',t.maxScore||10); // FIX: persist totalScore so result page is in sync
  location.href='quiz.html';
}

window._nbSelectLogout=function(){ nbLogout(); };

// =================================================================
// QUIZ ENGINE — Vietnamese input fix + score fix
// =================================================================
let _qzQ=[],_qzA={},_qzIdx=0,_qzTimer=null,_qzStart=null,_qzMode='train',_qzDone=false;

async function nbQuizInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  nbCheckSession();
  const tid=nb.get('currentTestId'),tn=nb.get('currentTestName');
  const dur=parseInt(nb.get('currentTestDuration'))||45;
  _qzMode=nb.get('quizMode')||'train';
  if(!tid){location.href='select.html';return;}
  document.getElementById('qzTitle').textContent=tn||'Bài thi';
  document.getElementById('studentInfo').textContent=nbStudentName()+(nbClass()?' · '+nbClass():'');
  const badge=document.getElementById('qzModeBadge');
  if(badge)badge.innerHTML=_qzMode==='train'?'<span class="qz-badge-train">🎓 LUYỆN TẬP</span>':'<span class="qz-badge-test">⏱ KIỂM TRA</span>';

  let qs=[];
  try{qs=await gasGet({action:'getQuestions',testId:tid});}catch(e){}
  if(!Array.isArray(qs)||!qs.length){
    nbToast('error','Không có câu hỏi','');
    setTimeout(()=>location.href='select.html',2000);return;
  }
  _qzQ=qs.map(q=>({...q,answer:_pj(q.answer,{}),correct:q.correct||q.correctAnswer||''}));
  _qzA={};_qzIdx=0;_qzDone=false;_qzStart=Date.now();

  if(_qzMode==='test'){
    const tot=dur*60;
    _qzTimer=setInterval(()=>{
      const left=Math.max(0,tot-Math.floor((Date.now()-_qzStart)/1000));
      const m=String(Math.floor(left/60)).padStart(2,'0'),s=String(left%60).padStart(2,'0');
      const te=document.getElementById('timer');
      if(te){te.textContent=`${m}:${s}`;te.style.color=left<60?'var(--danger)':'';}
      if(left<=0){clearInterval(_qzTimer);qzSubmit(true);}
    },1000);
  }else{
    const te=document.getElementById('timer');if(te)te.textContent='∞';
  }
  _qzNav();qzChangeTo(0);
}

window.__qzCurrentIdx=0;
window.qzChangeTo=function(idx){
  if(idx<0||idx>=_qzQ.length)return;
  _qzIdx=idx;window.__qzCurrentIdx=idx;
  _qzRenderQ(idx);_qzNav();_qzProgress();
};
window.qzHandleNext=function(){
  if(_qzIdx<_qzQ.length-1)qzChangeTo(_qzIdx+1);else qzCheckBeforeSubmit();
};
window.qzCheckBeforeSubmit=function(){
  const done=Object.keys(_qzA).filter(k=>{const a=_qzA[k];return a!==null&&a!==undefined&&a!==''&&!(Array.isArray(a)&&!a.length);}).length;
  const skip=_qzQ.length-done;
  if(typeof Swal==='undefined'){qzSubmit(false);return;}
  Swal.fire({
    title:'Nộp bài?',
    html:`<div class="swal-launch-body" style="text-align:center">
      <div style="font-size:2rem;margin-bottom:8px">📋</div>
      <div>✅ Đã làm: <b style="color:var(--accent)">${done}/${_qzQ.length}</b></div>
      ${skip>0?`<div style="margin-top:6px">⚠️ Chưa làm: <b style="color:var(--warning)">${skip} câu</b></div>`:''}
    </div>`,
    icon:'question',showCancelButton:true,confirmButtonText:'📤 NỘP BÀI',cancelButtonText:'← Làm tiếp',
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',customClass:{popup:'nb-swal-popup'}
  }).then(r=>{if(r.isConfirmed)qzSubmit(false);});
};

async function qzSubmit(timeout=false){
  if(_qzDone)return;_qzDone=true;clearInterval(_qzTimer);
  // FIX: use stored quizTotalScore (set when test started) for consistency with result page
  const ts=parseFloat(nb.get('quizTotalScore'))||parseFloat(_qzQ[0]?.totalScore)||10;
  const n=_qzQ.length;
  let correct=0,earned=0;
  _qzQ.forEach((q,i)=>{
    // FIX: use points if valid, else divide evenly
    let pts=parseFloat(q.points)||0;
    if(pts<=0)pts=ts/n;
    if(_qzCheck(q,_qzA[i])){correct++;earned+=pts;}
  });
  earned=Math.round(earned*100)/100;
  const timeSec=Math.floor((Date.now()-_qzStart)/1000);
  nb.set('lastScore',earned);nb.set('quizTotalScore',ts);
  nb.set('correctCount',`${correct}/${n}`);
  nb.setJson('quizAnswers',_qzA);nb.setJson('quizQuestions',_qzQ);

  if(_qzMode==='test'){
    const tn=nb.get('currentTestName')||'Bài thi';
    try{
      await gasPost({action:'submitResult',student:nbStudentName(),school:nbSchool(),
        class:nbClass(),testName:tn,score:earned,total:`${correct}/${n}`,
        answers:JSON.stringify({answers:_qzA,timeSec,timeout,totalScore:ts})});
    }catch(e){}
  }
  const brId=nb.get('battleRoomId');
  if(brId){
    try{
      await gasPost({action:'submitBattleResult',roomId:brId,
        studentName:nbStudentName(),school:nbSchool(),class:nbClass(),
        score:earned,scorePct:(earned/ts)*100,correct,total:n,timeSec,timeout});
    }catch(e){}
    nb.del('battleRoomId');
  }
  location.href='result.html';
}

function _qzCheck(q,ua){
  if(ua===null||ua===undefined||ua==='')return false;
  const cor=(q.correct||q.correctAnswer||'').trim();
  switch(q.type){
    case'single':case'tf':case'numeric':case'scale':
      return String(ua).trim().toLowerCase()===cor.trim().toLowerCase();
    case'multiple':{
      const ca=cor.split('|').map(s=>s.trim().toLowerCase()).filter(Boolean).sort();
      const ual=(Array.isArray(ua)?ua:[ua]).map(s=>String(s).trim().toLowerCase()).filter(Boolean).sort();
      return JSON.stringify(ca)===JSON.stringify(ual);
    }
    case'fill':case'fill_bank':{
      // Case-insensitive, trim, normalize diacritics
      const ua_n=String(ua).trim().toLowerCase();
      return cor.split('|').some(s=>s.trim().toLowerCase()===ua_n);
    }
    case'matching':{
      const ca=cor.split('|').map(s=>s.trim().toLowerCase()).sort();
      const ual=(Array.isArray(ua)?ua:[]).map(s=>String(s).trim().toLowerCase()).sort();
      return JSON.stringify(ca)===JSON.stringify(ual);
    }
    case'ordering':{
      const ca=cor.split('|').map(s=>s.trim().toLowerCase());
      const ual=(Array.isArray(ua)?ua:[]).map(s=>String(s).trim().toLowerCase());
      return JSON.stringify(ca)===JSON.stringify(ual);
    }
    default:return String(ua).trim().toLowerCase()===cor.trim().toLowerCase();
  }
}

function _qzRenderQ(idx){
  const q=_qzQ[idx];if(!q)return;
  const ua=_qzA[idx];
  document.getElementById('qzQuestion').innerHTML=nbEsc(q.question).replace(/\n/g,'<br>');
  document.getElementById('qzCounter').textContent=`Câu ${idx+1} / ${_qzQ.length}`;
  const iw=document.getElementById('qzImageWrap'),ii=document.getElementById('qzImage');
  if(iw&&ii){if(q.image&&q.image.length>10){ii.src=q.image;iw.style.display='';}else iw.style.display='none';}
  const ae=document.getElementById('qzAnswers');
  const ans=_pj(typeof q.answer==='string'?q.answer:JSON.stringify(q.answer),{});
  if(ae)ae.innerHTML=_qzRenderA(q,ans,ua,idx);
  // Bind fill input after render
  if(q.type==='fill'||q.type==='fill_bank'||q.type==='numeric'){
    const inp=ae?.querySelector('.qz-fill-input');
    if(inp){
      // Vietnamese IME fix: use both compositionend and input
      let composing=false;
      inp.addEventListener('compositionstart',()=>composing=true);
      inp.addEventListener('compositionend',()=>{
        composing=false;
        _qzA[idx]=inp.value;
        if(_qzMode==='train'&&inp.value)setTimeout(()=>_qzRenderQ(idx),500);
        _qzNav();
      });
      inp.addEventListener('input',()=>{
        if(!composing){_qzA[idx]=inp.value;_qzNav();}
      });
      inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!composing)qzHandleNext();});
    }
  }
  const fb=document.getElementById('qzFeedback');
  if(fb){
    if(_qzMode==='train'&&ua!==undefined&&ua!==null&&ua!==''){
      const ok=_qzCheck(q,ua);
      fb.style.display='';fb.className=`qz-feedback ${ok?'qz-fb-ok':'qz-fb-err'}`;
      fb.innerHTML=ok
        ?'<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> <b>Chính xác!</b>'
        :`<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Sai. Đáp án đúng: <b>${nbEsc((q.correct||'').replace(/\|/g,' · '))}</b>`;
    }else fb.style.display='none';
  }
  document.getElementById('qzPrev').disabled=idx===0;
  const nb2=document.getElementById('qzNext');
  if(nb2)nb2.innerHTML=idx===_qzQ.length-1
    ?'<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Nộp bài'
    :'Tiếp <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
}

function _qzRenderA(q,ans,ua,idx){
  const type=q.type,items=ans.items||[];
  switch(type){
    case'single':return items.map(it=>{
      const v=it.text||'',s=String(ua)===v;
      return `<label class="qz-opt ${s?'qz-opt-sel':''}" onclick="qzPickSingle(${idx},'${nbEsc(v).replace(/'/g,"\\'")}')">
        <span class="qz-radio ${s?'checked':''}"></span><span>${nbEsc(it.text||v)}</span></label>`;
    }).join('');
    case'multiple':{
      const sa=Array.isArray(ua)?ua:[];
      return items.map(it=>{
        const v=it.text||'',s=sa.includes(v);
        return `<label class="qz-opt ${s?'qz-opt-sel':''}" onclick="qzPickMultiple(${idx},'${nbEsc(v).replace(/'/g,"\\'")}')">
          <span class="qz-checkbox ${s?'checked':''}"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
          <span>${nbEsc(it.text||v)}</span></label>`;
      }).join('');
    }
    case'tf':return['Đúng','Sai'].map(v=>{
      const s=String(ua)===v;
      return `<label class="qz-opt qz-tf-opt ${s?'qz-opt-sel':''}" onclick="qzPickSingle(${idx},'${v}')">
        <span class="qz-tf-icon">${v==='Đúng'?'✓':'✗'}</span><span>${v}</span></label>`;
    }).join('');
    case'ordering':{
      const ordered=Array.isArray(ua)&&ua.length?ua:items.map(i=>i.text||'');
      return `<div class="qz-ordering" id="qz-order-${idx}">
        ${ordered.map((t,i)=>`<div class="qz-order-item" draggable="true" data-val="${nbEsc(t)}"
            ondragstart="qzDragStart(event,${idx})" ondragover="event.preventDefault()" ondrop="qzDropOrder(event,${idx})">
          <span class="qz-order-handle">⠿</span>
          <span class="qz-order-num">${i+1}</span>
          <span>${nbEsc(t)}</span></div>`).join('')}</div>`;
    }
    case'matching':{
      const lefts=items.map(p=>p.left||p.text||'');
      const rights=[...items.map(p=>p.right||'')].sort(()=>Math.random()-.5);
      const sel=Array.isArray(ua)?ua:[];
      return `<div class="qz-matching">
        <div class="qz-match-col">${lefts.map(l=>`<div class="qz-match-cell">${nbEsc(l)}</div>`).join('')}</div>
        <div class="qz-match-arrows">${lefts.map(()=>'<div class="qz-arrow">→</div>').join('')}</div>
        <div class="qz-match-col">${lefts.map((_,i)=>`<select class="qz-match-sel" onchange="qzPickMatch(${idx},${i},this.value)">
          <option value="">— Chọn —</option>
          ${rights.map(r=>`<option value="${nbEsc(r)}" ${sel[i]===r?'selected':''}>${nbEsc(r)}</option>`).join('')}
        </select>`).join('')}</div></div>`;
    }
    case'fill':
      return `<div class="qz-fill-wrap">
        <input type="text" class="qz-fill-input" lang="vi" placeholder="Nhập đáp án..."
          value="${nbEsc(String(ua||''))}" autocomplete="off">
        <div class="qz-fill-hint">💡 Gõ đáp án và nhấn Enter để tiếp tục</div></div>`;
    case'fill_bank':{
      const bank=ans.bank||(q.correct||'').split('|').filter(Boolean);
      const shuffled=[...new Set(bank)].sort(()=>Math.random()-.5);
      const sel=String(ua||'');
      return `<div class="qz-fillbank-wrap">
        <div class="qz-fillbank-slot ${sel?'filled':''}">
          ${sel?`<span class="qz-chip">${nbEsc(sel)}<button class="qz-chip-x" onclick="window._qzFillBank_clear(${idx})">×</button></span>`:'<span class="qz-slot-placeholder">Chọn từ bên dưới ↓</span>'}
        </div>
        <div class="qz-word-bank">
          ${shuffled.map(w=>`<button class="qz-word-btn ${w===sel?'qz-word-selected':''}" onclick="window._qzFillBank_pick(${idx},'${nbEsc(w).replace(/'/g,"\\'")}')">
            ${nbEsc(w)}</button>`).join('')}
        </div></div>`;
    }
    case'numeric':
      return `<div class="qz-fill-wrap">
        <input type="number" class="qz-fill-input" placeholder="Nhập số..."
          value="${nbEsc(String(ua||''))}" autocomplete="off"></div>`;
    case'scale':{
      const max=parseInt(ans.max)||5,sv=parseInt(ua)||0;
      return `<div class="qz-scale">
        <div style="display:flex;gap:8px">${Array.from({length:max},(_,i)=>i+1).map(v=>`
          <button class="qz-scale-btn ${v===sv?'qz-scale-sel':''}" onclick="qzPickSingle(${idx},'${v}')">${v}</button>`).join('')}</div>
        <div class="qz-scale-labels"><span>Rất thấp</span><span>Rất cao</span></div></div>`;
    }
    case'image_choice':
      return `<div class="qz-img-choices">
        ${items.map(it=>{const v=it.text||'',s=String(ua)===v;
          return `<div class="qz-img-opt ${s?'qz-img-sel':''}" onclick="qzPickSingle(${idx},'${nbEsc(v).replace(/'/g,"\\'")}')">
            ${it.image?`<img src="${nbEsc(it.image)}" class="qz-img-opt-img" alt="">`:
              `<div class="qz-img-placeholder">${nbEsc((v||'?').charAt(0).toUpperCase())}</div>`}
            <span>${nbEsc(it.text||v)}</span></div>`;
        }).join('')}</div>`;
    default:return `<div class="qz-type-err">Dạng câu hỏi "${nbEsc(type)}" chưa được hỗ trợ</div>`;
  }
}

// Fill bank helpers (avoid inline arrow in attribute)
window._qzFillBank_pick=(idx,v)=>{ _qzA[idx]=v; _qzRenderQ(idx); _qzNav(); };
window._qzFillBank_clear=idx=>{ _qzA[idx]=''; _qzRenderQ(idx); _qzNav(); };

window.qzPickSingle=(idx,v)=>{ _qzA[idx]=v; _qzRenderQ(idx); _qzNav(); };
window.qzPickMultiple=(idx,v)=>{
  let a=Array.isArray(_qzA[idx])?[..._qzA[idx]]:[];
  const i=a.indexOf(v);if(i===-1)a.push(v);else a.splice(i,1);
  _qzA[idx]=a;_qzRenderQ(idx);_qzNav();
};
window.qzPickMatch=(idx,pi,v)=>{
  const it=(_pj(typeof _qzQ[idx].answer==='string'?_qzQ[idx].answer:JSON.stringify(_qzQ[idx].answer),{})).items||[];
  let a=Array.isArray(_qzA[idx])?[..._qzA[idx]]:Array(it.length).fill('');
  while(a.length<it.length)a.push('');
  a[pi]=v;_qzA[idx]=a;_qzNav();
};
let _dragV=null,_dragI=null;
window.qzDragStart=(e,idx)=>{ _dragV=e.target.closest('[data-val]')?.dataset.val;_dragI=idx; };
window.qzDropOrder=(e,idx)=>{
  const t=e.target.closest('[data-val]');if(!t||!_dragV||_dragI!==idx)return;
  const tv=t.dataset.val;
  let a=Array.isArray(_qzA[idx])?[..._qzA[idx]]:(_qzQ[idx].answer?.items?.map(x=>x.text)||[]);
  const fi=a.indexOf(_dragV),ti=a.indexOf(tv);
  if(fi<0||ti<0)return;a.splice(fi,1);a.splice(ti,0,_dragV);
  _qzA[idx]=a;_qzRenderQ(idx);
};

function _qzNav(){
  const dots=document.getElementById('qzDots');
  if(dots)dots.innerHTML=_qzQ.map((_,i)=>{
    const a=_qzA[i];const d=a!==undefined&&a!==null&&a!==''&&!(Array.isArray(a)&&!a.length);
    return `<span class="qz-dot ${i===_qzIdx?'active':''} ${d?'done':''}" onclick="qzChangeTo(${i})" title="Câu ${i+1}"></span>`;
  }).join('');
  const grid=document.getElementById('qzGrid');
  if(grid)grid.innerHTML=_qzQ.map((_,i)=>{
    const a=_qzA[i];const d=a!==undefined&&a!==null&&a!==''&&!(Array.isArray(a)&&!a.length);
    return `<button class="qz-grid-btn ${i===_qzIdx?'active':''} ${d?'done':''}" onclick="qzChangeTo(${i})">${i+1}</button>`;
  }).join('');
  const st=document.getElementById('qzStat');
  if(st){const d=Object.values(_qzA).filter(v=>v!==undefined&&v!==null&&v!==''&&!(Array.isArray(v)&&!v.length)).length;st.textContent=`${d}/${_qzQ.length} câu`;}
}
function _qzProgress(){
  const p=((_qzIdx+1)/_qzQ.length)*100;
  const e=document.getElementById('qzProgress');if(e)e.style.width=p+'%';
}

// =================================================================
// PAGE: RESULT — Fixed score display + donut chart
// =================================================================
async function nbResultInit(){
  const mode=nb.get('quizMode')||'test';
  const isIsp=mode==='ispring';
  const ts=parseFloat(nb.get('quizTotalScore'))||(isIsp?100:10);
  const sc=parseFloat(nb.get('lastScore'))||0;
  const pct=Math.min(100,(sc/ts)*100);
  const correct=nb.get('correctCount')||'0/0';

  // Score counter animation
  const numEl=document.getElementById('resScoreVal');
  if(numEl){
    let cur=0;const step=Math.max(sc/50,0.1);
    const iv=setInterval(()=>{
      cur=Math.min(cur+step,sc);
      numEl.textContent=Number.isInteger(sc)&&Number.isInteger(ts)?Math.round(cur):parseFloat(cur.toFixed(2));
      if(cur>=sc)clearInterval(iv);
    },25);
  }

  // Ring arc
  const arc=document.getElementById('res-ring-arc');
  if(arc){
    const r=50,circ=2*Math.PI*r;
    const dashArr=(pct/100)*circ;
    arc.style.stroke=pct>=85?'#00e676':pct>=70?'#4facfe':pct>=50?'#f97316':'#ef4444';
    setTimeout(()=>{
      arc.style.strokeDasharray=`${dashArr} ${circ}`;
      arc.style.transition='stroke-dasharray 1.5s ease';
    },300);
  }

  const rSet=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  rSet('resScoreLbl',`/ ${Number.isInteger(ts)?ts:ts.toFixed(1)} điểm`);
  rSet('resName',nbStudentName());
  rSet('resSchool',nbSchool()+(nbClass()?' · '+nbClass():''));
  rSet('resTestName',(nb.get('currentTestName')||'').replace(/^\[iSpring\]\s*/i,''));

  // Trophy
  const tr=document.getElementById('resTrophy');
  if(tr)tr.textContent=pct>=85?'🏆':pct>=70?'🥈':pct>=50?'🥉':'📝';

  const mb=document.getElementById('resModeBadge');
  if(mb){
    if(isIsp)        mb.innerHTML='<span class="res-mode-isp">🌠 iSpring</span>';
    else if(mode==='train') mb.innerHTML='<span class="res-mode-train">🎓 LUYỆN TẬP</span>';
    else             mb.innerHTML='<span class="res-mode-test">⏱ KIỂM TRA</span>';
  }

  if(!isIsp){
    const [cor,tot]=(correct||'0/0').split('/').map(Number);
    const wrong=(tot||0)-(cor||0);
    rSet('resCorrect',correct);
    _drawResultChart(sc,ts,cor||0,wrong||0,tot||0);
    document.getElementById('resBtnReview')?.style&&(document.getElementById('resBtnReview').style.display='');
  }else{
    const st=nb.get('ispringStatus')||'completed';
    const stMap={passed:'✓ Đạt',completed:'✓ Hoàn thành',failed:'✗ Chưa đạt',incomplete:'⚠ Chưa xong'};
    rSet('resStatus',stMap[st]||'Hoàn thành');
    const sEl=document.getElementById('resStatus');
    if(sEl)sEl.style.color=['passed','completed'].includes(st)?'var(--accent)':'var(--danger)';
    document.getElementById('resCorrectRow')?.style&&(document.getElementById('resCorrectRow').style.display='none');
    document.getElementById('resStatusRow')?.style&&(document.getElementById('resStatusRow').style.display='');
    document.getElementById('resBtnReview')?.style&&(document.getElementById('resBtnReview').style.display='none');
    rSet('resSubtitle','KẾT QUẢ BÀI THI iSPRING');
    _drawIspringChart(sc,100);
  }
}

function _drawResultChart(score,total,cor,wrong,tot){
  const el=document.getElementById('resChartArea');if(!el)return;
  const pct=total>0?Math.min(100,(score/total)*100):0;
  const skipCount=(tot||0)-(cor||0)-(wrong||0);
  el.innerHTML=`
    <div class="res-chart-title">📊 Phân tích kết quả</div>
    <div class="res-chart-donut-wrap">
      <svg viewBox="0 0 120 120" class="res-chart-donut">
        ${_donut(cor,tot,0,'#00e676')}
        ${_donut(wrong,tot,cor/Math.max(tot,1),'#ef4444')}
        ${skipCount>0?_donut(skipCount,tot,(cor+wrong)/Math.max(tot,1),'rgba(255,255,255,.12)'):'' }
        <circle cx="60" cy="60" r="30" fill="var(--bg2)"/>
        <text x="60" y="55" text-anchor="middle" dominant-baseline="central" fill="#f1f5f9" font-size="14" font-weight="700">${Math.round(pct)}%</text>
        <text x="60" y="70" text-anchor="middle" dominant-baseline="central" fill="#64748b" font-size="9">tỉ lệ</text>
      </svg>
      <div class="res-chart-legend">
        <div class="res-legend-item"><span class="res-legend-dot" style="background:#00e676"></span>Đúng: <b style="color:#00e676">${cor||0}</b></div>
        <div class="res-legend-item"><span class="res-legend-dot" style="background:#ef4444"></span>Sai: <b style="color:#ef4444">${wrong||0}</b></div>
        ${skipCount>0?`<div class="res-legend-item"><span class="res-legend-dot" style="background:rgba(255,255,255,.25)"></span>Bỏ qua: <b>${skipCount}</b></div>`:''}
        <div class="res-legend-item" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">Tổng: <b>${tot||0} câu</b></div>
      </div>
    </div>
    <div class="res-score-bar-wrap">
      <div class="res-score-bar-label">Điểm số: <b>${score} / ${total}</b></div>
      <div class="res-score-bar-track">
        <div class="res-score-bar-fill" style="width:${pct}%;background:${pct>=50?'var(--accent)':'var(--danger)'}"></div>
        <span class="res-score-bar-val">${pct.toFixed(1)}%</span>
      </div>
    </div>`;
}

function _drawIspringChart(score,total){
  const el=document.getElementById('resChartArea');if(!el)return;
  const pct=Math.min(100,Math.max(0,score));
  el.innerHTML=`
    <div class="res-chart-title">📊 Điểm iSpring</div>
    <div class="res-score-bar-wrap">
      <div class="res-score-bar-label">Điểm số: <b>${score} / ${total}</b></div>
      <div class="res-score-bar-track">
        <div class="res-score-bar-fill" style="width:${pct}%;background:${pct>=50?'var(--ispring)':'var(--danger)'}"></div>
        <span class="res-score-bar-val">${pct}%</span>
      </div>
    </div>`;
}

function _donut(part,total,startFrac,color){
  if(!total||!part||part<0)return'';
  const r=45,cx=60,cy=60;
  const startA=startFrac*2*Math.PI-Math.PI/2;
  const endA=startA+(Math.min(part,total)/total)*2*Math.PI;
  const x1=cx+r*Math.cos(startA),y1=cy+r*Math.sin(startA);
  const x2=cx+r*Math.cos(endA-0.001),y2=cy+r*Math.sin(endA-0.001);
  const large=(part/total)>.5?1:0;
  return `<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}Z" fill="${color}" opacity=".9"/>`;
}

// Review modal
window.nbOpenReview=function(){
  const modal=document.getElementById('resModal');if(!modal)return;
  modal.style.display='flex';
  const qs=nb.json('quizQuestions',[]);const ans=nb.json('quizAnswers',{});
  if(!qs.length){document.getElementById('resQList').innerHTML='<div class="res-empty">Không có dữ liệu bài làm</div>';return;}
  let ok=0,err=0,skip=0;
  const html=qs.map((q,i)=>{
    const ua=ans[i];
    const empty=ua===undefined||ua===null||ua===''||(Array.isArray(ua)&&!ua.length);
    const isOk=!empty&&_qzCheck(q,ua);
    if(empty)skip++;else if(isOk)ok++;else err++;
    const cd=(q.correct||q.correctAnswer||'').replace(/\|/g,' · ');
    const ud=Array.isArray(ua)?ua.join(' → '):String(ua||'');
    return `<div class="res-q-item ${isOk?'ok':empty?'skip':'err'}">
      <div class="res-q-num">Câu ${i+1} <span class="res-q-type">${q.type||'single'}</span></div>
      <div class="res-q-text">${nbEsc(q.question)}</div>
      <div class="res-q-row"><span class="res-q-lbl">Bạn:</span> <span class="res-q-val ${isOk?'ok':empty?'skip':'err'}">${empty?'(Bỏ qua)':nbEsc(ud)}</span></div>
      ${!isOk&&!empty?`<div class="res-q-row"><span class="res-q-lbl">Đúng:</span> <span class="res-q-correct">${nbEsc(cd)}</span></div>`:''}
    </div>`;
  }).join('');
  const ch=document.getElementById('resChips');
  if(ch)ch.innerHTML=`<div class="res-chip ok">${ok}<small>Đúng</small></div><div class="res-chip err">${err}<small>Sai</small></div><div class="res-chip skip">${skip}<small>Bỏ qua</small></div>`;
  document.getElementById('resQList').innerHTML=html;
};
window.nbCloseReview=function(){const m=document.getElementById('resModal');if(m)m.style.display='none';};

// =================================================================
// PAGE: HISTORY — with pagination, retry, review per item
// =================================================================
let _histAll=[];
const HIST_PAGE_SIZE=10;
let _histPage=1,_histFiltered=[];

async function nbHistoryInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  nbCheckSession();
  const name=nbStudentName();
  const nameEl=document.getElementById('histStudentName');
  if(nameEl)nameEl.textContent=name;
  const listEl=document.getElementById('histList');
  const statsEl=document.getElementById('histStats');
  if(listEl)listEl.innerHTML=`<div class="hist-list-inner">${Array(4).fill('<div class="hist-skeleton"></div>').join('')}</div>`;
  // Inject search+page controls into filter bar
  const fb=document.getElementById('histFilterBar')||document.querySelector('.hist-filter-bar');
  if(fb&&!document.getElementById('histSearch')){
    const si=document.createElement('input');
    si.id='histSearch';si.type='text';si.placeholder='🔍 Tìm bài thi...';
    si.style.cssText='flex:1;padding:7px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.11);border-radius:99px;color:#f0f4f8;font-size:.78rem;outline:none;min-width:0;';
    si.addEventListener('input',()=>{_histApplyFilter();});
    fb.appendChild(si);
  }
  try{
    const [sysRes,ispRes]=await Promise.all([
      gasGet({action:'getResults',student:name}),
      gasGet({action:'getIspringResults',student:name})
    ]);
    _histAll=[
      ...(Array.isArray(sysRes)?sysRes:[])
        .filter(r=>!String(r.testName||'').toLowerCase().includes('[ispring]'))
        .map(r=>({...r,src:'sys'})),
      ...(Array.isArray(ispRes)?ispRes:[]).map(r=>({...r,src:'isp'}))
    ].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0));

    if(!_histAll.length){
      if(listEl)listEl.innerHTML=`<div class="hist-empty"><svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/></svg><p>Chưa có lịch sử làm bài</p></div>`;
      return;
    }

    if(statsEl){
      const avg=(_histAll.reduce((s,r)=>s+parseFloat(r.score||0),0)/_histAll.length).toFixed(1);
      const best=Math.max(..._histAll.map(r=>parseFloat(r.score||0))).toFixed(1);
      statsEl.innerHTML=`
        <div class="hist-stat"><span class="hist-stat-n">${_histAll.length}</span><span class="hist-stat-l">Lần làm</span></div>
        <div class="hist-stat"><span class="hist-stat-n">${avg}</span><span class="hist-stat-l">Điểm TB</span></div>
        <div class="hist-stat"><span class="hist-stat-n">${best}</span><span class="hist-stat-l">Cao nhất</span></div>`;
    }
    _histFiltered=[..._histAll];_histPage=1;
    _histRender(_histFiltered);
    const filter=document.getElementById('histFilter');
    if(filter){
      window._histFilterFn=f=>{
        const src=f==='all'?_histAll:_histAll.filter(r=>r.src===f);
        const q=(document.getElementById('histSearch')?.value||'').toLowerCase();
        _histFiltered=q?src.filter(r=>(r.testName||'').toLowerCase().includes(q)):src;
        _histPage=1;_histRender(_histFiltered);
      };
    }
  }catch(e){
    if(listEl)listEl.innerHTML='<div class="hist-empty" style="color:var(--danger)">Lỗi tải dữ liệu</div>';
  }
}

function _histApplyFilter(){
  const q=(document.getElementById('histSearch')?.value||'').toLowerCase();
  const src=document.getElementById('histFilter')?.value||'all';
  const base=src==='all'?_histAll:_histAll.filter(r=>r.src===src);
  _histFiltered=q?base.filter(r=>(r.testName||'').toLowerCase().includes(q)):base;
  _histPage=1;_histRender(_histFiltered);
}

function _histRender(data){
  const el=document.getElementById('histList');if(!el)return;
  if(!data.length){el.innerHTML='<div class="hist-empty">Không có kết quả nào</div>';return;}
  const pages=Math.ceil(data.length/HIST_PAGE_SIZE);
  if(_histPage<1)_histPage=1;if(_histPage>pages)_histPage=pages;
  const page=data.slice((_histPage-1)*HIST_PAGE_SIZE,_histPage*HIST_PAGE_SIZE);

  el.innerHTML=`<div class="hist-list-inner">${page.map((r,i)=>{
    const sc=parseFloat(r.score||0);
    const col=sc>=8||sc>=80?'var(--accent)':sc>=5||sc>=50?'var(--primary)':'var(--danger)';
    const dt=r.time?new Date(r.time).toLocaleString('vi-VN'):'—';
    const name=(r.testName||r.test_name||'Bài thi').replace(/^\[iSpring\]\s*/i,'');
    const gIdx=(_histPage-1)*HIST_PAGE_SIZE+i;
    return `<div class="hist-item">
      <div class="hist-score-ring" style="--ring-color:${col}"><span>${sc%1===0?sc:sc.toFixed(1)}</span></div>
      <div class="hist-info">
        <div class="hist-name">${nbEsc(name)}</div>
        <div class="hist-meta">
          <span class="hist-badge ${r.src}">${r.src==='isp'?'iSpring':'Hệ thống'}</span>
          <span>${r.total||''}</span>
          <span>🕐 ${dt}</span>
        </div>
      </div>
      <div class="hist-item-acts">
        ${r.src==='sys'?`<button class="hist-act-btn hist-act-retry" title="Làm lại" onclick="window._histRetry(${gIdx})">🔄</button>`:''}
        ${r.src==='sys'&&r.answers?`<button class="hist-act-btn hist-act-review" title="Xem lại bài" onclick="window._histReview(${gIdx})">👁</button>`:''}
      </div>
    </div>`;
  }).join('')}</div>`;

  // Pagination controls
  if(pages>1){
    const pg=document.createElement('div');
    pg.className='hist-pagination';
    pg.innerHTML=`
      <button class="hist-pg-btn" ${_histPage<=1?'disabled':''} onclick="window._histChangePage(${_histPage-1})">←</button>
      <span class="hist-pg-info">${_histPage} / ${pages} <small style="color:var(--text3)">(${data.length} bài)</small></span>
      <button class="hist-pg-btn" ${_histPage>=pages?'disabled':''} onclick="window._histChangePage(${_histPage+1})">→</button>`;
    el.appendChild(pg);
  }
}

window._histChangePage=function(p){_histPage=p;_histRender(_histFiltered);document.getElementById('histList')?.scrollIntoView({behavior:'smooth',block:'start'});};

// Retry: re-launch the test for this result
window._histRetry=async function(idx){
  const r=_histFiltered[idx];if(!r)return;
  const tn=String(r.testName||'').replace(/^\[iSpring\]\s*/i,'');
  try{
    const tests=await gasGet({action:'getTests'});
    const test=(Array.isArray(tests)?tests:[]).find(t=>t.name===tn||t.name===r.testName);
    if(test){_startQuiz(test,'test');}
    else nbToast('warning','Không tìm thấy','Bài thi không còn tồn tại');
  }catch(e){nbToast('error','Lỗi','Không thể tải bài thi');}
};

// Review: show questions & answers from stored answers JSON
window._histReview=async function(idx){
  const r=_histFiltered[idx];if(!r)return;
  let ansData={};
  try{ansData=JSON.parse(r.answers||'{}');}catch{}
  const qs=ansData.answers; // quizAnswers
  if(!qs||typeof qs!=='object'){
    // Try to load questions from server
    nbToast('info','Đang tải...','');
    const tn=String(r.testName||'').replace(/^\[iSpring\]\s*/i,'');
    try{
      const tests=await gasGet({action:'getTests'});
      const test=(Array.isArray(tests)?tests:[]).find(t=>t.name===tn);
      if(!test){nbToast('warning','','Không tìm thấy dữ liệu bài làm');return;}
      const questions=await gasGet({action:'getQuestions',testId:test.id});
      if(!Array.isArray(questions)||!questions.length){nbToast('warning','','Không có câu hỏi');return;}
      // Store for review modal and open it
      nb.setJson('quizQuestions',questions.map(q=>({...q,answer:_pj(q.answer,{}),correct:q.correct||q.correctAnswer||''})));
      nb.setJson('quizAnswers',{});
    }catch(e){nbToast('error','Lỗi','');return;}
  }else{
    // We have answer data from submission
    nb.set('lastScore',r.score||0);
    nb.set('quizTotalScore',10);
    nb.set('correctCount',r.total||'');
    // Try to get questions too
    const tn=String(r.testName||'').replace(/^\[iSpring\]\s*/i,'');
    try{
      const tests=await gasGet({action:'getTests'});
      const test=(Array.isArray(tests)?tests:[]).find(t=>t.name===tn);
      if(test){
        const questions=await gasGet({action:'getQuestions',testId:test.id});
        if(Array.isArray(questions)&&questions.length){
          nb.setJson('quizQuestions',questions.map(q=>({...q,answer:_pj(q.answer,{}),correct:q.correct||q.correctAnswer||''})));
          nb.setJson('quizAnswers',qs||{});
        }
      }
    }catch{}
  }
  // Open review modal if on result page, else navigate to result
  if(typeof nbOpenReview==='function'&&document.getElementById('resModal')){
    nbOpenReview();
  }else{
    nb.set('quizMode','train');
    location.href='result.html';
  }
};

// =================================================================
// PAGE: DASHBOARD — pagination, charts, search/filter for results
// =================================================================
let _dbPollId=null,_dbResultPage=1,_dbResultAll=[],_dbResultFiltered=[];
const DB_PAGE_SIZE=20;

async function nbDashboardInit(){
  if(!nbIsAdmin()){location.href='index.html';return;}
  nbCheckSession();
  const user=nbCurrentUser();
  const badge=document.getElementById('dbUserBadge');
  if(badge){
    badge.innerHTML=`${nbIsSuperAdmin()?'🛡 SUPER ADMIN':'🔑 ADMIN'} — <b>${nbEsc(user?.name||user?.username||'Admin')}</b>`;
    badge.className=`db-user-badge ${nbIsSuperAdmin()?'super':'admin'}`;
  }
  const topU=document.getElementById('dbTopUser');
  if(topU)topU.textContent=user?.name||user?.username||'';
  document.querySelectorAll('.super-only').forEach(el=>el.style.display=nbIsSuperAdmin()?'':'none');
  // FIX: only load stats + pending on init (fast). Other tabs load lazily on click.
  window._dbTabLoaded={overview:true,pending:true};
  await Promise.all([_dbLoadStats(),_dbLoadPending()]);
  _dbPollId=setInterval(_dbAutoRefresh,10000);
}

async function _dbAutoRefresh(){
  nbCheckSession();
  await _dbLoadStats();
  // Only refresh currently visible tab data
  const activeTab=document.querySelector('.db-tab-pane.active')?.dataset?.tab||'overview';
  if(activeTab==='results')  _dbLoadResults();
  if(activeTab==='pending')  _dbLoadPending();
  if(activeTab==='battle')   _dbLoadBattleRooms();
  if(activeTab==='tests')    _dbLoadTests();
  if(activeTab==='ispring')  _dbLoadIspring();
}

// Full reload - used when forced (e.g. after creating a test)
async function _dbLoadAll(){
  await Promise.all([
    _dbLoadStats(),_dbLoadTests(),_dbLoadPending(),_dbLoadResults(),
    _dbLoadIspring(),_dbLoadBattleRooms(),
    nbIsSuperAdmin()?_dbLoadAdmins():Promise.resolve()
  ]);
}

async function _dbLoadStats(){
  try{
    const s=await gasGet({action:'getDashboardStats'});
    const _s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v||0;};
    _s('dbStatTests',s.totalTests);_s('dbStatQ',s.totalQuestions);
    _s('dbStatResults',s.totalResults);_s('dbStatIsp',s.totalIspring);
    _s('dbStatStudents',s.activeStudents);_s('dbStatRooms',s.activeRooms);
    const pb=document.getElementById('dbPendingBadge');
    if(pb&&s.pendingUsers>0)pb.textContent=s.pendingUsers;else if(pb)pb.textContent='';
    const rr=document.getElementById('dbRecentResults');
    if(rr&&s.recentResults?.length){
      rr.innerHTML=s.recentResults.map(r=>`
        <div class="db-recent-row">
          <b>${nbEsc(r.student||'')}</b>
          <span>${nbEsc((r.testName||'').replace(/^\[iSpring\]\s*/i,''))}</span>
          <span class="db-score">${r.score}</span>
          <span class="db-time">${r.time?new Date(r.time).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'—'}</span>
        </div>`).join('');
    }
  }catch(e){}
}

async function _dbLoadTests(){
  const el=document.getElementById('dbTestList');if(!el)return;
  try{
    const data=await gasGet({action:'getTests'});
    if(!Array.isArray(data)||!data.length){el.innerHTML='<div class="db-empty">Chưa có đề thi nào</div>';return;}
    el.innerHTML=data.map(t=>`
      <div class="db-row">
        <div class="db-row-main">
          <span class="db-row-title">${nbEsc(t.name)}</span>
          <span class="db-row-meta">⏱ ${t.duration}p · ❓ ${t.qCount||0} câu · 📊 ${t.maxScore||10} điểm</span>
        </div>
        <div class="db-row-acts">
          <button class="dba-btn edit" onclick="dbEditTest('${t.id}','${nbEsc(t.name)}',${t.duration},${t.maxScore||10},'${nbEsc(t.desc||'')}')">✏</button>
          <button class="dba-btn qs" onclick="dbManageQ('${t.id}','${nbEsc(t.name)}')">📝 Câu hỏi</button>
          <button class="dba-btn del" onclick="dbDelTest('${t.id}','${nbEsc(t.name)}')">🗑</button>
        </div>
      </div>`).join('');
  }catch(e){el.innerHTML='<div class="db-empty err">Lỗi kết nối</div>';}
}

async function _dbLoadPending(){
  const el=document.getElementById('dbPendingList');if(!el)return;
  try{
    const data=await gasGet({action:'getPendingUsers'});
    const pb=document.getElementById('dbPendingBadge');
    if(pb)pb.textContent=(Array.isArray(data)&&data.length)?data.length:'';
    if(!Array.isArray(data)||!data.length){el.innerHTML='<div class="db-empty">Không có yêu cầu mới ✓</div>';return;}
    el.innerHTML=data.map(u=>`
      <div class="db-row">
        <div class="db-row-main">
          <span class="db-row-title">${nbEsc(u.name||'')} <span style="color:var(--text3)">@${nbEsc(u.username)}</span></span>
          <span class="db-row-meta">${nbEsc(u.school||'')}${u.class?' · '+u.class:''}</span>
          <span class="db-row-time">🕐 ${u.time||''}</span>
        </div>
        <div class="db-row-acts">
          <button class="dba-btn ok" onclick="dbHandleUser('${nbEsc(u.username)}','approved')">✓ Duyệt</button>
          <button class="dba-btn del" onclick="dbHandleUser('${nbEsc(u.username)}','rejected')">✗ Từ chối</button>
        </div>
      </div>`).join('');
  }catch(e){}
}

async function _dbLoadResults(){
  try{
    const [sysData,ispData]=await Promise.all([
      gasGet({action:'getResults'}),
      gasGet({action:'getIspringResults'})
    ]);
    // FIX: sysData already contains iSpring results (same Results sheet), deduplicate by excluding [iSpring] tagged entries from sysData
    _dbResultAll=[
      ...(Array.isArray(sysData)?sysData:[])
        .filter(r=>!String(r.testName||'').toLowerCase().includes('[ispring]'))
        .map(r=>({...r,src:'sys'})),
      ...(Array.isArray(ispData)?ispData:[]).map(r=>({...r,src:'isp'}))
    ].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0));
    _dbResultFiltered=[..._dbResultAll];
    _dbResultPage=1;
    _dbRenderResults();
    _dbRenderCharts();
  }catch(e){}
}

function _dbFilterResults(){
  const search=(document.getElementById('dbResultSearch')?.value||'').toLowerCase();
  const src=document.getElementById('dbResultSrc')?.value||'all';
  const scoreMin=parseFloat(document.getElementById('dbResultScoreMin')?.value)||0;
  const scoreMax=parseFloat(document.getElementById('dbResultScoreMax')?.value)||9999;
  _dbResultFiltered=_dbResultAll.filter(r=>{
    const sc=parseFloat(r.score||0);
    const matchSrc=src==='all'||(src==='sys'&&r.src==='sys')||(src==='isp'&&r.src==='isp');
    const matchScore=sc>=scoreMin&&sc<=scoreMax;
    const matchSearch=!search||
      (r.student||'').toLowerCase().includes(search)||
      (r.testName||'').toLowerCase().includes(search)||
      (r.school||'').toLowerCase().includes(search);
    return matchSrc&&matchScore&&matchSearch;
  });
  _dbResultPage=1;
  _dbRenderResults();
}
window._dbFilterResults=_dbFilterResults;

function _dbRenderResults(){
  const el=document.getElementById('dbResultList');if(!el)return;
  const data=_dbResultFiltered;
  const total=data.length;
  const pages=Math.ceil(total/DB_PAGE_SIZE);
  const start=(_dbResultPage-1)*DB_PAGE_SIZE;
  const page=data.slice(start,start+DB_PAGE_SIZE);

  // Count display
  const cnt=document.getElementById('dbResultCount');
  if(cnt)cnt.textContent=`${total} kết quả`;

  if(!page.length){el.innerHTML='<div class="db-empty">Không có kết quả nào</div>';return;}
  el.innerHTML=`<div class="db-table-wrap"><table class="db-tbl">
    <thead><tr><th>Học sinh</th><th>Bài thi</th><th>Điểm</th><th>Đúng/Tổng</th><th>Thời gian</th><th>Loại</th></tr></thead>
    <tbody>${page.map(r=>{
      const sc=parseFloat(r.score||0);
      const col=sc>=8||sc>=80?'var(--accent)':sc>=5||sc>=50?'var(--primary)':'var(--danger)';
      return `<tr>
        <td><b>${nbEsc(r.student||'')}</b><br><small style="color:var(--text3)">${nbEsc(r.school||'')}</small></td>
        <td class="db-tbl-test">${nbEsc((r.testName||'').replace(/^\[iSpring\]\s*/i,''))}</td>
        <td style="color:${col};font-weight:800">${sc%1===0?sc:sc.toFixed(1)}</td>
        <td>${nbEsc(r.total||'')}</td>
        <td><small>${r.time?new Date(r.time).toLocaleString('vi-VN'):''}</small></td>
        <td><span class="db-src ${r.src}">${r.src==='isp'?'iSpring':'System'}</span></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;

  // Pagination
  if(pages>1){
    const pg=document.createElement('div');
    pg.className='db-pagination';
    pg.innerHTML=`
      <button class="db-pg-btn" ${_dbResultPage<=1?'disabled':''} onclick="window._dbChangePage(${_dbResultPage-1})">←</button>
      <span class="db-pg-info">${_dbResultPage} / ${pages}</span>
      <button class="db-pg-btn" ${_dbResultPage>=pages?'disabled':''} onclick="window._dbChangePage(${_dbResultPage+1})">→</button>`;
    el.appendChild(pg);
  }
}

window._dbChangePage=function(p){_dbResultPage=p;_dbRenderResults();
  document.getElementById('dbResultList')?.scrollIntoView({behavior:'smooth',block:'start'});
};

function _dbRenderCharts(){
  // Chart 1: Score distribution donut
  const c1=document.getElementById('dbChart1');
  if(c1&&_dbResultAll.length){
    const bins=[0,0,0,0]; // 0-49, 50-69, 70-84, 85-100
    _dbResultAll.forEach(r=>{
      const sc=parseFloat(r.score||0);
      const pct=parseFloat(r.total||'1/1')===1?sc:(sc/10)*100; // normalize
      if(pct<50)bins[0]++;else if(pct<70)bins[1]++;else if(pct<85)bins[2]++;else bins[3]++;
    });
    const tot=_dbResultAll.length;
    const cats=[{l:'0–49%',c:'#ef4444'},{l:'50–69%',c:'#f97316'},{l:'70–84%',c:'#4facfe'},{l:'85–100%',c:'#00e676'}];
    c1.innerHTML=`<div class="db-chart-title">Phân bố điểm</div>
      <div class="db-chart-bars">
        ${cats.map((cat,i)=>{
          const pct=tot>0?(bins[i]/tot)*100:0;
          return `<div class="db-bar-item">
            <div class="db-bar-track"><div class="db-bar-fill" style="height:${pct}%;background:${cat.c}"></div></div>
            <div class="db-bar-label">${cat.l}</div>
            <div class="db-bar-val" style="color:${cat.c}">${bins[i]}</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // Chart 2: Top tests by avg score
  const c2=document.getElementById('dbChart2');
  if(c2&&_dbResultAll.length){
    const byTest={};
    _dbResultAll.forEach(r=>{
      const k=(r.testName||'?').replace(/^\[iSpring\]\s*/i,'iSpring: ');
      if(!byTest[k])byTest[k]={sum:0,n:0};
      byTest[k].sum+=parseFloat(r.score||0);byTest[k].n++;
    });
    const sorted=Object.entries(byTest).sort((a,b)=>b[1].n-a[1].n).slice(0,5);
    const maxAvg=Math.max(...sorted.map(([,v])=>v.sum/v.n),1);
    c2.innerHTML=`<div class="db-chart-title">Bài thi phổ biến (lượt làm)</div>
      <div class="db-chart-hbars">
        ${sorted.map(([name,v])=>{
          const avg=(v.sum/v.n);
          const w=(avg/maxAvg)*100;
          const col=avg>=8||avg>=80?'var(--accent)':avg>=5||avg>=50?'var(--primary)':'var(--warning)';
          return `<div class="db-hbar-item">
            <div class="db-hbar-name">${nbEsc(name.length>24?name.slice(0,22)+'…':name)}</div>
            <div class="db-hbar-track">
              <div class="db-hbar-fill" style="width:${w}%;background:${col}"></div>
              <span class="db-hbar-val">${v.n} lượt · TB: ${avg.toFixed(1)}</span>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }
}

async function _dbLoadIspring(){
  const el=document.getElementById('dbIspList');if(!el)return;
  try{
    const data=await gasGet({action:'getIspring'});
    if(!Array.isArray(data)||!data.length){el.innerHTML='<div class="db-empty">Chưa có bài iSpring</div>';return;}
    el.innerHTML=data.map(t=>`
      <div class="db-row">
        <div class="db-row-main">
          <span class="db-row-title">${nbEsc(t.name)}</span>
          <span class="db-row-meta">📁 ${nbEsc(t.path||'')} · ⏱ ${t.duration||45}p</span>
          <span class="db-vis-badge ${t.visible?'on':'off'}">${t.visible?'👁 Hiện':'🙈 Ẩn'}</span>
        </div>
        <div class="db-row-acts">
          <button class="dba-btn edit" onclick="dbEditIsp('${t.id}','${nbEsc(t.name)}','${nbEsc(t.path||'')}',${t.duration||45})">✏</button>
          <button class="dba-btn ${t.visible?'warn':'ok'}" onclick="dbToggleIsp('${t.id}',${!t.visible})">${t.visible?'Ẩn':'Hiện'}</button>
          <button class="dba-btn del" onclick="dbDelIsp('${t.id}','${nbEsc(t.name)}')">🗑</button>
        </div>
      </div>`).join('');
  }catch(e){}
}

async function _dbLoadBattleRooms(){
  const el=document.getElementById('dbBattleList');if(!el)return;
  try{
    const data=await gasGet({action:'getBattleRooms'});
    if(!Array.isArray(data)||!data.length){el.innerHTML='<div class="db-empty">Chưa có phòng thi nào</div>';return;}
    el.innerHTML=data.slice(0,20).map(r=>`
      <div class="db-row db-room-row">
        <div class="db-row-main">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="db-room-code">${r.roomCode||r.id}</span>
            <span class="db-row-title">${nbEsc(r.name||'')}</span>
            <span class="db-room-status st-${r.status}">${{waiting:'⏳ Chờ',active:'🔴 Đang thi',finished:'✅ Xong',cancelled:'❌ Hủy'}[r.status]||r.status}</span>
          </div>
          <span class="db-row-meta">⏱ ${r.duration}p · 🎯 Đạt ${r.passScore}% · RP +${r.rpWin}/${r.rpLoss}</span>
        </div>
        <div class="db-row-acts">
          <button class="dba-btn ok" onclick="location.href='battle-monitor.html?id=${r.id}'">👁 Monitor</button>
          ${r.status==='waiting'?`<button class="dba-btn" onclick="dbStartRoom('${r.id}')">▶ Bắt đầu</button>`:''}
          ${['waiting','active'].includes(r.status)?`<button class="dba-btn del" onclick="dbCancelRoom('${r.id}')">✗ Hủy</button>`:''}
        </div>
      </div>`).join('');
  }catch(e){}
}

async function _dbLoadAdmins(){
  const el=document.getElementById('dbAdminList');if(!el)return;
  try{
    const data=await gasGet({action:'getAdmins'});
    if(!Array.isArray(data)||!data.length){el.innerHTML='<div class="db-empty">Không có admin nào</div>';return;}
    el.innerHTML=data.map(u=>`
      <div class="db-row">
        <div class="db-row-main">
          <span class="db-row-title">${nbEsc(u.name||u.username)} <span class="db-role-tag ${u.role}">${u.role==='super_admin'?'🛡 SUPER':'🔑 ADMIN'}</span></span>
          <span class="db-row-meta">@${nbEsc(u.username)} · ${u.status==='active'?'✓ Hoạt động':'🔒 Bị khóa'}</span>
        </div>
        ${u.role!=='super_admin'?`
        <div class="db-row-acts">
          <button class="dba-btn ${u.status==='active'?'warn':'ok'}" onclick="dbToggleAdmin('${nbEsc(u.username)}',${u.status!=='active'})">${u.status==='active'?'🔒 Khóa':'🔓 Mở'}</button>
          <button class="dba-btn del" onclick="dbDelAdmin('${nbEsc(u.username)}')">🗑</button>
        </div>`:'<span class="db-protected">🛡 Được bảo vệ</span>'}
      </div>`).join('');
  }catch(e){}
}

// Dashboard action buttons
window.dbCreateTest=async function(){
  const {value:v}=await Swal.fire({
    title:'Tạo đề thi mới',
    html:`<input id="sw-n" class="swal2-input" placeholder="Tên đề thi *" autofocus>
          <input id="sw-d" class="swal2-input" placeholder="Mô tả (tùy chọn)">
          <input id="sw-t" class="swal2-input" type="number" value="45" placeholder="Thời gian (phút)">
          <input id="sw-s" class="swal2-input" type="number" value="10" placeholder="Tổng điểm">`,
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Tạo',cancelButtonText:'Hủy',
    customClass:{popup:'nb-swal-popup'},
    preConfirm:()=>({name:document.getElementById('sw-n').value.trim(),desc:document.getElementById('sw-d').value.trim(),dur:parseInt(document.getElementById('sw-t').value)||45,ts:parseFloat(document.getElementById('sw-s').value)||10})
  });
  if(!v?.name)return;
  await gasPost({action:'createTest',name:v.name,desc:v.desc,duration:v.dur,totalScore:v.ts});
  nbToast('success','Đã tạo đề thi!','');setTimeout(_dbLoadTests,1000);
};

window.dbEditTest=async function(id,name,dur,ts,desc){
  const {value:v}=await Swal.fire({
    title:'Chỉnh sửa đề thi',
    html:`<input id="sw-n" class="swal2-input" value="${nbEsc(name)}" placeholder="Tên">
          <input id="sw-d" class="swal2-input" value="${nbEsc(desc||'')}" placeholder="Mô tả">
          <input id="sw-t" class="swal2-input" type="number" value="${dur}" placeholder="Thời gian">
          <input id="sw-s" class="swal2-input" type="number" value="${ts}" placeholder="Tổng điểm">`,
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Lưu',cancelButtonText:'Hủy',customClass:{popup:'nb-swal-popup'},
    preConfirm:()=>({name:document.getElementById('sw-n').value.trim(),desc:document.getElementById('sw-d').value.trim(),dur:parseInt(document.getElementById('sw-t').value)||45,ts:parseFloat(document.getElementById('sw-s').value)||10})
  });
  if(!v?.name)return;
  await gasPost({action:'updateTest',id,name:v.name,desc:v.desc,duration:v.dur,totalScore:v.ts});
  nbToast('success','Đã cập nhật!','');setTimeout(_dbLoadTests,1000);
};

window.dbDelTest=async function(id,name){
  const r=await Swal.fire({title:'Xóa đề thi?',text:`"${name}" sẽ bị xóa vĩnh viễn!`,icon:'warning',
    showCancelButton:true,confirmButtonColor:'#ef4444',confirmButtonText:'Xóa',cancelButtonText:'Hủy',
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',customClass:{popup:'nb-swal-popup'}});
  if(!r.isConfirmed)return;
  await gasPost({action:'deleteTest',testId:id});
  nbToast('success','Đã xóa','');setTimeout(_dbLoadAll,1000);
};

window.dbManageQ=function(id,name){ nb.setJson('currentTest',{id,name}); location.href='question-list.html'; };

window.dbHandleUser=async function(un,status){
  await gasPost({action:'handleUserRequest',username:un,status});
  nbToast('success',status==='approved'?'Đã duyệt!':'Đã từ chối','');
  setTimeout(()=>{_dbLoadPending();_dbLoadStats();},1000);
};

window.dbAddIsp=async function(){
  const {value:v}=await Swal.fire({
    title:'Thêm bài iSpring',
    html:`<input id="sw-n" class="swal2-input" placeholder="Tên bài thi *" autofocus>
          <input id="sw-p" class="swal2-input" placeholder="Path (vd: quizzes/test/index.html) *">
          <input id="sw-t" class="swal2-input" type="number" value="45" placeholder="Thời gian (phút)">
          <input id="sw-s" class="swal2-input" placeholder="Môn học (tùy chọn)">`,
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Thêm',cancelButtonText:'Hủy',customClass:{popup:'nb-swal-popup'},
    preConfirm:()=>({name:document.getElementById('sw-n').value.trim(),path:document.getElementById('sw-p').value.trim(),dur:parseInt(document.getElementById('sw-t').value)||45,subj:document.getElementById('sw-s').value.trim()})
  });
  if(!v?.name||!v?.path){nbToast('warning','Thiếu thông tin','Tên và Path bắt buộc');return;}
  await gasPost({action:'addIspring',name:v.name,path:v.path,duration:v.dur,subject:v.subj});
  nbToast('success','Đã thêm!','');setTimeout(_dbLoadIspring,1000);
};

window.dbEditIsp=async function(id,name,path,dur){
  const {value:v}=await Swal.fire({
    title:'Chỉnh sửa iSpring',
    html:`<input id="sw-n" class="swal2-input" value="${nbEsc(name)}">
          <input id="sw-p" class="swal2-input" value="${nbEsc(path)}">
          <input id="sw-t" class="swal2-input" type="number" value="${dur}">`,
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Lưu',cancelButtonText:'Hủy',customClass:{popup:'nb-swal-popup'},
    preConfirm:()=>({name:document.getElementById('sw-n').value.trim(),path:document.getElementById('sw-p').value.trim(),dur:parseInt(document.getElementById('sw-t').value)||45})
  });
  if(!v?.name)return;
  await gasPost({action:'updateIspring',id,name:v.name,path:v.path,duration:v.dur});
  nbToast('success','Đã cập nhật!','');setTimeout(_dbLoadIspring,1000);
};
window.dbToggleIsp=async function(id,vis){ await gasPost({action:'updateIspring',id,visible:vis}); _dbLoadIspring(); };
window.dbDelIsp=async function(id,name){
  const r=await Swal.fire({title:'Xóa?',text:name,icon:'warning',showCancelButton:true,
    confirmButtonColor:'#ef4444',background:'rgba(8,14,26,.98)',color:'#f1f5f9',customClass:{popup:'nb-swal-popup'}});
  if(!r.isConfirmed)return;
  await gasPost({action:'deleteIspring',id});nbToast('success','Đã xóa','');setTimeout(_dbLoadIspring,1000);
};

window.dbCreateAdmin=async function(){
  if(!nbIsSuperAdmin()){nbToast('error','Không có quyền','Chỉ Super Admin mới tạo được admin');return;}
  const {value:v}=await Swal.fire({
    title:'Tạo tài khoản Admin',
    html:`<input id="sw-u" class="swal2-input" placeholder="Tên đăng nhập *" autofocus>
          <input id="sw-n" class="swal2-input" placeholder="Họ và tên *">
          <input id="sw-p" class="swal2-input" type="password" placeholder="Mật khẩu *">`,
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Tạo',cancelButtonText:'Hủy',customClass:{popup:'nb-swal-popup'},
    preConfirm:()=>({u:document.getElementById('sw-u').value.trim().toLowerCase(),n:document.getElementById('sw-n').value.trim(),p:document.getElementById('sw-p').value.trim()})
  });
  if(!v?.u||!v?.p){nbToast('warning','Thiếu thông tin','');return;}
  const res=await gasCall({action:'createAdmin',username:v.u,name:v.n,password:v.p});
  if(res?.status==='error'){nbToast('error','Lỗi',res.message||'');return;}
  nbToast('success','Đã tạo!','Tài khoản admin mới sẵn sàng');setTimeout(_dbLoadAdmins,1000);
};
window.dbToggleAdmin=async function(un,active){
  await gasPost({action:'toggleAdmin',username:un,active});
  nbToast('success',active?'Đã mở khóa':'Đã khóa','');setTimeout(_dbLoadAdmins,600);
};
window.dbDelAdmin=async function(un){
  const r=await Swal.fire({title:'Xóa admin?',text:`@${un}`,icon:'warning',showCancelButton:true,
    confirmButtonColor:'#ef4444',background:'rgba(8,14,26,.98)',color:'#f1f5f9',customClass:{popup:'nb-swal-popup'}});
  if(!r.isConfirmed)return;
  await gasPost({action:'deleteAdmin',username:un});nbToast('success','Đã xóa','');setTimeout(_dbLoadAdmins,600);
};

// FIX: Battle room creation — use gasCall for response
window.dbCreateBattleRoom=async function(){
  const [tests,isps]=await Promise.all([gasGet({action:'getTests'}),gasGet({action:'getIspring'})]);
  const tOpts=(Array.isArray(tests)?tests:[]).map(t=>`<option value="nebula:${t.id}">${nbEsc(t.name)} (${t.qCount||0} câu)</option>`).join('');
  const iOpts=(Array.isArray(isps)?isps:[]).filter(x=>x.visible!==false).map(t=>`<option value="ispring:${t.id}">[iSpring] ${nbEsc(t.name)}</option>`).join('');
  const {value:v}=await Swal.fire({
    title:'Tạo Phòng Thi Đấu',
    html:`<input id="sw-rn" class="swal2-input" placeholder="Tên phòng *" autofocus>
          <select id="sw-src" class="swal2-input" style="height:42px;border-radius:10px">
            <optgroup label="Hệ thống">${tOpts}</optgroup>
            <optgroup label="iSpring">${iOpts}</optgroup>
          </select>
          <input id="sw-dur" class="swal2-input" type="number" value="45" placeholder="Thời gian (phút)">
          <input id="sw-ps" class="swal2-input" type="number" value="50" placeholder="Điểm đạt (%)">
          <div style="display:flex;gap:8px;margin:6px 1rem 0">
            <input id="sw-rw" class="swal2-input" type="number" value="30" placeholder="RP thắng" style="margin:0">
            <input id="sw-rl" class="swal2-input" type="number" value="10" placeholder="RP thua" style="margin:0">
          </div>`,
    background:'rgba(8,14,26,.98)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'🏆 Tạo phòng',cancelButtonText:'Hủy',
    customClass:{popup:'nb-swal-popup'},
    preConfirm:()=>{
      const src=document.getElementById('sw-src').value.split(':');
      const rn=document.getElementById('sw-rn').value.trim();
      if(!rn){Swal.showValidationMessage('Nhập tên phòng!');return false;}
      return {name:rn,sourceType:src[0],testKey:src[1],
        dur:parseInt(document.getElementById('sw-dur').value)||45,
        ps:parseFloat(document.getElementById('sw-ps').value)||50,
        rw:parseInt(document.getElementById('sw-rw').value)||30,
        rl:parseInt(document.getElementById('sw-rl').value)||10};
    }
  });
  if(!v)return;
  const payload={action:'createBattleRoom',name:v.name,sourceType:v.sourceType,
    duration:v.dur,passScore:v.ps,rpWin:v.rw,rpLoss:v.rl,
    createdBy:nbCurrentUser()?.username||'admin'};
  if(v.sourceType==='nebula') payload.testId=v.testKey;
  else payload.ispringId=v.testKey;
  const res=await gasCall(payload);
  nbToast('success',`Đã tạo phòng!`,`Mã: ${res?.roomCode||'Đang tạo...'}`);
  setTimeout(_dbLoadBattleRooms,1200);
};

window.dbStartRoom=async function(id){
  const r=await Swal.fire({title:'Bắt đầu phòng thi?',text:'Học sinh sẽ thi ngay',icon:'question',showCancelButton:true,background:'rgba(8,14,26,.98)',color:'#f1f5f9',customClass:{popup:'nb-swal-popup'}});
  if(!r.isConfirmed)return;
  await gasPost({action:'updateBattleRoom',id,status:'active',startedAt:new Date().toLocaleString('vi-VN')});
  nbToast('success','Phòng đã bắt đầu!','');setTimeout(_dbLoadBattleRooms,800);
};
window.dbCancelRoom=async function(id){
  const r=await Swal.fire({title:'Hủy phòng?',icon:'warning',showCancelButton:true,confirmButtonColor:'#ef4444',background:'rgba(8,14,26,.98)',color:'#f1f5f9',customClass:{popup:'nb-swal-popup'}});
  if(!r.isConfirmed)return;
  await gasPost({action:'updateBattleRoom',id,status:'cancelled'});setTimeout(_dbLoadBattleRooms,800);
};

window.dbSwitchTab=async function(tab){
  document.querySelectorAll('.db-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.db-tab-pane').forEach(p=>p.classList.toggle('active',p.dataset.tab===tab));
  if(!window._dbTabLoaded)window._dbTabLoaded={};
  if(window._dbTabLoaded[tab])return; // already loaded once
  window._dbTabLoaded[tab]=true;
  if(tab==='tests')    await _dbLoadTests();
  if(tab==='ispring')  await _dbLoadIspring();
  if(tab==='results')  await _dbLoadResults();
  if(tab==='battle')   await _dbLoadBattleRooms();
  if(tab==='pending')  await _dbLoadPending();
  if(tab==='admins'&&nbIsSuperAdmin()) await _dbLoadAdmins();
};

// =================================================================
// ADD QUESTION — all types
// =================================================================
async function nbAddQuestionInit(){
  const test=nb.json('currentTest',null);
  if(!test){location.href='dashboard.html';return;}
  if(typeof renderEditor==='function')renderEditor();
  if(typeof calculatePreviewPoints==='function')calculatePreviewPoints();
  if(typeof showTypeHint==='function')showTypeHint();
  await fetchQuestionStats(test.id);
}

window.renderEditor=function(){
  const type=document.getElementById('qType')?.value||'single';
  const list=document.getElementById('ansList');if(!list)return;
  list.innerHTML='';
  const addBtn=document.getElementById('addBtn');
  switch(type){
    case'single':case'multiple':for(let i=0;i<4;i++)addAnsRow();if(addBtn)addBtn.style.display='';break;
    case'tf':
      list.innerHTML=`<div class="aq-tf-wrap">
        <label class="aq-tf-opt"><input type="radio" name="tf-ans" value="Đúng" checked><span>✓ Đúng</span></label>
        <label class="aq-tf-opt"><input type="radio" name="tf-ans" value="Sai"><span>✗ Sai</span></label>
      </div>`;if(addBtn)addBtn.style.display='none';break;
    case'matching':for(let i=0;i<3;i++)addAnsRow();if(addBtn)addBtn.style.display='';break;
    case'ordering':['Bước 1','Bước 2','Bước 3'].forEach(v=>addAnsRow(v));if(addBtn)addBtn.style.display='';break;
    case'fill':addAnsRow();addAnsRow();if(addBtn)addBtn.style.display='';break;
    case'fill_bank':addAnsRow();addAnsRow();addAnsRow();if(addBtn)addBtn.style.display='';break;
    case'numeric':list.innerHTML=`<div class="aq-num-wrap"><label>Đáp án số:</label><input type="number" id="aq-num" class="input-control" style="width:200px" oninput="buildCorrect()"></div>`;if(addBtn)addBtn.style.display='none';break;
    case'scale':list.innerHTML=`<div class="aq-scale-setup"><label>Max: <input type="number" id="aq-sc-max" value="5" min="3" max="10" class="input-control" style="width:80px" oninput="buildCorrect()"></label><label>Đáp án: <input type="number" id="aq-sc-ans" value="5" min="1" max="10" class="input-control" style="width:80px" oninput="buildCorrect()"></label></div>`;if(addBtn)addBtn.style.display='none';break;
    case'image_choice':for(let i=0;i<4;i++)addAnsRow();if(addBtn)addBtn.style.display='';break;
  }
  buildCorrect();
};

window.addAnsRow=function(preset=''){
  const type=document.getElementById('qType')?.value||'single';
  const list=document.getElementById('ansList');if(!list)return;
  const idx=list.children.length;
  const d=document.createElement('div');d.className='aq-ans-row';
  const L='ABCDEFGHIJ';
  switch(type){
    case'single':d.innerHTML=`<input type="radio" name="ans-correct" onchange="buildCorrect()"><input type="text" lang="vi" class="input-control aq-ans-in" placeholder="Phương án ${L[idx]||idx+1}" value="${nbEsc(preset)}" oninput="buildCorrect()"><button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'multiple':d.innerHTML=`<input type="checkbox" onchange="buildCorrect()"><input type="text" lang="vi" class="input-control aq-ans-in" placeholder="Phương án ${L[idx]||idx+1}" value="${nbEsc(preset)}" oninput="buildCorrect()"><button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'matching':d.innerHTML=`<input type="text" lang="vi" class="input-control" placeholder="Vế A ${idx+1}" style="flex:1" oninput="buildCorrect()"><span class="aq-arrow">↔</span><input type="text" lang="vi" class="input-control" placeholder="Vế B ${idx+1}" style="flex:1" oninput="buildCorrect()"><button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'ordering':d.innerHTML=`<span class="aq-ord-n">${idx+1}</span><input type="text" lang="vi" class="input-control aq-ans-in" placeholder="Mục ${idx+1}" value="${nbEsc(preset)}" oninput="buildCorrect()"><button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'fill':d.innerHTML=`<span class="aq-fill-lbl">Đáp án ${idx+1}:</span><input type="text" lang="vi" class="input-control aq-ans-in" placeholder="Đáp án chấp nhận..." value="${nbEsc(preset)}" oninput="buildCorrect()"><button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'fill_bank':d.innerHTML=`<span class="aq-fill-lbl">${idx===0?'✓ Đúng:':'Từ gợi ý:'}</span><input type="text" lang="vi" class="input-control aq-ans-in" placeholder="${idx===0?'Đáp án đúng':'Từ mồi nhử hoặc đáp án phụ...'}" value="${nbEsc(preset)}" oninput="buildCorrect()">${idx>0?'<input type="checkbox" class="aq-correct-check" title="Cũng là đáp án đúng" onchange="buildCorrect()" style="width:18px;height:18px;flex-shrink:0">':'<span style="font-size:.68rem;color:var(--accent);flex-shrink:0">✓</span>'}<button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'image_choice':d.innerHTML=`<input type="radio" name="ans-correct" onchange="buildCorrect()"><input type="text" lang="vi" class="input-control aq-ans-in" placeholder="Nhãn" style="flex:1" oninput="buildCorrect()"><input type="text" class="input-control" placeholder="URL ảnh" style="flex:1.5" oninput="buildCorrect()"><button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
  }
  list.appendChild(d);buildCorrect();
};

window.buildCorrect=function(){
  const type=document.getElementById('qType')?.value||'single';
  const list=document.getElementById('ansList');
  const out=document.getElementById('finalCorrect');if(!out||!list)return;
  const rows=Array.from(list.children);
  let correct='',ansObj={};
  switch(type){
    case'single':{const items=rows.map(r=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||'',isCorrect:r.querySelector('input[type=radio]')?.checked||false}));const ci=items.find(x=>x.isCorrect);correct=ci?.text||'';ansObj={items};break;}
    case'multiple':{const items=rows.map(r=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||'',isCorrect:r.querySelector('input[type=checkbox]')?.checked||false}));correct=items.filter(x=>x.isCorrect).map(x=>x.text).join('|');ansObj={items};break;}
    case'tf':{const s=list.querySelector('input[name="tf-ans"]:checked');correct=s?.value||'Đúng';ansObj={value:correct};break;}
    case'matching':{const items=rows.map(r=>{const ins=r.querySelectorAll('input[type=text]');return{left:ins[0]?.value?.trim()||'',right:ins[1]?.value?.trim()||''};});correct=items.map(p=>`${p.left}-${p.right}`).join('|');ansObj={items};break;}
    case'ordering':{const items=rows.map(r=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||''}));correct=items.map(x=>x.text).join('|');ansObj={items};break;}
    case'fill':{const acc=rows.map(r=>r.querySelector('.aq-ans-in')?.value?.trim()).filter(Boolean);correct=acc.join('|');ansObj={items:[],bank:acc};break;}
    case'fill_bank':{const all=rows.map((r,i)=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||'',correct:i===0||(r.querySelector('.aq-correct-check')?.checked||false)}));correct=all.filter(x=>x.correct).map(x=>x.text).join('|');ansObj={items:[],bank:all.map(x=>x.text).filter(Boolean)};break;}
    case'numeric':{correct=document.getElementById('aq-num')?.value?.trim()||'';ansObj={};break;}
    case'scale':{correct=document.getElementById('aq-sc-ans')?.value||'5';ansObj={max:parseInt(document.getElementById('aq-sc-max')?.value||'5')};break;}
    case'image_choice':{const items=rows.map(r=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||'',image:r.querySelectorAll('input[type=text]')[1]?.value?.trim()||'',isCorrect:r.querySelector('input[type=radio]')?.checked||false}));const ci=items.find(x=>x.isCorrect);correct=ci?.text||'';ansObj={items};break;}
  }
  out.value=correct;window._aqCorrect=correct;window._aqAnswer=ansObj;
};

window.calculatePreviewPoints=function(){
  const ts=parseFloat(document.getElementById('totalScore')?.value)||10;
  const el=document.getElementById('scorePreview');if(el)el.textContent=`(mỗi câu ≈ ${ts} điểm khi chia đều)`;
};
window.toggleScoreUI=function(){
  const m=document.getElementById('scoreMode')?.value;
  document.getElementById('boxTotalScore')?.style&&(document.getElementById('boxTotalScore').style.display=m==='equal'?'':'none');
  document.getElementById('boxPoint')?.style&&(document.getElementById('boxPoint').style.display=m==='custom'?'':'none');
};

window.saveData=async function(){
  const test=nb.json('currentTest',null);if(!test)return;
  const qText=document.getElementById('qText')?.value?.trim();
  const qType=document.getElementById('qType')?.value||'single';
  const qTime=parseInt(document.getElementById('testTime')?.value)||45;
  const sm=document.getElementById('scoreMode')?.value||'equal';
  const ts=parseFloat(document.getElementById('totalScore')?.value)||10;
  const pt=parseFloat(document.getElementById('qPoint')?.value)||1;
  const img=document.getElementById('qData')?.value||document.getElementById('qUrl')?.value||'';
  if(!qText){nbToast('warning','Thiếu nội dung','Nhập câu hỏi trước');return;}
  buildCorrect();
  const correct=window._aqCorrect||'',ansObj=window._aqAnswer||{};
  if(!correct){nbToast('warning','Chưa có đáp án','Thiết lập đáp án đúng');return;}
  const btn=document.getElementById('saveBtn');
  if(btn){btn.disabled=true;btn.textContent='Đang lưu...';}
  try{
    await gasPost({action:'saveQuestion',testId:test.id,type:qType,question:qText,image:img,
      answer:JSON.stringify(ansObj),correct,testTime:qTime,scoreMode:sm,totalScore:ts,points:pt,
      oldQuestion:window._aqEditMode&&window._aqOriginalQ?window._aqOriginalQ:''});
    nbToast('success',window._aqEditMode?'Đã cập nhật!':'Đã lưu!','Câu hỏi đã đồng bộ Cloud');
    if(!window._aqEditMode){
      document.getElementById('qText').value='';
      document.getElementById('qData').value='';document.getElementById('qUrl').value='';
      document.getElementById('qPrevBox')?.classList?.remove('has-image');
      renderEditor();fetchQuestionStats(test.id);
    }else{ nb.del('editQuestionData');setTimeout(()=>location.href='question-list.html',800); }
  }catch(e){nbToast('error','Lỗi','Không thể lưu');}
  if(btn){btn.disabled=false;btn.textContent='ĐỒNG BỘ LÊN CLOUD HỆ THỐNG';}
};

window.fetchQuestionStats=async function(testId){
  const data=await gasGet({action:'getQuestions',testId});
  const cnt=Array.isArray(data)?data.length:0;
  const ts=parseFloat(document.getElementById('totalScore')?.value)||10;
  const el=document.getElementById('scorePreview');
  if(el)el.textContent=`Hiện có ${cnt} câu → câu mới là câu ${cnt+1} (mỗi câu ≈ ${(ts/(cnt+1)).toFixed(2)} điểm)`;
};

window.fillEditData=function(d){
  document.getElementById('qType').value=d.type||'single';
  document.getElementById('qText').value=d.question||'';
  // FIX: restore time, score, scoreMode from edit data
  if(document.getElementById('testTime'))
    document.getElementById('testTime').value=d.testTime||d.testtime||45;
  if(document.getElementById('totalScore'))
    document.getElementById('totalScore').value=d.totalScore||d.totalscore||10;
  if(document.getElementById('scoreMode')&&(d.scoreMode||d.scoremode))
    document.getElementById('scoreMode').value=d.scoreMode||d.scoremode||'equal';
  if(typeof toggleScoreUI==='function')toggleScoreUI();
  if(typeof calculatePreviewPoints==='function')calculatePreviewPoints();
  if(d.image&&d.image.length>5){
    document.getElementById('qUrl').value=d.image;
    const img=document.getElementById('qPrevImg'),box=document.getElementById('qPrevBox');
    if(img&&box){img.src=d.image;box.classList.add('has-image');}
  }
  renderEditor();
  const ans=_pj(typeof d.answer==='string'?d.answer:JSON.stringify(d.answer),{});
  _aqFillEdit(d.type,ans,d.correct||d.correctAnswer||'');
};

function _aqFillEdit(type,ans,correct){
  const list=document.getElementById('ansList');if(!list)return;
  switch(type){
    case'single':case'multiple':
      list.innerHTML='';(ans.items||[]).forEach(it=>{addAnsRow(it.text||'');const last=list.lastElementChild;const inp=last?.querySelector(type==='single'?'input[type=radio]':'input[type=checkbox]');if(inp&&it.isCorrect)inp.checked=true;});buildCorrect();break;
    case'tf':{const r=list.querySelector(`input[value="${correct}"]`);if(r)r.checked=true;buildCorrect();break;}
    case'ordering':list.innerHTML='';(ans.items||[]).forEach(i=>addAnsRow(i.text||''));break;
    case'matching':list.innerHTML='';(ans.items||[]).forEach(p=>{addAnsRow(p.left||'');const last=list.lastElementChild;const ins=last?.querySelectorAll('input[type=text]');if(ins?.[1])ins[1].value=p.right||'';});buildCorrect();break;
    case'fill':case'fill_bank':list.innerHTML='';correct.split('|').filter(Boolean).forEach(v=>addAnsRow(v));if(!correct)addAnsRow();buildCorrect();break;
  }
}

// Image upload
window.handleFile=function(inp){
  const f=inp.files[0];if(!f)return;
  if(f.size>5*1024*1024){nbToast('warning','Ảnh quá lớn','Giới hạn 5MB');return;}
  const r=new FileReader();r.onload=e=>{const b=e.target.result;document.getElementById('qData').value=b;_prevImg(b);};r.readAsDataURL(f);
};
window.handleLinkInput=function(url){if(url.startsWith('http')){document.getElementById('qData').value='';_prevImg(url);}};
function _prevImg(src){const b=document.getElementById('qPrevBox'),i=document.getElementById('qPrevImg');if(b&&i){i.src=src;b.classList.add('has-image');}}
window.clearMedia=function(){document.getElementById('qData').value='';document.getElementById('qUrl').value='';document.getElementById('qPrevBox')?.classList?.remove('has-image');};

// =================================================================
// PLAYER (iSpring) — FIXED: single init guard, single result handler
// =================================================================
function _plInit(){
  if(window._plInited)return; window._plInited=true;
  const params=new URLSearchParams(location.search);
  const path=params.get('path');
  const battle=params.get('battle');
  document.getElementById('pl-name').textContent=nb.get('currentIspringName')||'iSpring';
  document.getElementById('pl-student').textContent=nbStudentName();
  // FIX: populate the loading screen name
  const loadName=document.getElementById('pl-load-name');
  if(loadName)loadName.textContent=nb.get('currentIspringName')||'';
  if(!path){document.getElementById('pl-error').style.display='flex';return;}
  const frame=document.getElementById('pl-frame');
  document.getElementById('pl-loading').style.display='flex';
  // Simulated progress bar while iframe loads
  const pgf=document.getElementById('pl-pgf');
  let _pct=0;
  const _progTimer=setInterval(()=>{
    _pct=Math.min(_pct+Math.random()*4,88);
    if(pgf)pgf.style.width=_pct+'%';
  },200);
  frame.addEventListener('load',()=>{
    clearInterval(_progTimer);
    if(pgf){pgf.style.width='100%';setTimeout(()=>{pgf.style.width='0%';pgf.style.transition='none';},600);}
    document.getElementById('pl-loading').style.display='none';
    setTimeout(()=>{
      document.getElementById('pl-exit').classList.remove('locked');
      document.getElementById('pl-submit-btn').style.display='flex';
    },3000);
  });
  frame.src=path;

  // ── Single result handler flag ─────────────────────────────────
  let _resultHandled=false;

  async function _handleIspringResult(score,status,correct,total){
    if(_resultHandled)return;
    _resultHandled=true;

    const sc=Math.min(100,Math.max(0,parseInt(score)||0));
    const st=String(status||'completed').toLowerCase();
    const cor=parseInt(correct)||0,tot=parseInt(total)||0;
    const tn='[iSpring] '+(nb.get('currentIspringName')||'Bài thi iSpring');

    nb.set('lastScore',sc);nb.set('quizMode','ispring');nb.set('quizTotalScore','100');
    nb.set('ispringStatus',st);nb.set('ispCorrect',cor);nb.set('ispTotal',tot);
    nb.set('correctCount',cor>0&&tot>0?`${cor}/${tot}`:`${sc}/100`);
    nb.set('currentTestName',tn);nb.set('ispSavedByPlayer','1');

    // Show result panel
    const rp=document.getElementById('pl-result');
    if(rp){
      rp.style.display='flex';
      const ring=document.getElementById('pl-ring-fg');
      if(ring)setTimeout(()=>{ring.style.transition='stroke-dashoffset 1.5s';ring.style.strokeDashoffset=351.9*(1-sc/100);},300);
      const _s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
      _s('pl-score-num',sc);_s('pl-r-name',nbStudentName());
      _s('pl-r-test',tn.replace(/^\[iSpring\]\s*/i,''));
      const stLabel={passed:'✓ Đạt',completed:'✓ Hoàn thành',failed:'✗ Chưa đạt',incomplete:'⚠ Chưa xong'}[st]||'Hoàn thành';
      _s('pl-r-status',stLabel);
      const statusEl=document.getElementById('pl-r-status');
      if(statusEl)statusEl.className=`pl-info-val ${['passed','completed'].includes(st)?'ok':'err'}`;
    }
    // Update sync status
    const syncEl=document.getElementById('pl-sync');
    const syncTxt=document.getElementById('pl-sync-text');
    if(syncEl)syncEl.className='saving';
    if(syncTxt)syncTxt.textContent='Đang lưu kết quả...';

    // Save to GAS once
    try{
      await gasPost({action:'submitResult',student:nbStudentName(),school:nbSchool(),
        class:nbClass(),testName:tn,score:sc,
        total:cor>0&&tot>0?`${cor}/${tot}`:`${sc}/100`,
        answers:JSON.stringify({status:st,source:'player',score:sc,correct:cor,total:tot,
          student:nbStudentName(),school:nbSchool(),class:nbClass(),
          timestamp:new Date().toISOString()})});
      if(syncTxt)syncTxt.textContent='✓ Đã lưu kết quả thành công';
      if(syncEl){syncEl.className='saved';syncEl.style.color='var(--accent)';}
    }catch(e){
      if(syncTxt)syncTxt.textContent='⚠ Lưu thất bại - kết quả cục bộ';
      if(syncEl)syncEl.style.color='var(--warning)';
    }

    if(battle){
      try{await gasPost({action:'submitBattleResult',roomId:battle,studentName:nbStudentName(),school:nbSchool(),class:nbClass(),score:sc,scorePct:sc,correct:cor,total:tot,timeSec:0});}catch(e){}
      nb.del('battleRoomId');
    }
  }

  // Listen for nebula-bridge postMessage (type='nebula_ispring_result')
  window.addEventListener('message',e=>{
    const d=e.data;
    if(!d||typeof d!=='object')return;
    if(d.type==='nebula_ispring_result'){
      _handleIspringResult(d.score,d.status,d.correct,d.total);
    }
  },{passive:true});

  // Manual submit button — show score input dialog if auto score not received
  window._plManualScore=async function(){
    if(_resultHandled){nbToast('info','Đã lưu','Kết quả đã được lưu');return;}
    // Ask user to enter the score they see in iSpring
    if(typeof Swal!=='undefined'){
      const {value,isConfirmed}=await Swal.fire({
        title:'Nộp kết quả',
        html:`<div style="font-size:.88rem;color:#94a3b8;margin-bottom:12px">Nhập điểm hiển thị trong bài thi (0–100)</div>
              <input id="swal-isp-score" class="swal2-input" type="number" min="0" max="100" placeholder="Điểm (0-100)" style="text-align:center;font-size:1.2rem;font-weight:700">
              <select id="swal-isp-status" class="swal2-input" style="height:42px">
                <option value="completed">✓ Hoàn thành</option>
                <option value="passed">✓ Đạt yêu cầu</option>
                <option value="failed">✗ Chưa đạt</option>
                <option value="incomplete">⚠ Chưa hoàn tất</option>
              </select>`,
        background:'rgba(8,14,26,.98)',color:'#f1f5f9',showCancelButton:true,
        confirmButtonText:'📤 Nộp kết quả',cancelButtonText:'Tiếp tục làm',
        customClass:{popup:'nb-swal-popup'},
        preConfirm:()=>{
          const sc=parseInt(document.getElementById('swal-isp-score').value)||0;
          const st=document.getElementById('swal-isp-status').value;
          return {sc,st};
        }
      });
      if(isConfirmed&&value){_handleIspringResult(value.sc,value.st,0,0);}
    }else{
      const sc=parseInt(prompt('Nhập điểm (0-100):')||'0')||0;
      _handleIspringResult(sc,'completed',0,0);
    }
  };
  window._plExit=()=>{document.getElementById('pl-dlg').style.display='flex';};
  window._plCloseDlg=()=>{document.getElementById('pl-dlg').style.display='none';};
  window._plForceExit=()=>location.href='select.html';
  window._plGoSel=()=>location.href='select.html';
  window._plGoResult=()=>{location.href='result.html';};
  window._plRetry=()=>location.reload();
  window._plGoHist=()=>location.href='history.html';
}

// =================================================================
// BATTLE (student page)
// =================================================================
async function nbBattleInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  nbCheckSession();
  const nameEl=document.getElementById('btlNavName');
  if(nameEl)nameEl.textContent=nbCurrentUser()?.name||nbStudentName()||'Học sinh';
  await _battleLoad();
  setInterval(_battleLoad,15000);
}

// Store rooms globally for safe lookup (avoids JSON-in-onclick escaping bugs)
window._nbBattleRooms={};

async function _battleLoad(){
  const [rooms,leaderboard]=await Promise.all([
    gasGet({action:'getBattleRooms'}),
    gasGet({action:'getLeaderboard'})
  ]);
  const allRooms=Array.isArray(rooms)?rooms:[];
  // Build room lookup map
  allRooms.forEach(r=>{window._nbBattleRooms[r.id]=r;});
  const active=allRooms.filter(r=>['waiting','active'].includes(r.status));
  const el=document.getElementById('battleRooms');
  if(el){
    if(!active.length){
      el.innerHTML='<div class="battle-empty"><div class="battle-empty-icon">⚔️</div><p>Chưa có phòng thi nào đang hoạt động</p><small>Liên hệ admin để mở phòng thi đấu</small></div>';
    }else{
      el.innerHTML=active.map(r=>`
        <div class="battle-card">
          <div class="battle-card-header">
            <span class="battle-room-code">${r.roomCode}</span>
            <span class="battle-status ${r.status}">${r.status==='active'?'🔴 ĐANG THI':'⏳ Chờ bắt đầu'}</span>
          </div>
          <div class="battle-card-name">${nbEsc(r.name||'')}</div>
          <div class="battle-card-meta">
            <span>⏱ ${r.duration}p</span>
            <span>🎯 Đạt ${r.passScore}%</span>
            <span>⭐ +${r.rpWin}/-${Math.abs(r.rpLoss||10)} RP</span>
          </div>
          <div class="battle-card-actions">
            ${r.status==='active'
              ?`<button class="battle-btn-join" onclick="nbBattleJoinStart('${r.id}')">⚔️ BẮT ĐẦU THI</button>`
              :`<button class="battle-btn-join waiting" onclick="nbBattleJoin('${r.id}')">+ Đăng ký tham gia</button>`}
          </div>
        </div>`).join('');
    }
  }

  // Leaderboard
  const lb=document.getElementById('battleLeaderboard');
  if(lb){
    const lba=Array.isArray(leaderboard)?leaderboard:[];
    if(!lba.length){
      lb.innerHTML='<div class="battle-lb-empty">Chưa có dữ liệu xếp hạng</div>';
    }else{
      const myName=nbStudentName().trim().toLowerCase();
      lb.innerHTML=lba.slice(0,20).map((p,i)=>{
        const t=NB_TIERS.find(x=>x.name===p.tier?.name)||nbGetTier(p.rp||0);
        const isMe=myName&&(p.studentName||'').trim().toLowerCase()===myName;
        return `<div class="lb-row ${i<3?'lb-top':''} ${isMe?'lb-me':''}">
          <span class="lb-rank ${['gold','silver','bronze'][i]||''}">${i+1}</span>
          <span class="lb-tier" style="color:${t.color}">${t.icon}</span>
          <span class="lb-name">${nbEsc(p.studentName||'')}${isMe?' <span class="lb-you">Bạn</span>':''}</span>
          <span class="lb-school">${nbEsc((p.school||'').slice(0,14))}</span>
          <span class="lb-rp" style="color:${t.color}">${p.rp||0} RP</span>
        </div>`;
      }).join('');

      // My stats panel
      const myStats=lba.find(p=>(p.studentName||'').trim().toLowerCase()===myName);
      const msEl=document.getElementById('battleMyStats');
      if(msEl&&myStats){
        const t=NB_TIERS.find(x=>x.name===myStats.tier?.name)||nbGetTier(myStats.rp||0);
        msEl.style.display='';
        const tierEl=document.getElementById('battleMyTier');
        if(tierEl)tierEl.innerHTML=`<span style="color:${t.color};font-size:1.4rem">${t.icon}</span> <span style="color:${t.color};font-weight:800">${t.name}</span>`;
        const infoEl=document.getElementById('battleMyInfo');
        if(infoEl)infoEl.innerHTML=`
          <div class="btl-my-row"><span>RP</span><b style="color:${t.color}">${myStats.rp||0}</b></div>
          <div class="btl-my-row"><span>Trận</span><b>${myStats.matches||0}</b></div>
          <div class="btl-my-row"><span>Thắng</span><b style="color:var(--accent)">${myStats.wins||0}</b></div>
          <div class="btl-my-row"><span>Hạng</span><b>#${myStats.rank||'?'}</b></div>`;
      }
    }
  }
}

window.nbBattleJoin=async function(roomId){
  await gasPost({action:'joinBattleRoom',roomId,studentName:nbStudentName(),school:nbSchool(),class:nbClass()});
  nbToast('success','Đã đăng ký!','Chờ admin bắt đầu phòng thi');_battleLoad();
};

window.nbBattleJoinStart=async function(roomId){
  const room=window._nbBattleRooms[roomId];
  if(!room){nbToast('error','Lỗi','Không tìm thấy phòng thi');return;}
  nb.set('battleRoomId',roomId);
  await gasPost({action:'joinBattleRoom',roomId,studentName:nbStudentName(),school:nbSchool(),class:nbClass()});
  if(room.sourceType==='ispring'&&room.ispringId){
    const isps=await gasGet({action:'getIspring'});
    const isp=(Array.isArray(isps)?isps:[]).find(x=>x.id===room.ispringId);
    if(isp){nb.set('currentIspringName',isp.name);location.href=`player.html?path=${encodeURIComponent(isp.path)}&battle=${roomId}`;}
    else nbToast('error','Lỗi','Không tìm thấy bài iSpring');
  }else if(room.testId){
    const tests=await gasGet({action:'getTests'});
    const test=(Array.isArray(tests)?tests:[]).find(x=>x.id===room.testId);
    if(test){nb.set('currentTestId',test.id);nb.set('currentTestName',test.name);nb.set('currentTestDuration',room.duration||test.duration||45);nb.setJson('currentTest',test);nb.set('quizMode','test');nb.set('quizTotalScore',test.maxScore||10);location.href='quiz.html';}
    else nbToast('error','Lỗi','Không tìm thấy bài thi');
  }else{
    nbToast('error','Lỗi','Phòng chưa cấu hình bài thi');
  }
};

// =================================================================
// BATTLE MONITOR — auto-refresh every 3s
// =================================================================
let _monPoll=null;
async function nbBattleMonitorInit(){
  if(!nbIsAdmin()){location.href='index.html';return;}
  const roomId=new URLSearchParams(location.search).get('id');
  if(!roomId){location.href='dashboard.html';return;}
  nb.set('monitorRoomId',roomId);
  await _monitorLoad();
  _monPoll=setInterval(_monitorLoad,3000);
}

async function _monitorLoad(){
  const roomId=nb.get('monitorRoomId');if(!roomId)return;
  try{
    const [room,parts,lb]=await Promise.all([
      gasGet({action:'getBattleRoom',id:roomId}),
      gasGet({action:'getBattleParticipants',roomId}),
      gasGet({action:'getBattleLeaderboard',roomId})
    ]);
    if(!room)return;
    const infoEl=document.getElementById('monitorRoomInfo');
    if(infoEl)infoEl.innerHTML=`<span class="mon-code">${room.roomCode}</span><span class="mon-name">${nbEsc(room.name||'')}</span><span class="mon-status ${room.status}">${{waiting:'⏳ Chờ',active:'🔴 Đang thi',finished:'✅ Xong'}[room.status]||room.status}</span>`;
    const pa=Array.isArray(parts)?parts:[];
    const done=pa.filter(p=>p.status==='submitted'||p.status==='timeout').length;
    const doing=pa.filter(p=>p.status==='doing').length;
    const wait=pa.filter(p=>p.status==='joined').length;
    const _st=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    _st('monTotal',pa.length);_st('monDoing',doing);_st('monDone',done);_st('monWaiting',wait);
    const prog=document.getElementById('monProgressBar');
    if(prog&&pa.length)prog.style.width=(done/pa.length*100)+'%';
    const allEl=document.getElementById('monAllParts');
    if(allEl)allEl.innerHTML=pa.map(p=>`<div class="mon-part-row st-${p.status}">
      <span class="mon-part-status-dot"></span>
      <span class="mon-part-name">${nbEsc(p.studentName||'')}</span>
      <span class="mon-part-school">${nbEsc(p.school||'')}</span>
      <span class="mon-part-st">${{joined:'⏳ Chờ',doing:'✏️ Đang làm',submitted:'✅ Nộp',timeout:'⏰ Hết giờ'}[p.status]||p.status}</span>
      <span class="mon-part-score">${p.status==='submitted'?parseFloat(p.score||0).toFixed(1):'—'}</span>
    </div>`).join('');
    const lbEl=document.getElementById('monLeaderboard');
    const lba=Array.isArray(lb)?lb:[];
    if(lbEl)lbEl.innerHTML=lba.length?lba.map((p,i)=>`<div class="mon-lb-row ${i<3?'mon-lb-top':''}">
        <span class="mon-lb-rank r${i+1}">${i+1}</span>
        <span class="mon-lb-name">${nbEsc(p.studentName||'')}</span>
        <span class="mon-lb-score" style="color:${parseFloat(p.scorePct||0)>=room.passScore?'var(--accent)':'var(--danger)'}">${parseFloat(p.score||0).toFixed(1)}</span>
        <span class="mon-lb-pct">${parseFloat(p.scorePct||0).toFixed(0)}%</span>
        <span class="mon-lb-time">${p.timeSec?Math.floor(p.timeSec/60)+'m'+String(p.timeSec%60).padStart(2,'0')+'s':'—'}</span>
      </div>`).join(''):'<div class="mon-lb-empty">Chờ học sinh nộp bài...</div>';
    const luEl=document.getElementById('monLastUpdate');
    if(luEl)luEl.textContent='Cập nhật: '+new Date().toLocaleTimeString('vi-VN');
    const actEl=document.getElementById('monRoomActions');
    if(actEl)actEl.innerHTML=`
      ${room.status==='waiting'?`<button class="dba-btn ok" onclick="monStartRoom('${roomId}')">▶ Bắt đầu</button>`:''}
      ${room.status==='active'?`<button class="dba-btn warn" onclick="monFinishRoom('${roomId}')">■ Kết thúc</button>`:''}
      <button class="dba-btn del" onclick="monCancelRoom('${roomId}')">✗ Hủy phòng</button>
      <a class="dba-btn" href="dashboard.html">← Dashboard</a>`;
  }catch(e){}
}

window.monStartRoom=async function(id){await gasPost({action:'updateBattleRoom',id,status:'active',startedAt:new Date().toLocaleString('vi-VN')});_monitorLoad();};
window.monFinishRoom=async function(id){
  const r=await Swal.fire({title:'Kết thúc phòng?',text:'Sẽ tính RP cho tất cả',icon:'question',showCancelButton:true,background:'rgba(8,14,26,.98)',color:'#f1f5f9',customClass:{popup:'nb-swal-popup'}});
  if(!r.isConfirmed)return;
  await gasPost({action:'updateBattleRoom',id,status:'finished',finishedAt:new Date().toLocaleString('vi-VN')});
  clearInterval(_monPoll);nbToast('success','Đã kết thúc!','');setTimeout(()=>location.href='dashboard.html',2000);
};
window.monCancelRoom=async function(id){
  const r=await Swal.fire({title:'Hủy phòng?',icon:'warning',showCancelButton:true,confirmButtonColor:'#ef4444',background:'rgba(8,14,26,.98)',color:'#f1f5f9',customClass:{popup:'nb-swal-popup'}});
  if(!r.isConfirmed)return;
  await gasPost({action:'updateBattleRoom',id,status:'cancelled'});clearInterval(_monPoll);location.href='dashboard.html';
};

// INDEX
function nbIdxGoTo(url){document.getElementById('mainBox')?.classList?.add('idx-fade-out');setTimeout(()=>location.href=url,350);}
window.nbIdxGoTo=nbIdxGoTo;

// =================================================================
// AUTO INIT ROUTER
// =================================================================
document.addEventListener('DOMContentLoaded',function(){
  const pg=location.pathname.split('/').pop()||'index.html';
  // Always check session on protected pages
  if(!pg.includes('index')&&!pg.includes('login')){nbCheckSession();}
  if(pg.includes('login')     &&!window._lgnInit)     {window._lgnInit=1;  if(typeof nbLgnInit==='function')nbLgnInit();}
  if(pg.includes('name')      &&!window._nameInitDone){window._nameInitDone=1;if(typeof nbNameInit==='function')nbNameInit();}
  if(pg.includes('select')    &&!window._selInitDone) {window._selInitDone=1;if(typeof nbSelectInit==='function')nbSelectInit();}
  if(pg.includes('quiz')      &&!window._quizInitDone){window._quizInitDone=1;if(typeof nbQuizInit==='function')nbQuizInit();}
  if(pg.includes('result')    &&!window._resInitDone) {window._resInitDone=1;if(typeof nbResultInit==='function')nbResultInit();}
  if(pg.includes('history')   &&!window._histInitDone){window._histInitDone=1;if(typeof nbHistoryInit==='function')nbHistoryInit();}
  if(pg.includes('dashboard') &&!window._dashInitDone){window._dashInitDone=1;if(typeof nbDashboardInit==='function')nbDashboardInit();}
  if(pg.includes('add-question')&&typeof nbAddQuestionInit==='function')nbAddQuestionInit();
  if(pg.includes('battle-monitor')&&!window._monInitDone){window._monInitDone=1;if(typeof nbBattleMonitorInit==='function')nbBattleMonitorInit();}
  if(pg.includes('battle')&&!pg.includes('monitor')&&!window._battleInitDone){window._battleInitDone=1;if(typeof nbBattleInit==='function')nbBattleInit();}
  // Player: init from player.html's own DOMContentLoaded, not here
});
