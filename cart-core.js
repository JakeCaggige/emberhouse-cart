/* Emberhouse cart — CORE engine (Shopify Storefront Cart API). Load before cart-ui.js.
 * Exposes window.EH = { get, load, add, update, remove }. After every change calls EH.onCart(cart, justAdded). */
(function () {
  var DOMAIN = "emberhouse-d3v5uvbe.myshopify.com",
    TOKEN = "6b3eb8f11bab4fcce7cc7bc2917a9a08", // Storefront public token (safe in browser)
    VERSION = "2026-04", KEY = "eh_cart_id";
  var cartId = localStorage.getItem(KEY), cart = null;
  var CART = "{id checkoutUrl totalQuantity cost{subtotalAmount{amount currencyCode}} lines(first:50){nodes{id quantity merchandise{... on ProductVariant{id title image{url} selectedOptions{name value} price{amount currencyCode} product{title handle}}}}}}";
  function gql(q, v) {
    return fetch("https://" + DOMAIN + "/api/" + VERSION + "/graphql.json", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": TOKEN },
      body: JSON.stringify({ query: q, variables: v || {} })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.errors) throw new Error(j.errors[0].message);
      return j.data;
    });
  }
  function set(c, added) {
    cart = c;
    if (c) { cartId = c.id; localStorage.setItem(KEY, c.id); }
    if (EH.onCart) EH.onCart(cart, added);
  }
  function ensure() {
    return cartId ? Promise.resolve() : gql("mutation{cartCreate{cart" + CART + "}}").then(function (d) { set(d.cartCreate.cart); });
  }
  var EH = window.EH = {
    get: function () { return cart; },
    query: gql,
    load: function () {
      if (!cartId) { if (EH.onCart) EH.onCart(null); return; }
      gql("query($id:ID!){cart(id:$id)" + CART + "}", { id: cartId }).then(function (d) {
        if (!d.cart) { localStorage.removeItem(KEY); cartId = null; if (EH.onCart) EH.onCart(null); } else set(d.cart);
      }).catch(function () {});
    },
    add: function (id, q) {
      return ensure().then(function () {
        return gql("mutation($c:ID!,$l:[CartLineInput!]!){cartLinesAdd(cartId:$c,lines:$l){cart" + CART + "}}", { c: cartId, l: [{ merchandiseId: id, quantity: q || 1 }] });
      }).then(function (d) { set(d.cartLinesAdd.cart, true); });
    },
    update: function (lid, q) {
      return q < 1 ? EH.remove(lid) : gql("mutation($c:ID!,$l:[CartLineUpdateInput!]!){cartLinesUpdate(cartId:$c,lines:$l){cart" + CART + "}}", { c: cartId, l: [{ id: lid, quantity: q }] }).then(function (d) { set(d.cartLinesUpdate.cart); });
    },
    remove: function (lid) {
      return gql("mutation($c:ID!,$l:[ID!]!){cartLinesRemove(cartId:$c,lineIds:$l){cart" + CART + "}}", { c: cartId, l: [lid] }).then(function (d) { set(d.cartLinesRemove.cart); });
    }
  };
})();
