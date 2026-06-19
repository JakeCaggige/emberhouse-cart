/* Emberhouse cart — UI layer. Requires cart-core.js (window.EH).
 * Renders the cart drawer (markup lives in the site Footer custom code) and self-injects its CSS
 * (Webflow embed CSS is unreliable; JS-injected !important wins). Matches the Figma cart design.
 * data-eh hooks: cart-drawer, cart-close, cart-lines, cart-subtotal, checkout, cart-count,
 * cart-open; per-line: line-inc / line-dec / line-remove. */
(function () {
  var EH = window.EH;
  if (!EH) return;

  var CSS = ".eh-drawer{position:fixed!important;top:0;right:0;width:460px;max-width:92vw;height:100%;background:#BAD4D9!important;box-shadow:-8px 0 40px rgba(17,18,8,.18);transform:translateX(100%);transition:transform .35s ease;z-index:99999;display:flex;flex-direction:column;font-family:'Space Mono',monospace!important;color:#111208}.eh-drawer.is-open{transform:translateX(0)}.eh-drawer-head{display:flex;justify-content:flex-end;align-items:center;padding:20px 28px 6px}.eh-drawer-close{font-size:26px;line-height:1;background:none!important;border:none!important;color:#111208!important;cursor:pointer;text-decoration:none;font-family:inherit}.eh-lines{flex:1;overflow-y:auto;padding:8px 28px}.eh-empty{padding:48px 0;text-align:center;color:#3E3F24;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.eh-li{display:flex;gap:16px;align-items:flex-start;padding:18px 0;border-bottom:1px solid rgba(62,63,36,.18)}.eh-li-img{width:78px;height:78px;flex:0 0 78px;background:#F6F2E9;border-radius:4px;object-fit:cover}.eh-li-info{flex:1;min-width:0}.eh-li-title{font-weight:700;text-transform:uppercase;font-size:13px;letter-spacing:.04em;color:#111208;line-height:1.3}.eh-li-opts{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#3E3F24;margin-top:6px}.eh-li-remove{margin-top:12px;background:none!important;border:none!important;padding:0!important;font-family:inherit;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#3E3F24!important;cursor:pointer;text-decoration:none;display:inline-block}.eh-li-remove:hover{color:#111208!important}.eh-li-right{display:flex;flex-direction:column;align-items:flex-end;gap:14px;flex-shrink:0}.eh-li-price{font-weight:700;font-size:13px;color:#111208}.eh-li-qty{display:flex;align-items:center;gap:6px;border:1.5px solid #929524;border-radius:999px;padding:4px 8px;background:#F6F2E9}.eh-li-qty button{width:22px;height:22px;border:none;background:none;color:#3E3F24;cursor:pointer;font-size:15px;line-height:1;font-family:inherit}.eh-li-qty span{font-size:13px;font-weight:700;min-width:18px;text-align:center}.eh-drawer-foot{padding:20px 28px 28px;border-top:1px solid rgba(62,63,36,.18)}.eh-subtotal-row{display:flex;justify-content:space-between;align-items:center;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:16px;margin-bottom:16px;font-family:'Space Mono',monospace}.eh-checkout{display:block;text-align:center;padding:18px;background:#111208!important;color:#F6F2E9!important;border-radius:999px!important;text-decoration:none;font-family:'Space Mono',monospace!important;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:14px}.eh-checkout:hover{background:#000!important}";
  var st = document.createElement("style"); st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  function money(m) { return m ? "$" + Number(m.amount).toFixed(2).replace(/\.00$/, "") : "$0"; }
  function open(s) { var d = document.querySelector('[data-eh="cart-drawer"]'); if (d) d.classList.toggle("is-open", s !== false); }

  function render(cart) {
    var qty = cart ? cart.totalQuantity : 0;
    document.querySelectorAll('[data-eh="cart-count"]').forEach(function (e) { e.textContent = qty; });
    var sub = document.querySelector('[data-eh="cart-subtotal"]'); if (sub) sub.textContent = cart ? money(cart.cost.subtotalAmount) : "$0";
    var box = document.querySelector('[data-eh="cart-lines"]'); if (!box) return;
    box.innerHTML = (!cart || !qty) ? '<div class="eh-empty">Your cart is empty</div>' : cart.lines.nodes.map(function (l) {
      var v = l.merchandise, opts = (v.title && v.title !== "Default Title") ? v.title : "";
      return '<div class="eh-li" data-line-id="' + l.id + '">' +
        (v.image ? '<img class="eh-li-img" src="' + v.image.url + '" alt="">' : '<div class="eh-li-img"></div>') +
        '<div class="eh-li-info"><div class="eh-li-title">' + v.product.title + '</div>' +
        '<div class="eh-li-opts">' + opts + '</div>' +
        '<button class="eh-li-remove" data-eh="line-remove">Remove</button></div>' +
        '<div class="eh-li-right"><div class="eh-li-price">' + money(v.price) + '</div>' +
        '<div class="eh-li-qty"><button data-eh="line-dec">−</button><span>' + l.quantity + '</span><button data-eh="line-inc">+</button></div></div>' +
        '</div>';
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
    var lid = line.getAttribute("data-line-id"), c2 = EH.get(), cur = c2 && c2.lines.nodes.find(function (n) { return n.id === lid; });
    if (!cur) return;
    if (e.target.closest('[data-eh="line-inc"]')) EH.update(lid, cur.quantity + 1);
    else if (e.target.closest('[data-eh="line-dec"]')) EH.update(lid, cur.quantity - 1);
    else if (e.target.closest('[data-eh="line-remove"]')) EH.remove(lid);
  });

  if (document.readyState !== "loading") EH.load();
  else document.addEventListener("DOMContentLoaded", function () { EH.load(); });
})();
