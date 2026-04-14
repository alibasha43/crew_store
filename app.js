const STORE_CONFIG = {
    ps_games: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "Games", title: "PlayStation Games" },
    xbox_games: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "Games", title: "Xbox Games" },
    pc_games: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "Games", title: "PC Games" },
    ps_subs: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "Subscriptions", title: "PS Plus" },
    xbox_subs: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "Subscriptions", title: "Game Pass" },
    pc_subs: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "Subscriptions", title: "PC Subscriptions" },
    ps_cards: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "GiftCards", title: "PSN Cards" },
    xbox_cards: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "GiftCards", title: "Xbox Cards" },
    pc_cards: { id: "1AGvTOYX5qXX3ezaku0rwTbQ0TkxBvCEH7QZHCfjNuU8", tab: "GiftCards", title: "Steam Cards" }
};

const HOME_COLLECTIONS = [
    { key: "ps_games", countId: "games-count", gridId: "random-games-grid" },
    { key: "ps_subs", countId: "subs-count", gridId: "random-subs-grid" },
    { key: "ps_cards", countId: "cards-count", gridId: "random-cards-grid" }
];

const WHATSAPP_NUMBER = "9647718168589";
const itemsPerPage = 24;
const dataCache = new Map();

let currentData = [];
let currentPage = 1;
let lastScrollY = 0;

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateProductCount(count) {
    setText("category-count", `${count} ${count === 1 ? "item" : "items"}`);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function statusMarkup(title, body) {
    return `
        <div class="status-card">
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(body)}</p>
        </div>
    `;
}

function setGridState(gridId, title, body) {
    const grid = document.getElementById(gridId);
    if (grid) grid.innerHTML = statusMarkup(title, body);
}

function parseCSV(csv) {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < csv.length; i += 1) {
        const char = csv[i];
        const next = csv[i + 1];

        if (char === '"') {
            if (insideQuotes && next === '"') {
                value += '"';
                i += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
            continue;
        }

        if (char === "," && !insideQuotes) {
            row.push(value);
            value = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (char === "\r" && next === "\n") i += 1;
            row.push(value);
            if (row.some((cell) => cell.trim() !== "")) rows.push(row);
            row = [];
            value = "";
            continue;
        }

        value += char;
    }

    if (value.length || row.length) {
        row.push(value);
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    }

    return rows;
}

function normalizeProduct(raw) {
    const item = Object.fromEntries(
        Object.entries(raw).map(([key, val]) => [key.toLowerCase(), (val ?? "").trim()])
    );

    return {
        name: item.name || "Item",
        price: item.price || "",
        category: item.category || "Standard",
        imageurl: item.imageurl || "https://via.placeholder.com/400",
        description: item.description || "",
        searchText: [item.name, item.category, item.description].join(" ").toLowerCase()
    };
}

async function fetchSheet(config) {
    const cacheKey = `${config.id}:${config.tab}`;
    if (dataCache.has(cacheKey)) return dataCache.get(cacheKey);

    const url = `https://docs.google.com/spreadsheets/d/${config.id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.tab)}`;

    const request = fetch(url)
        .then(async (response) => {
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            const text = await response.text();
            const rows = parseCSV(text);
            if (rows.length < 2) return [];

            const headers = rows[0].map((header) => header.replaceAll('"', "").trim().toLowerCase());
            return rows
                .slice(1)
                .map((cells) => {
                    const raw = {};
                    headers.forEach((header, index) => {
                        raw[header] = cells[index] ?? "";
                    });
                    return normalizeProduct(raw);
                })
                .filter((item) => item.name || item.price || item.imageurl);
        })
        .catch((error) => {
            dataCache.delete(cacheKey);
            throw error;
        });

    dataCache.set(cacheKey, request);
    return request;
}

function createCard(product) {
    const safeName = escapeHtml(product.name);
    const safeCategory = escapeHtml(product.category);
    const safePrice = escapeHtml(product.price);
    const safeImage = escapeHtml(product.imageurl);
    const link = `https://wa.me/${WHATSAPP_NUMBER}?text=I%20want%20to%20buy%20${encodeURIComponent(product.name)}`;

    return `
        <div class="product-card p-4">
            <img src="${safeImage}" loading="lazy" class="w-full h-64 object-cover rounded-2xl mb-4 shadow-xl" alt="${safeName}">
            <h3 class="font-bold text-lg leading-tight mb-1">${safeName}</h3>
            <p class="text-sky-200/60 text-xs font-bold uppercase tracking-widest mb-4">${safeCategory}</p>
            <div class="flex justify-between items-center gap-3">
                <span class="text-2xl font-black text-sky-300">${safePrice}</span>
                <a href="${link}" target="_blank" class="bg-sky-400 text-slate-950 p-3 rounded-2xl hover:bg-sky-300 transition neon-blue">
                    <i data-lucide="shopping-cart" class="w-5 h-5"></i>
                </a>
            </div>
        </div>
    `;
}

function closeDropdowns() {
    document.querySelectorAll(".dropdown.open").forEach((dropdown) => dropdown.classList.remove("open"));
}

function toggleDropdown(event) {
    if (window.innerWidth > 768) return;
    event.preventDefault();
    const dropdown = event.currentTarget.closest(".dropdown");
    const shouldOpen = !dropdown.classList.contains("open");
    closeDropdowns();
    if (shouldOpen) dropdown.classList.add("open");
}

function renderPagination() {
    const pageCount = Math.ceil(currentData.length / itemsPerPage);
    const container = document.getElementById("pagination");
    container.innerHTML = "";

    if (pageCount <= 1) return;

    container.appendChild(createPageBtn(currentPage - 1, '<i data-lucide="chevron-left" class="w-4 h-4"></i>', false, currentPage === 1));
    const delta = 1;
    const range = [];

    for (let i = 1; i <= pageCount; i += 1) {
        if (i === 1 || i === pageCount || (i >= currentPage - delta && i <= currentPage + delta)) range.push(i);
    }

    let previous;
    for (const page of range) {
        if (previous) {
            if (page - previous === 2) {
                container.appendChild(createPageBtn(previous + 1, previous + 1));
            } else if (page - previous !== 1) {
                const dots = document.createElement("span");
                dots.innerText = "...";
                dots.className = "page-dots";
                container.appendChild(dots);
            }
        }
        container.appendChild(createPageBtn(page, page, page === currentPage));
        previous = page;
    }

    container.appendChild(createPageBtn(currentPage + 1, '<i data-lucide="chevron-right" class="w-4 h-4"></i>', false, currentPage === pageCount));
    lucide.createIcons();
}

function createPageBtn(page, label, active = false, disabled = false) {
    const btn = document.createElement("button");
    btn.innerHTML = label;
    btn.className = `page-btn ${active ? "active" : ""} ${disabled ? "disabled" : ""}`;
    if (!disabled) {
        btn.onclick = () => {
            currentPage = page;
            renderGrid();
            window.scrollTo({ top: 0, behavior: "smooth" });
        };
    }
    return btn;
}

function renderGrid() {
    const grid = document.getElementById("product-grid");
    if (!currentData.length) {
        grid.innerHTML = statusMarkup("No Results", "Try another category, or change your search words.");
        document.getElementById("pagination").innerHTML = "";
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = currentData.slice(start, end);
    grid.innerHTML = paginatedItems.map(createCard).join("");
    renderPagination();
    lucide.createIcons();
}

function cleanPrice(price) {
    if (!price) return 0;
    return parseFloat(String(price).replace(/[^\d.]/g, "")) || 0;
}

function sortItems(type) {
    if (type === "name") currentData.sort((a, b) => a.name.localeCompare(b.name));
    else if (type === "price-low") currentData.sort((a, b) => cleanPrice(a.price) - cleanPrice(b.price));
    else if (type === "price-high") currentData.sort((a, b) => cleanPrice(b.price) - cleanPrice(a.price));
    currentPage = 1;
    renderGrid();
}

async function loadConfig(key) {
    const config = STORE_CONFIG[key];
    showPage("product");
    setText("category-title", config.title);
    updateProductCount(0);
    setGridState("product-grid", "Loading Items", "Pulling the latest products from the sheet.");
    document.getElementById("pagination").innerHTML = "";

    try {
        currentData = await fetchSheet(config);
        currentPage = 1;
        updateProductCount(currentData.length);
        renderGrid();
    } catch (error) {
        currentData = [];
        updateProductCount(0);
        setGridState("product-grid", "Unable To Load", "The product sheet could not be reached right now.");
    }
}

async function loadHome() {
    HOME_COLLECTIONS.forEach(({ gridId, countId }) => {
        setGridState(gridId, "Loading Collection", "Fetching products for this section.");
        setText(countId, "...");
    });

    const results = await Promise.allSettled(
        HOME_COLLECTIONS.map(({ key }) => fetchSheet(STORE_CONFIG[key]))
    );

    HOME_COLLECTIONS.forEach(({ gridId, countId }, index) => {
        const result = results[index];
        if (result.status !== "fulfilled") {
            setText(countId, "0 items");
            setGridState(gridId, "Unavailable", "This collection is temporarily unavailable.");
            return;
        }

        const items = result.value;
        setText(countId, `${items.length} items`);

        if (!items.length) {
            setGridState(gridId, "No Items Yet", "This collection is currently empty.");
            return;
        }

        const randomItems = [...items].sort(() => 0.5 - Math.random()).slice(0, 4);
        document.getElementById(gridId).innerHTML = randomItems.map(createCard).join("");
    });

    lucide.createIcons();
}

async function searchProducts() {
    const query = document.getElementById("mainSearch").value.trim().toLowerCase();
    if (query.length < 2) return;

    showPage("product");
    setText("category-title", "Search Results");
    updateProductCount(0);
    setGridState("product-grid", "Searching Store", "Looking through games, subscriptions, and gift cards.");
    document.getElementById("pagination").innerHTML = "";

    try {
        const allResults = await Promise.allSettled(
            Object.values(STORE_CONFIG).map((config) => fetchSheet(config))
        );

        currentData = allResults
            .filter((result) => result.status === "fulfilled")
            .flatMap((result) => result.value)
            .filter((item) => item.searchText.includes(query));

        currentPage = 1;
        updateProductCount(currentData.length);
        renderGrid();
    } catch (error) {
        currentData = [];
        updateProductCount(0);
        setGridState("product-grid", "Search Failed", "The store could not be searched right now.");
    }
}

function showPage(page) {
    const home = document.getElementById("home-view");
    const prod = document.getElementById("product-view");
    closeDropdowns();

    if (page === "home") {
        home.classList.remove("hidden");
        prod.classList.add("hidden");
        loadHome();
    } else {
        home.classList.add("hidden");
        prod.classList.remove("hidden");
    }

    setTimeout(() => lucide.createIcons(), 100);
}

function handleHeaderVisibility() {
    const nav = document.querySelector("nav");
    if (!nav) return;

    const currentScrollY = window.scrollY || window.pageYOffset;
    if (currentScrollY <= 30) nav.classList.remove("nav-hidden");
    else if (currentScrollY > lastScrollY && currentScrollY > 120) nav.classList.add("nav-hidden");
    else if (currentScrollY < lastScrollY) nav.classList.remove("nav-hidden");

    lastScrollY = currentScrollY;
}

function renderParticles() {
    const container = document.getElementById("hero-particles");
    if (!container) return;

    const particles = Array.from({ length: 48 }, (_, index) => {
        const size = `${Math.random() * 5 + 2}px`;
        const left = `${Math.random() * 100}%`;
        const top = `${Math.random() * 100}%`;
        const opacity = (Math.random() * 0.5 + 0.2).toFixed(2);
        const duration = `${Math.random() * 10 + 8}s`;
        const delay = `${Math.random() * -18}s`;
        const kind = index % 3 === 0 ? "particle soft" : "particle";
        return `<span class="${kind}" style="--size:${size}; --left:${left}; --top:${top}; --opacity:${opacity}; --duration:${duration}; --delay:${delay};"></span>`;
    });

    container.innerHTML = particles.join("");
}

window.toggleDropdown = toggleDropdown;
window.showPage = showPage;
window.loadConfig = loadConfig;
window.closeDropdowns = closeDropdowns;
window.sortItems = sortItems;
window.searchProducts = searchProducts;

window.onload = () => {
    renderParticles();
    loadHome();
    lucide.createIcons();
    handleHeaderVisibility();
};

window.addEventListener("scroll", handleHeaderVisibility, { passive: true });
document.addEventListener("click", (event) => {
    if (!event.target.closest(".dropdown")) closeDropdowns();
});
window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeDropdowns();
});
