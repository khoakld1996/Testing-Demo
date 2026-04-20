/* ================================================================
   NEBULA BRIDGE v2.0 — iSpring SCORM Interceptor
   ================================================================
   File này được player.html tự động inject vào quiz — KHÔNG cần
   thêm tay vào từng quiz's index.html.

   Cách hoạt động:
   1. player.html inject file này vào iframe sau khi quiz load
   2. Bridge override window.API (SCORM) trong context của quiz
   3. Khi iSpring gọi LMSSetValue(score) → bridge bắt điểm
   4. Khi quiz xong → bridge gửi postMessage lên player.html
   5. player.html nhận → lưu GAS → result.html
   ================================================================ */
(function(){
  'use strict';
  if(window._nebulaBridgeReady) return; /* không chạy 2 lần */
  window._nebulaBridgeReady = true;

  var _score  = 0;
  var _max    = 0;
  var _status = '';
  var _done   = false;

  /* ── SCORM 1.2 API ── */
  var _api12 = {
    _nebula: true,
    LMSInitialize:     function(){ _log('LMSInitialize'); return 'true'; },
    LMSFinish:         function(){ _log('LMSFinish, score='+_score+'/'+_max); _done12(); return 'true'; },
    LMSGetLastError:   function(){ return '0'; },
    LMSGetErrorString: function(){ return 'No error'; },
    LMSGetDiagnostic:  function(){ return ''; },
    LMSGetValue: function(k){
      var map = {
        'cmi.core.lesson_status':             'not attempted',
        'cmi.core.lesson_mode':               'normal',
        'cmi.core.score.raw':                 String(_score),
        'cmi.core.score.min':                 '0',
        'cmi.core.score.max':                 String(_max||'100'),
        'cmi.core.session_time':              '',
        'cmi.core.total_time':                '0000:00:00.0',
        'cmi.suspend_data':                   '',
        'cmi.launch_data':                    '',
        'cmi.core.student_id':                localStorage.getItem('username')||'student',
        'cmi.core.student_name':              localStorage.getItem('studentName')||'',
        'cmi.student_data.mastery_score':     '50',
        'cmi.student_data.max_time_allowed':  '',
        'cmi.student_data.time_limit_action': 'continue,no message'
      };
      return (k in map) ? map[k] : '';
    },
    LMSSetValue: function(k, v){
      _log('SetValue '+k+'='+v);
      if(k === 'cmi.core.score.raw'){
        var n=parseFloat(v); if(!isNaN(n)) _score=n;
      }
      if(k === 'cmi.core.score.max'){
        var n=parseFloat(v); if(!isNaN(n)&&n>0) _max=n;
      }
      if(k === 'cmi.core.lesson_status'){
        _status=String(v).toLowerCase();
        if(['passed','completed','failed'].indexOf(_status)>=0) _done12();
      }
      if(k === 'cmi.core.exit' && _status) _done12();
      return 'true';
    },
    LMSCommit: function(){
      if(['passed','completed','failed'].indexOf(_status)>=0) _done12();
      return 'true';
    }
  };

  /* ── SCORM 2004 API ── */
  var _api2004 = {
    _nebula: true,
    Initialize:     function(){ _log('Initialize 2004'); return 'true'; },
    Terminate:      function(){ _log('Terminate 2004, score='+_score+'/'+_max); _done12(); return 'true'; },
    GetLastError:   function(){ return '0'; },
    GetErrorString: function(){ return 'No error'; },
    GetDiagnostic:  function(){ return ''; },
    GetValue: function(k){
      if(k==='cmi.score.raw')     return String(_score);
      if(k==='cmi.score.max')     return String(_max||'100');
      if(k==='cmi.score.scaled')  return _max>0?String(_score/_max):'';
      if(k==='cmi.learner_id')    return localStorage.getItem('username')||'student';
      if(k==='cmi.learner_name')  return localStorage.getItem('studentName')||'';
      if(k==='cmi.completion_status')    return 'not attempted';
      if(k==='cmi.success_status')       return 'unknown';
      if(k==='cmi.entry')                return 'ab-initio';
      if(k==='cmi.mode')                 return 'normal';
      if(k==='cmi.completion_threshold') return '0.5';
      if(k==='cmi.scaled_passing_score') return '0.5';
      return '';
    },
    SetValue: function(k, v){
      _log('SetValue2004 '+k+'='+v);
      if(k==='cmi.score.raw'){
        var n=parseFloat(v); if(!isNaN(n)) _score=n;
      }
      if(k==='cmi.score.max'){
        var n=parseFloat(v); if(!isNaN(n)&&n>0) _max=n;
      }
      if(k==='cmi.score.scaled'&&_score===0){
        var n=parseFloat(v); if(!isNaN(n)&&n>=0&&n<=1) _score=Math.round(n*100);
      }
      if(k==='cmi.success_status'){
        _status=String(v).toLowerCase();
        if(['passed','failed'].indexOf(_status)>=0) _done12();
      }
      if(k==='cmi.completion_status'){
        var cs=String(v).toLowerCase();
        if(!_status||_status==='unknown') _status=cs;
        if(cs==='completed') _done12();
      }
      if(k==='cmi.exit'&&_status) _done12();
      return 'true';
    },
    Commit: function(){
      if(['passed','completed','failed'].indexOf(_status)>=0) _done12();
      return 'true';
    }
  };

  /* ── Cài API vào window quiz (cùng context → không bị block) ── */
  if(!window.API||!window.API._nebula)    window.API         = _api12;
  if(!window.API_1484_11||!window.API_1484_11._nebula) window.API_1484_11 = _api2004;

  /* ── Khi xong quiz → gửi kết quả về player.html ── */
  function _done12(){
    if(_done) return;
    _done = true;

    var pct=0, cor=0, tot=0;
    if(_max>0){
      cor=Math.round(_score);
      tot=Math.round(_max);
      pct=Math.min(100,Math.round((_score/_max)*100));
    } else if(_score>0&&_score<=1){
      pct=Math.round(_score*100);
    } else {
      pct=Math.min(100,Math.max(0,Math.round(_score)));
    }

    var st=_status||'completed';
    _log('DONE pct='+pct+' cor='+cor+'/'+tot+' st='+st);

    /* postMessage lên player.html (hoạt động HTTP same-origin) */
    try{
      window.parent.postMessage({
        nebula_ispring_done: true,
        score:   pct,
        correct: cor,
        total:   tot,
        status:  st,
        raw:     _score,
        max:     _max
      }, '*');
    }catch(e){}

    /* Fallback redirect với URL params (hoạt động cả file://) */
    setTimeout(function(){
      if(!_done) return;
      var base = location.href;
      var qi   = base.indexOf('/quizzes/');
      var root = qi>=0 ? base.substring(0,qi) : base.split('/').slice(0,-3).join('/');
      var url  = root+'/result.html?nb_isp=1&score='+pct+'&correct='+cor+'&total='+tot+'&status='+st;
      location.href = url;
    }, 1200);
  }

  function _log(msg){
    if(typeof console!=='undefined') console.log('[NebulaBridge]', msg);
  }

  /* Patch QuizPlayer nếu iSpring dùng mode "prompt" thay vì "lms" */
  function _patchQP(){
    if(typeof QuizPlayer!=='undefined'&&QuizPlayer.start&&!QuizPlayer._nbPatched){
      QuizPlayer._nbPatched=true;
      var orig=QuizPlayer.start;
      QuizPlayer.start=function(){
        var args=Array.prototype.slice.call(arguments);
        for(var i=0;i<args.length;i++){
          if(args[i]==='prompt'||args[i]==='cloud') args[i]='lms';
        }
        return orig.apply(this,args);
      };
    }
  }
  _patchQP();
  document.addEventListener('DOMContentLoaded',_patchQP);
  setTimeout(_patchQP,50);
  setTimeout(_patchQP,400);

})();
