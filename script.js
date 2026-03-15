(() => {
  "use strict";

  /** @typedef {{
   *  id: string;
   *  word: string;
   *  reading: string;
   *  language: string;
   *  category: string;
   *  meaning: string;
   *  example: string;
   *  tags: string[];
   *  favorite: boolean;
   *  rating: number;
   *  note: string;
   *  createdAt: string;
   *  updatedAt: string;
   * }} SenseWord */

  const STORAGE_KEY = "sensewords:v1";
  const PREF_KEY = "sensewords:prefs:v1";

  /** @type {SenseWord[]} */
  let words = [];

  const prefs = {
    theme: "dark",
    compact: false,
  };

  const els = {
    totalWords: document.getElementById("totalWords"),
    favoriteCount: document.getElementById("favoriteCount"),
    tagCount: document.getElementById("tagCount"),
    randomWordMain: document.getElementById("randomWordMain"),
    randomWordSub: document.getElementById("randomWordSub"),
    randomWordCard: document.getElementById("randomWordCard"),
    searchInput: document.getElementById("searchInput"),
    tagFilter: document.getElementById("tagFilter"),
    sortSelect: document.getElementById("sortSelect"),
    clearFiltersButton: document.getElementById("clearFiltersButton"),
    shuffleButton: document.getElementById("shuffleButton"),
    exportButton: document.getElementById("exportButton"),
    importButton: document.getElementById("importButton"),
    importFileInput: document.getElementById("importFileInput"),
    tagList: document.getElementById("tagList"),
    wordGrid: document.getElementById("wordGrid"),
    emptyState: document.getElementById("emptyState"),
    resultCount: document.getElementById("resultCount"),
    wordCardTemplate: /** @type {HTMLTemplateElement|null} */ (
      document.getElementById("wordCardTemplate")
    ),
    themeToggle: document.getElementById("themeToggle"),
    compactToggle: document.getElementById("compactToggle"),
    toggleSidebarButton: document.getElementById("toggleSidebarButton"),
    addWordButton: document.getElementById("addWordButton"),
    wordModalBackdrop: document.getElementById("wordModalBackdrop"),
    closeModalButton: document.getElementById("closeModalButton"),
    cancelButton: document.getElementById("cancelButton"),
    deleteWordButton: document.getElementById("deleteWordButton"),
    wordForm: document.getElementById("wordForm"),
    wordId: document.getElementById("wordId"),
    wordInput: document.getElementById("wordInput"),
    readingInput: document.getElementById("readingInput"),
    languageInput: document.getElementById("languageInput"),
    categoryInput: document.getElementById("categoryInput"),
    meaningInput: document.getElementById("meaningInput"),
    exampleInput: document.getElementById("exampleInput"),
    tagsInput: document.getElementById("tagsInput"),
    favoriteToggle: document.getElementById("favoriteToggle"),
    ratingInput: document.getElementById("ratingInput"),
    noteInput: document.getElementById("noteInput"),
  };

  function safeParseJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = safeParseJSON(raw);
      if (Array.isArray(parsed)) {
        words = parsed.map((w) => ({
          ...w,
          tags: Array.isArray(w.tags)
            ? w.tags
            : typeof w.tags === "string"
            ? w.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        }));
      }
    }

    const prefRaw = localStorage.getItem(PREF_KEY);
    if (prefRaw) {
      const p = safeParseJSON(prefRaw);
      if (p && typeof p === "object") {
        if (p.theme === "light" || p.theme === "dark") {
          prefs.theme = p.theme;
        }
        if (typeof p.compact === "boolean") {
          prefs.compact = p.compact;
        }
      }
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }

  function savePrefs() {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  }

  function applyTheme() {
    if (prefs.theme === "dark") {
      document.body.classList.add("theme-dark");
    } else {
      document.body.classList.remove("theme-dark");
    }
    if (els.themeToggle) {
      els.themeToggle.querySelector(".icon").textContent =
        prefs.theme === "dark" ? "🌙" : "☀️";
    }
  }

  function applyCompact() {
    const app = document.querySelector(".app");
    if (!app) return;
    if (prefs.compact) {
      app.classList.add("compact");
    } else {
      app.classList.remove("compact");
    }
  }

  function collectTags() {
    const map = new Map();
    for (const w of words) {
      for (const tag of w.tags || []) {
        if (!tag) continue;
        map.set(tag, (map.get(tag) || 0) + 1);
      }
    }
    return map;
  }

  let currentSearch = "";
  let currentTagFilter = "";
  let currentSort = "created-desc";

  function filterAndSortWords() {
    let list = [...words];

    if (currentSearch.trim()) {
      const q = currentSearch.trim().toLowerCase();
      list = list.filter((w) => {
        return (
          (w.word || "").toLowerCase().includes(q) ||
          (w.reading || "").toLowerCase().includes(q) ||
          (w.meaning || "").toLowerCase().includes(q) ||
          (w.example || "").toLowerCase().includes(q) ||
          (w.note || "").toLowerCase().includes(q) ||
          (w.language || "").toLowerCase().includes(q) ||
          (w.category || "").toLowerCase().includes(q) ||
          (Array.isArray(w.tags) ? w.tags.join(" ") : "").toLowerCase().includes(q)
        );
      });
    }

    if (currentTagFilter) {
      list = list.filter(
        (w) => Array.isArray(w.tags) && w.tags.includes(currentTagFilter)
      );
    }

    list.sort((a, b) => {
      switch (currentSort) {
        case "created-asc":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "created-desc":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "word-asc":
          return (a.word || "").localeCompare(b.word || "", "ja");
        case "word-desc":
          return (b.word || "").localeCompare(a.word || "", "ja");
        case "favorite-desc":
          if (a.favorite === b.favorite) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return a.favorite ? -1 : 1;
        case "rating-desc":
          if ((b.rating || 0) === (a.rating || 0)) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return list;
  }

  function renderStats() {
    if (els.totalWords) els.totalWords.textContent = String(words.length);
    if (els.favoriteCount) {
      els.favoriteCount.textContent = String(words.filter((w) => w.favorite).length);
    }
    const tagMap = collectTags();
    if (els.tagCount) els.tagCount.textContent = String(tagMap.size);

    const card = els.randomWordCard;
    if (!card) return;
    if (words.length === 0) {
      els.randomWordMain.textContent = "—";
      els.randomWordSub.textContent = "まだ登録がありません";
      return;
    }
    const today = new Date();
    const seed =
      today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % words.length;
    const w = words[index];
    els.randomWordMain.textContent = w.word || "—";
    const hints = [
      w.meaning,
      w.example,
      w.note,
      [w.language, w.category].filter(Boolean).join(" / "),
    ].filter(Boolean);
    els.randomWordSub.textContent =
      hints[0] || "その日のワードは日替わりでランダムに変わります。";
  }

  function renderTags() {
    const list = els.tagList;
    const select = els.tagFilter;
    if (!list || !select) return;

    const tagMap = collectTags();
    list.innerHTML = "";

    const buttonAll = document.createElement("li");
    const btnAll = document.createElement("button");
    btnAll.textContent = "すべて";
    if (!currentTagFilter) {
      btnAll.classList.add("active");
    }
    btnAll.addEventListener("click", () => {
      currentTagFilter = "";
      select.value = "";
      render();
    });
    buttonAll.appendChild(btnAll);
    list.appendChild(buttonAll);

    select.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "すべて";
    select.appendChild(optAll);

    const entries = Array.from(tagMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "ja")
    );

    for (const [tag, count] of entries) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = tag;
      if (currentTagFilter === tag) {
        btn.classList.add("active");
      }
      const badge = document.createElement("span");
      badge.className = "tag-count-pill";
      badge.textContent = String(count);
      btn.appendChild(badge);
      btn.addEventListener("click", () => {
        currentTagFilter = currentTagFilter === tag ? "" : tag;
        select.value = currentTagFilter;
        render();
      });
      li.appendChild(btn);
      list.appendChild(li);

      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = `${tag} (${count})`;
      select.appendChild(opt);
    }

    select.value = currentTagFilter;
  }

  function renderWordList() {
    if (!els.wordGrid || !els.emptyState || !els.resultCount) return;
    const list = filterAndSortWords();

    els.wordGrid.innerHTML = "";
    els.resultCount.textContent = `${list.length} 件`;

    if (list.length === 0) {
      els.emptyState.classList.remove("hidden");
      return;
    }

    els.emptyState.classList.add("hidden");

    for (const w of list) {
      const card = createWordCard(w);
      els.wordGrid.appendChild(card);
    }
  }

  function setFavoriteButtonState(button, active) {
    if (!button) return;
    if (active) {
      button.classList.add("active");
      button.textContent = "★";
    } else {
      button.classList.remove("active");
      button.textContent = "☆";
    }
  }

  function createWordCard(w) {
    const t = els.wordCardTemplate;
    if (!t || !("content" in t)) {
      const card = document.createElement("article");
      card.className = "word-card";
      card.textContent = w.word || "";
      return card;
    }
    const clone = /** @type {HTMLElement} */ (t.content.firstElementChild.cloneNode(true));

    const title = clone.querySelector(".word-title");
    const reading = clone.querySelector(".word-reading");
    const lang = clone.querySelector(".word-language");
    const cat = clone.querySelector(".word-category");
    const meaning = clone.querySelector(".word-meaning");
    const example = clone.querySelector(".word-example");
    const tagsContainer = clone.querySelector(".word-tags");
    const rating = clone.querySelector(".word-rating");
    const date = clone.querySelector(".word-date");
    const favoriteBtn = clone.querySelector(".favorite-button");
    const editBtn = clone.querySelector(".edit-button");
    const dupBtn = clone.querySelector(".duplicate-button");

    if (title) title.textContent = w.word || "（未入力）";
    if (reading) reading.textContent = w.reading || "";
    if (lang) lang.textContent = w.language || "";
    if (cat) cat.textContent = w.category || "";
    if (meaning) meaning.textContent = w.meaning || "";
    if (example) example.textContent = w.example || "";

    if (tagsContainer) {
      tagsContainer.innerHTML = "";
      if (Array.isArray(w.tags)) {
        for (const tag of w.tags) {
          if (!tag) continue;
          const pill = document.createElement("span");
          pill.className = "word-tag-pill";
          pill.textContent = tag;
          tagsContainer.appendChild(pill);
        }
      }
    }

    if (rating) {
      const r = Math.max(0, Math.min(5, Number(w.rating) || 0));
      if (r <= 0) {
        rating.textContent = "";
      } else {
        rating.innerHTML = `<span>${"★".repeat(r)}</span>${"☆".repeat(5 - r)}`;
      }
    }

    if (date) {
      date.textContent = formatDate(w.createdAt);
    }

    if (favoriteBtn) {
      setFavoriteButtonState(favoriteBtn, w.favorite);
      favoriteBtn.addEventListener("click", () => {
        w.favorite = !w.favorite;
        w.updatedAt = new Date().toISOString();
        setFavoriteButtonState(favoriteBtn, w.favorite);
        saveToStorage();
        renderStats();
      });
    }

    if (editBtn) {
      editBtn.addEventListener("click", () => openModalForEdit(w.id));
    }

    if (dupBtn) {
      dupBtn.addEventListener("click", () => {
        const copy = {
          ...w,
          id: uid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        words.unshift(copy);
        saveToStorage();
        render();
      });
    }

    return clone;
  }

  function render() {
    renderStats();
    renderTags();
    renderWordList();
  }

  function openModal() {
    if (!els.wordModalBackdrop) return;
    els.wordModalBackdrop.classList.add("visible");
    els.wordModalBackdrop.setAttribute("aria-hidden", "false");
    if (els.wordInput) {
      setTimeout(() => els.wordInput.focus(), 10);
    }
  }

  function closeModal() {
    if (!els.wordModalBackdrop) return;
    els.wordModalBackdrop.classList.remove("visible");
    els.wordModalBackdrop.setAttribute("aria-hidden", "true");
  }

  function resetForm() {
    if (!els.wordForm) return;
    els.wordForm.reset();
    if (els.wordId) els.wordId.value = "";
    if (els.favoriteToggle) {
      els.favoriteToggle.setAttribute("aria-pressed", "false");
    }
    if (els.ratingInput) {
      els.ratingInput.value = "0";
    }
    if (els.deleteWordButton) {
      els.deleteWordButton.classList.add("hidden");
    }
    const titleEl = document.getElementById("wordModalTitle");
    if (titleEl) titleEl.textContent = "ワードを追加";
  }

  function openModalForNew() {
    resetForm();
    openModal();
  }

  function fillFormFromWord(w) {
    if (!w) return;
    if (els.wordId) els.wordId.value = w.id;
    if (els.wordInput) els.wordInput.value = w.word || "";
    if (els.readingInput) els.readingInput.value = w.reading || "";
    if (els.languageInput) els.languageInput.value = w.language || "";
    if (els.categoryInput) els.categoryInput.value = w.category || "";
    if (els.meaningInput) els.meaningInput.value = w.meaning || "";
    if (els.exampleInput) els.exampleInput.value = w.example || "";
    if (els.tagsInput) els.tagsInput.value = (w.tags || []).join(", ");
    if (els.noteInput) els.noteInput.value = w.note || "";
    if (els.favoriteToggle) {
      els.favoriteToggle.setAttribute("aria-pressed", w.favorite ? "true" : "false");
    }
    if (els.ratingInput) {
      els.ratingInput.value = String(Number.isFinite(w.rating) ? w.rating : 0);
    }
    if (els.deleteWordButton) {
      els.deleteWordButton.classList.remove("hidden");
    }
    const titleEl = document.getElementById("wordModalTitle");
    if (titleEl) titleEl.textContent = "ワードを編集";
  }

  function openModalForEdit(id) {
    const w = words.find((w) => w.id === id);
    if (!w) return;
    resetForm();
    fillFormFromWord(w);
    openModal();
  }

  function parseTags(text) {
    if (!text) return [];
    return text
      .split(/[,、]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    if (!els.wordInput) return;

    const word = els.wordInput.value.trim();
    if (!word) {
      els.wordInput.focus();
      return;
    }

    const now = new Date().toISOString();
    const id = els.wordId && els.wordId.value ? els.wordId.value : uid();
    const existingIndex = words.findIndex((w) => w.id === id);

    const favorite =
      els.favoriteToggle &&
      els.favoriteToggle.getAttribute("aria-pressed") === "true";
    const rating = els.ratingInput ? Number(els.ratingInput.value) || 0 : 0;

    const payload = {
      id,
      word,
      reading: els.readingInput ? els.readingInput.value.trim() : "",
      language: els.languageInput ? els.languageInput.value.trim() : "",
      category: els.categoryInput ? els.categoryInput.value.trim() : "",
      meaning: els.meaningInput ? els.meaningInput.value.trim() : "",
      example: els.exampleInput ? els.exampleInput.value.trim() : "",
      tags: parseTags(els.tagsInput ? els.tagsInput.value : ""),
      favorite,
      rating,
      note: els.noteInput ? els.noteInput.value.trim() : "",
      createdAt:
        existingIndex >= 0 && words[existingIndex].createdAt
          ? words[existingIndex].createdAt
          : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      words[existingIndex] = payload;
    } else {
      words.unshift(payload);
    }

    saveToStorage();
    render();
    closeModal();
  }

  function handleDeleteWord() {
    if (!els.wordId || !els.wordId.value) {
      closeModal();
      return;
    }
    const id = els.wordId.value;
    const index = words.findIndex((w) => w.id === id);
    if (index >= 0) {
      words.splice(index, 1);
      saveToStorage();
      render();
    }
    closeModal();
  }

  function handleExport() {
    if (words.length === 0) {
      alert("まだワードが登録されていません。");
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const blob = new Blob([JSON.stringify({ version: 1, words }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sensewords-${y}${m}${d}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleImportFileChange(event) {
    const input = /** @type {HTMLInputElement} */ (event.target);
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = safeParseJSON(text);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.words)) {
        alert("読み込みに失敗しました。ファイル形式を確認してください。");
        return;
      }
      const incoming = parsed.words.map((w) => ({
        ...w,
        id: w.id || uid(),
        tags: Array.isArray(w.tags)
          ? w.tags
          : typeof w.tags === "string"
          ? w.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        createdAt: w.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const existingIds = new Set(words.map((w) => w.id));
      const merged = [...words];
      for (const w of incoming) {
        if (existingIds.has(w.id)) {
          merged.push({ ...w, id: uid() });
        } else {
          merged.push(w);
        }
      }
      words = merged;
      saveToStorage();
      render();
      alert(`インポートが完了しました（${incoming.length} 件追加）。`);
    };
    reader.readAsText(file, "utf-8");
    input.value = "";
  }

  function handleShuffle() {
    if (words.length === 0) return;
    const list = filterAndSortWords();
    if (list.length === 0) return;
    const index = Math.floor(Math.random() * list.length);
    const w = list[index];
    currentSearch = w.word || "";
    if (els.searchInput) {
      els.searchInput.value = currentSearch;
    }
    render();
  }

  function focusSearch() {
    if (!els.searchInput) return;
    els.searchInput.focus();
    els.searchInput.select();
  }

  function setupEvents() {
    if (els.addWordButton) {
      els.addWordButton.addEventListener("click", openModalForNew);
    }
    if (els.closeModalButton) {
      els.closeModalButton.addEventListener("click", closeModal);
    }
    if (els.cancelButton) {
      els.cancelButton.addEventListener("click", closeModal);
    }
    if (els.wordModalBackdrop) {
      els.wordModalBackdrop.addEventListener("click", (e) => {
        if (e.target === els.wordModalBackdrop) {
          closeModal();
        }
      });
    }
    if (els.favoriteToggle) {
      els.favoriteToggle.addEventListener("click", () => {
        const pressed =
          els.favoriteToggle.getAttribute("aria-pressed") === "true" ? "false" : "true";
        els.favoriteToggle.setAttribute("aria-pressed", pressed);
      });
    }
    if (els.wordForm) {
      els.wordForm.addEventListener("submit", handleFormSubmit);
    }
    if (els.deleteWordButton) {
      els.deleteWordButton.addEventListener("click", () => {
        if (confirm("このワードを削除しますか？")) {
          handleDeleteWord();
        }
      });
    }
    if (els.searchInput) {
      els.searchInput.addEventListener("input", () => {
        currentSearch = els.searchInput.value;
        renderWordList();
      });
    }
    if (els.tagFilter) {
      els.tagFilter.addEventListener("change", () => {
        currentTagFilter = els.tagFilter.value;
        renderWordList();
      });
    }
    if (els.sortSelect) {
      els.sortSelect.addEventListener("change", () => {
        currentSort = els.sortSelect.value;
        renderWordList();
      });
    }
    if (els.clearFiltersButton) {
      els.clearFiltersButton.addEventListener("click", () => {
        currentSearch = "";
        currentTagFilter = "";
        currentSort = "created-desc";
        if (els.searchInput) els.searchInput.value = "";
        if (els.tagFilter) els.tagFilter.value = "";
        if (els.sortSelect) els.sortSelect.value = "created-desc";
        render();
      });
    }
    if (els.shuffleButton) {
      els.shuffleButton.addEventListener("click", handleShuffle);
    }
    if (els.exportButton) {
      els.exportButton.addEventListener("click", handleExport);
    }
    if (els.importButton && els.importFileInput) {
      els.importButton.addEventListener("click", () => els.importFileInput.click());
      els.importFileInput.addEventListener("change", handleImportFileChange);
    }
    if (els.themeToggle) {
      els.themeToggle.addEventListener("click", () => {
        prefs.theme = prefs.theme === "dark" ? "light" : "dark";
        savePrefs();
        applyTheme();
      });
    }
    if (els.compactToggle) {
      els.compactToggle.addEventListener("click", () => {
        prefs.compact = !prefs.compact;
        savePrefs();
        applyCompact();
      });
    }
    if (els.toggleSidebarButton) {
      const sidebar = document.querySelector(".sidebar");
      els.toggleSidebarButton.addEventListener("click", () => {
        if (!sidebar) return;
        const hidden = sidebar.classList.toggle("hidden");
        els.toggleSidebarButton.textContent = hidden ? "開く" : "閉じる";
      });
    }

    document.addEventListener("keydown", (e) => {
      const active = document.activeElement;
      const inInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.getAttribute("contenteditable") === "true");

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
        return;
      }

      if (inInput) return;

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openModalForNew();
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        prefs.theme = prefs.theme === "dark" ? "light" : "dark";
        savePrefs();
        applyTheme();
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        prefs.compact = !prefs.compact;
        savePrefs();
        applyCompact();
      }
    });
  }

  function migrateIfNeeded() {
    let updated = false;
    for (const w of words) {
      if (!Array.isArray(w.tags)) {
        w.tags = parseTags(w.tags || "");
        updated = true;
      }
      if (!w.id) {
        w.id = uid();
        updated = true;
      }
      if (!w.createdAt) {
        w.createdAt = new Date().toISOString();
        updated = true;
      }
      if (!w.updatedAt) {
        w.updatedAt = w.createdAt;
        updated = true;
      }
      if (typeof w.favorite !== "boolean") {
        w.favorite = false;
        updated = true;
      }
      if (!Number.isFinite(w.rating)) {
        w.rating = 0;
        updated = true;
      }
    }
    if (updated) {
      saveToStorage();
    }
  }

  function init() {
    loadFromStorage();
    migrateIfNeeded();
    applyTheme();
    applyCompact();
    setupEvents();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

