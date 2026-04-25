/* nebula-bridge.js v3.1 — single submission, no duplicate */
(function(){
  'use strict';
  var _sent=false;
  var _sk='nbr_'+Date.now();

  function _done(){ _sent=true; try{sessionStorage.setItem(_sk,'1');}catch(e){} }
  function _isDone(){ return _sent||sessionStorage.getItem(_sk)==='1'; }

  function send(score,status,correct,total){
    if(_isDone()) return;
    _done();
    var sc=Math.min(100,Math.max(0,parseInt(score)||0));
    var payload={type:'nebula_ispring_result',score:sc,
      status:String(status||'completed').toLowerCase(),
      correct:parseInt(correct)||0,total:parseInt(total)||0,ts:Date.now()};
    try{window.parent.postMessage(payload,'*');}catch(e){}
    if(window.top&&window.top!==window.parent){try{window.top.postMessage(payload,'*');}catch(e){}}
    if(window.parent===window){
      var q='?nb_isp=1&score='+sc+'&status='+payload.status;
      if(payload.correct)q+='&correct='+payload.correct+'&total='+payload.total;
      setTimeout(function(){location.href='../result.html'+q;},600);
    }
  }

  function hookIspring(){
    if(typeof ispring==='undefined'||!ispring.player)return false;
    try{ispring.player.on('finish',function(d){
      send(d&&(d.score||d.result||0),d&&(d.passed?'passed':d.failed?'failed':'completed'),
           d&&(d.correctAnswers||0),d&&(d.totalQuestions||0));
    });return true;}catch(e){return false;}
  }

  function hookScorm(){
    var api=window.API||window.API_1484_11||(window.parent&&(window.parent.API||window.parent.API_1484_11));
    if(!api)return false;
    function intercept(){
      if(!_isDone()){
        var sc=0,st='completed',cor=0;
        try{sc=parseInt(api.LMSGetValue&&api.LMSGetValue('cmi.core.score.raw')||0)||0;
            st=api.LMSGetValue&&api.LMSGetValue('cmi.core.lesson_status')||'completed';}catch(e){}
        send(sc,st,cor,cor);
      }
      return api._origFin?api._origFin.apply(this,arguments):'true';
    }
    if(api.LMSFinish&&!api._origFin){api._origFin=api.LMSFinish;api.LMSFinish=intercept;return true;}
    if(api.Terminate&&!api._origFin){api._origFin=api.Terminate;api.Terminate=intercept;return true;}
    return false;
  }

  var _t=0;
  function poll(){if(hookScorm()||hookIspring())return;if(++_t<30)setTimeout(poll,500);}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',poll);
  else poll();

  window.nebulaSubmit=function(sc,st,cor,tot){_sent=false;try{sessionStorage.removeItem(_sk);}catch(e){}send(sc,st,cor,tot);};
})();
