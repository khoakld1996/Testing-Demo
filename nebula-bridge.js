/* ================================================================
   NEBULA BRIDGE v2.2 — iSpring SCORM Interceptor + DOM Scraper
   ================================================================
   ĐẶT FILE NÀY TRONG <head> của index.html của bài iSpring,
   SAU data/browsersupport.js, TRƯỚC mọi script khác.

   v2.2 Changes:
   - Thêm DOM Scraper: khi SCORM/player events không hoạt động,
     tự động quét DOM tìm element kết quả iSpring
     (div.published-rich-text chứa "% (X points)")
   - Thêm MutationObserver để phát hiện kết quả ngay khi hiện
   ================================================================ */
(function(){
  'use strict';
  if(window._nebulaBridgeReady) return;
  window._nebulaBridgeReady = true;

  var _score  = 0;
  var _max    = 0;
  var _status = '';
  var _done   = false;
  var _corEvt = 0;
  var _totEvt = 0;

  /* ────────────────────────────────────────────────
     SCORM 1.2 API
  ──────────────────────────────────────────────── */
  var _api12 = {
    _nebula: true,
    LMSInitialize:     function(){ _log('LMSInitialize'); return 'true'; },
    LMSFinish:         function(){ _log('LMSFinish score='+_score+'/'+_max); _finish(); return 'true'; },
    LMSGetLastError:   function(){ return '0'; },
    LMSGetErrorString: function(){ return 'No error'; },
    LMSGetDiagnostic:  function(){ return ''; },
    LMSGetValue: function(k){
      var map = {
        'cmi.core.lesson_status':             'not attempted',
        'cmi.core.lesson_mode':               'normal',
        'cmi.core.score.raw':                 String(_score),
        'cmi.core.score.min':                 '0',
        'cmi.core.score.max':                 String(_max || '100'),
        'cmi.core.session_time':              '',
        'cmi.core.total_time':                '0000:00:00.0',
        'cmi.suspend_data':                   '',
        'cmi.launch_data':                    '',
        'cmi.core.student_id':                localStorage.getItem('username') || 'student',
        'cmi.core.student_name':              localStorage.getItem('studentName') || '',
        'cmi.student_data.mastery_score':     '50',
        'cmi.student_data.max_time_allowed':  '',
        'cmi.student_data.time_limit_action': 'continue,no message'
      };
      return (k in map) ? map[k] : '';
    },
    LMSSetValue: function(k, v){
      _log('LMSSetValue ' + k + '=' + v);
      if(k === 'cmi.core.score.raw'){
        var nr = parseFloat(v); if(!isNaN(nr)) _score = nr;
      }
      if(k === 'cmi.core.score.max'){
        var nm = parseFloat(v); if(!isNaN(nm) && nm > 0) _max = nm;
      }
      if(k === 'cmi.core.lesson_status'){
        _status = String(v).toLowerCase();
        if(['passed','completed','failed'].indexOf(_status) >= 0) _finish();
      }
      if(k === 'cmi.core.exit' && _status) _finish();
      return 'true';
    },
    LMSCommit: function(){
      if(['passed','completed','failed'].indexOf(_status) >= 0) _finish();
      return 'true';
    }
  };

  /* ────────────────────────────────────────────────
     SCORM 2004 API
  ──────────────────────────────────────────────── */
  var _api2004 = {
    _nebula: true,
    Initialize:     function(){ _log('Initialize 2004'); return 'true'; },
    Terminate:      function(){ _log('Terminate 2004 score='+_score+'/'+_max); _finish(); return 'true'; },
    GetLastError:   function(){ return '0'; },
    GetErrorString: function(){ return 'No error'; },
    GetDiagnostic:  function(){ return ''; },
    GetValue: function(k){
      if(k === 'cmi.score.raw')             return String(_score);
      if(k === 'cmi.score.max')             return String(_max || '100');
      if(k === 'cmi.score.scaled')          return _max > 0 ? String(_score / _max) : '';
      if(k === 'cmi.learner_id')            return localStorage.getItem('username') || 'student';
      if(k === 'cmi.learner_name')          return localStorage.getItem('studentName') || '';
      if(k === 'cmi.completion_status')     return 'not attempted';
      if(k === 'cmi.success_status')        return 'unknown';
      if(k === 'cmi.entry')                 return 'ab-initio';
      if(k === 'cmi.mode')                  return 'normal';
      if(k === 'cmi.completion_threshold')  return '0.5';
      if(k === 'cmi.scaled_passing_score')  return '0.5';
      return '';
    },
    SetValue: function(k, v){
      _log('SetValue2004 ' + k + '=' + v);
      if(k === 'cmi.score.raw'){
        var nr = parseFloat(v); if(!isNaN(nr)) _score = nr;
      }
      if(k === 'cmi.score.max'){
        var nm = parseFloat(v); if(!isNaN(nm) && nm > 0) _max = nm;
      }
      if(k === 'cmi.score.scaled' && _score === 0){
        var ns = parseFloat(v); if(!isNaN(ns) && ns >= 0 && ns <= 1) _score = Math.round(ns * 100);
      }
      if(k === 'cmi.success_status'){
        _status = String(v).toLowerCase();
        if(['passed','failed'].indexOf(_status) >= 0) _finish();
      }
      if(k === 'cmi.completion_status'){
        var cs = String(v).toLowerCase();
        if(!_status || _status === 'unknown') _status = cs;
        if(cs === 'completed') _finish();
      }
      if(k === 'cmi.exit' && _status) _finish();
      return 'true';
    },
    Commit: function(){
      if(['passed','completed','failed'].indexOf(_status) >= 0) _finish();
      return 'true';
    }
  };

  if(!window.API         || !window.API._nebula)        window.API         = _api12;
  if(!window.API_1484_11 || !window.API_1484_11._nebula) window.API_1484_11 = _api2004;

  /* ────────────────────────────────────────────────
     HOOK VÀO PLAYER EVENTS
  ──────────────────────────────────────────────── */
  function _hookPlayer(player){
    if(!player){ _log('hookPlayer: player is null'); return; }
    _log('hookPlayer: attaching events');

    function _attach(){
      try {
        if(player.passingEvent){
          player.passingEvent().addHandler(function(res){
            _log('passingEvent: ' + JSON.stringify(res));
            _fromPlayerResult(res, 'passed');
          });
        }
        if(player.failingEvent){
          player.failingEvent().addHandler(function(res){
            _log('failingEvent: ' + JSON.stringify(res));
            _fromPlayerResult(res, 'failed');
          });
        }
        if(player.completionEvent){
          player.completionEvent().addHandler(function(res){
            _log('completionEvent: ' + JSON.stringify(res));
            _fromPlayerResult(res, _status || 'completed');
          });
        }
        if(player.finishEvent){
          player.finishEvent().addHandler(function(res){
            _log('finishEvent: ' + JSON.stringify(res));
            _fromPlayerResult(res, _status || 'completed');
          });
        }
      } catch(e){ _log('attach error: ' + e); }
    }

    _attach();
    setTimeout(_attach, 500);
  }

  function _fromPlayerResult(res, status){
    if(_done) return;
    if(res && typeof res === 'object'){
      var sc  = _pick(res, ['score','Score','points','Points','percentage']);
      var mx  = _pick(res, ['maxScore','maxPoints','total','Total']);
      var cor = _pick(res, ['correctAnswers','correct','correctAnswerCount']);
      var tot = _pick(res, ['totalQuestions','questionCount','total','Total']);

      if(sc  !== null && !isNaN(parseFloat(sc)))  _score  = parseFloat(sc);
      if(mx  !== null && parseFloat(mx) > 0)       _max    = parseFloat(mx);
      if(cor !== null && parseInt(cor) > 0)         _corEvt = parseInt(cor);
      if(tot !== null && parseInt(tot) > 0)         _totEvt = parseInt(tot);
    }
    if(!_status) _status = status;
    _finish();
  }

  function _pick(obj, keys){
    for(var i = 0; i < keys.length; i++){
      if(keys[i] in obj && obj[keys[i]] !== undefined && obj[keys[i]] !== null)
        return obj[keys[i]];
    }
    return null;
  }

  /* ════════════════════════════════════════════════
     DOM SCRAPER v2.2 — Đọc trực tiếp từ element kết quả iSpring
     Kích hoạt khi SCORM/player events không trả về dữ liệu.

     iSpring render kết quả dạng:
       "2% (1 points)"   → Your Score
       "100% (45 points)" → Passing Score
       "You did not pass." / "You passed!"

     Selector: div.published-rich-text (hoặc các class liên quan)
  ════════════════════════════════════════════════ */
  var _domPollTimer   = null;
  var _domObserver    = null;
  var _domPollCount   = 0;
  var _DOM_POLL_MAX   = 300; /* 5 phút × 1 poll/giây */
  var _DOM_POLL_DELAY = 1000; /* ms */

  /* Phân tích text "2% (1 points)" hoặc "100% (45 points)" */
  function _parseScoreText(text){
    /* Khớp "X% (Y points)" */
    var m = text.match(/(\d+(?:\.\d+)?)\s*%\s*\(\s*(\d+(?:\.\d+)?)\s*points?\s*\)/i);
    if(m) return { pct: parseFloat(m[1]), pts: parseFloat(m[2]) };
    /* Khớp "X%" không có ngoặc */
    var m2 = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if(m2) return { pct: parseFloat(m2[1]), pts: null };
    /* Khớp số thẳng "X / Y" */
    var m3 = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if(m3) return { pct: null, pts: parseFloat(m3[1]), max: parseFloat(m3[2]) };
    return null;
  }

  /* Xác định trạng thái pass/fail từ text */
  function _parseStatus(text){
    var t = text.toLowerCase();
    if(t.indexOf('did not pass') >= 0 || t.indexOf('not pass') >= 0 || t.indexOf('failed') >= 0) return 'failed';
    if(t.indexOf('passed') >= 0 || t.indexOf('you pass') >= 0 || t.indexOf('congratu') >= 0) return 'passed';
    if(t.indexOf('complet') >= 0) return 'completed';
    return null;
  }

  /* ════════════════════════════════════════════════
     _scrapeDOM v2.3
     Chiến lược: đọc raw body text, dùng regex label-aware để
     phân biệt chính xác "Your Score" vs "Passing Score".
     Không dựa vào thứ tự DOM (vì iSpring render Passing trước).
  ════════════════════════════════════════════════ */
  function _scrapeDOM(){
    if(_done) return true;

    var doc     = document;
    var body    = doc.body || doc.documentElement;
    if(!body) return false;

    /* Lấy toàn bộ raw text từ body (innerText bảo toàn newline) */
    var rawText = body.innerText || body.textContent || '';
    if(!rawText) return false;

    /* Cần ít nhất có chữ "points" hoặc "pass" trên trang kết quả */
    if(rawText.toLowerCase().indexOf('points') < 0 &&
       rawText.toLowerCase().indexOf('pass')   < 0) return false;

    _log('DOM scrape v2.3 rawText length=' + rawText.length);

    var result = {
      yourPct:  null,  /* % điểm thí sinh          */
      yourPts:  null,  /* điểm thô thí sinh         */
      passPts:  null,  /* tổng điểm tối đa          */
      status:   null,
      found:    false
    };

    /* ── 1. Tìm "Your Score" / "Score" label rồi lấy số ngay sau ──
       iSpring dùng: "Your Score:\n2% (1 points)"
       hoặc inline:  "Your Score: 2% (1 points)"               */
    var yourRe = /(?:your\s+score|điểm\s+của\s+bạn)[:\s\n]*(\d+(?:\.\d+)?)\s*%\s*\(\s*(\d+(?:\.\d+)?)\s*points?\s*\)/i;
    var yourM  = rawText.match(yourRe);
    if(yourM){
      result.yourPct = parseFloat(yourM[1]);
      result.yourPts = parseFloat(yourM[2]);
      result.found   = true;
      _log('Your Score (label match): pct=' + result.yourPct + ' pts=' + result.yourPts);
    }

    /* ── 2. Tìm "Passing Score" / "Pass" label ── */
    var passRe = /(?:passing\s+score|pass(?:ing)?)[:\s\n]*(\d+(?:\.\d+)?)\s*%\s*\(\s*(\d+(?:\.\d+)?)\s*points?\s*\)/i;
    var passM  = rawText.match(passRe);
    if(passM){
      result.passPts = parseFloat(passM[2]); /* pts của Passing = total questions */
      _log('Passing Score (label match): pct=' + passM[1] + ' pts=' + result.passPts);
    }

    /* ── 3. Fallback: nếu không tìm được label, thu thập tất cả "X% (Y points)" ──
       Rồi dùng logic: pts nhỏ hơn = correct của thí sinh,
                       pts lớn hơn = tổng câu hỏi (passing score)          */
    if(!result.found){
      var allMatches = [];
      var re = /(\d+(?:\.\d+)?)\s*%\s*\(\s*(\d+(?:\.\d+)?)\s*points?\s*\)/gi;
      var m;
      while((m = re.exec(rawText)) !== null){
        allMatches.push({ pct: parseFloat(m[1]), pts: parseFloat(m[2]), idx: m.index });
      }

      _log('DOM scrape fallback: all score matches = ' + JSON.stringify(allMatches));

      if(allMatches.length === 0) return false;
      result.found = true;

      if(allMatches.length === 1){
        /* Chỉ có 1 entry → đó là điểm thí sinh */
        result.yourPct = allMatches[0].pct;
        result.yourPts = allMatches[0].pts;

      } else {
        /* Có 2+ entries:
           - Điểm thí sinh = entry có pts NHỎ HƠN (số câu đúng)
           - Passing score = entry có pts LỚN HƠN (tổng câu)
           Ví dụ: "100% (45 points)" và "2% (1 points)"
           → your = {pct:2, pts:1}, pass = {pts:45}            */

        /* Sắp xếp theo pts tăng dần */
        var sorted = allMatches.slice().sort(function(a, b){ return a.pts - b.pts; });

        /* Entry nhỏ nhất pts = thí sinh */
        result.yourPct = sorted[0].pct;
        result.yourPts = sorted[0].pts;

        /* Entry lớn nhất pts = tổng (passing score) */
        result.passPts = sorted[sorted.length - 1].pts;

        /* Nếu yourPts === passPts → thí sinh đạt tuyệt đối */
        if(result.yourPts === result.passPts) result.passPts = null;
      }
    }

    /* ── 4. Phát hiện pass/fail từ text ── */
    result.status = _parseStatus(rawText);

    /* ── 5. Tính toán kết quả cuối ── */
    var finalPct     = 0;
    var finalCorrect = 0;
    var finalTotal   = 0;

    if(result.yourPct !== null){
      finalPct = Math.min(100, Math.max(0, Math.round(result.yourPct)));
    }
    if(result.yourPts !== null){
      finalCorrect = Math.round(result.yourPts);
    }
    if(result.passPts !== null){
      finalTotal = Math.round(result.passPts);
    }

    /* Nếu chưa có pct, tính từ correct/total */
    if(finalPct === 0 && finalCorrect > 0 && finalTotal > 0){
      finalPct = Math.min(100, Math.round((finalCorrect / finalTotal) * 100));
    }

    var finalStatus = result.status || (finalPct >= 50 ? 'passed' : 'failed');

    _log('DOM scrape RESULT → pct=' + finalPct +
         ' correct=' + finalCorrect + '/' + finalTotal +
         ' status=' + finalStatus);

    if(finalPct > 0 || finalCorrect > 0){
      if(_score === 0)  _score  = finalPct;
      if(_max   === 0)  _max    = 100;
      if(!_status)      _status = finalStatus;
      if(_corEvt === 0) _corEvt = finalCorrect;
      if(_totEvt === 0) _totEvt = finalTotal;
      _finish();
      return true;
    }

    return false;
  }

  /* ── Khởi động DOM polling + MutationObserver ── */
  function _startDOMWatch(){
    _log('DOM Watch started');

    /* MutationObserver: phát hiện ngay khi kết quả render */
    if(typeof MutationObserver !== 'undefined'){
      try {
        _domObserver = new MutationObserver(function(mutations){
          /* Chỉ kiểm tra khi có thêm node mới */
          var hasNew = false;
          for(var i = 0; i < mutations.length; i++){
            if(mutations[i].addedNodes.length > 0){ hasNew = true; break; }
          }
          if(!hasNew) return;

          /* Kiểm tra nếu đã xuất hiện element chứa "points" */
          var bodyTxt = document.body ? (document.body.innerText || document.body.textContent || '') : '';
          if(bodyTxt.indexOf('points') >= 0 || bodyTxt.indexOf('pass') >= 0){
            if(_scrapeDOM()){
              _stopDOMWatch();
            }
          }
        });

        _domObserver.observe(document.documentElement || document.body, {
          childList: true,
          subtree:   true
        });
        _log('MutationObserver attached');
      } catch(e){
        _log('MutationObserver error: ' + e);
      }
    }

    /* Polling backup: chạy mỗi giây */
    _domPollTimer = setInterval(function(){
      _domPollCount++;
      if(_done || _domPollCount > _DOM_POLL_MAX){
        _stopDOMWatch();
        return;
      }
      /* Chỉ scrape nếu trang có text "points" (trang kết quả iSpring) */
      var bodyTxt = document.body ? (document.body.innerText || document.body.textContent || '') : '';
      if(bodyTxt.indexOf('points') >= 0 || bodyTxt.indexOf('pass') >= 0){
        if(_scrapeDOM()) _stopDOMWatch();
      }
    }, _DOM_POLL_DELAY);
  }

  function _stopDOMWatch(){
    if(_domObserver){ try{ _domObserver.disconnect(); }catch(e){} _domObserver = null; }
    if(_domPollTimer){ clearInterval(_domPollTimer); _domPollTimer = null; }
    _log('DOM Watch stopped');
  }

  /* Bắt đầu watch DOM sau khi trang load */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _startDOMWatch);
  } else {
    _startDOMWatch();
  }

  /* ────────────────────────────────────────────────
     VÁ QuizPlayer.start
  ──────────────────────────────────────────────── */
  function _wrapQP(qp){
    if(!qp || qp._nbPatched) return qp;
    qp._nbPatched = true;
    var origStart = qp.start;
    qp.start = function(){
      var args = Array.prototype.slice.call(arguments);

      for(var i = 0; i < args.length; i++){
        if(args[i] === 'prompt' || args[i] === 'cloud'){
          _log('Mode patched: "' + args[i] + '" → "lms"');
          args[i] = 'lms';
        }
      }

      for(var j = args.length - 1; j >= 0; j--){
        if(typeof args[j] === 'function'){
          (function(origCb){
            args[j] = function(player){
              _hookPlayer(player);
              return origCb(player);
            };
          })(args[j]);
          break;
        }
      }

      _log('QuizPlayer.start() intercepted, mode=lms');
      return origStart.apply(this, args);
    };
    return qp;
  }

  if(window.QuizPlayer){ _wrapQP(window.QuizPlayer); }

  var _qpValue = window.QuizPlayer || undefined;
  try {
    Object.defineProperty(window, 'QuizPlayer', {
      configurable: true,
      enumerable:   true,
      get: function(){ return _qpValue; },
      set: function(val){
        _log('QuizPlayer assigned → wrapping');
        _qpValue = _wrapQP(val);
        try {
          Object.defineProperty(window, 'QuizPlayer', {
            configurable: true, writable: true,
            enumerable: true,   value: _qpValue
          });
        } catch(e){}
      }
    });
  } catch(e){
    _log('defineProperty not supported: ' + e);
    var _pollCount = 0;
    var _poll = setInterval(function(){
      _pollCount++;
      if(window.QuizPlayer){ _wrapQP(window.QuizPlayer); clearInterval(_poll); }
      if(_pollCount > 50)  clearInterval(_poll);
    }, 50);
  }

  /* ────────────────────────────────────────────────
     TỔNG HỢP KẾT QUẢ & GỬI VỀ player.html
  ──────────────────────────────────────────────── */
  function _finish(){
    if(_done) return;
    _done = true;
    _stopDOMWatch();

    var cor = _corEvt || Math.round(_score);
    var tot = _totEvt || Math.round(_max);
    var pct = 0;

    if(_max > 0){
      pct = Math.min(100, Math.round((_score / _max) * 100));
    } else if(_score > 0 && _score <= 1){
      pct = Math.round(_score * 100);
    } else {
      pct = Math.min(100, Math.max(0, Math.round(_score)));
    }

    var st = _status || 'completed';
    _log('FINISH → pct=' + pct + ' cor=' + cor + '/' + tot + ' st=' + st);

    try {
      window.parent.postMessage({
        nebula_ispring_done: true,
        score:   pct,
        correct: cor,
        total:   tot,
        status:  st,
        raw:     _score,
        max:     _max
      }, '*');
    } catch(e){}

    setTimeout(function(){
      if(!_done) return;
      var base = location.href;
      var qi   = base.indexOf('/quizzes/');
      var root = qi >= 0
                 ? base.substring(0, qi)
                 : base.split('/').slice(0, -3).join('/');
      var url  = root + '/result.html?nb_isp=1'
               + '&score='   + pct
               + '&correct=' + cor
               + '&total='   + tot
               + '&status='  + st;
      _log('Redirect → ' + url);
      location.href = url;
    }, 1200);
  }

  /* ────────────────────────────────────────────────
     NHẬN postMessage từ quiz iframe
  ──────────────────────────────────────────────── */
  window.addEventListener('message', function(e){
    var d = e.data;
    if(!d || !d.nebula_ispring_done) return;
    _log('postMessage received from iframe');
    if(d.score  !== undefined) _score  = d.raw   || d.score;
    if(d.max    !== undefined) _max    = d.max;
    if(d.status !== undefined) _status = d.status;
    if(d.correct > 0)          _corEvt = d.correct;
    if(d.total   > 0)          _totEvt = d.total;
    _finish();
  });

  function _log(msg){
    if(typeof console !== 'undefined') console.log('[NebulaBridge v2.2]', msg);
  }

})();