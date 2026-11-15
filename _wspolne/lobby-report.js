/* Gra mówi stronie głównej, czy jest teraz na ekranie lobby (postMessage działa też przy otwarciu z dysku, file://).
   Selektor lobby podaje atrybut data-sel. Strona główna chowa wtedy przycisk „Menu główne”, gdy lobby nie ma. */
(function(){
  var sel=document.currentScript&&document.currentScript.getAttribute('data-sel');
  if(!sel||window.parent===window)return;
  function shown(e){
    if(!e)return false;
    var r=e.getBoundingClientRect(),cs=getComputedStyle(e);
    return r.width>40&&r.height>40&&cs.display!=='none'&&cs.visibility!=='hidden';
  }
  function send(){
    var l=false;try{l=shown(document.querySelector(sel))}catch(x){}
    try{window.parent.postMessage({type:'gmenu-lobby',lobby:l},'*')}catch(x){}
  }
  setInterval(send,250);send();
})();
