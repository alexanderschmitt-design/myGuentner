/* ============================================================
   cart.js — shared shopping cart module (localStorage backed).

   Public API on `window.Cart`:
     get()                   -> Array<CartItem>
     add(item, qty=1)        -> add item or increment quantity
     remove(id, type)        -> remove a single line
     updateQty(id, type, q)  -> set quantity (>= 1)
     clear()                 -> empty cart
     count()                 -> total quantity across all lines
     subtotal()              -> sum of (unitPrice * qty * (1 - discount%/100)) for priced lines
     onChange(fn)            -> subscribe to cart changes

   CartItem shape:
     {
       type:        'product' | 'fan' | 'heater',
       id:          string,                 // unique per (type, id)
       title:       string,
       subtitle:    string,
       partNumber:  string | null,
       imageSrc:    string,
       unitPrice:   number | null,          // null = "price on request"
       discount:    number,                 // percent 0–100
       deliveryWeeks: number | null,
       quantity:    number,
       priceOnRequest: boolean
     }
   ============================================================ */
(function () {
  const KEY = 'mygpc_cart_v1';
  const listeners = [];

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    listeners.forEach(fn => { try { fn(items); } catch (e) {} });
  }

  function seedIfEmpty() {
    const existing = read();
    if (existing && existing.length) return existing;
    const seed = [
      {
        type: 'product', id: 'GACV PX 040.1DF/2A-40.E-14HJ.1H0E',
        title: 'GACV PX 040.1DF/2A-40.E-14HJ.1H0E',
        subtitle: 'Evaporator (DX) · 10 kW',
        partNumber: null,
        imageSrc: 'images/series-gacc.png',
        unitPrice: 3082, discount: 0, deliveryWeeks: null,
        quantity: 1, priceOnRequest: true
      },
      {
        type: 'product', id: 'GACV AP 040.2DN/2A-A2.A-1NEN.1H0M',
        title: 'GACV AP 040.2DN/2A-A2.A-1NEN.1H0M',
        subtitle: 'Evaporator · 5 kW',
        partNumber: null,
        imageSrc: 'images/series-gadc.png',
        unitPrice: 4666, discount: 0, deliveryWeeks: 12,
        quantity: 1, priceOnRequest: false
      },
      {
        type: 'fan', id: 'VT03033U',
        title: 'S1G200-CA91-11',
        subtitle: 'Fan · GASC FP',
        partNumber: 'VT03033U',
        imageSrc: 'images/spare-fan.png',
        unitPrice: 2845, discount: 52, deliveryWeeks: null,
        quantity: 3, priceOnRequest: false
      },
      {
        type: 'heater', id: 'H04BA15351200230',
        title: 'Heating Element Coil 1200 W / 230 V',
        subtitle: 'Heating Tray',
        partNumber: 'H04BA15351200230',
        imageSrc: 'images/spare-heater.jpg',
        unitPrice: 83, discount: 52, deliveryWeeks: null,
        quantity: 4, priceOnRequest: false
      }
    ];
    write(seed);
    return seed;
  }

  const Cart = {
    get() { return read() || seedIfEmpty(); },

    add(item, qty = 1) {
      const items = Cart.get();
      const idx = items.findIndex(x => x.type === item.type && x.id === item.id);
      if (idx >= 0) {
        items[idx].quantity = Math.max(1, (items[idx].quantity || 0) + qty);
      } else {
        items.push(Object.assign({ quantity: Math.max(1, qty), discount: 0, priceOnRequest: false }, item));
      }
      write(items);
    },

    remove(id, type) {
      const items = Cart.get().filter(x => !(x.id === id && x.type === type));
      write(items);
    },

    updateQty(id, type, qty) {
      const items = Cart.get();
      const it = items.find(x => x.id === id && x.type === type);
      if (!it) return;
      it.quantity = Math.max(1, parseInt(qty, 10) || 1);
      write(items);
    },

    clear() { write([]); },

    count() {
      return Cart.get().reduce((sum, x) => sum + (x.quantity || 0), 0);
    },

    subtotal() {
      return Cart.get().reduce((sum, x) => {
        if (x.priceOnRequest || x.unitPrice == null) return sum;
        const after = x.unitPrice * x.quantity * (1 - (x.discount || 0) / 100);
        return sum + after;
      }, 0);
    },

    onChange(fn) { listeners.push(fn); }
  };

  // Expose on window
  window.Cart = Cart;

  // Cross-tab sync
  window.addEventListener('storage', e => {
    if (e.key === KEY) listeners.forEach(fn => { try { fn(Cart.get()); } catch (_) {} });
  });
})();
