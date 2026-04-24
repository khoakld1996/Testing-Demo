/* ================================================================
 * NEBULA QUIZ v3.0 — script.js  (Google Apps Script Edition)
 * ── ĐỔI SCRIPT_URL trước khi dùng! ──
 * ================================================================ */

// ── CONFIG ────────────────────────────────────────────────────
window.SCRIPT_URL = window.SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzHsfO3xwnX1ezc4vqqu4-8T0lTsjrKcoSirUVCm4Cfjqb2yw6fWjmE1jfgrrXiaPjJ/exec';
window.API        = window.SCRIPT_URL;
window.API_URL    = window.SCRIPT_URL;

// ── RANK TIERS (mirror GAS) ───────────────────────────────────
const NB_TIERS = [
  { name:"Sắt",      icon:"⚙️",  color:"#a8a29e", minRp:0,    bg:"#44403c" },
  { name:"Đồng",     icon:"🥉",  color:"#cd7f32", minRp:100,  bg:"#451a03" },
  { name:"Bạc",      icon:"🥈",  color:"#cbd5e1", minRp:300,  bg:"#1e293b" },
  { name:"Vàng",     icon:"🥇",  color:"#fbbf24", minRp:600,  bg:"#431407" },
  { name:"Bạch Kim", icon:"💠",  color:"#38bdf8", minRp:1000, bg:"#082f49" },
  { name:"Kim Cương",icon:"💎",  color:"#818cf8", minRp:1500, bg:"#1e1b4b" },
  { name:"Tinh Anh", icon:"🔱",  color:"#e879f9", minRp:2200, bg:"#4a044e" },
  { name:"Thách Đấu",icon:"🏆",  color:"#fde047", minRp:3000, bg:"#713f12" }
];
function nbGetTier(rp){
  let t=NB_TIERS[0];
  for(const x of NB_TIERS){ if(rp>=x.minRp) t=x; }
  return t;
}

// ── STORAGE HELPERS ───────────────────────────────────────────
const nb = {
  get:     k     => localStorage.getItem(k),
  set:     (k,v) => localStorage.setItem(k, String(v)),
  del:     k     => localStorage.removeItem(k),
  json:    (k,d) => { try{const v=JSON.parse(localStorage.getItem(k));return v??d;}catch{return d??null;} },
  setJson: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
};
window.nb = nb;

// ── HTTP HELPERS ──────────────────────────────────────────────
async function gasGet(params={}) {
  const url = window.SCRIPT_URL + '?' + new URLSearchParams(params).toString();
  const r   = await fetch(url);
  return r.json();
}
async function gasPost(data={}) {
  const r = await fetch(window.SCRIPT_URL, {
    method:'POST', mode:'no-cors',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify(data)
  });
  // no-cors returns opaque — try GET fallback
  return null;
}
async function gasPostJson(data={}) {
  // Use GET with params for small payloads (GAS limitation)
  const url = window.SCRIPT_URL + '?' + new URLSearchParams({
    action: data.action,
    _d: encodeURIComponent(JSON.stringify(data))
  }).toString();
  try {
    const r = await fetch(url);
    return r.json();
  } catch {
    // Fallback: plain POST
    await fetch(window.SCRIPT_URL,{
      method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(data)
    });
    return {status:'ok'};
  }
}

// ── AUTH ──────────────────────────────────────────────────────
function nbCurrentUser()  { return nb.json('currentUser',null); }
function nbIsLoggedIn()   { return !!nbCurrentUser(); }
function nbIsAdmin()      { const u=nbCurrentUser(); return u&&(u.role==='admin'||u.role==='super_admin'); }
function nbIsSuperAdmin() { const u=nbCurrentUser(); return u&&u.role==='super_admin'; }
function nbStudentName()  { return nb.get('studentName')||nbCurrentUser()?.name||''; }
function nbSchool()       { return (nb.get('schoolName')||'').replace(/^'+/,''); }
function nbClass()        { return (nb.get('className')||'').replace(/^'+/,''); }
function nbEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
window.nbEsc = nbEsc;
window.sanitizeDur = d => { const n=parseInt(d)||0; return (n>0&&n<1440)?n:0; };

function nbLogout(){localStorage.clear();location.href='index.html';}
window.nbLogout = nbLogout;

// ── ALERT ─────────────────────────────────────────────────────
async function nbAlert(type,title,text,timer=2200){
  if(typeof Swal!=='undefined'){
    return Swal.fire({icon:type,title,text,timer,showConfirmButton:false,
      background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
  }else{ alert(`[${type}] ${title}: ${text}`); }
}
window.nbAlert=nbAlert;

// =============================================================
// PAGE: LOGIN
// =============================================================
async function nbLgnInit(){
  const role = new URLSearchParams(location.search).get('role')||'student';
  nb.set('loginRole',role);
  if(role==='admin'){
    document.getElementById('regToggleBtn')?.classList?.add('hidden');
    const ht=document.getElementById('headerText');
    if(ht) ht.textContent='QUẢN TRỊ VIÊN';
  }else{
    document.getElementById('regToggleBtn')?.classList?.remove('hidden');
  }
  ['user','pass'].forEach(id=>{
    document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')nbLgnHandle('login');});
  });
  document.getElementById('regPass')?.addEventListener('input',function(){nbLgnPwStrength(this.value);});
}

async function nbLgnHandle(action){
  if(action==='login'){
    const user=document.getElementById('user')?.value?.trim()?.toLowerCase();
    const pass=document.getElementById('pass')?.value?.trim();
    if(!user||!pass){nbAlert('warning','Thiếu thông tin','Nhập tài khoản và mật khẩu');return;}
    const btn=document.getElementById('btnLogin');
    if(btn){btn.disabled=true;btn.textContent='Đang xác thực...';}
    let res;
    try{ res=await gasGet({action:'login',user,pass}); }catch(e){ res={status:'error',message:'Lỗi kết nối'}; }
    if(btn){btn.disabled=false;btn.innerHTML='Đăng nhập <svg viewBox="0 0 24 24"><path d="M10 17v-3H3v-4h7V7l5 5-5 5zm4-15c1.1 0 2 .9 2 2v3h-2V4H5v16h9v-3h2v3c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h9z"/></svg>';}
    if(res?.status==='pending'){nbAlert('info','Chờ duyệt','Tài khoản đang chờ admin xét duyệt');return;}
    if(res?.status==='locked') {nbAlert('error','Bị khóa','Tài khoản đã bị khóa, liên hệ admin');return;}
    if(res?.status!=='success'){nbAlert('error','Thất bại',res?.message||'Sai tài khoản hoặc mật khẩu');return;}
    const role=nb.get('loginRole')||'student';
    const isAdmin=res.role==='admin'||res.role==='super_admin';
    if(role==='admin'&&!isAdmin){nbAlert('error','Không có quyền','Tài khoản này không phải admin');return;}
    nb.setJson('currentUser',{username:res.username||user,name:res.name||'',school:res.school||'',class:res.class||'',role:res.role||'student'});
    nb.set('studentName',res.name||'');
    nb.set('schoolName', res.school||'');
    nb.set('className',  res.class||'');
    location.href = isAdmin ? 'dashboard.html' : 'name.html';
  }else if(action==='register'){
    const name=document.getElementById('regFullName')?.value?.trim();
    const cls =document.getElementById('regClass')?.value?.trim();
    const sch =document.getElementById('regSchool')?.value?.trim();
    const user=document.getElementById('regUser')?.value?.trim()?.toLowerCase();
    const pass=document.getElementById('regPass')?.value?.trim();
    if(!name||!user||!pass||!sch){nbAlert('warning','Thiếu thông tin','Điền đầy đủ thông tin');return;}
    if(pass.length<6){nbAlert('warning','Mật khẩu yếu','Mật khẩu tối thiểu 6 ký tự');return;}
    const btn=document.getElementById('btnReg');
    if(btn){btn.disabled=true;btn.textContent='Đang gửi...';}
    try{await gasPostJson({action:'register',name,class:cls,school:sch,user,pass});}catch(e){}
    if(btn){btn.disabled=false;btn.textContent='Gửi yêu cầu';}
    await nbAlert('success','Đã gửi!','Admin sẽ xét duyệt tài khoản sớm');
    nbLgnToggleForm(false);
  }
}

function nbLgnToggleForm(showReg){
  document.getElementById('loginForm')?.classList?.toggle('hidden',showReg);
  document.getElementById('registerForm')?.classList?.toggle('hidden',!showReg);
  const ht=document.getElementById('headerText');
  if(ht) ht.textContent=showReg?'ĐĂNG KÝ':'ĐĂNG NHẬP';
}
function nbLgnTogglePw(id,btn){
  const el=document.getElementById(id);if(!el)return;
  const show=el.type==='password'; el.type=show?'text':'password';
  btn.innerHTML=show?'<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>':'<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
}
function nbLgnPwStrength(pw){
  const bar=document.getElementById('regPwBar'),hint=document.getElementById('regPwHint');
  if(!bar||!hint)return;
  let s=0;if(pw.length>=8)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^a-zA-Z0-9]/.test(pw))s++;
  const lv=[{l:'Rất yếu',c:'#ef4444',w:'20%'},{l:'Yếu',c:'#f97316',w:'40%'},{l:'TB',c:'#eab308',w:'60%'},{l:'Mạnh',c:'#22c55e',w:'80%'},{l:'Rất mạnh',c:'#10b981',w:'100%'}];
  const lev=lv[s]||lv[0];
  bar.style.cssText=`width:${lev.w};background:${lev.c};height:3px;border-radius:2px;transition:.3s`;
  hint.style.color=lev.c; hint.textContent=pw?lev.l:'';
}

// =============================================================
// PAGE: NAME
// =============================================================
function nbNameInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  const u=nbCurrentUser();
  const f=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||'';};
  f('nameInput',  u.name  ||nb.get('studentName')||'');
  f('schoolInput',u.school||nbSchool()||'');
  f('classInput', u.class ||nbClass()||'');
}
function nbNameSubmit(){
  const name=document.getElementById('nameInput')?.value?.trim();
  const school=document.getElementById('schoolInput')?.value?.trim();
  const cls=document.getElementById('classInput')?.value?.trim();
  if(!name){nbAlert('warning','Thiếu tên','Vui lòng nhập họ và tên');return;}
  nb.set('studentName',name);
  nb.set('schoolName', school||'');
  nb.set('className',  cls||'');
  const u=nbCurrentUser();
  if(u) nb.setJson('currentUser',{...u,name,school,class:cls});
  location.href='select.html';
}

// =============================================================
// PAGE: SELECT
// =============================================================
let _selTests=[],_selIspring=[];
async function nbSelectInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  const u=nbCurrentUser();
  const f=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v||'';};
  f('selNavName', u.name||nbStudentName());
  f('selNavClass',u.class||nbClass());
  f('selWelcome', `Chào ${u.name||'bạn'}! Chọn bài thi để bắt đầu 🚀`);
  const [tr,ir]=await Promise.all([gasGet({action:'getTests'}),gasGet({action:'getIspring'})]);
  _selTests  = Array.isArray(tr)?tr:[];
  _selIspring= Array.isArray(ir)?ir.filter(x=>x.visible!==false):[];
  _nbRenderAll();
}
window._nbRenderAll=function(){
  const q=(document.getElementById('selSearch')?.value||'').toLowerCase();
  const f=x=>!q||String(x.name||'').toLowerCase().includes(q)||(x.desc||'').toLowerCase().includes(q);
  const t=_selTests.filter(f), isp=_selIspring.filter(f);
  const el=id=>document.getElementById(id);
  const setCnt=(id,n,u)=>{const e=el(id);if(e)e.textContent=`${n} ${u}`;};
  setCnt('selSysCount',t.length,'đề');
  setCnt('selIspCount',isp.length,'bài');
  const tEl=el('selTestList');
  if(tEl){
    if(!t.length) tEl.innerHTML='<div class="sel-empty">Chưa có bài thi</div>';
    else tEl.innerHTML=t.map(x=>`
      <div class="sel-test-item" onclick="_nbConfirmLaunch('${nbEsc(JSON.stringify(x))}')">
        <div class="sel-test-main">
          <div class="sel-test-name">${nbEsc(x.name)}</div>
          ${x.desc?`<div class="sel-test-desc">${nbEsc(x.desc)}</div>`:''}
          <div class="sel-test-meta">
            <span>⏱ ${x.duration||45}p</span>
            <span>❓ ${x.qCount||0} câu</span>
            <span>📊 ${x.maxScore||10} điểm</span>
          </div>
        </div>
        <svg class="sel-chevron" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </div>`).join('');
  }
  const iEl=el('selIspringList');
  if(iEl){
    if(!isp.length) iEl.innerHTML='<div class="sel-empty">Chưa có bài iSpring</div>';
    else iEl.innerHTML=isp.map(x=>`
      <div class="sel-test-item sel-isp-item" onclick="_nbLaunchIspring('${nbEsc(JSON.stringify(x))}')">
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

window._nbConfirmLaunch=window._nbConfirmLaunch||function(tj){
  const t=JSON.parse(tj);
  if(!t.qCount){nbAlert('info','Đề trống','Đề thi chưa có câu hỏi');return;}
  if(typeof Swal==='undefined'){_startQuiz(t,'train');return;}
  Swal.fire({
    title:'Bắt đầu bài thi?',
    html:`<div class="swal-launch-body">
      <div class="swal-launch-row"><span>📝 <b class="swal-highlight">${nbEsc(t.name)}</b></span></div>
      <div class="swal-launch-row"><span>⏳ ${t.duration}p · ❓ ${t.qCount} câu · 📊 ${t.maxScore} điểm</span></div>
      <div class="swal-mode-wrap">
        <label class="swal-mode-label">Chế độ làm bài:</label>
        <select id="swal-mode-select" class="swal-mode-sel">
          <option value="train" selected>🎓 LUYỆN TẬP — Xem đáp án ngay</option>
          <option value="test">⏱️ KIỂM TRA — Tính giờ, chấm cuối bài</option>
        </select>
      </div></div>`,
    icon:'question',showCancelButton:true,
    confirmButtonText:'BẮT ĐẦU',cancelButtonText:'ĐỂ SAU',
    background:'rgba(10,15,30,0.97)',color:'#f1f5f9',
    preConfirm:()=>document.getElementById('swal-mode-select').value
  }).then(r=>{if(r.isConfirmed)_startQuiz(t,r.value||'train');});
};
function _startQuiz(t,mode){
  nb.set('currentTestId',t.id);nb.set('currentTestName',t.name);
  nb.set('currentTestDuration',t.duration||45);nb.setJson('currentTest',t);
  nb.set('quizMode',mode);location.href='quiz.html';
}
window._nbSelectLogout=function(){
  if(typeof Swal!=='undefined')
    Swal.fire({title:'Đăng xuất?',icon:'question',showCancelButton:true,confirmButtonText:'Đăng xuất',cancelButtonText:'Hủy',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'})
      .then(r=>{if(r.isConfirmed)nbLogout();});
  else nbLogout();
};

// =============================================================
// QUIZ ENGINE
// =============================================================
let _qzQ=[],_qzA={},_qzIdx=0,_qzTimer=null,_qzStart=null,_qzMode='train',_qzDone=false;

async function nbQuizInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  const tid=nb.get('currentTestId'),tn=nb.get('currentTestName');
  const dur=parseInt(nb.get('currentTestDuration'))||45;
  _qzMode=nb.get('quizMode')||'train';
  if(!tid){location.href='select.html';return;}
  document.getElementById('qzTitle').textContent=tn||'Bài thi';
  document.getElementById('studentInfo').textContent=nbStudentName()+(nbClass()?' · '+nbClass():'');
  const badge=document.getElementById('qzModeBadge');
  if(badge) badge.innerHTML=_qzMode==='train'
    ?'<span class="qz-badge-train">🎓 LUYỆN TẬP</span>'
    :'<span class="qz-badge-test">⏱ KIỂM TRA</span>';

  let qs=[];
  try{ qs=await gasGet({action:'getQuestions',testId:tid}); }catch(e){}
  if(!Array.isArray(qs)||!qs.length){
    nbAlert('error','Không có câu hỏi','');
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

function _pj(s,d){try{return JSON.parse(typeof s==='string'?s:JSON.stringify(s))||d;}catch{return d;}}
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
    html:`<div style="font-size:.9rem;color:rgba(255,255,255,.8)">
      ✅ Đã làm: <b style="color:var(--accent)">${done}/${_qzQ.length}</b>
      ${skip>0?`<br>⚠ Chưa làm: <b style="color:var(--warning)">${skip} câu</b>`:''}
    </div>`,
    icon:'question',showCancelButton:true,confirmButtonText:'NỘP BÀI',cancelButtonText:'LÀM TIẾP',
    background:'rgba(10,15,30,0.97)',color:'#f1f5f9'
  }).then(r=>{if(r.isConfirmed)qzSubmit(false);});
};

async function qzSubmit(timeout=false){
  if(_qzDone)return;_qzDone=true;clearInterval(_qzTimer);
  const ts=parseFloat(_qzQ[0]?.totalScore)||10;
  let correct=0,earned=0;
  _qzQ.forEach((q,i)=>{
    const pts=parseFloat(q.points)||(ts/_qzQ.length);
    if(_qzCheck(q,_qzA[i])){correct++;earned+=pts;}
  });
  earned=Math.round(earned*100)/100;
  const timeSec=Math.floor((Date.now()-_qzStart)/1000);
  nb.set('lastScore',earned);nb.set('quizTotalScore',ts);
  nb.set('correctCount',`${correct}/${_qzQ.length}`);
  nb.setJson('quizAnswers',_qzA);nb.setJson('quizQuestions',_qzQ);

  if(_qzMode==='test'){
    const tn=nb.get('currentTestName')||'Bài thi';
    try{
      await fetch(window.SCRIPT_URL,{method:'POST',mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'submitResult',student:nbStudentName(),school:nbSchool(),
          class:nbClass(),testName:tn,score:earned,total:`${correct}/${_qzQ.length}`,
          answers:JSON.stringify({answers:_qzA,timeSec,timeout})})});
    }catch(e){}
  }
  // Battle mode
  const brId=nb.get('battleRoomId');
  if(brId){
    try{
      await fetch(window.SCRIPT_URL,{method:'POST',mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'submitBattleResult',roomId:brId,
          studentName:nbStudentName(),school:nbSchool(),class:nbClass(),
          score:earned,scorePct:(earned/ts)*100,correct,total:_qzQ.length,timeSec,timeout})});
    }catch(e){}
    nb.del('battleRoomId');
  }
  location.href='result.html';
}

function _qzCheck(q,ua){
  if(ua===null||ua===undefined||ua==='')return false;
  const cor=q.correct||q.correctAnswer||'';
  switch(q.type){
    case'single':case'tf':case'numeric':case'scale':
      return String(ua).trim().toLowerCase()===String(cor).trim().toLowerCase();
    case'multiple':{
      const ca=cor.split('|').map(s=>s.trim().toLowerCase()).sort();
      const ual=(Array.isArray(ua)?ua:[ua]).map(s=>String(s).trim().toLowerCase()).sort();
      return JSON.stringify(ca)===JSON.stringify(ual);
    }
    case'fill':case'fill_bank':
      return cor.split('|').map(s=>s.trim().toLowerCase()).includes(String(ua).trim().toLowerCase());
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
    default:return String(ua).trim().toLowerCase()===String(cor).trim().toLowerCase();
  }
}

function _qzRenderQ(idx){
  const q=_qzQ[idx];if(!q)return;
  const ua=_qzA[idx];
  const qe=document.getElementById('qzQuestion');
  if(qe)qe.innerHTML=nbEsc(q.question).replace(/\n/g,'<br>');
  document.getElementById('qzCounter').textContent=`Câu ${idx+1} / ${_qzQ.length}`;
  const iw=document.getElementById('qzImageWrap'),ii=document.getElementById('qzImage');
  if(iw&&ii){if(q.image&&q.image.length>10){ii.src=q.image;iw.style.display='';}else iw.style.display='none';}
  const ae=document.getElementById('qzAnswers');
  const ans=_pj(typeof q.answer==='string'?q.answer:JSON.stringify(q.answer),{});
  if(ae) ae.innerHTML=_qzRenderA(q,ans,ua,idx);
  const fb=document.getElementById('qzFeedback');
  if(fb){
    if(_qzMode==='train'&&ua!==undefined&&ua!==null&&ua!==''){
      const ok=_qzCheck(q,ua);
      fb.style.display='';fb.className=`qz-feedback ${ok?'qz-fb-ok':'qz-fb-err'}`;
      fb.innerHTML=ok
        ?'<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> <b>Chính xác!</b>'
        :`<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Sai. Đáp án: <b>${nbEsc((q.correct||'').replace(/\|/g,' | '))}</b>`;
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
    case'single':{
      return items.map(it=>{
        const v=it.text||'',s=String(ua)===v;
        return `<label class="qz-opt ${s?'qz-opt-sel':''}" onclick="qzPickSingle(${idx},'${nbEsc(v)}')">
          <span class="qz-radio ${s?'checked':''}"></span><span>${nbEsc(it.text||v)}</span></label>`;
      }).join('');
    }
    case'multiple':{
      const sa=Array.isArray(ua)?ua:[];
      return items.map(it=>{
        const v=it.text||'',s=sa.includes(v);
        return `<label class="qz-opt ${s?'qz-opt-sel':''}" onclick="qzPickMultiple(${idx},'${nbEsc(v)}')">
          <span class="qz-checkbox ${s?'checked':''}"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span><span>${nbEsc(it.text||v)}</span></label>`;
      }).join('');
    }
    case'tf':
      return['Đúng','Sai'].map(v=>{
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
          <span>${nbEsc(t)}</span></div>`).join('')}
      </div>`;
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
        </select>`).join('')}</div>
      </div>`;
    }
    case'fill':{
      return `<div class="qz-fill-wrap">
        <input type="text" class="qz-fill-input" placeholder="Nhập đáp án..."
          value="${nbEsc(String(ua||''))}"
          oninput="qzPickFill(${idx},this.value)"
          onkeydown="if(event.key==='Enter')qzHandleNext()">
        <div class="qz-fill-hint">💡 Nhấn Enter để tiếp tục</div></div>`;
    }
    case'fill_bank':{
      const bank=ans.bank||(q.correct||'').split('|').filter(Boolean);
      const shuffled=[...bank].sort(()=>Math.random()-.5);
      const sel=String(ua||'');
      return `<div class="qz-fillbank-wrap">
        <div class="qz-fillbank-slot ${sel?'filled':''}">
          ${sel?`<span class="qz-chip">${nbEsc(sel)}<button class="qz-chip-x" onclick="qzPickFill(${idx},'')">×</button></span>`:'<span class="qz-slot-placeholder">Chọn từ bên dưới ↓</span>'}
        </div>
        <div class="qz-word-bank">
          ${shuffled.map(w=>`<button class="qz-word-btn ${w===sel?'qz-word-selected':''}" onclick="qzPickFill(${idx},'${nbEsc(w)}')">${nbEsc(w)}</button>`).join('')}
        </div></div>`;
    }
    case'numeric':
      return `<div class="qz-fill-wrap">
        <input type="number" class="qz-fill-input" placeholder="Nhập số..."
          value="${nbEsc(String(ua||''))}"
          oninput="qzPickFill(${idx},this.value)"></div>`;
    case'scale':{
      const max=parseInt(ans.max)||5;
      const sv=parseInt(ua)||0;
      return `<div class="qz-scale">
        ${Array.from({length:max},(_,i)=>i+1).map(v=>`
          <button class="qz-scale-btn ${v===sv?'qz-scale-sel':''}" onclick="qzPickSingle(${idx},'${v}')">${v}</button>`).join('')}
        <div class="qz-scale-labels"><span>Rất thấp</span><span>Rất cao</span></div></div>`;
    }
    case'image_choice':
      return `<div class="qz-img-choices">
        ${items.map(it=>{
          const v=it.text||'',s=String(ua)===v;
          return `<div class="qz-img-opt ${s?'qz-img-sel':''}" onclick="qzPickSingle(${idx},'${nbEsc(v)}')">
            ${it.image?`<img src="${nbEsc(it.image)}" class="qz-img-opt-img" alt="">`:
              `<div class="qz-img-placeholder">${nbEsc(v.charAt(0).toUpperCase())}</div>`}
            <span>${nbEsc(it.text||v)}</span></div>`;
        }).join('')}</div>`;
    default:return '<div class="qz-type-err">Dạng câu hỏi không được hỗ trợ</div>';
  }
}

window.qzPickSingle=(idx,v)=>{ _qzA[idx]=v; _qzRenderQ(idx); _qzNav(); };
window.qzPickMultiple=(idx,v)=>{
  let a=Array.isArray(_qzA[idx])?[..._qzA[idx]]:[];
  const i=a.indexOf(v);if(i===-1)a.push(v);else a.splice(i,1);
  _qzA[idx]=a; _qzRenderQ(idx); _qzNav();
};
window.qzPickFill=(idx,v)=>{ _qzA[idx]=v; if(_qzMode==='train'&&v) setTimeout(()=>_qzRenderQ(idx),600); _qzNav(); };
window.qzPickMatch=(idx,pi,v)=>{
  const q=_qzQ[idx];const items=(_pj(typeof q.answer==='string'?q.answer:JSON.stringify(q.answer),{})).items||[];
  let a=Array.isArray(_qzA[idx])?[..._qzA[idx]]:Array(items.length).fill('');
  while(a.length<items.length)a.push('');
  a[pi]=v;_qzA[idx]=a;_qzNav();
};
let _dragV=null,_dragI=null;
window.qzDragStart=(e,idx)=>{ _dragV=e.target.closest('[data-val]')?.dataset.val; _dragI=idx; };
window.qzDropOrder=(e,idx)=>{
  const t=e.target.closest('[data-val]');if(!t||!_dragV||_dragI!==idx)return;
  const tv=t.dataset.val;
  let a=Array.isArray(_qzA[idx])?[..._qzA[idx]]:_qzQ[idx].answer?.items?.map(x=>x.text)||[];
  const fi=a.indexOf(_dragV),ti=a.indexOf(tv);
  if(fi<0||ti<0)return;a.splice(fi,1);a.splice(ti,0,_dragV);
  _qzA[idx]=a;_qzRenderQ(idx);
};

function _qzNav(){
  const dots=document.getElementById('qzDots');
  if(dots) dots.innerHTML=_qzQ.map((_,i)=>{
    const a=_qzA[i];const d=a!==undefined&&a!==null&&a!==''&&!(Array.isArray(a)&&!a.length);
    return `<span class="qz-dot ${i===_qzIdx?'active':''} ${d?'done':''}" onclick="qzChangeTo(${i})" title="Câu ${i+1}"></span>`;
  }).join('');
  const grid=document.getElementById('qzGrid');
  if(grid) grid.innerHTML=_qzQ.map((_,i)=>{
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

// =============================================================
// PAGE: RESULT
// =============================================================
async function nbResultInit(){
  const mode=nb.get('quizMode')||'test';
  const isIsp=mode==='ispring';
  const ts=parseFloat(nb.get('quizTotalScore'))||(isIsp?100:10);
  const sc=parseFloat(nb.get('lastScore'))||0;
  const correct=nb.get('correctCount')||'0/0';
  const pct=Math.min(100,(sc/ts)*100);

  // Score ring
  const numEl=document.getElementById('resScoreVal');
  if(numEl){
    let cur=0;const step=sc/40;
    const iv=setInterval(()=>{
      cur=Math.min(cur+step,sc);
      numEl.textContent=Number.isInteger(ts)&&Number.isInteger(sc)?Math.round(cur):cur.toFixed(1);
      if(cur>=sc)clearInterval(iv);
    },30);
  }

  // Animate ring (result.html uses SVG ring)
  const ring=document.getElementById('res-ring-arc');
  if(ring){
    const r=56,circ=2*Math.PI*r,fill=circ*(pct/100);
    setTimeout(()=>{ring.style.cssText=`stroke-dasharray:${fill} ${circ};stroke-dashoffset:0;transition:stroke-dasharray 1.5s ease;stroke:${pct>=85?'#00e676':pct>=70?'#4facfe':pct>=50?'#f97316':'#ef4444'}`;},300);
  }

  const rSet=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  rSet('resScoreLbl',`/ ${Number.isInteger(ts)?ts:ts.toFixed(1)} điểm`);
  rSet('resName',    nbStudentName());
  rSet('resSchool',  nbSchool()+(nbClass()?' · '+nbClass():''));
  rSet('resTestName',(nb.get('currentTestName')||'').replace(/^\[iSpring\]\s*/i,''));

  // Trophy
  const tr=document.getElementById('resTrophy');
  if(tr)tr.textContent=pct>=85?'🏆':pct>=70?'🥈':pct>=50?'🥉':'📝';

  if(!isIsp){
    rSet('resCorrect',correct);
    _drawResultChart(sc,ts,correct);
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
  }

  // Mode badge
  const mb=document.getElementById('resModeBadge');
  if(mb){
    if(isIsp)        mb.innerHTML='<span class="res-mode-isp">🌠 iSpring</span>';
    else if(mode==='train') mb.innerHTML='<span class="res-mode-train">🎓 LUYỆN TẬP</span>';
    else             mb.innerHTML='<span class="res-mode-test">⏱ KIỂM TRA</span>';
  }
}

function _drawResultChart(score,total,correctStr){
  const el=document.getElementById('resChartArea');if(!el)return;
  const pct=Math.min(100,total>0?(score/total)*100:0);
  const [cor,tot]=(correctStr||'0/0').split('/').map(Number);
  const wrong=tot-(cor||0);
  const skip=0;
  el.innerHTML=`
    <div class="res-chart-title">Phân tích kết quả</div>
    <div class="res-chart-donut-wrap">
      <svg viewBox="0 0 120 120" class="res-chart-donut">
        ${_donutArc(cor,tot,0,'var(--accent)')}
        ${_donutArc(wrong,tot,cor/tot,'var(--danger)')}
        ${(tot===0||cor+wrong<tot)?_donutArc(tot-cor-wrong,tot,(cor+wrong)/tot,'rgba(255,255,255,.1)'):''}
        <text x="60" y="55" class="res-donut-num">${Math.round(pct)}</text>
        <text x="60" y="70" class="res-donut-lbl">%</text>
      </svg>
      <div class="res-chart-legend">
        <div class="res-legend-item"><span class="res-legend-dot" style="background:var(--accent)"></span> Đúng: <b>${cor||0}</b></div>
        <div class="res-legend-item"><span class="res-legend-dot" style="background:var(--danger)"></span> Sai: <b>${wrong||0}</b></div>
        <div class="res-legend-item"><span class="res-legend-dot" style="background:rgba(255,255,255,.3)"></span> Tổng: <b>${tot||0}</b></div>
      </div>
    </div>
    <div class="res-score-bar-wrap">
      <div class="res-score-bar-label">Điểm số</div>
      <div class="res-score-bar-track">
        <div class="res-score-bar-fill" style="width:${pct}%;background:${pct>=50?'var(--accent)':'var(--danger)'}"></div>
        <span class="res-score-bar-val">${score}/${total}</span>
      </div>
    </div>`;
}
function _donutArc(part,total,startFraction,color){
  if(!total||!part)return'';
  const r=45,cx=60,cy=60,circ=2*Math.PI*r;
  const startAngle=startFraction*2*Math.PI-Math.PI/2;
  const endAngle=startAngle+(part/total)*2*Math.PI;
  const x1=cx+r*Math.cos(startAngle),y1=cy+r*Math.sin(startAngle);
  const x2=cx+r*Math.cos(endAngle),y2=cy+r*Math.sin(endAngle);
  const large=part/total>.5?1:0;
  return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" opacity=".85"/>`;
}

window.nbOpenReview=function(){
  const modal=document.getElementById('resModal');if(!modal)return;
  modal.style.display='flex';
  const qs=nb.json('quizQuestions',[]);const ans=nb.json('quizAnswers',{});
  if(!qs.length){document.getElementById('resQList').innerHTML='<div class="res-empty">Không có dữ liệu</div>';return;}
  let ok=0,err=0,skip=0;
  const html=qs.map((q,i)=>{
    const ua=ans[i];
    const empty=ua===undefined||ua===null||ua===''||(Array.isArray(ua)&&!ua.length);
    const isOk=!empty&&_qzCheck(q,ua);
    if(empty)skip++;else if(isOk)ok++;else err++;
    const cd=(q.correct||q.correctAnswer||'').replace(/\|/g,' | ');
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
window.nbCloseReview=function(){
  const m=document.getElementById('resModal');if(m)m.style.display='none';
};

// =============================================================
// PAGE: HISTORY — smooth, no jank
// =============================================================
async function nbHistoryInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  const name=nbStudentName();
  const nameEl=document.getElementById('histStudentName');
  if(nameEl)nameEl.textContent=name;

  const listEl=document.getElementById('histList');
  const statsEl=document.getElementById('histStats');
  const filterEl=document.getElementById('histFilter');

  // Show skeleton while loading
  if(listEl)listEl.innerHTML=`<div class="hist-list-inner">${Array(5).fill('<div class="hist-skeleton"></div>').join('')}</div>`;

  try{
    const [sysRes,ispRes]=await Promise.all([
      gasGet({action:'getResults',student:name}),
      gasGet({action:'getIspringResults',student:name})
    ]);
    const all=[
      ...(Array.isArray(sysRes)?sysRes:[]).map(r=>({...r,src:'sys'})),
      ...(Array.isArray(ispRes)?ispRes:[]).map(r=>({...r,src:'isp'}))
    ].sort((a,b)=>new Date(b.time||b.submitted_at||0)-new Date(a.time||a.submitted_at||0));

    if(!all.length){
      if(listEl)listEl.innerHTML=`<div class="hist-empty">
        <svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/></svg>
        <p>Chưa có lịch sử làm bài</p></div>`;
      return;
    }

    // Stats
    if(statsEl){
      const avg=all.reduce((s,r)=>s+parseFloat(r.score||0),0)/all.length;
      const best=Math.max(...all.map(r=>parseFloat(r.score||0)));
      statsEl.innerHTML=`
        <div class="hist-stat"><span class="hist-stat-n">${all.length}</span><span class="hist-stat-l">Lần làm</span></div>
        <div class="hist-stat"><span class="hist-stat-n">${avg.toFixed(1)}</span><span class="hist-stat-l">Điểm TB</span></div>
        <div class="hist-stat"><span class="hist-stat-n">${best.toFixed(1)}</span><span class="hist-stat-l">Cao nhất</span></div>`;
    }

    // Render (no animation frames — just insert all at once to avoid jank)
    _histRender(all);

    // Filter
    if(filterEl) filterEl.addEventListener('change',()=>_histRender(_histFilter(all,filterEl.value)));

  }catch(e){
    if(listEl)listEl.innerHTML='<div class="hist-empty" style="color:var(--danger)">Lỗi tải dữ liệu</div>';
  }
}

function _histFilter(all,f){
  if(f==='sys') return all.filter(r=>r.src==='sys');
  if(f==='isp') return all.filter(r=>r.src==='isp');
  return all;
}

function _histRender(data){
  const el=document.getElementById('histList');if(!el)return;
  if(!data.length){el.innerHTML='<div class="hist-empty">Không có kết quả nào</div>';return;}
  el.innerHTML=`<div class="hist-list-inner">${data.map(r=>{
    const sc=parseFloat(r.score||0);
    const col=sc>=8||sc>=80?'var(--accent)':sc>=5||sc>=50?'var(--primary)':'var(--danger)';
    const dt=r.time?new Date(r.time).toLocaleString('vi-VN'):'—';
    return `<div class="hist-item">
      <div class="hist-score-ring" style="--ring-color:${col}">
        <span>${sc%1===0?sc:sc.toFixed(1)}</span>
      </div>
      <div class="hist-info">
        <div class="hist-name">${nbEsc((r.testName||r.test_name||'Bài thi').replace(/^\[iSpring\]\s*/i,''))}</div>
        <div class="hist-meta">
          <span class="hist-badge ${r.src}">${r.src==='isp'?'iSpring':'Hệ thống'}</span>
          <span>${r.total||''}</span>
          <span>🕐 ${dt}</span>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// =============================================================
// PAGE: DASHBOARD (admin)
// =============================================================
let _dbPollId=null,_dbTab='overview';

async function nbDashboardInit(){
  if(!nbIsAdmin()){location.href='index.html';return;}
  const user=nbCurrentUser();

  // Role badge
  const badge=document.getElementById('dbUserBadge');
  if(badge){
    const tier=nbIsSuperAdmin()?'🛡 SUPER ADMIN':'🔑 ADMIN';
    badge.innerHTML=`${tier} — <b>${nbEsc(user?.name||user?.username||'Admin')}</b>`;
    badge.className=`db-user-badge ${nbIsSuperAdmin()?'super':'admin'}`;
  }

  // Show/hide super admin tab
  document.querySelectorAll('.super-only').forEach(el=>el.style.display=nbIsSuperAdmin()?'':'none');

  // Initial load
  await _dbLoadAll();

  // Auto-refresh every 10s (no F5 needed)
  _dbPollId=setInterval(_dbAutoRefresh, 10000);
}

async function _dbAutoRefresh(){
  // Lightweight: only reload stats + results
  await Promise.all([_dbLoadStats(), _dbLoadResults()]);
  // Also refresh pending badge
  const pend=await gasGet({action:'getPendingUsers'});
  const b=document.getElementById('dbPendingBadge');
  if(b&&Array.isArray(pend)) b.textContent=pend.length||'';
}

async function _dbLoadAll(){
  await Promise.all([
    _dbLoadStats(),
    _dbLoadTests(),
    _dbLoadPending(),
    _dbLoadResults(),
    _dbLoadIspring(),
    _dbLoadBattleRooms(),
    nbIsSuperAdmin()?_dbLoadAdmins():Promise.resolve()
  ]);
}

async function _dbLoadStats(){
  try{
    const s=await gasGet({action:'getDashboardStats'});
    const _s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v||0;};
    _s('dbStatTests',   s.totalTests);
    _s('dbStatQ',       s.totalQuestions);
    _s('dbStatResults', s.totalResults);
    _s('dbStatIsp',     s.totalIspring);
    _s('dbStatStudents',s.activeStudents);
    _s('dbStatRooms',   s.activeRooms);
    const pb=document.getElementById('dbPendingBadge');
    if(pb&&s.pendingUsers>0)pb.textContent=s.pendingUsers;
    // Recent results
    const rr=document.getElementById('dbRecentResults');
    if(rr&&s.recentResults?.length){
      rr.innerHTML=s.recentResults.map(r=>`
        <div class="db-recent-row">
          <b>${nbEsc(r.student||'')}</b>
          <span>${nbEsc((r.testName||'').replace(/^\[iSpring\]\s*/i,''))}</span>
          <span class="db-score">${r.score}</span>
          <span class="db-time">${r.time?new Date(r.time).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'—'}</span>
        </div>`).join('');
    }
  }catch(e){}
}

async function _dbLoadTests(){
  const el=document.getElementById('dbTestList');if(!el)return;
  try{
    const data=await gasGet({action:'getTests'});
    if(!Array.isArray(data)||!data.length){el.innerHTML='<div class="db-empty">Chưa có đề thi</div>';return;}
    el.innerHTML=data.map(t=>`
      <div class="db-row">
        <div class="db-row-main">
          <span class="db-row-title">${nbEsc(t.name)}</span>
          <span class="db-row-meta">⏱ ${t.duration}p · ❓ ${t.qCount||0} câu · 📊 ${t.maxScore||10} điểm</span>
        </div>
        <div class="db-row-acts">
          <button class="dba-btn edit" onclick="dbEditTest('${t.id}','${nbEsc(t.name)}',${t.duration},${t.maxScore||10},'${nbEsc(t.desc||'')}')">✏</button>
          <button class="dba-btn qs"   onclick="dbManageQ('${t.id}','${nbEsc(t.name)}')">📝 Câu hỏi</button>
          <button class="dba-btn del"  onclick="dbDelTest('${t.id}','${nbEsc(t.name)}')">🗑</button>
        </div>
      </div>`).join('');
  }catch(e){el.innerHTML='<div class="db-empty err">Lỗi tải dữ liệu</div>';}
}

async function _dbLoadPending(){
  const el=document.getElementById('dbPendingList');if(!el)return;
  try{
    const data=await gasGet({action:'getPendingUsers'});
    const pb=document.getElementById('dbPendingBadge');
    if(pb)pb.textContent=Array.isArray(data)&&data.length?data.length:'';
    if(!Array.isArray(data)||!data.length){el.innerHTML='<div class="db-empty">Không có yêu cầu mới ✓</div>';return;}
    el.innerHTML=data.map(u=>`
      <div class="db-row">
        <div class="db-row-main">
          <span class="db-row-title">${nbEsc(u.name||'')}</span>
          <span class="db-row-meta">@${nbEsc(u.username)} · ${nbEsc(u.school||'')} ${u.class?'· '+u.class:''}</span>
          <span class="db-row-time">🕐 ${u.time||''}</span>
        </div>
        <div class="db-row-acts">
          <button class="dba-btn ok"  onclick="dbHandleUser('${nbEsc(u.username)}','approved')">✓ Duyệt</button>
          <button class="dba-btn del" onclick="dbHandleUser('${nbEsc(u.username)}','rejected')">✗ Từ chối</button>
        </div>
      </div>`).join('');
  }catch(e){}
}

async function _dbLoadResults(){
  const el=document.getElementById('dbResultList');if(!el)return;
  try{
    const [sysData,ispData]=await Promise.all([
      gasGet({action:'getResults'}),
      gasGet({action:'getIspringResults'})
    ]);
    const all=[
      ...(Array.isArray(sysData)?sysData:[]).map(r=>({...r,src:'sys'})),
      ...(Array.isArray(ispData)?ispData:[]).map(r=>({...r,src:'isp'}))
    ].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)).slice(0,60);
    if(!all.length){el.innerHTML='<div class="db-empty">Chưa có kết quả</div>';return;}
    el.innerHTML=`<div class="db-table-wrap"><table class="db-tbl">
      <thead><tr><th>Học sinh</th><th>Bài thi</th><th>Điểm</th><th>Đúng/Tổng</th><th>Thời gian</th><th>Loại</th></tr></thead>
      <tbody>${all.map(r=>{
        const sc=parseFloat(r.score||0);
        const col=sc>=8||sc>=80?'var(--accent)':sc>=5||sc>=50?'var(--primary)':'var(--danger)';
        return `<tr>
          <td><b>${nbEsc(r.student||'')}</b><br><small>${nbEsc(r.school||'')}</small></td>
          <td class="db-tbl-test">${nbEsc((r.testName||'').replace(/^\[iSpring\]\s*/i,''))}</td>
          <td style="color:${col};font-weight:700">${sc%1===0?sc:sc.toFixed(1)}</td>
          <td>${nbEsc(r.total||'')}</td>
          <td><small>${r.time?new Date(r.time).toLocaleString('vi-VN'):''}</small></td>
          <td><span class="db-src ${r.src}">${r.src==='isp'?'iSpring':'System'}</span></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  }catch(e){}
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
          <span class="db-vis-badge ${t.visible?'on':'off'}">${t.visible?'👁 Hiển thị':'🙈 Ẩn'}</span>
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
    const active=data.filter(r=>['waiting','active'].includes(r.status));
    el.innerHTML=data.slice(0,20).map(r=>`
      <div class="db-row db-room-row">
        <div class="db-row-main">
          <span class="db-room-code">${r.roomCode||r.id}</span>
          <span class="db-row-title">${nbEsc(r.name||'')}</span>
          <span class="db-room-status st-${r.status}">${{waiting:'⏳ Chờ',active:'🔴 Đang diễn ra',finished:'✅ Xong',cancelled:'❌ Đã hủy'}[r.status]||r.status}</span>
          <span class="db-row-meta">⏱ ${r.duration}p · 🎯 Đạt ${r.passScore}% · RP +${r.rpWin}/-${Math.abs(r.rpLoss)}</span>
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
          <span class="db-row-title">${nbEsc(u.name||u.username)}</span>
          <span class="db-role-tag ${u.role}">${u.role==='super_admin'?'🛡 SUPER ADMIN':'🔑 ADMIN'}</span>
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

// Dashboard actions
window.dbCreateTest=async function(){
  if(typeof Swal==='undefined')return;
  const {value:v}=await Swal.fire({
    title:'Tạo đề thi mới',
    html:`<input id="sw-n" class="swal2-input" placeholder="Tên đề thi *" autofocus>
          <input id="sw-d" class="swal2-input" placeholder="Mô tả (tùy chọn)">
          <input id="sw-t" class="swal2-input" type="number" value="45" placeholder="Thời gian (phút)">
          <input id="sw-s" class="swal2-input" type="number" value="10" placeholder="Tổng điểm">`,
    background:'rgba(10,15,30,0.97)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Tạo',cancelButtonText:'Hủy',
    preConfirm:()=>({name:document.getElementById('sw-n').value.trim(),desc:document.getElementById('sw-d').value.trim(),dur:parseInt(document.getElementById('sw-t').value)||45,ts:parseFloat(document.getElementById('sw-s').value)||10})
  });
  if(!v?.name)return;
  await gasPostJson({action:'createTest',name:v.name,desc:v.desc,duration:v.dur,totalScore:v.ts});
  nbAlert('success','Đã tạo!','');setTimeout(_dbLoadTests,800);
};

window.dbEditTest=async function(id,name,dur,ts,desc){
  const {value:v}=await Swal.fire({
    title:'Chỉnh sửa đề thi',
    html:`<input id="sw-n" class="swal2-input" value="${nbEsc(name)}" placeholder="Tên">
          <input id="sw-d" class="swal2-input" value="${nbEsc(desc||'')}" placeholder="Mô tả">
          <input id="sw-t" class="swal2-input" type="number" value="${dur}" placeholder="Thời gian">
          <input id="sw-s" class="swal2-input" type="number" value="${ts}" placeholder="Tổng điểm">`,
    background:'rgba(10,15,30,0.97)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Lưu',cancelButtonText:'Hủy',
    preConfirm:()=>({name:document.getElementById('sw-n').value.trim(),desc:document.getElementById('sw-d').value.trim(),dur:parseInt(document.getElementById('sw-t').value)||45,ts:parseFloat(document.getElementById('sw-s').value)||10})
  });
  if(!v?.name)return;
  await gasPostJson({action:'updateTest',id,name:v.name,desc:v.desc,duration:v.dur,totalScore:v.ts});
  nbAlert('success','Đã cập nhật!','');setTimeout(_dbLoadTests,800);
};

window.dbDelTest=async function(id,name){
  const r=await Swal.fire({title:'Xóa đề thi?',text:`"${name}" sẽ bị xóa vĩnh viễn!`,icon:'warning',showCancelButton:true,confirmButtonColor:'#ef4444',confirmButtonText:'Xóa',cancelButtonText:'Hủy',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
  if(!r.isConfirmed)return;
  await gasPostJson({action:'deleteTest',testId:id});
  nbAlert('success','Đã xóa','');setTimeout(_dbLoadAll,800);
};

window.dbManageQ=function(id,name){
  nb.setJson('currentTest',{id,name});location.href='question-list.html';
};

window.dbHandleUser=async function(un,status){
  await gasPostJson({action:'handleUserRequest',username:un,status});
  nbAlert('success',status==='approved'?'Đã duyệt!':'Đã từ chối','');
  setTimeout(()=>{_dbLoadPending();_dbLoadStats();},800);
};

window.dbAddIsp=async function(){
  const {value:v}=await Swal.fire({
    title:'Thêm bài iSpring',
    html:`<input id="sw-n" class="swal2-input" placeholder="Tên bài thi *" autofocus>
          <input id="sw-p" class="swal2-input" placeholder="Path (vd: quizzes/test1/index.html) *">
          <input id="sw-t" class="swal2-input" type="number" value="45" placeholder="Thời gian (phút)">
          <input id="sw-s" class="swal2-input" placeholder="Môn học (tùy chọn)">
          <input id="sw-d" class="swal2-input" placeholder="Mô tả (tùy chọn)">`,
    background:'rgba(10,15,30,0.97)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Thêm',cancelButtonText:'Hủy',
    preConfirm:()=>({name:document.getElementById('sw-n').value.trim(),path:document.getElementById('sw-p').value.trim(),dur:parseInt(document.getElementById('sw-t').value)||45,subj:document.getElementById('sw-s').value.trim(),desc:document.getElementById('sw-d').value.trim()})
  });
  if(!v?.name||!v?.path){nbAlert('warning','Thiếu thông tin','Tên và Path bắt buộc');return;}
  await gasPostJson({action:'addIspring',name:v.name,path:v.path,duration:v.dur,subject:v.subj,desc:v.desc});
  nbAlert('success','Đã thêm!','');setTimeout(_dbLoadIspring,800);
};

window.dbEditIsp=async function(id,name,path,dur){
  const {value:v}=await Swal.fire({
    title:'Chỉnh sửa iSpring',
    html:`<input id="sw-n" class="swal2-input" value="${nbEsc(name)}" placeholder="Tên">
          <input id="sw-p" class="swal2-input" value="${nbEsc(path)}" placeholder="Path">
          <input id="sw-t" class="swal2-input" type="number" value="${dur}" placeholder="Thời gian">`,
    background:'rgba(10,15,30,0.97)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Lưu',cancelButtonText:'Hủy',
    preConfirm:()=>({name:document.getElementById('sw-n').value.trim(),path:document.getElementById('sw-p').value.trim(),dur:parseInt(document.getElementById('sw-t').value)||45})
  });
  if(!v?.name)return;
  await gasPostJson({action:'updateIspring',id,name:v.name,path:v.path,duration:v.dur});
  nbAlert('success','Đã cập nhật!','');setTimeout(_dbLoadIspring,800);
};

window.dbToggleIsp=async function(id,vis){
  await gasPostJson({action:'updateIspring',id,visible:vis});_dbLoadIspring();
};

window.dbDelIsp=async function(id,name){
  const r=await Swal.fire({title:'Xóa?',text:name,icon:'warning',showCancelButton:true,confirmButtonColor:'#ef4444',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
  if(!r.isConfirmed)return;
  await gasPostJson({action:'deleteIspring',id});
  nbAlert('success','Đã xóa','');setTimeout(_dbLoadIspring,800);
};

window.dbCreateAdmin=async function(){
  if(!nbIsSuperAdmin()){nbAlert('error','Không có quyền','Chỉ Super Admin mới tạo được admin');return;}
  const {value:v}=await Swal.fire({
    title:'Tạo tài khoản Admin',
    html:`<input id="sw-u" class="swal2-input" placeholder="Tên đăng nhập *" autofocus>
          <input id="sw-n" class="swal2-input" placeholder="Họ và tên *">
          <input id="sw-p" class="swal2-input" type="password" placeholder="Mật khẩu *">`,
    background:'rgba(10,15,30,0.97)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'Tạo',cancelButtonText:'Hủy',
    preConfirm:()=>({u:document.getElementById('sw-u').value.trim().toLowerCase(),n:document.getElementById('sw-n').value.trim(),p:document.getElementById('sw-p').value.trim()})
  });
  if(!v?.u||!v?.p){nbAlert('warning','Thiếu thông tin','');return;}
  const res=await gasPostJson({action:'createAdmin',username:v.u,name:v.n,password:v.p});
  if(res?.status==='error'){nbAlert('error','Lỗi',res.message||'');return;}
  nbAlert('success','Đã tạo!','Tài khoản admin mới sẵn sàng');setTimeout(_dbLoadAdmins,800);
};

window.dbToggleAdmin=async function(un,active){
  await gasPostJson({action:'toggleAdmin',username:un,active});
  nbAlert('success',active?'Đã mở khóa':'Đã khóa','');setTimeout(_dbLoadAdmins,500);
};

window.dbDelAdmin=async function(un){
  const r=await Swal.fire({title:'Xóa admin?',text:`@${un}`,icon:'warning',showCancelButton:true,confirmButtonColor:'#ef4444',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
  if(!r.isConfirmed)return;
  await gasPostJson({action:'deleteAdmin',username:un});
  nbAlert('success','Đã xóa','');setTimeout(_dbLoadAdmins,500);
};

// Battle room creation (dashboard)
window.dbCreateBattleRoom=async function(){
  const [tests,isps]=await Promise.all([gasGet({action:'getTests'}),gasGet({action:'getIspring'})]);
  const tOpts=(Array.isArray(tests)?tests:[]).map(t=>`<option value="nebula:${t.id}">${nbEsc(t.name)} (${t.qCount||0} câu)</option>`).join('');
  const iOpts=(Array.isArray(isps)?isps:[]).filter(x=>x.visible!==false).map(t=>`<option value="ispring:${t.id}">[iSpring] ${nbEsc(t.name)}</option>`).join('');
  const {value:v}=await Swal.fire({
    title:'Tạo Phòng Thi Đấu',
    html:`<input id="sw-rn" class="swal2-input" placeholder="Tên phòng *" autofocus>
          <select id="sw-src" class="swal2-input" style="height:42px">
            <optgroup label="Hệ thống">${tOpts}</optgroup>
            <optgroup label="iSpring">${iOpts}</optgroup>
          </select>
          <input id="sw-dur" class="swal2-input" type="number" value="45" placeholder="Thời gian (phút)">
          <input id="sw-ps"  class="swal2-input" type="number" value="50" placeholder="Điểm đạt (%)">
          <div style="display:flex;gap:8px">
            <input id="sw-rw" class="swal2-input" type="number" value="30" placeholder="RP thắng" style="margin:0">
            <input id="sw-rl" class="swal2-input" type="number" value="10" placeholder="RP thua" style="margin:0">
          </div>`,
    background:'rgba(10,15,30,0.97)',color:'#f1f5f9',showCancelButton:true,
    confirmButtonText:'🏆 Tạo phòng',cancelButtonText:'Hủy',
    preConfirm:()=>{
      const src=document.getElementById('sw-src').value.split(':');
      return {name:document.getElementById('sw-rn').value.trim(),sourceType:src[0],testKey:src[1],
              dur:parseInt(document.getElementById('sw-dur').value)||45,
              ps:parseFloat(document.getElementById('sw-ps').value)||50,
              rw:parseInt(document.getElementById('sw-rw').value)||30,
              rl:parseInt(document.getElementById('sw-rl').value)||10};
    }
  });
  if(!v?.name)return;
  const payload={action:'createBattleRoom',name:v.name,sourceType:v.sourceType,
                 duration:v.dur,passScore:v.ps,rpWin:v.rw,rpLoss:v.rl,
                 createdBy:nbCurrentUser()?.username||'admin'};
  if(v.sourceType==='nebula')  payload.testId=v.testKey;
  if(v.sourceType==='ispring') payload.ispringId=v.testKey;
  const res=await gasPostJson(payload);
  nbAlert('success',`Đã tạo phòng!`,`Mã: ${res?.roomCode||'...'}`);
  setTimeout(_dbLoadBattleRooms,1000);
};

window.dbStartRoom=async function(id){
  const r=await Swal.fire({title:'Bắt đầu phòng thi?',text:'Học sinh sẽ thi ngay',icon:'question',showCancelButton:true,background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
  if(!r.isConfirmed)return;
  await gasPostJson({action:'updateBattleRoom',id,status:'active',startedAt:new Date().toLocaleString('vi-VN')});
  nbAlert('success','Phòng đã bắt đầu!','');setTimeout(_dbLoadBattleRooms,800);
};

window.dbCancelRoom=async function(id){
  const r=await Swal.fire({title:'Hủy phòng?',icon:'warning',showCancelButton:true,confirmButtonColor:'#ef4444',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
  if(!r.isConfirmed)return;
  await gasPostJson({action:'updateBattleRoom',id,status:'cancelled'});
  setTimeout(_dbLoadBattleRooms,800);
};

// Tab switching
window.dbSwitchTab=function(tab){
  _dbTab=tab;
  document.querySelectorAll('.db-tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.db-tab-pane').forEach(p=>p.classList.toggle('active',p.dataset.tab===tab));
};

// =============================================================
// ADD QUESTION PAGE
// =============================================================
let _aqEditMode=false,_aqOriginalQ=null;

async function nbAddQuestionInit(){
  const test=nb.json('currentTest',null);
  if(!test){location.href='dashboard.html';return;}
  renderEditor();calculatePreviewPoints();showTypeHint();
  await fetchQuestionStats(test.id);
}

window.renderEditor=function(){
  const type=document.getElementById('qType')?.value||'single';
  const list=document.getElementById('ansList');if(!list)return;
  list.innerHTML='';
  const addBtn=document.getElementById('addBtn');
  switch(type){
    case'single':case'multiple':
      for(let i=0;i<4;i++)addAnsRow();
      if(addBtn)addBtn.style.display='';break;
    case'tf':
      list.innerHTML=`<div class="aq-tf-wrap">
        <label class="aq-tf-opt"><input type="radio" name="tf-ans" value="Đúng" checked><span>✓ Đúng</span></label>
        <label class="aq-tf-opt"><input type="radio" name="tf-ans" value="Sai"><span>✗ Sai</span></label>
      </div>`;
      if(addBtn)addBtn.style.display='none';break;
    case'matching':for(let i=0;i<3;i++)addAnsRow();if(addBtn)addBtn.style.display='';break;
    case'ordering':['Bước 1','Bước 2','Bước 3'].forEach(v=>addAnsRow(v));if(addBtn)addBtn.style.display='';break;
    case'fill':addAnsRow();addAnsRow();if(addBtn)addBtn.style.display='';break;
    case'fill_bank':addAnsRow();addAnsRow();addAnsRow();if(addBtn)addBtn.style.display='';break;
    case'numeric':
      list.innerHTML=`<div class="aq-num-wrap"><label>Đáp án số đúng:</label><input type="number" id="aq-num" class="input-control" style="width:200px" oninput="buildCorrect()"></div>`;
      if(addBtn)addBtn.style.display='none';break;
    case'scale':
      list.innerHTML=`<div class="aq-scale-setup">
        <label>Thang tối đa: <input type="number" id="aq-sc-max" value="5" min="3" max="10" class="input-control" style="width:80px" oninput="buildCorrect()"></label>
        <label>Đáp án đúng: <input type="number" id="aq-sc-ans" value="5" min="1" max="10" class="input-control" style="width:80px" oninput="buildCorrect()"></label>
      </div>`;
      if(addBtn)addBtn.style.display='none';break;
    case'image_choice':for(let i=0;i<4;i++)addAnsRow();if(addBtn)addBtn.style.display='';break;
  }
  buildCorrect();
};

window.addAnsRow=function(preset=''){
  const type=document.getElementById('qType')?.value||'single';
  const list=document.getElementById('ansList');if(!list)return;
  const idx=list.children.length;
  const d=document.createElement('div');d.className='aq-ans-row';
  const letters='ABCDEFGHIJ';
  switch(type){
    case'single':
      d.innerHTML=`<input type="radio" name="ans-correct" onchange="buildCorrect()" title="Đáp án đúng">
        <input type="text" class="input-control aq-ans-in" placeholder="Phương án ${letters[idx]||idx+1}" value="${nbEsc(preset)}" oninput="buildCorrect()">
        <button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'multiple':
      d.innerHTML=`<input type="checkbox" onchange="buildCorrect()" title="Đáp án đúng">
        <input type="text" class="input-control aq-ans-in" placeholder="Phương án ${letters[idx]||idx+1}" value="${nbEsc(preset)}" oninput="buildCorrect()">
        <button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'matching':
      d.innerHTML=`<input type="text" class="input-control" placeholder="Vế A ${idx+1}" style="flex:1" oninput="buildCorrect()">
        <span class="aq-arrow">↔</span>
        <input type="text" class="input-control" placeholder="Vế B ${idx+1}" style="flex:1" oninput="buildCorrect()">
        <button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'ordering':
      d.innerHTML=`<span class="aq-ord-n">${idx+1}</span>
        <input type="text" class="input-control aq-ans-in" placeholder="Mục ${idx+1}" value="${nbEsc(preset)}" oninput="buildCorrect()">
        <button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'fill':
      d.innerHTML=`<span class="aq-fill-lbl">Đáp án ${idx+1}:</span>
        <input type="text" class="input-control aq-ans-in" placeholder="Đáp án chấp nhận..." value="${nbEsc(preset)}" oninput="buildCorrect()">
        <button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'fill_bank':
      d.innerHTML=`<span class="aq-fill-lbl">${idx===0?'✓ Đúng:':'Mồi nhử:'}</span>
        <input type="text" class="input-control aq-ans-in" placeholder="${idx===0?'Đáp án đúng':'Từ mồi nhử...'}" value="${nbEsc(preset)}" oninput="buildCorrect()">
        ${idx>0?`<input type="checkbox" class="aq-correct-check" title="Đây cũng là đáp án đúng" onchange="buildCorrect()" style="width:18px;height:18px;flex-shrink:0">`:
          `<span style="font-size:.7rem;color:var(--accent);flex-shrink:0">✓ đúng</span>`}
        <button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
    case'image_choice':
      d.innerHTML=`<input type="radio" name="ans-correct" onchange="buildCorrect()" title="Đúng">
        <input type="text" class="input-control aq-ans-in" placeholder="Nhãn" style="flex:1" oninput="buildCorrect()">
        <input type="text" class="input-control" placeholder="URL ảnh" style="flex:1.5" oninput="buildCorrect()">
        <button class="aq-del" onclick="this.closest('.aq-ans-row').remove();buildCorrect()">×</button>`;break;
  }
  list.appendChild(d);buildCorrect();
};

window.buildCorrect=function(){
  const type=document.getElementById('qType')?.value||'single';
  const list=document.getElementById('ansList');
  const out=document.getElementById('finalCorrect');
  if(!out||!list)return;
  const rows=Array.from(list.children);
  let correct='',ansObj={};
  switch(type){
    case'single':{
      const items=rows.map(r=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||'',isCorrect:r.querySelector('input[type=radio]')?.checked||false}));
      const ci=items.find(x=>x.isCorrect);
      correct=ci?.text||'';ansObj={items};break;
    }
    case'multiple':{
      const items=rows.map(r=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||'',isCorrect:r.querySelector('input[type=checkbox]')?.checked||false}));
      correct=items.filter(x=>x.isCorrect).map(x=>x.text).join('|');ansObj={items};break;
    }
    case'tf':{const s=list.querySelector('input[name="tf-ans"]:checked');correct=s?.value||'Đúng';ansObj={value:correct};break;}
    case'matching':{
      const items=rows.map(r=>{const ins=r.querySelectorAll('input[type=text]');return{left:ins[0]?.value?.trim()||'',right:ins[1]?.value?.trim()||''};});
      correct=items.map(p=>`${p.left}-${p.right}`).join('|');ansObj={items};break;
    }
    case'ordering':{
      const items=rows.map(r=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||''}));
      correct=items.map(x=>x.text).join('|');ansObj={items};break;
    }
    case'fill':{
      const acc=rows.map(r=>r.querySelector('.aq-ans-in')?.value?.trim()).filter(Boolean);
      correct=acc.join('|');ansObj={items:[],bank:acc};break;
    }
    case'fill_bank':{
      const all=rows.map((r,i)=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||'',correct:i===0||(r.querySelector('.aq-correct-check')?.checked||false)}));
      correct=all.filter(x=>x.correct).map(x=>x.text).join('|');
      ansObj={items:[],bank:all.map(x=>x.text).filter(Boolean)};break;
    }
    case'numeric':{correct=document.getElementById('aq-num')?.value?.trim()||'';ansObj={};break;}
    case'scale':{
      const max=document.getElementById('aq-sc-max')?.value||'5';
      const ans=document.getElementById('aq-sc-ans')?.value||'5';
      correct=ans;ansObj={max:parseInt(max)};break;
    }
    case'image_choice':{
      const items=rows.map(r=>({text:r.querySelector('.aq-ans-in')?.value?.trim()||'',image:r.querySelectorAll('input[type=text]')[1]?.value?.trim()||'',isCorrect:r.querySelector('input[type=radio]')?.checked||false}));
      const ci=items.find(x=>x.isCorrect);correct=ci?.text||'';ansObj={items};break;
    }
  }
  out.value=correct;
  window._aqCorrect=correct;window._aqAnswer=ansObj;
};

window.calculatePreviewPoints=function(){
  const ts=parseFloat(document.getElementById('totalScore')?.value)||10;
  const el=document.getElementById('scorePreview');
  if(el)el.textContent=`(mỗi câu ~${ts} điểm khi chia đều)`;
};
window.toggleScoreUI=function(){
  const m=document.getElementById('scoreMode')?.value;
  const b1=document.getElementById('boxTotalScore'),b2=document.getElementById('boxPoint');
  if(b1)b1.style.display=m==='equal'?'':'none';
  if(b2)b2.style.display=m==='custom'?'':'none';
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
  if(!qText){nbAlert('warning','Thiếu nội dung','Nhập câu hỏi trước');return;}
  buildCorrect();
  const correct=window._aqCorrect||'';const ansObj=window._aqAnswer||{};
  if(!correct){nbAlert('warning','Chưa có đáp án','Thiết lập đáp án đúng');return;}
  const btn=document.getElementById('saveBtn');
  if(btn){btn.disabled=true;btn.innerHTML='<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;animation:spin .8s linear infinite"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8z"/></svg> Đang lưu...';}
  try{
    await fetch(window.SCRIPT_URL,{method:'POST',mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'saveQuestion',testId:test.id,type:qType,question:qText,
        image:img,answer:JSON.stringify(ansObj),correct,testTime:qTime,
        scoreMode:sm,totalScore:ts,points:pt,
        oldQuestion:window._aqEditMode&&window._aqOriginalQ?window._aqOriginalQ:''})});
    await nbAlert('success',_aqEditMode?'Đã cập nhật!':'Đã lưu!','Câu hỏi đã đồng bộ Cloud');
    if(!_aqEditMode){
      document.getElementById('qText').value='';
      document.getElementById('qData').value='';
      document.getElementById('qUrl').value='';
      document.getElementById('qPrevBox')?.classList?.remove('has-image');
      renderEditor();fetchQuestionStats(test.id);
    }else{nb.del('editQuestionData');setTimeout(()=>location.href='question-list.html',600);}
  }catch(e){nbAlert('error','Lỗi','Không thể lưu');}
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
  if(d.image&&d.image.length>5){
    document.getElementById('qUrl').value=d.image;
    const img=document.getElementById('qPrevImg');const box=document.getElementById('qPrevBox');
    if(img&&box){img.src=d.image;box.classList.add('has-image');}
  }
  renderEditor();
  const ans=_pj(typeof d.answer==='string'?d.answer:JSON.stringify(d.answer),{});
  _aqFillEdit(d.type,ans,d.correct||d.correctAnswer||'');
};

function _aqFillEdit(type,ans,correct){
  const list=document.getElementById('ansList');if(!list)return;
  switch(type){
    case'single':case'multiple':{
      list.innerHTML='';(ans.items||[]).forEach(it=>{
        addAnsRow(it.text||'');
        const last=list.lastElementChild;
        const inp=last?.querySelector(type==='single'?'input[type=radio]':'input[type=checkbox]');
        if(inp&&it.isCorrect)inp.checked=true;
      });buildCorrect();break;
    }
    case'tf':{const r=list.querySelector(`input[value="${correct}"]`);if(r)r.checked=true;buildCorrect();break;}
    case'ordering':{list.innerHTML='';(ans.items||[]).forEach(i=>addAnsRow(i.text||''));break;}
    case'matching':{
      list.innerHTML='';(ans.items||[]).forEach(p=>{
        addAnsRow(p.left||'');
        const last=list.lastElementChild;
        const ins=last?.querySelectorAll('input[type=text]');
        if(ins?.[1])ins[1].value=p.right||'';
      });buildCorrect();break;
    }
    case'fill':case'fill_bank':{
      list.innerHTML='';
      const acc=correct.split('|').filter(Boolean);
      acc.forEach(v=>addAnsRow(v));if(!acc.length)addAnsRow();
      buildCorrect();break;
    }
  }
}

// image upload helpers
window.handleFile=function(inp){
  const f=inp.files[0];if(!f)return;
  if(f.size>5*1024*1024){nbAlert('warning','Ảnh quá lớn','Giới hạn 5MB');return;}
  const r=new FileReader();r.onload=e=>{const b=e.target.result;document.getElementById('qData').value=b;_prevImg(b);};
  r.readAsDataURL(f);
};
window.handleLinkInput=function(url){if(url.startsWith('http')){document.getElementById('qData').value='';_prevImg(url);}};
function _prevImg(src){const b=document.getElementById('qPrevBox'),i=document.getElementById('qPrevImg');if(b&&i){i.src=src;b.classList.add('has-image');}}
window.clearMedia=function(){document.getElementById('qData').value='';document.getElementById('qUrl').value='';document.getElementById('qPrevBox')?.classList?.remove('has-image');};

// =============================================================
// BATTLE (student page)
// =============================================================
async function nbBattleInit(){
  if(!nbCurrentUser()){location.href='index.html';return;}
  await _battleLoad();
  setInterval(_battleLoad,15000); // poll every 15s
}
async function _battleLoad(){
  const el=document.getElementById('battleRooms');if(!el)return;
  const [rooms,leaderboard]=await Promise.all([
    gasGet({action:'getBattleRooms'}),
    gasGet({action:'getLeaderboard'})
  ]);
  const active=(Array.isArray(rooms)?rooms:[]).filter(r=>['waiting','active'].includes(r.status));
  if(!active.length){el.innerHTML='<div class="battle-empty"><div class="battle-empty-icon">⚔️</div><p>Chưa có phòng thi nào đang hoạt động</p><small>Liên hệ admin để mở phòng thi đấu</small></div>';return;}
  el.innerHTML=active.map(r=>`
    <div class="battle-card">
      <div class="battle-card-header">
        <span class="battle-room-code">${r.roomCode}</span>
        <span class="battle-status ${r.status}">${r.status==='active'?'🔴 ĐANG DIỄN RA':'⏳ Chờ bắt đầu'}</span>
      </div>
      <div class="battle-card-name">${nbEsc(r.name)}</div>
      <div class="battle-card-meta">
        <span>⏱ ${r.duration}p</span>
        <span>🎯 Đạt ${r.passScore}%</span>
        <span>⭐ +${r.rpWin} / -${Math.abs(r.rpLoss)} RP</span>
      </div>
      <div class="battle-card-actions">
        ${r.status==='active'?`<button class="battle-btn-join" onclick="nbBattleJoinStart('${r.id}','${nbEsc(JSON.stringify(r))}')">⚔️ BẮT ĐẦU THI</button>`
          :`<button class="battle-btn-join waiting" onclick="nbBattleJoin('${r.id}')">+ Đăng ký tham gia</button>`}
      </div>
    </div>`).join('');

  // Leaderboard
  const lb=document.getElementById('battleLeaderboard');
  if(lb&&Array.isArray(leaderboard)&&leaderboard.length){
    lb.innerHTML=`<div class="lb-title">🏆 Bảng Xếp Hạng Toàn Cầu</div>`+
      leaderboard.slice(0,20).map((p,i)=>{
        const tier=p.tier||nbGetTier(p.rp||0);
        const tierObj=typeof tier==='object'?tier:{name:tier};
        const t=NB_TIERS.find(x=>x.name===tierObj.name)||NB_TIERS[0];
        return `<div class="lb-row ${i<3?'lb-top':''}">
          <span class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</span>
          <span class="lb-tier" style="color:${t.color}">${t.icon}</span>
          <span class="lb-name">${nbEsc(p.studentName||'')}</span>
          <span class="lb-school">${nbEsc(p.school||'')}</span>
          <span class="lb-rp" style="color:${t.color}">${p.rp||0} RP</span>
          <span class="lb-wins">W:${p.wins||0}/${p.matches||0}</span>
        </div>`;
      }).join('');
  }
}

window.nbBattleJoin=async function(roomId){
  const user=nbCurrentUser();if(!user)return;
  await gasPostJson({action:'joinBattleRoom',roomId,studentName:nbStudentName(),school:nbSchool(),class:nbClass()});
  nbAlert('success','Đã đăng ký!','Chờ admin bắt đầu phòng thi');
  _battleLoad();
};

window.nbBattleJoinStart=async function(roomId,roomJson){
  const room=JSON.parse(roomJson);if(!room)return;
  nb.set('battleRoomId',roomId);
  await gasPostJson({action:'joinBattleRoom',roomId,studentName:nbStudentName(),school:nbSchool(),class:nbClass()});
  if(room.sourceType==='ispring'&&room.ispringId){
    const isps=await gasGet({action:'getIspring'});
    const isp=(Array.isArray(isps)?isps:[]).find(x=>x.id===room.ispringId);
    if(isp){nb.set('currentIspringName',isp.name);location.href=`player.html?path=${encodeURIComponent(isp.path)}&battle=${roomId}`;}
  }else if(room.testId){
    const tests=await gasGet({action:'getTests'});
    const test=(Array.isArray(tests)?tests:[]).find(x=>x.id===room.testId);
    if(test){
      nb.set('currentTestId',test.id);nb.set('currentTestName',test.name);
      nb.set('currentTestDuration',room.duration||test.duration||45);
      nb.setJson('currentTest',test);nb.set('quizMode','test');location.href='quiz.html';
    }
  }
};

// =============================================================
// BATTLE MONITOR (admin page — auto-updates)
// =============================================================
let _monitorPoll=null;
async function nbBattleMonitorInit(){
  if(!nbIsAdmin()){location.href='index.html';return;}
  const roomId=new URLSearchParams(location.search).get('id');
  if(!roomId){location.href='dashboard.html';return;}
  nb.set('monitorRoomId',roomId);
  await _monitorLoad();
  _monitorPoll=setInterval(_monitorLoad,3000); // update every 3s — no F5 needed
}

async function _monitorLoad(){
  const roomId=nb.get('monitorRoomId');if(!roomId)return;
  try{
    const [room,parts,leaderboard]=await Promise.all([
      gasGet({action:'getBattleRoom',id:roomId}),
      gasGet({action:'getBattleParticipants',roomId}),
      gasGet({action:'getBattleLeaderboard',roomId})
    ]);
    if(!room)return;

    // Room info
    const infoEl=document.getElementById('monitorRoomInfo');
    if(infoEl)infoEl.innerHTML=`
      <span class="mon-code">${room.roomCode}</span>
      <span class="mon-name">${nbEsc(room.name||'')}</span>
      <span class="mon-status ${room.status}">${{waiting:'⏳ Chờ',active:'🔴 Đang thi',finished:'✅ Xong'}[room.status]||room.status}</span>`;

    // Stats
    const partsArr=Array.isArray(parts)?parts:[];
    const done=partsArr.filter(p=>p.status==='submitted'||p.status==='timeout').length;
    const doing=partsArr.filter(p=>p.status==='doing').length;
    const waiting=partsArr.filter(p=>p.status==='joined').length;
    const _stel=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    _stel('monTotal',  partsArr.length);
    _stel('monDoing',  doing);
    _stel('monDone',   done);
    _stel('monWaiting',waiting);

    // Progress bar
    const prog=document.getElementById('monProgressBar');
    if(prog&&partsArr.length) prog.style.width=(done/partsArr.length*100)+'%';

    // Participant list
    const allEl=document.getElementById('monAllParts');
    if(allEl) allEl.innerHTML=partsArr.map(p=>`
      <div class="mon-part-row st-${p.status}">
        <span class="mon-part-status-dot"></span>
        <span class="mon-part-name">${nbEsc(p.studentName||'')}</span>
        <span class="mon-part-school">${nbEsc(p.school||'')}</span>
        <span class="mon-part-st">${{joined:'⏳ Đã đăng ký',doing:'✏️ Đang làm',submitted:'✅ Nộp bài',timeout:'⏰ Hết giờ'}[p.status]||p.status}</span>
        ${p.status==='submitted'?`<span class="mon-part-score">${parseFloat(p.score||0).toFixed(1)} điểm</span>`:'<span class="mon-part-score">—</span>'}
      </div>`).join('');

    // Leaderboard
    const lbEl=document.getElementById('monLeaderboard');
    const lbArr=Array.isArray(leaderboard)?leaderboard:[];
    if(lbEl) lbEl.innerHTML=lbArr.length
      ? lbArr.map((p,i)=>`
          <div class="mon-lb-row ${i<3?'mon-lb-top':''}">
            <span class="mon-lb-rank r${i+1}">${i+1}</span>
            <span class="mon-lb-name">${nbEsc(p.studentName||'')}</span>
            <span class="mon-lb-score" style="color:${p.scorePct>=p.passScore?'var(--accent)':'var(--danger)'}">${parseFloat(p.score||0).toFixed(1)}</span>
            <span class="mon-lb-pct">${parseFloat(p.scorePct||0).toFixed(0)}%</span>
            <span class="mon-lb-time">${p.timeSec?Math.floor(p.timeSec/60)+'m'+String(p.timeSec%60).padStart(2,'0')+'s':'—'}</span>
          </div>`)
        .join('')
      : '<div class="mon-lb-empty">Chờ học sinh nộp bài...</div>';

    // Last update timestamp
    const luEl=document.getElementById('monLastUpdate');
    if(luEl)luEl.textContent='Cập nhật: '+new Date().toLocaleTimeString('vi-VN');

    // Actions
    const actEl=document.getElementById('monRoomActions');
    if(actEl){
      actEl.innerHTML=`
        ${room.status==='waiting'?`<button class="dba-btn ok" onclick="monStartRoom('${roomId}')">▶ Bắt đầu</button>`:''}
        ${room.status==='active'?`<button class="dba-btn warn" onclick="monFinishRoom('${roomId}')">■ Kết thúc</button>`:''}
        <button class="dba-btn del" onclick="monCancelRoom('${roomId}')">✗ Hủy phòng</button>
        <a class="dba-btn" href="dashboard.html">← Dashboard</a>`;
    }
  }catch(e){}
}

window.monStartRoom=async function(id){
  await gasPostJson({action:'updateBattleRoom',id,status:'active',startedAt:new Date().toLocaleString('vi-VN')});
  _monitorLoad();
};
window.monFinishRoom=async function(id){
  const r=await Swal.fire({title:'Kết thúc phòng?',text:'Sẽ tính RP cho tất cả thí sinh',icon:'question',showCancelButton:true,background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
  if(!r.isConfirmed)return;
  await gasPostJson({action:'updateBattleRoom',id,status:'finished',finishedAt:new Date().toLocaleString('vi-VN')});
  clearInterval(_monitorPoll);
  nbAlert('success','Đã kết thúc!','');setTimeout(()=>location.href='dashboard.html',2000);
};
window.monCancelRoom=async function(id){
  const r=await Swal.fire({title:'Hủy phòng?',icon:'warning',showCancelButton:true,confirmButtonColor:'#ef4444',background:'rgba(10,15,30,0.97)',color:'#f1f5f9'});
  if(!r.isConfirmed)return;
  await gasPostJson({action:'updateBattleRoom',id,status:'cancelled'});
  clearInterval(_monitorPoll);location.href='dashboard.html';
};

// =============================================================
// PLAYER PAGE (iSpring)
// =============================================================
function _plInit(){
  const params=new URLSearchParams(location.search);
  const path=params.get('path');
  const battle=params.get('battle');
  document.getElementById('pl-name').textContent=nb.get('currentIspringName')||'iSpring';
  document.getElementById('pl-student').textContent=nbStudentName();
  if(!path){document.getElementById('pl-error').style.display='flex';return;}
  const frame=document.getElementById('pl-frame');
  document.getElementById('pl-loading').style.display='flex';
  frame.addEventListener('load',()=>{
    document.getElementById('pl-loading').style.display='none';
    setTimeout(()=>{
      document.getElementById('pl-exit').classList.remove('locked');
      document.getElementById('pl-submit-btn').style.display='flex';
    },3000);
  });
  frame.src=path;
  window.addEventListener('message',async e=>{
    const d=e.data;if(!d||typeof d!=='object')return;
    const score=Math.min(100,Math.max(0,parseInt(d.score||d.Score||0)||0));
    const status=d.status||d.Status||'completed';
    const cor=parseInt(d.correct||d.Correct||0)||0;
    const tot=parseInt(d.total||d.Total||0)||0;
    const tn='[iSpring] '+(nb.get('currentIspringName')||'Bài thi iSpring');
    nb.set('lastScore',score);nb.set('quizMode','ispring');nb.set('quizTotalScore','100');
    nb.set('ispringStatus',status);nb.set('ispCorrect',cor);nb.set('ispTotal',tot);
    nb.set('currentTestName',tn);nb.set('ispSavedByPlayer','1');
    try{
      await fetch(window.SCRIPT_URL,{method:'POST',mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'submitResult',student:nbStudentName(),school:nbSchool(),
          class:nbClass(),testName:tn,score,total:cor>0&&tot>0?`${cor}/${tot}`:`${score}/100`,
          answers:JSON.stringify({status,source:'ispring',score,correct:cor,total:tot})})});
    }catch(e){}
    if(battle){
      try{await fetch(window.SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'submitBattleResult',roomId:battle,studentName:nbStudentName(),school:nbSchool(),class:nbClass(),score,scorePct:score,correct:cor,total:tot,timeSec:0})});}catch(e){}
      nb.del('battleRoomId');
    }
    // Show result panel
    const rp=document.getElementById('pl-result');
    if(rp){
      rp.style.display='flex';
      const rn=document.getElementById('pl-ring-fg');
      if(rn)setTimeout(()=>{rn.style.transition='stroke-dashoffset 1.5s';rn.style.strokeDashoffset=351.9*(1-score/100);},300);
      const _s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
      _s('pl-score-num',score);_s('pl-r-name',nbStudentName());_s('pl-r-test',tn.replace(/^\[iSpring\]\s*/i,''));
      _s('pl-r-status',{passed:'✓ Đạt',completed:'✓ Hoàn thành',failed:'✗ Chưa đạt',incomplete:'⚠ Chưa xong'}[status]||status);
    }
  });
  window._plExit=()=>{document.getElementById('pl-dlg').style.display='flex';};
  window._plCloseDlg=()=>{document.getElementById('pl-dlg').style.display='none';};
  window._plForceExit=()=>location.href='select.html';
  window._plGoSel=()=>location.href='select.html';
  window._plGoResult=()=>location.href='result.html';
  window._plRetry=()=>location.reload();
  window._plGoHist=()=>location.href='history.html';
  window._plManualScore=()=>window.dispatchEvent(new MessageEvent('message',{data:{score:0,status:'completed'}}));
}
if(document.getElementById('pl-frame'))document.addEventListener('DOMContentLoaded',_plInit);

// =============================================================
// INDEX PAGE
// =============================================================
function nbIdxGoTo(url){
  document.getElementById('mainBox')?.classList?.add('idx-fade-out');
  setTimeout(()=>location.href=url,350);
}
window.nbIdxGoTo=nbIdxGoTo;

// =============================================================
// AUTO INIT
// =============================================================
document.addEventListener('DOMContentLoaded',()=>{
  const pg=location.pathname.split('/').pop()||'index.html';
  if(pg.includes('login')       &&!window._lgnInit)      {window._lgnInit=1;nbLgnInit();}
  if(pg.includes('name')        &&!window._nameInitDone) {window._nameInitDone=1;nbNameInit();}
  if(pg.includes('select')      &&!window._selectInitDone){window._selectInitDone=1;nbSelectInit();}
  if(pg.includes('quiz')        &&!window._quizInitDone) {window._quizInitDone=1;nbQuizInit();}
  if(pg.includes('result')      &&!window._resultInitDone){window._resultInitDone=1;nbResultInit();}
  if(pg.includes('history')     &&!window._histInitDone) {window._histInitDone=1;nbHistoryInit();}
  if(pg.includes('dashboard')   &&!window._dashInitDone) {window._dashInitDone=1;nbDashboardInit();}
  if(pg.includes('add-question')&&typeof nbAddQuestionInit==='function')nbAddQuestionInit();
  if(pg.includes('question-list')){}
  if(pg.includes('battle-monitor')&&!window._monInitDone){window._monInitDone=1;nbBattleMonitorInit();}
  if(pg.includes('battle')&&!pg.includes('monitor')&&!window._battleInitDone){window._battleInitDone=1;nbBattleInit();}
});
