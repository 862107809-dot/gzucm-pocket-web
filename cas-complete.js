'use strict';
/** Runs only on the same-origin CAS callback completion page. */
(()=>{
 try{
  if(window.opener&&!window.opener.closed){
   window.opener.postMessage({type:'GZUCM_CAS_CALLBACK_RETURN'},window.location.origin);
   window.setTimeout(()=>window.close(),900);
  }
 }catch{}
})();
