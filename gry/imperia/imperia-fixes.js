/* ==========================================================
   Imperia – drobne poprawki rozgrywki (nie zmieniają imperia-lib1.js)
   - Ustawianie wojsk przed bitwą: kliknięcie INNEJ własnej jednostki przy zaznaczonej
     tylko zmienia zaznaczenie (dotąd obie jednostki od razu zamieniały się miejscami).
     Jednostkę przestawiasz klikając ją, a potem puste zielone pole.
   ========================================================== */
(function(){
'use strict';
var orig = window.deployClick;
if (typeof orig !== 'function') return;
window.deployClick = function(px, py){
  try {
    var Bt = FZ && FZ.battle;
    if (Bt && canDeploy(Bt) && !Bt.busy){
      var cells = FZ.cells, s = FZ.s, bi = -1, bd = 1e9;
      cells.forEach(function(c){ var d = Math.pow(FZ.ccx + c.ux * s - px, 2) + Math.pow(FZ.ccy + c.uy * s - py, 2); if (d < bd){ bd = d; bi = c.i; } });
      if (bi >= 0 && bd <= s * s * 1.1 && cells[bi].play){
        var at = Bt.units.find(function(u){ return u.cell === bi; });
        var su = Bt.units.find(function(u){ return u.id === Bt.sel && u.side === 1; });
        if (at && at.side === 1 && su && su !== at){
          Bt.sel = at.id; Bt.ver++; fzHud(); fzRedraw();
          try { sfx('tap'); } catch (e) {}
          return;
        }
      }
    }
  } catch (e) {}
  return orig.apply(this, arguments);
};
})();
