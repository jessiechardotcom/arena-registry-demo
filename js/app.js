// Registry app — fetches items from Are.na via Netlify function,
// handles category/status filtering, and manages the claim flow.

const state = {
  items: [],
  activeSort: "default",
};

// ─── Sample items (local preview fallback) ───────────────────────────────────

const SAMPLE_ITEMS = [
  {
    id: "sample-1",
    name: "Zyllan Alien",
    price: 45,
    image: "https://cdn11.bigcommerce.com/s-23s5gfmhr7/images/stencil/1000w/products/2018/52560/AL3GRE__20440.1772468804.jpg?c=1",
    url: "https://us.jellycat.com/zyllan-alien/",
    claimed: false,
  },
  {
    id: "sample-2",
    name: "Amuseables Baguette",
    price: 35,
    image: "https://cdn11.bigcommerce.com/s-23s5gfmhr7/images/stencil/1000w/products/124/48492/A2BAGET__57137.1732743233.jpg?c=1",
    url: "https://us.jellycat.com/amuseables-baguette/",
    claimed: false,
  },
  {
    id: "sample-3",
    name: "Siamese Sweatshirt",
    price: 66,
    notes: "Size 56/62",
    image: "https://minirodini.centracdn.net/client/dynamic/images/17847_3fc1c79e27-26120117-94-1-1350x0.jpg",
    url: "https://www.minirodini.com/us/siamese-sweatshirt-grey-melange",
    claimed: false,
  },
  {
    id: "sample-4",
    name: "Hadagi",
    price: 48,
    notes: "Newborn or 6M",
    image: "https://www.makieclothier.com/wp-content/uploads/2017/07/pilehadagi_wht_nb-3m_top.jpg",
    url: "https://www.makieclothier.com/product/pile-first-hadagi-white/",
    claimed: false,
  },
];

// ─── Boot ───────────────────────────────────────────────────────────────────

async function init() {
  renderSkeletons(8);
  try {
    const data = await fetchItems();
    state.items = data.items || [];
    renderGrid(state.items);
    bindFilters();
    bindModal();
  } catch (err) {
    // Fall back to sample items for local preview
    state.items = SAMPLE_ITEMS;
    renderGrid(state.items);
    bindFilters();
    bindModal();
  }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

async function fetchItems() {
  const res = await fetch("/.netlify/functions/items");
  if (!res.ok) throw new Error("Failed to load registry");
  return res.json();
}

// ─── Render ──────────────────────────────────────────────────────────────────

function renderSkeletons(count) {
  const grid = document.getElementById("registry-grid");
  grid.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "skeleton-card";
    el.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line"></div>
      </div>`;
    grid.appendChild(el);
  }
}

function renderGrid(items) {
  const sorted = applySort(items);
  const grid = document.getElementById("registry-grid");
  grid.innerHTML = "";

  if (sorted.length === 0) {
    const empty = document.createElement("p");
    empty.className = "registry-empty";
    empty.textContent =
      state.activeSort === "claimed"
        ? "Nothing claimed yet — be the first!"
        : "No items here yet.";
    grid.appendChild(empty);
    return;
  }

  sorted.forEach((item) => grid.appendChild(buildCard(item)));
}

function buildCard(item) {
  const quantityWanted = item.quantityWanted || 1;
  const quantityClaimed = item.quantityClaimed || 0;
  const remaining = quantityWanted - quantityClaimed;
  const isFullyClaimed = remaining <= 0;

  const card = document.createElement("article");
  card.className = "registry-card" + (isFullyClaimed ? " is-claimed" : "");
  card.dataset.id = item.id;

  // Image
  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image-wrap";
  if (item.image) {
    const img = document.createElement("img");
    img.className = "card-image";
    img.src = item.image;
    img.alt = item.name;
    img.loading = "lazy";
    imageWrap.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "card-image-placeholder";
    placeholder.textContent = "🎁";
    imageWrap.appendChild(placeholder);
  }
  card.appendChild(imageWrap);

  // Body
  const body = document.createElement("div");
  body.className = "card-body";

  if (item.price != null) {
    const price = document.createElement("p");
    price.className = "card-price";
    price.textContent = "$" + item.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    body.appendChild(price);
  }

  const name = document.createElement("h3");
  name.className = "card-name";
  name.textContent = item.name;
  body.appendChild(name);

  if (item.notes) {
    const notes = document.createElement("p");
    notes.className = "card-notes";
    notes.textContent = item.notes;
    body.appendChild(notes);
  }

  if (quantityWanted > 1) {
    const qty = document.createElement("p");
    qty.className = "card-qty";
    qty.textContent = isFullyClaimed
      ? `All ${quantityWanted} claimed`
      : `${remaining} of ${quantityWanted} still needed`;
    body.appendChild(qty);
  }

  card.appendChild(body);

  // Footer
  const footer = document.createElement("div");
  footer.className = "card-footer";

  if (item.url) {
    const link = document.createElement("a");
    link.className = "card-link";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View item ↗\uFE0E";
    footer.appendChild(link);
  } else {
    footer.appendChild(document.createElement("span")); // spacer
  }

  if (isFullyClaimed) {
    const badge = document.createElement("span");
    badge.className = "claimed-badge";
    badge.textContent = "Claimed ✓";
    footer.appendChild(badge);
  } else {
    const btn = document.createElement("button");
    btn.className = "claim-btn";
    btn.textContent = "I'll get this!";
    btn.addEventListener("click", () => openClaimModal(item));
    footer.appendChild(btn);
  }

  card.appendChild(footer);
  return card;
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

function applySort(items) {
  const sorted = [...items];
  switch (state.activeSort) {
    case "recent":
      sorted.sort((a, b) => {
        if (!a.createdTime && !b.createdTime) return 0;
        if (!a.createdTime) return 1;
        if (!b.createdTime) return -1;
        return new Date(b.createdTime) - new Date(a.createdTime);
      });
      break;
    case "price-desc":
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      break;
    case "price-asc":
      sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      break;
    case "unclaimed":
      sorted.sort((a, b) => a.claimed - b.claimed);
      break;
    case "claimed":
      sorted.sort((a, b) => b.claimed - a.claimed);
      break;
  }
  return sorted;
}

function bindFilters() {
  document.getElementById("sort-select").addEventListener("change", (e) => {
    state.activeSort = e.target.value;
    renderGrid(state.items);
  });
}

// ─── Claim Modal ─────────────────────────────────────────────────────────────

function bindModal() {
  const modal = document.getElementById("claim-modal");
  const form = document.getElementById("claim-form");

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.open) closeModal();
  });

  form.addEventListener("submit", submitClaim);
}

function openClaimModal(item) {
  const modal = document.getElementById("claim-modal");
  hideModalError();
  document.getElementById("claim-form").reset();

  modal.querySelector("input[name=recordId]").value = item.id;
  modal.querySelector(".modal-item-name").textContent = item.name;

  modal.showModal();
  modal.querySelector("input[name=email]").focus();
}

function closeModal() {
  document.getElementById("claim-modal").close();
}

async function submitClaim(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector("button[type=submit]");

  const payload = {
    recordId: form.recordId.value,
    email: form.email.value.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";
  hideModalError();

  try {
    const res = await fetch("/.netlify/functions/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.status === 409) {
      showModalError("Someone just claimed this — great minds think alike! Please choose something else.");
      const item = state.items.find((i) => i.id === payload.recordId);
      if (item) { item.claimed = true; renderGrid(state.items); }
      return;
    }

    if (!res.ok) {
      showModalError(data.error || "Something went wrong. Please try again.");
      return;
    }

    // Redirect to My Items page
    window.location.href = `/my-items?email=${encodeURIComponent(payload.email)}`;

  } catch (err) {
    showModalError("Network error — please check your connection and try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Claim this gift";
  }
}

function showModalError(msg) {
  const el = document.querySelector(".modal-error");
  el.textContent = msg;
  el.hidden = false;
}

function hideModalError() {
  const el = document.querySelector(".modal-error");
  el.hidden = true;
  el.textContent = "";
}

// ─── Toast ───────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

// ─── Start ───────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
