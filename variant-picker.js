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
    sf('query($h:String!){product(handle:$h){variants(first:100){nodes{id availableForSale price{amount currencyCode} selectedOptions{name value}}}}}', { h: handle })
      .then(function (d) {
        if (!d.product) return;
        var vs = d.product.variants.nodes;
        if (!vs.length) return;
        var names = vs[0].selectedOptions.map(function (o) { return o.name; });
        var sel = {};
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
          if (add) {
            var ok = v && v.availableForSale;
            add.setAttribute("data-variant-id", ok ? v.id : "");
            add.classList.toggle("is-soldout", !ok);
            add.textContent = ok ? "Add to Cart" : (v ? "Sold Out" : "Unavailable");
          }
        }
        document.addEventListener("click", function (e) {
          var b = e.target.closest(".eh-opt");
          if (!b) return;
          e.preventDefault();
          sel[b.getAttribute("data-opt")] = b.getAttribute("data-val");
          apply();
        });
        apply();
      })
      .catch(function (e) { console.warn("variant-picker:", e.message); });
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
