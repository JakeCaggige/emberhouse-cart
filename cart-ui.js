/* Emberhouse cart — UI layer. Requires cart-core.js (window.EH).
 * Renders the cart drawer (outer markup in nav_component) to match the Figma cart design,
 * self-injects its CSS, builds the "You May Also Like" row + header lock, and re-parents the
 * drawer to <body> so position:fixed escapes the transformed nav. */
(function () {
  var EH = window.EH;
  if (!EH) return;
  var SHOP = "/shop-products/";

  var CSS = ".eh-drawer{position:fixed!important;top:0!important;bottom:0!important;right:0!important;width:460px;max-width:92vw;height:auto!important;background:#BAD4D9!important;box-shadow:-8px 0 40px rgba(17,18,8,.18);transform:translateX(100%);transition:transform .35s ease;z-index:99999;display:flex;flex-direction:column;font-family:'Space Mono',monospace!important;color:#111208}.eh-drawer.is-open{transform:translateX(0)}.eh-drawer-head{display:flex;justify-content:space-between;align-items:center;padding:22px 28px 8px}.eh-lock{width:20px;height:20px;color:#111208}.eh-drawer-close{font-size:24px;line-height:1;background:none!important;border:none!important;color:#111208!important;cursor:pointer;text-decoration:none;font-family:inherit}.eh-lines{flex:1;overflow-y:auto;padding:4px 28px}.eh-empty{padding:48px 0;text-align:center;color:#3E3F24;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.eh-li{display:flex;gap:16px;align-items:flex-start;padding:18px 0;border-bottom:1px solid rgba(62,63,36,.2)}.eh-li-img{width:84px;height:84px;flex:0 0 84px;background:#F6F2E9;border-radius:3px;object-fit:cover}.eh-li-main{flex:1;min-width:0}.eh-li-title{font-weight:700;text-transform:uppercase;font-size:13px;letter-spacing:.03em;color:#111208;line-height:1.25}.eh-li-opts{display:flex;gap:22px;margin-top:10px}.eh-li-opt{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#3E3F24;line-height:1.5}.eh-li-right{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:12px;flex-shrink:0;align-self:stretch}.eh-li-price{font-weight:700;font-size:13px;color:#111208}.eh-li-qty{display:flex;align-items:center;gap:8px;border:1.5px solid #929524;border-radius:999px;padding:4px 10px;background:#F6F2E9}.eh-li-qty button{width:18px;height:22px;border:none;background:none;color:#3E3F24;cursor:pointer;font-size:15px;line-height:1;font-family:inherit}.eh-li-qty span{font-size:13px;font-weight:700;min-width:14px;text-align:center}.eh-li-remove{background:none!important;border:none!important;padding:0!important;font-family:inherit;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#3E3F24!important;cursor:pointer;text-decoration:none}.eh-li-remove:hover{color:#111208!important}.eh-recs{padding:18px 28px 4px}.eh-recs-head{font-weight:700;text-transform:uppercase;font-size:13px;letter-spacing:.05em;margin-bottom:16px;color:#111208}.eh-recs-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.eh-rec{text-decoration:none;text-align:center;display:block}.eh-rec-img{width:100%;aspect-ratio:1/1;background:#F6F2E9;border-radius:3px;object-fit:cover;display:block}.eh-rec-cat{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#3E3F24;margin-top:10px}.eh-rec-name{font-weight:700;text-transform:uppercase;font-size:12px;color:#111208;margin-top:3px;line-height:1.2}.eh-rec-price{font-size:10px;color:#3E3F24;margin-top:3px}.eh-drawer-foot{display:block!important;padding:18px 28px 26px;border-top:1px solid rgba(62,63,36,.2)}.eh-subtotal-row{display:flex;justify-content:space-between;align-items:baseline;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:19px;margin-bottom:16px;font-family:'Space Mono',monospace}.eh-checkout{display:block;text-align:center;padding:18px;background:#111208!important;color:#F6F2E9!important;border-radius:999px!important;text-decoration:none;font-family:'Space Mono',monospace!important;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:14px}.eh-checkout:hover{background:#000!important}";
  var st = document.createElement("style"); st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  function money(m) { return m ? "$" + Number(m.amount).toFixed(2).replace(/\.00$/, "") : "$0"; }
  function open(s) { var d = document.querySelector('[data-eh="cart-drawer"]'); if (d) d.classList.toggle("is-open", s !== false); }

  function lineHTML(l) {
    var v = l.merchandise;
    var opts = (v.selectedOptions || []).filter(function (o) { return o.value && o.value !== "Default Title"; });
    var optCols = opts.length
      ? '<div class="eh-li-opts"><div class="eh-li-opt">' + opts[0].value + '</div>' +
        (opts.length > 1 ? '<div class="eh-li-opt">' + opts.slice(1).map(function (o) { return o.value; }).join("<br>") + '</div>' : '') + '</div>'
      : '';
    return '<div class="eh-li" data-line-id="' + l.id + '">' +
      (v.image ? '<img class="eh-li-img" src="' + v.image.url + '" alt="">' : '<div class="eh-li-img"></div>') +
      '<div class="eh-li-main"><div class="eh-li-title">' + v.product.title + '</div>' + optCols + '</div>' +
      '<div class="eh-li-right"><div class="eh-li-price">' + money(v.price) + '</div>' +
      '<div class="eh-li-qty"><button data-eh="line-dec">−</button><span>' + l.quantity + '</span><button data-eh="line-inc">+</button></div>' +
      '<button class="eh-li-remove" data-eh="line-remove">Remove</button></div></div>';
  }

  function render(cart) {
    var qty = cart ? cart.totalQuantity : 0;
    document.querySelectorAll('[data-eh="cart-count"]').forEach(function (e) { e.textContent = qty; });
    var sub = document.querySelector('[data-eh="cart-subtotal"]'); if (sub) sub.textContent = cart ? money(cart.cost.subtotalAmount) : "$0";
    var box = document.querySelector('[data-eh="cart-lines"]');
    if (box) box.innerHTML = (!cart || !qty) ? '<div class="eh-empty">Your cart is empty</div>' : cart.lines.nodes.map(lineHTML).join("");
    renderRecs();
  }

  // --- You May Also Like ---
  var recProducts = null;
  function renderRecs() {
    var box = document.querySelector('[data-eh="cart-recs"]');
    if (!box || !recProducts) return;
    var cart = EH.get(), inCart = {};
    if (cart) cart.lines.nodes.forEach(function (l) { inCart[l.merchandise.product.handle] = 1; });
    var recs = recProducts.filter(function (p) { return !inCart[p.handle]; }).slice(0, 3);
    box.innerHTML = recs.length === 0 ? "" : '<div class="eh-recs-head">You May Also Like</div><div class="eh-recs-grid">' +
      recs.map(function (p) {
        var cat = (p.collections.nodes[0] && p.collections.nodes[0].title) || "";
        return '<a class="eh-rec" href="' + SHOP + p.handle + '">' +
          (p.featuredImage ? '<img class="eh-rec-img" src="' + p.featuredImage.url + '" alt="">' : '<div class="eh-rec-img"></div>') +
          '<div class="eh-rec-cat">' + cat + '</div><div class="eh-rec-name">' + p.title + '</div>' +
          '<div class="eh-rec-price">from ' + money(p.priceRange.minVariantPrice) + '</div></a>';
      }).join("") + '</div>';
  }
  function loadRecs() {
    EH.query("query{products(first:12,sortKey:BEST_SELLING){nodes{handle title featuredImage{url} priceRange{minVariantPrice{amount currencyCode}} collections(first:1){nodes{title}}}}}")
      .then(function (d) { recProducts = d.products.nodes; renderRecs(); }).catch(function () {});
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

  function start() {
    var d = document.querySelector('[data-eh="cart-drawer"]');
    if (d) {
      if (d.parentElement !== document.body) document.body.appendChild(d);
      var head = d.querySelector(".eh-drawer-head");
      if (head && !head.querySelector(".eh-lock")) head.insertAdjacentHTML("afterbegin",
        '<svg class="eh-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>');
      var foot = d.querySelector(".eh-drawer-foot");
      if (foot && !d.querySelector('[data-eh="cart-recs"]')) {
        var recs = document.createElement("div"); recs.className = "eh-recs"; recs.setAttribute("data-eh", "cart-recs");
        foot.parentNode.insertBefore(recs, foot);
      }
      if (foot) foot.innerHTML = '<div class="eh-subtotal-row"><span>Subtotal</span><span data-eh="cart-subtotal">$0</span></div>' +
        '<a class="eh-checkout" data-eh="checkout" href="#">Continue to Checkout</a>';
    }
    loadRecs();
    EH.load();
  }
  if (document.readyState !== "loading") start();
  else document.addEventListener("DOMContentLoaded", start);
})();
