/* ================================================================
 * nebula-bridge.js v3.0
 * Chèn vào folder iSpring để bắt kết quả và gửi về Nebula
 * ================================================================
 * Cách dùng:
 *   1. Copy file này vào cùng thư mục với index.html của iSpring
 *   2. Chèn vào index.html của iSpring (trước </body>):
 *      <script src="nebula-bridge.js"></script>
 *   3. Script tự động lắng nghe kết quả từ iSpring SDK
 * ================================================================ */

(function(){
  'use strict';

  var _sent = false;

  /* ── Gửi kết quả lên parent window (player.html) ── */
  function sendResult(score, status, correct, total){
    if(_sent) return;
    _sent = true;

    var payload = {
      type:    'nebula_result',
      score:   Math.min(100, Math.max(0, parseInt(score) || 0)),
      status:  status  || 'completed',
      correct: parseInt(correct) || 0,
      total:   parseInt(total)   || 0,
      ts:      Date.now()
    };

    /* Gửi lên player.html qua postMessage */
    try { window.parent.postMessage(payload, '*'); } catch(e){}
    try { window.top.postMessage(payload, '*');    } catch(e){}

    /* Nếu không có parent (test trực tiếp), redirect về result.html */
    if(window.parent === window || window.top === window){
      var qs = '?nb_isp=1&score='+payload.score+'&status='+payload.status;
      if(payload.correct) qs += '&correct='+payload.correct+'&total='+payload.total;
      setTimeout(function(){ location.href = '../result.html' + qs; }, 800);
    }
  }

  /* ── Lắng nghe iSpring SDK events ── */

  /* 1. iSpring Player API (recommended) */
  if(typeof ispring !== 'undefined' && ispring.player){
    try{
      ispring.player.on('finish', function(data){
        sendResult(
          data && data.score ? data.score : 0,
          data && data.passed ? 'passed' : 'completed',
          data && data.correctAnswers,
          data && data.totalQuestions
        );
      });
    }catch(e){}
  }

  /* 2. SCORM 1.2 / 2004 intercept */
  function _hookScorm(){
    var api = window.API || window.API_1484_11;
    if(!api) return false;

    var _orig12 = api.LMSFinish || api.Terminate || null;

    function _intercept12(){
      var score  = 0, status = 'completed', cor = 0, tot = 0;
      try{
        score  = parseInt(api.LMSGetValue('cmi.core.score.raw') || api.GetValue('cmi.score.raw') || 0) || 0;
        status = api.LMSGetValue('cmi.core.lesson_status') || api.GetValue('cmi.success_status') || 'completed';
        cor    = parseInt(api.LMSGetValue('cmi.interactions_count') || 0) || 0;
        tot    = cor;
      }catch(e){}
      sendResult(score, status, cor, tot);
      if(_orig12) return _orig12.apply(this, arguments);
      return 'true';
    }

    if(api.LMSFinish) { api.LMSFinish = _intercept12; return true; }
    if(api.Terminate) { api.Terminate = _intercept12; return true; }
    return false;
  }

  /* 3. Poll for SCORM API (some iSpring versions load async) */
  var _scormTries = 0;
  function _pollScorm(){
    if(_hookScorm()) return;
    _scormTries++;
    if(_scormTries < 20) setTimeout(_pollScorm, 500);
  }
  _pollScorm();

  /* 4. Listen for postMessage from iSpring internal frames */
  window.addEventListener('message', function(e){
    var d = e.data;
    if(!d || typeof d !== 'object') return;
    if(_sent) return;

    /* iSpring HTML5 sends various event shapes */
    var score  = d.score  || d.Score  || d.result  || d.Result  || 0;
    var status = d.status || d.Status || d.outcome  || '';
    var cor    = d.correct || d.Correct || d.correctAnswers || 0;
    var tot    = d.total   || d.Total   || d.totalQuestions  || 0;

    /* Only fire on recognizable finish events */
    var isFinish = d.type === 'nebula_result' ? false :
      (d.type === 'finished' || d.type === 'complete' ||
       d.event === 'finish' || d.event === 'complete' ||
       String(status).toLowerCase().match(/pass|fail|complet/));

    if(isFinish && (score || status)){
      sendResult(score, status, cor, tot);
    }
  });

  /* 5. Observe DOM for iSpring result screen */
  var _obs = null;
  function _tryObserve(){
    if(!window.MutationObserver) return;
    _obs = new MutationObserver(function(){
      /* Look for iSpring "passed/failed" text patterns */
      var body = document.body && document.body.innerText || '';
      var hasPassed = /passed|đạt|hoàn thành|100%|score/i.test(body) ||
                      document.querySelector('.isPassed, .isCompleted, .result-screen, .quiz-result');
      if(hasPassed && !_sent){
        var scoreEl = document.querySelector('.score-value, .total-score, [data-score]');
        var sc = scoreEl ? parseInt(scoreEl.textContent) || 0 : 0;
        if(sc > 0) sendResult(sc, 'completed', 0, 0);
      }
    });
    _obs.observe(document.body || document.documentElement, {childList:true, subtree:true});
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _tryObserve);
  } else {
    _tryObserve();
  }

  /* Expose for manual trigger (edge cases) */
  window.nebulaSubmit = function(score, status, correct, total){
    sendResult(score, status, correct, total);
  };

  console.log('[nebula-bridge v3.0] Loaded — monitoring iSpring result...');
})();
