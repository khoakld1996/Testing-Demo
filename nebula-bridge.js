/* ================================================================
   NEBULA BRIDGE — iSpring Score Reporter  v1.0
   ================================================================
   Đặt file này vào thư mục gốc dự án (cùng cấp với player.html).
   Sau đó thêm vào quiz index.html TRƯỚC </body>:

       <script src="../../nebula-bridge.js"></script>
       (điều chỉnh đường dẫn tương đối cho phù hợp)

   Sau khi thêm, điểm số được gửi TỰ ĐỘNG về result.html và
   dashboard — không cần thao tác thủ công, chạy được trên mọi
   trình duyệt và giao thức (file:// lẫn http://).
   ================================================================ */

(function(){
  'use strict';

  /* ── State ── */
  var _score   = 0;    /* cmi.core.score.raw  */
  var _max     = 0;    /* cmi.core.score.max  */
  var _status  = '';   /* passed / completed / failed */
  var _done    = false;

  /* ─────────────────────────────────────────────────────────────
     SCORM 1.2 API — định nghĩa TRONG context của quiz (không cần
     cross-frame). iSpring sẽ tìm window.API trước window.parent.API.
     ───────────────────────────────────────────────────────────── */
  function _buildApi(){
    return {
      _nebula: 1,
      LMSInitialize: function(){ return 'true'; },
      LMSFinish:     function(){ _triggerDone(); return 'true'; },
      LMSGetLastError:   function(){ return '0'; },
      LMSGetErrorString: function(){ return 'No error'; },
      LMSGetDiagnostic:  function(){ return ''; },
      LMSGetValue: function(k){
        var tbl = {
          'cmi.core.lesson_status':             'not attempted',
          'cmi.core.lesson_mode':               'normal',
          'cmi.core.score.raw':                 '',
          'cmi.core.score.min':                 '0',
          'cmi.core.score.max':                 '100',
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
        return (tbl[k] !== undefined) ? tbl[k] : '';
      },
      LMSSetValue: function(k, v){
        if(k === 'cmi.core.score.raw'){
          var n = parseFloat(v);
          if(!isNaN(n)){ _score = n; }
        }
        if(k === 'cmi.core.score.max'){
          var n = parseFloat(v);
          if(!isNaN(n) && n > 0){ _max = n; }
        }
        if(k === 'cmi.core.lesson_status'){
          _status = String(v).toLowerCase();
          if(['passed','completed','failed'].indexOf(_status) >= 0) _triggerDone();
        }
        if(k === 'cmi.core.exit' && _status) _triggerDone();
        return 'true';
      },
      LMSCommit: function(){
        if(['passed','completed','failed'].indexOf(_status) >= 0) _triggerDone();
        return 'true';
      }
    };
  }

  /* Cài API vào window của quiz (cùng context — không bị block) */
  if(!window.API || !window.API._nebula){
    window.API = _buildApi();
  }
  /* Cũng thử set vào window.parent phòng trường hợp HTTP same-origin */
  try{
    if(window.parent && window.parent !== window && !window.parent.API){
      window.parent.API = window.API;
    }
  }catch(e){}

  /* ─────────────────────────────────────────────────────────────
     PATCH QuizPlayer.start — đổi "prompt" → "lms"
     "prompt" = gửi lên iSpring cloud (bypass SCORM hoàn toàn)
     "lms"    = dùng window.API (SCORM của chúng ta ở trên)
     ───────────────────────────────────────────────────────────── */
  var _origQP = null;
  function _patchQP(){
    if(typeof QuizPlayer !== 'undefined' && QuizPlayer.start && !_origQP){
      _origQP = QuizPlayer.start;
      QuizPlayer.start = function(){
        var args = Array.prototype.slice.call(arguments);
        for(var i = 0; i < args.length; i++){
          if(args[i] === 'prompt' || args[i] === 'cloud'){
            args[i] = 'lms';
            break;
          }
        }
        return _origQP.apply(this, args);
      };
    }
  }

  /* Patch ngay + khi DOM sẵn sàng (QuizPlayer có thể load sau) */
  _patchQP();
  document.addEventListener('DOMContentLoaded', _patchQP);
  setTimeout(_patchQP, 50);
  setTimeout(_patchQP, 300);

  /* ─────────────────────────────────────────────────────────────
     _triggerDone — Thu thập kết quả và gửi về Nebula
     ───────────────────────────────────────────────────────────── */
  function _triggerDone(){
    if(_done) return;
    _done = true;

    /* Tính điểm % */
    var pct = 0;
    var cor = 0;
    var tot = 0;

    if(_max > 0){
      /* iSpring gửi raw = số điểm (ví dụ: 1/45) → tính % */
      cor = Math.round(_score);
      tot = Math.round(_max);
      pct = Math.min(100, Math.round((_score / _max) * 100));
    } else if(_score > 0 && _score <= 1){
      /* scaled 0-1 */
      pct = Math.round(_score * 100);
    } else {
      /* raw là % trực tiếp */
      pct = Math.min(100, Math.max(0, Math.round(_score)));
    }

    var st = _status || 'completed';

    /* 1. postMessage lên player.html (hoạt động khi chạy qua HTTP) */
    try{
      window.parent.postMessage({
        nebula_ispring_done: true,
        score:   pct,
        correct: cor,
        total:   tot,
        status:  st
      }, '*');
    }catch(e){}

    /* 2. Chuyển hướng trực tiếp đến result.html với URL params
          (hoạt động cả file:// — không cần cross-frame) */
    var url = _buildResultUrl(pct, cor, tot, st);
    if(url){
      setTimeout(function(){
        if(_done) location.href = url;
      }, 800);
    }
  }

  /* Tìm đường dẫn đến result.html từ vị trí quiz hiện tại */
  function _buildResultUrl(pct, cor, tot, st){
    try{
      var here  = location.href.split('?')[0];
      var proto = location.protocol;
      var host  = location.host; /* rỗng khi file:// */

      /* Tìm vị trí thư mục "quizzes" trong URL */
      var quizIdx = here.toLowerCase().indexOf('/quizzes/');
      var base;

      if(quizIdx >= 0){
        /* Cắt tại /quizzes/ → lấy phần trước đó */
        base = here.substring(0, quizIdx);
      } else {
        /* Fallback: đi lên 2 cấp từ index.html */
        var parts = here.split('/');
        parts.pop();   /* bỏ index.html */
        parts.pop();   /* bỏ tên thư mục quiz */
        base = parts.join('/');
      }

      var params = '?nb_isp=1&score='+pct+'&correct='+cor+'&total='+tot+'&status='+st;
      return base + '/result.html' + params;
    }catch(e){ return null; }
  }

})();
