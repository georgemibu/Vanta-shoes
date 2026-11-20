(function () {
  "use strict";

  const products = window.VANTA_PRODUCTS;
  const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
  const grid = document.querySelector("#product-grid");
  const overlay = document.querySelector("#overlay");
  const cartDrawer = document.querySelector("#cart-drawer");
  const productModal = document.querySelector("#product-modal");
  const cartItems = document.querySelector(".cart-items");
  const toast = document.querySelector(".toast");
  const whatsappNumber = "5491100000000";
  let activeFilter = "all";
  let activeProduct = null;
  let activeSize = null;
  let lastFocusedElement = null;
  let toastTimer;
  let cart = readCart();

  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem("vanta-cart") || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((item) =>
        item &&
        products.some((product) => product.id === item.id) &&
        Number.isInteger(Number(item.size)) &&
        Number(item.size) >= 36 &&
        Number(item.size) <= 45 &&
        Number.isInteger(Number(item.quantity)) &&
        Number(item.quantity) > 0
      ).map((item) => ({
        id: item.id,
        size: Number(item.size),
        quantity: Math.min(Number(item.quantity), 10)
      }));
    } catch (error) {
      console.warn("No se pudo leer el carrito guardado.", error);
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem("vanta-cart", JSON.stringify(cart));
    } catch (error) {
      console.warn("No se pudo guardar el carrito en este navegador.", error);
      showToast("No pudimos guardar tu carrito en este navegador.");
    }
  }

  function productById(id) {
    return products.find((product) => product.id === id);
  }

  function productCard(product, index) {
    const tag = product.tag ? `<span class="product-tag">${product.tag}</span>` : "";
    const hover = product.hoverImage ? `<img class="product-card__image product-card__image--hover" src="${product.hoverImage}" alt="" loading="lazy">` : "";
    return `
      <article class="product-card reveal" style="--card-index:${index}">
        <button class="product-card__visual" type="button" data-detail="${product.id}" aria-label="Ver detalle de ${product.name}">
          <span class="product-card__number">0${index + 1} / 08</span>${tag}
          <img class="product-card__image" src="${product.image}" alt="${product.name}, color ${product.color}" loading="lazy">${hover}
          <span class="product-card__quickview">QUICK VIEW <b>↗</b></span>
        </button>
        <div class="product-card__meta">
          <div><span class="product-card__category">${product.category} / ${product.color}</span><h3><button type="button" data-detail="${product.id}">${product.name}</button></h3></div>
          <strong>${currency.format(product.price)}</strong>
        </div>
        <button class="product-card__add" type="button" data-add="${product.id}" aria-label="Agregar ${product.name} al carrito"><span>AGREGAR AL CARRITO</span><b>+</b></button>
      </article>`;
  }

  function visibleProducts() {
    const searchTerm = document.querySelector("#header-search").value.trim().toLocaleLowerCase("es");
    const sort = document.querySelector("#sort-products").value;
    let result = products.filter((product) =>
      (activeFilter === "all" || product.category === activeFilter) &&
      `${product.name} ${product.category} ${product.color}`.toLocaleLowerCase("es").includes(searchTerm)
    );
    if (sort === "price-asc") result = result.slice().sort((a, b) => a.price - b.price);
    if (sort === "price-desc") result = result.slice().sort((a, b) => b.price - a.price);
    if (sort === "newest") result = result.slice().sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return result;
  }

  function renderProducts() {
    const result = visibleProducts();
    grid.innerHTML = result.length
      ? result.map(productCard).join("")
      : '<div class="no-results"><span>0 — 00</span><h3>NO ENCONTRAMOS<br>ESA SILUETA.</h3><p>Probá con otro nombre o categoría.</p></div>';
    document.querySelector(".results-count").textContent = `${String(result.length).padStart(2, "0")} MODELOS`;
    document.querySelector('[data-filter="all"] span').textContent = String(products.length).padStart(2, "0");
    observeReveals();
    bindImageFallbacks(grid);
  }

  function setFilter(button) {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderProducts();
  }

  function bindImageFallbacks(root) {
    root.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", function onImageError() {
        image.removeEventListener("error", onImageError);
        image.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23e6e3dc'/%3E%3Cpath d='M110 370c105-12 162-65 227-166 20-30 47-42 70-22l96 86 108 37c37 13 63 48 63 88v22H110z' fill='%23101010'/%3E%3Cpath d='M342 281l93 48m-118-6 97 49m-126-7 91 45' fill='none' stroke='%23f4f2ed' stroke-width='11'/%3E%3Cpath d='M117 416h543' stroke='%23ff5722' stroke-width='12'/%3E%3Ctext x='40' y='70' fill='%23101010' font-family='Arial' font-size='26' letter-spacing='4'%3EVANTA%C2%AE / DESIGNED TO MOVE%3C/text%3E%3C/svg%3E";
      });
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function cartQuantity() {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  function updateCart() {
    const count = cartQuantity();
    document.querySelector(".cart-count").textContent = count;
    document.querySelector(".drawer-count").textContent = `(${count})`;
    document.querySelector(".cart-subtotal strong").textContent = currency.format(
      cart.reduce((total, item) => total + productById(item.id).price * item.quantity, 0)
    );
    document.querySelector(".cart-empty").hidden = cart.length > 0;
    cartItems.innerHTML = cart.map((item) => {
      const product = productById(item.id);
      return `<article class="cart-item">
        <img src="${product.image}" alt="" loading="lazy">
        <div class="cart-item__details"><span>${product.category} / ${product.color}</span><h3>${product.name}</h3><p>TALLE ${item.size}</p>
          <div class="cart-item__bottom"><div class="cart-quantity"><button type="button" data-quantity="-1" data-key="${item.id}-${item.size}" aria-label="Disminuir cantidad">−</button><span>${item.quantity}</span><button type="button" data-quantity="1" data-key="${item.id}-${item.size}" aria-label="Aumentar cantidad">+</button></div><strong>${currency.format(product.price * item.quantity)}</strong></div>
        </div><button class="remove-item" type="button" data-remove="${item.id}-${item.size}" aria-label="Eliminar ${product.name} del carrito">×</button>
      </article>`;
    }).join("");
    const checkout = document.querySelector(".whatsapp-checkout");
    checkout.classList.toggle("is-disabled", cart.length === 0);
    checkout.setAttribute("aria-disabled", String(cart.length === 0));
    checkout.href = cart.length ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage())}` : "#";
    bindImageFallbacks(cartItems);
  }

  function whatsappMessage() {
    const lines = ["Hola VANTA®, quiero realizar este pedido:", ""];
    cart.forEach((item) => {
      const product = productById(item.id);
      lines.push(`• ${product.name} — Talle ${item.size} — Cant. ${item.quantity} — ${currency.format(product.price)} c/u`);
    });
    const total = cart.reduce((sum, item) => sum + productById(item.id).price * item.quantity, 0);
    lines.push("", `Total del pedido: ${currency.format(total)}`, "", "Pedido generado desde la demo VANTA®.");
    return lines.join("\n");
  }

  function parseCartKey(key) {
    const separator = key.lastIndexOf("-");
    return { id: key.slice(0, separator), size: Number(key.slice(separator + 1)) };
  }

  function addToCart(id, size, quantity) {
    const existing = cart.find((item) => item.id === id && item.size === size);
    if (existing) existing.quantity = Math.min(10, existing.quantity + quantity);
    else cart.push({ id, size, quantity: Math.min(10, quantity) });
    saveCart();
    updateCart();
    document.querySelector(".cart-trigger").classList.remove("is-bumped");
    void document.querySelector(".cart-trigger").offsetWidth;
    document.querySelector(".cart-trigger").classList.add("is-bumped");
    showToast(`${productById(id).name} agregado a tu carrito`);
  }

  function lockPage(locked) {
    document.body.classList.toggle("is-locked", locked);
  }

  function showOverlay() {
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    lockPage(true);
  }

  function hideOverlay() {
    overlay.classList.remove("is-visible");
    window.setTimeout(() => { overlay.hidden = true; }, 300);
    lockPage(false);
  }

  function openCart() {
    closeProductModal(false);
    lastFocusedElement = document.activeElement;
    showOverlay();
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.querySelector(".close-cart").focus();
  }

  function closeCart() {
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    hideOverlay();
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function openProductModal(id) {
    const product = productById(id);
    if (!product) return;
    closeCart();
    activeProduct = product;
    activeSize = null;
    lastFocusedElement = document.activeElement;
    document.querySelector(".modal-category").textContent = `${product.category} / ${product.color}`;
    document.querySelector("#modal-title").textContent = product.name;
    document.querySelector(".modal-price").textContent = currency.format(product.price);
    document.querySelector(".modal-description").textContent = product.description;
    document.querySelector(".modal-gallery").innerHTML = `<img src="${product.image}" alt="${product.name}, vista principal"><img src="${product.hoverImage || product.image}" alt="${product.name}, vista alternativa">`;
    document.querySelector(".size-grid").innerHTML = Array.from({ length: 10 }, (_, index) => {
      const size = index + 36;
      return `<button type="button" class="size-button" data-size="${size}" aria-pressed="false">${size}</button>`;
    }).join("");
    document.querySelector("#modal-quantity").value = 1;
    document.querySelector(".size-error").textContent = "";
    productModal.classList.add("is-open");
    productModal.setAttribute("aria-hidden", "false");
    showOverlay();
    document.querySelector(".close-modal").focus();
    bindImageFallbacks(productModal);
  }

  function closeProductModal(restoreFocus) {
    if (!productModal.classList.contains("is-open")) return;
    productModal.classList.remove("is-open");
    productModal.setAttribute("aria-hidden", "true");
    if (restoreFocus !== false) hideOverlay();
    if (restoreFocus !== false && lastFocusedElement) lastFocusedElement.focus();
  }

  function observeReveals() {
    const elements = document.querySelectorAll(".reveal:not(.is-revealed)");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-revealed"));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    elements.forEach((element) => observer.observe(element));
  }

  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => setFilter(button));
  });
  document.querySelector("#sort-products").addEventListener("change", renderProducts);
  document.querySelector("#header-search").addEventListener("input", renderProducts);
  document.querySelector(".search-toggle").addEventListener("click", () => {
    const panel = document.querySelector(".search-panel");
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) document.querySelector("#header-search").focus();
  });
  document.querySelector(".search-panel").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
    document.querySelector(".search-panel").classList.remove("is-open");
  });
  document.querySelector(".account-button").addEventListener("click", () => showToast("La cuenta VANTA estará disponible próximamente."));
  document.querySelector(".menu-toggle").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.querySelector(".desktop-nav").classList.toggle("is-open", open);
  });
  document.querySelectorAll(".desktop-nav a").forEach((link) => link.addEventListener("click", () => {
    document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
    document.querySelector(".desktop-nav").classList.remove("is-open");
  }));
  grid.addEventListener("click", (event) => {
    const detail = event.target.closest("[data-detail]");
    const add = event.target.closest("[data-add]");
    if (detail) openProductModal(detail.dataset.detail);
    if (add) openProductModal(add.dataset.add);
  });
  document.querySelector(".size-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-size]");
    if (!button) return;
    activeSize = Number(button.dataset.size);
    document.querySelectorAll(".size-button").forEach((sizeButton) => {
      const selected = sizeButton === button;
      sizeButton.classList.toggle("is-selected", selected);
      sizeButton.setAttribute("aria-pressed", String(selected));
    });
    document.querySelector(".size-error").textContent = "";
  });
  document.querySelector(".quantity-minus").addEventListener("click", () => {
    const input = document.querySelector("#modal-quantity");
    input.value = Math.max(1, Number(input.value) - 1);
  });
  document.querySelector(".quantity-plus").addEventListener("click", () => {
    const input = document.querySelector("#modal-quantity");
    input.value = Math.min(10, Number(input.value) + 1);
  });
  document.querySelector(".modal-add").addEventListener("click", () => {
    if (!activeSize) {
      document.querySelector(".size-error").textContent = "Elegí un talle para continuar.";
      document.querySelector(".size-button").focus();
      return;
    }
    const quantity = Math.min(10, Math.max(1, Number(document.querySelector("#modal-quantity").value) || 1));
    addToCart(activeProduct.id, activeSize, quantity);
    closeProductModal();
  });
  document.querySelector(".cart-trigger").addEventListener("click", openCart);
  document.querySelector(".close-cart").addEventListener("click", closeCart);
  document.querySelector(".close-modal").addEventListener("click", () => closeProductModal());
  document.querySelector(".continue-shopping").addEventListener("click", closeCart);
  document.querySelector(".cart-items").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove]");
    const adjust = event.target.closest("[data-quantity]");
    if (remove) {
      const key = parseCartKey(remove.dataset.remove);
      cart = cart.filter((item) => !(item.id === key.id && item.size === key.size));
    }
    if (adjust) {
      const key = parseCartKey(adjust.dataset.key);
      const item = cart.find((entry) => entry.id === key.id && entry.size === key.size);
      if (item) item.quantity = Math.min(10, item.quantity + Number(adjust.dataset.quantity));
      cart = cart.filter((entry) => entry.quantity > 0);
    }
    saveCart();
    updateCart();
  });
  document.querySelector(".whatsapp-checkout").addEventListener("click", (event) => {
    if (!cart.length) {
      event.preventDefault();
      showToast("Tu carrito está vacío.");
    }
  });
  overlay.addEventListener("click", () => {
    closeProductModal(false);
    closeCart();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProductModal();
      closeCart();
      document.querySelector(".search-panel").classList.remove("is-open");
    }
    if (event.key === "Tab" && (productModal.classList.contains("is-open") || cartDrawer.classList.contains("is-open"))) {
      const activeDialog = productModal.classList.contains("is-open") ? productModal : cartDrawer;
      const focusable = Array.from(activeDialog.querySelectorAll("button:not(:disabled), a[href], input, select")).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
  });
  document.querySelector(".newsletter-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.querySelector("#newsletter-email");
    const feedback = document.querySelector(".newsletter-feedback");
    if (!email.validity.valid || !email.value.trim()) {
      email.setAttribute("aria-invalid", "true");
      feedback.textContent = "Ingresá un email válido para suscribirte.";
      feedback.classList.add("is-error");
      email.focus();
      return;
    }
    email.removeAttribute("aria-invalid");
    feedback.textContent = "¡Listo! Tu suscripción de demostración quedó confirmada. No enviamos datos a ningún servicio.";
    feedback.classList.remove("is-error");
    email.value = "";
  });

  window.addEventListener("scroll", () => {
    const header = document.querySelector(".site-header");
    const currentScroll = window.scrollY;
    header.classList.toggle("is-scrolled", currentScroll > 40);
  }, { passive: true });

  document.querySelectorAll(".hero img, .story img").forEach((image) => bindImageFallbacks(image.parentElement));
  renderProducts();
  updateCart();
  observeReveals();
})();
