/* Emberhouse cart — UI layer. Requires cart-core.js (window.EH) loaded first.
 * Renders into Webflow elements via data-eh attributes (see cart.js header for the contract). */
(function () {
  var EH = window.EH;
  if (!EH) return;
  function money(m) { return m ? "$" + Number(m.amount).toFixed(2).replace(/\.00$/, "") : "$0"; }
  function open(s) { var d = document.querySelector('[data-eh="cart-drawer"]'); if (d) d.classList.toggle("is-open", s !== false); }
  function render(cart) {
    var qty = cart ? cart.totalQuantity : 0;
    document.querySelectorAll('[data-eh="cart-count"]').forEach(function (e) { e.textContent = qty; });
    var sub = document.querySelector('[data-eh="cart-subtotal"]'); if (sub) sub.textContent = cart ? money(cart.cost.subtotalAmount) : "$0";
    var box = document.querySelector('[data-eh="cart-lines"]'); if (!box) return;
    box.innerHTML = (!cart || !qty) ? "" : cart.lines.nodes.map(function (l) {
      var v = l.merchandise;
      return '<div class="eh-li" data-line-id="' + l.id + '"><div class="eh-li-b"><div class="eh-li-t">' +
        v.product.title + ' — ' + v.title + '</div><div class="eh-li-q">' +
        '<button data-eh="line-dec">−</button><span>' + l.quantity + '</span><button data-eh="line-inc">+</button>' +
        '<button data-eh="line-remove">Remove</button></div></div><div class="eh-li-p">' + money(v.price) + '</div></div>';
    }).join("");
  }
  EH.onCart = function (cart, added) { render(cart); if (added) open(true); };
  document.addEventListener("click", function (e) {
    var a = e.target.closest('[data-eh="add-to-cart"]');
    if (a) { e.preventDefault(); var id = a.getAttribute("data-variant-id"); if (id) EH.add(id, +a.getAttribute("data-qty") || 1); return; }
    if (e.target.closest('[data-eh="cart-open"]')) { e.preventDefault(); return open(true); }
    if (e.target.closest('[data-eh="cart-close"]')) { e.preventDefault(); return open(false); }
    if (e.target.closest('[data-eh="checkout"]')) { e.preventDefault(); var c = EH.get(); if (c && c.checkoutUrl) location.href = c.checkoutUrl; return; }
    var line = e.target.closest("[data-line-id]"); if (!line) return;
    var lid = line.getAttribute("data-line-id"), c = EH.get(), cur = c && c.lines.nodes.find(function (n) { return n.id === lid; });
    if (!cur) return;
    if (e.target.closest('[data-eh="line-inc"]')) EH.update(lid, cur.quantity + 1);
    else if (e.target.closest('[data-eh="line-dec"]')) EH.update(lid, cur.quantity - 1);
    else if (e.target.closest('[data-eh="line-remove"]')) EH.remove(lid);
  });
  if (document.readyState !== "loading") EH.load();
  else document.addEventListener("DOMContentLoaded", function () { EH.load(); });
})();
