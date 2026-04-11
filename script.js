/* ================================================================
   NEBULA QUIZ SYSTEM — script.js  (v2026)
   JS tập trung cho toàn dự án.
   Dùng `defer` hoặc đặt cuối <body>.
   ================================================================ */
'use strict';

/* ─── CONFIG ─── */
const NB_API = "https://script.google.com/macros/s/AKfycbxR9imqpVxYMB4M7CmV_C-ZiVO9nhRJTGwz44O0dlz0_Ru1dbBuToiOj8ciUE0TgSWT/exec";

/* Backward-compat aliases — code cũ trong HTML vẫn chạy được */
window.API       = NB_API;
window.API_URL   = NB_API;
window.SCRIPT_URL= NB_API;

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
/* Compat wrappers dùng trong dashboard.html gốc */
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

/* ─── SWAL WRAPPERS ─── */
function nbToast(icon, title, timer=2200){
  if(typeof Swal==='undefined') return;
  Swal.fire({ icon, title, timer, showConfirmButton:false,
    background:'#0f172a', color:'#f1f5f9' });
}
function nbAlert(icon, title, text=''){
  if(typeof Swal==='undefined') return Promise.resolve();
  return Swal.fire({ icon, title, text, background:'#0f172a', color:'#f1f5f9' });
}
function nbConfirm(opts={}){
  if(typeof Swal==='undefined')
    return Promise.resolve({ isConfirmed: confirm(opts.text||'?') });
  return Swal.fire(Object.assign({
    showCancelButton:true, cancelButtonText:'Hủy',
    background:'#0f172a', color:'#f1f5f9'
  }, opts));
}
function nbLoading(title='Đang xử lý...'){
  if(typeof Swal==='undefined') return;
  Swal.fire({ title, didOpen:()=>Swal.showLoading(),
    background:'#0f172a', color:'#f1f5f9', allowOutsideClick:false });
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
  if(type==='ordering')                        return order(userAns)===order(correctAns);
  if(type==='multiple'||type==='matching')     return sort(userAns) ===sort(correctAns);
  /* fill: nhiều đáp án chấp nhận, phân cách bằng | */
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
  if(pw.length>=8)          s++;
  if(/[A-Z]/.test(pw))      s++;
  if(/[0-9]/.test(pw))      s++;
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

/* ──────────────────────────────────────────────
   PAGE: dashboard.html
   – Export kết quả (CSV)
   – Auto-refresh khi có tài khoản mới
   – Chart: tỉ lệ đúng/sai của từng bài
   – iSpring config copy
   – Tất cả các functions gốc giữ nguyên logic
   ────────────────────────────────────────────── */
window.nbDashboardInit = function(){
  /* Kiểm tra quyền admin */
  if(nb.get('userRole')!=='admin'){ location.replace('index.html'); return; }

  /* Khởi tạo log/status helpers cho dashboard */
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
    if(el){ el.className=`api-status ${type}`; el.innerHTML=`<span class="dot"></span> ${text}`; }
  };

  /* Logout */
  window.logout = function(){
    nbConfirm({ title:'Đăng xuất?', icon:'warning', confirmButtonText:'Đăng xuất',
      confirmButtonColor:'#ef4444' }).then(r=>{ if(r.isConfirmed){ nb.clear(); location.replace('index.html'); }});
  };

  /* Export tất cả kết quả (FIX lỗi export) */
  window.exportResults = function(){
    /* lấy từ biến results đã load */
    const data = window._nbResults || [];
    if(!data.length){ nbToast('warning','Chưa có dữ liệu kết quả để xuất!'); return; }
    const rows = data.map(r=>({
      'Học sinh': r.student||'',
      'Trường':   r.school||'',
      'Bài thi':  r.testName||'',
      'Điểm':     r.score||'',
      'Tổng câu': r.total||'',
      'Thời gian':nbFmtTime(r.time)
    }));
    nbExportCSV(rows, `ket-qua-${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`);
    nbToast('success',`Đã xuất ${rows.length} kết quả!`);
  };

  /* Export iSpring results */
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

  /* Render chart: top bài có điểm TB cao nhất */
  window.nbRenderDashChart = function(results){
    const canvas=document.getElementById('chartEl');
    if(!canvas||typeof Chart==='undefined') return;
    /* Thống kê giỏi/trung/yếu */
    const s=[0,0,0];
    (results||[]).forEach(r=>{
      const v=parseFloat(r.score||0);
      if(v>=8)s[0]++;
      else if(v>=5)s[1]++;
      else s[2]++;
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
        maintainAspectRatio:false, cutout:'65%',
        plugins:{
          legend:{ position:'right', labels:{ color:'#94a3b8', font:{size:10}, usePointStyle:true }},
          tooltip:{ callbacks:{ label:(c)=>{
            const total=s.reduce((a,b)=>a+b,1);
            return ` ${c.label}: ${c.raw} (${((c.raw/total)*100).toFixed(0)}%)`;
          }}}
        }
      }
    });
  };

  /* Auto-refresh pending users mỗi 30s */
  nbStartAutoRefresh(async ()=>{
    const newPending = await callAPI('getPendingUsers').catch(()=>null);
    if(!newPending) return;
    const old = window._nbPending || [];
    window._nbPending = newPending;
    if(newPending.length > old.length){
      nbToast('info',`🔔 Có ${newPending.length - old.length} tài khoản mới đăng ký!`);
    }
    document.getElementById('cPending').innerText = newPending.length;
    if(window.renderPending) window.renderPending();
  }, 30000);
};

/* ──────────────────────────────────────────────
   PAGE: add-question.html
   – Nhiều đáp án điền khuyết (phân cách |)
   – Mỗi đáp án có upload/link hình ảnh
   – Tất cả loại câu hỏi mở rộng
   ────────────────────────────────────────────── */
window.nbAddQuestionInit = function(){
  window._aqEditMode    = false;
  window._aqOriginalQ   = '';
  window._aqQCount      = 0;

  /* renderEditor là hàm chính, gọi khi đổi loại */
  window.renderEditor = function(){
    const type = document.getElementById('qType').value;
    const list = document.getElementById('ansList');
    const addBtn= document.getElementById('addBtn');
    list.innerHTML='';
    if(addBtn) addBtn.style.display=['tf','fill'].includes(type)?'none':'block';

    if(type==='tf'){
      list.innerHTML=`
        <div class="ans-row">
          <i class="fas fa-question-circle" style="color:rgba(79,172,254,.8)"></i>
          <select id="tfCorrect" class="input-control" onchange="updateCorrectStr()">
            <option value="Đúng">✅ LỰA CHỌN: ĐÚNG (TRUE)</option>
            <option value="Sai">❌ LỰA CHỌN: SAI (FALSE)</option>
          </select>
        </div>`;
    } else if(type==='fill'){
      /* Multi-answer fill */
      list.innerHTML=`
        <p style="font-size:.78rem;color:rgba(124,77,255,.9);margin-bottom:10px">
          <i class="fas fa-info-circle"></i>
          Có thể thêm nhiều đáp án được chấp nhận (phân cách bằng |)
        </p>
        <div class="fill-ans-wrap" id="fillList">
          <div class="fill-ans-item">
            <i class="fas fa-check-circle" style="color:rgba(0,230,118,.7)"></i>
            <input type="text" class="input-control fill-ans-input"
              placeholder="Đáp án đúng #1..." oninput="updateCorrectStr()">
            <button type="button" onclick="addFillAnswer()"
              class="btn-add-ans" style="padding:8px 12px;white-space:nowrap">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>`;
    } else {
      /* single, multiple, matching, ordering */
      addAnsRow(); addAnsRow();
    }
    updateCorrectStr();
  };

  window.addFillAnswer = function(){
    const list=document.getElementById('fillList');
    const div=document.createElement('div');
    div.className='fill-ans-item';
    div.innerHTML=`
      <i class="fas fa-check-circle" style="color:rgba(0,230,118,.7)"></i>
      <input type="text" class="input-control fill-ans-input"
        placeholder="Đáp án đúng #${list.children.length+1}..." oninput="updateCorrectStr()">
      <button type="button" onclick="this.parentElement.remove();updateCorrectStr()"
        style="background:rgba(255,71,87,.15);color:#ff4757;border:none;border-radius:8px;
          padding:8px;cursor:pointer;font-size:.8rem">
        <i class="fas fa-times"></i>
      </button>`;
    list.appendChild(div);
  };

  /* addAnsRow: thêm 1 hàng đáp án với tuỳ chọn hình ảnh */
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
        <i class="fas fa-image"></i>
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
          ${data?.isCorrect?'checked':''} onchange="updateCorrectStr()">
        ${imgThumbHtml}
        <input type="text" class="ans-text input-control"
          placeholder="Nội dung đáp án..." value="${nbEsc(data?.text||data?.value||'')}"
          oninput="updateCorrectStr()">`;
    } else if(type==='matching'){
      html=`
        <input type="text" class="l-val input-control" placeholder="Vế A"
          value="${nbEsc(data?.left||'')}" oninput="updateCorrectStr()">
        <i class="fas fa-arrows-alt-h" style="color:rgba(79,172,254,.7);flex-shrink:0"></i>
        <input type="text" class="r-val input-control" placeholder="Vế B"
          value="${nbEsc(data?.right||'')}" oninput="updateCorrectStr()">`;
    } else if(type==='ordering'){
      html=`
        <span style="color:rgba(79,172,254,.8);font-weight:800;flex-shrink:0">#</span>
        ${imgThumbHtml}
        <input type="text" class="ord-val input-control"
          placeholder="Bước thực hiện..." value="${nbEsc(data?.text||data?.value||'')}"
          oninput="updateCorrectStr()">`;
    }

    div.innerHTML=html+`
      <button type="button"
        style="background:rgba(255,71,87,.12);color:#ff4757;border:none;border-radius:8px;
          padding:8px;cursor:pointer;flex-shrink:0"
        onclick="this.closest('.ans-row').remove();updateCorrectStr()">
        <i class="fas fa-trash-alt"></i>
      </button>`;
    list.appendChild(div);
  };

  /* Trigger hidden file input cho ảnh từng đáp án */
  window.triggerAnsImgUpload = function(placeholder){
    const input=document.createElement('input');
    input.type='file'; input.accept='image/*';
    input.onchange=function(){
      const file=input.files[0]; if(!file) return;
      if(file.size>500*1024){
        nbToast('warning','Ảnh quá lớn! Tối đa 500KB'); return;
      }
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

  /* updateCorrectStr: build chuỗi đáp án đúng */
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

  /* toggleScoreUI */
  window.toggleScoreUI = function(){
    const mode=document.getElementById('scoreMode')?.value;
    const boxEq=document.getElementById('boxTotalScore');
    const boxCust=document.getElementById('boxPoint');
    if(boxEq) boxEq.style.display=mode==='equal'?'block':'none';
    if(boxCust) boxCust.style.display=mode==='custom'?'block':'none';
  };

  /* calculatePreviewPoints */
  window.calculatePreviewPoints = function(){
    const total=parseFloat(document.getElementById('totalScore')?.value)||0;
    let count=window._aqEditMode?window._aqQCount:(window._aqQCount+1);
    const preview=document.getElementById('scorePreview');
    if(preview) preview.innerText=`Dự kiến: ${(total/(count||1)).toFixed(2)} điểm/câu`;
  };

  /* Image preview for question */
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
  window.updatePreview = window.updateQPreview; // compat

  /* fillEditData */
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
      /* fill multi */
      const fillList=document.getElementById('fillList');
      if(fillList&&data.correct){
        const answers=String(data.correct).split('|');
        fillList.innerHTML=''; /* clear default */
        answers.forEach((ans,idx)=>{
          const d=document.createElement('div');
          d.className='fill-ans-item';
          d.innerHTML=`
            <i class="fas fa-check-circle" style="color:rgba(0,230,118,.7)"></i>
            <input type="text" class="input-control fill-ans-input"
              value="${nbEsc(ans)}" placeholder="Đáp án #${idx+1}" oninput="updateCorrectStr()">
            ${idx>0?`<button type="button" onclick="this.parentElement.remove();updateCorrectStr()"
              style="background:rgba(255,71,87,.15);color:#ff4757;border:none;border-radius:8px;padding:8px;cursor:pointer">
              <i class="fas fa-times"></i></button>`:''}`;
          fillList.appendChild(d);
        });
      }
    } else if(ansObj&&ansObj.items){
      document.getElementById('addBtn').style.display='block';
      ansObj.items.forEach(it=>addAnsRow(it));
    }
    updateCorrectStr();
  };

  /* fetchQuestionStats */
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

  /* saveData — gửi lên AppScript */
  window.saveData = async function(){
    const btn=document.getElementById('saveBtn');
    const testData=JSON.parse(localStorage.getItem('currentTest'));
    const question=document.getElementById('qText').value.trim();
    const correct=document.getElementById('finalCorrect').value.trim();
    const type=document.getElementById('qType').value;

    if(!question) return nbAlert('error','Lỗi','Câu hỏi không được bỏ trống!');
    if(!correct&&type!=='fill')
      return nbAlert('warning','Thiếu đáp án','Vui lòng thiết lập ít nhất 1 đáp án đúng!');

    btn.disabled=true;
    btn.innerHTML='<i class="fas fa-meteor fa-spin"></i> ĐANG ĐỒNG BỘ...';

    /* Build answer object */
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
      setTimeout(()=>location.href='question-list.html',1600);
    }catch(err){
      nbAlert('error','Lỗi Cloud','Hệ thống bận, vui lòng thử lại!');
      btn.disabled=false;
      btn.innerHTML='THỬ LẠI NGAY';
    }
  };
};

/* ──────────────────────────────────────────────
   Auto-init theo trang hiện tại
   ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  const path=window.location.pathname;
  if(path.includes('dashboard.html'))    nbDashboardInit();
  if(path.includes('add-question.html')) nbAddQuestionInit();
});
