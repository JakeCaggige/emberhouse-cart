/* Emberhouse variant picker — builds the Size/Framing selector on a product page by fetching
 * the product's variants live from Shopify (Storefront API) by handle. Pairs with cart-core/ui.
 *
 * DOM contract:
 *   [data-eh="product-handle"]            → element whose text = the Shopify product handle (bind to shopify-handle CMS field)
 *   [data-eh-options="Size"] / ["Framing"]→ containers; option <button>s render inside
 *   [data-eh="variant-price"]             → shows the selected variant's price
 *   [data-eh="add-to-cart"]               → picker sets its data-variant-id to the selected variant (cleared when unavailable)
 * Selected option buttons get class .is-selected; unavailable add button gets .is-soldout.
 */
(function () {
  // Inject buy-box styling (Webflow's embed CSS gets overridden by page defaults; JS-injected !important wins).
  (function () {
    var c = ".eh-buybox{font-family:'Space Mono',monospace}.eh-opt-label{font-size:13px!important;font-weight:700!important;text-transform:uppercase;letter-spacing:.08em;color:#3E3F24!important;margin-bottom:10px;font-family:'Space Mono',monospace!important}.eh-opt-group{margin-bottom:22px}.eh-opt-row{display:flex;flex-wrap:wrap;gap:12px}.eh-opt{font-family:'Space Mono',monospace!important;font-size:15px!important;font-weight:700!important;text-transform:uppercase;letter-spacing:.02em;padding:14px 22px!important;border:none!important;border-radius:10px!important;background:#EAE3D2!important;color:#3E3F24!important;cursor:pointer;transition:background .15s,color .15s}.eh-opt:hover{background:#e1d9c4!important}.eh-opt.is-selected{background:#8a9a45!important;color:#F6F2E9!important}.eh-buy-row{display:flex;align-items:center;gap:16px;margin-top:8px}.eh-qty{display:flex;align-items:center;gap:4px;border:1.5px solid #C9C2AC!important;border-radius:999px;padding:5px 8px;background:transparent!important}.eh-qty-btn{font-family:'Space Mono',monospace!important;font-size:18px!important;line-height:1;width:34px;height:34px;border:none!important;background:transparent!important;color:#3E3F24!important;cursor:pointer;border-radius:50%;box-shadow:none!important}.eh-qty-btn:hover{background:#EAE3D2!important}.eh-qty-num{font-family:'Space Mono',monospace!important;font-size:16px!important;font-weight:700!important;color:#3E3F24!important;min-width:26px;text-align:center}.eh-add{flex:1;font-family:'Space Mono',monospace!important;font-size:22px!important;font-weight:700!important;text-transform:uppercase;letter-spacing:.04em;text-align:center;background:#BE5920!important;color:#fff!important;border:none!important;border-radius:999px!important;padding:18px 32px!important;cursor:pointer;text-decoration:none}.eh-add:hover{background:#a94d1a!important}.eh-add.is-soldout{background:#ABA48B!important;pointer-events:none}";
    var s = document.createElement("style"); s.textContent = c;
    (document.head || document.documentElement).appendChild(s);
  })();
  var DOMAIN = "emberhouse-d3v5uvbe.myshopify.com",
    TOKEN = "6b3eb8f11bab4fcce7cc7bc2917a9a08",
    VERSION = "2026-04";
  function sf(q, v) {
    return fetch("https://" + DOMAIN + "/api/" + VERSION + "/graphql.json", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": TOKEN },
      body: JSON.stringify({ query: q, variables: v })
    }).then(function (r) { return r.json(); }).then(function (j) { return j.data; });
  }
  function money(m) { return m ? "$" + Number(m.amount).toFixed(2).replace(/\.00$/, "") : ""; }

  function init() {
    var he = document.querySelector('[data-eh="product-handle"]');
    var handle = (he && he.textContent.trim()) || decodeURIComponent((location.pathname.split("/").filter(Boolean).pop() || ""));
    if (!handle) return;
    sf('query($h:String!){product(handle:$h){featuredImage{url} variants(first:100){nodes{id availableForSale image{url} price{amount currencyCode} selectedOptions{name value}}}}}', { h: handle })
      .then(function (d) {
        if (!d.product) return;
        var vs = d.product.variants.nodes;
        var feat = d.product.featuredImage && d.product.featuredImage.url;
        if (!vs.length) return;
        var names = vs[0].selectedOptions.map(function (o) { return o.name; });
        var sel = {}, qty = 1;
        function syncQty() {
          var q = document.querySelector('[data-eh="qty"]'); if (q) q.textContent = qty;
          var a = document.querySelector('[data-eh="add-to-cart"]'); if (a) a.setAttribute("data-qty", qty);
        }
        function valuesFor(name) {
          var s = [];
          vs.forEach(function (v) { v.selectedOptions.forEach(function (o) { if (o.name === name && s.indexOf(o.value) < 0) s.push(o.value); }); });
          return s;
        }
        names.forEach(function (name) {
          var box = document.querySelector('[data-eh-options="' + name + '"]');
          var vals = valuesFor(name);
          sel[name] = vals[0];
          if (box) box.innerHTML = vals.map(function (val) {
            return '<button type="button" class="eh-opt" data-opt="' + name + '" data-val="' + val + '">' + val + '</button>';
          }).join("");
        });
        function match() { return vs.find(function (v) { return v.selectedOptions.every(function (o) { return sel[o.name] === o.value; }); }); }
        function apply() {
          document.querySelectorAll(".eh-opt").forEach(function (b) {
            b.classList.toggle("is-selected", sel[b.getAttribute("data-opt")] === b.getAttribute("data-val"));
          });
          var v = match(),
            add = document.querySelector('[data-eh="add-to-cart"]'),
            price = document.querySelector('[data-eh="variant-price"]');
          if (price) price.textContent = v ? money(v.price) : "";
          var img = document.querySelector('[data-eh="main-image"]');
          if (img && ((v && v.image) || feat)) img.setAttribute("src", (v && v.image && v.image.url) || feat);
          if (add) {
            var ok = v && v.availableForSale;
            add.setAttribute("data-variant-id", ok ? v.id : "");
            add.classList.toggle("is-soldout", !ok);
            add.textContent = ok ? "ADD" : (v ? "SOLD OUT" : "UNAVAILABLE");
          }
        }
        document.addEventListener("click", function (e) {
          if (e.target.closest('[data-eh="qty-inc"]')) { e.preventDefault(); qty++; syncQty(); return; }
          if (e.target.closest('[data-eh="qty-dec"]')) { e.preventDefault(); qty = Math.max(1, qty - 1); syncQty(); return; }
          var b = e.target.closest(".eh-opt");
          if (!b) return;
          e.preventDefault();
          sel[b.getAttribute("data-opt")] = b.getAttribute("data-val");
          apply();
        });
        apply();
        syncQty();
      })
      .catch(function (e) { console.warn("variant-picker:", e.message); });
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
