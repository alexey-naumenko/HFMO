// === НАСТРОЙКИ ===
const MENU_CONTAINER_SELECTOR =
  '[data-qa="vacancy-list"] [data-qa="content"] > div'; // контейнер с вакансиями в "Мои вакансии"
const VACANCY_SELECTOR = 'a[data-qa="sidebar-vacancy-title"]';

// === ИКОНКИ (Lucide, MIT) ===
const ICONS = {
  pencil:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
  trash:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  eject:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 9-6-6-6 6"/><path d="M12 3v14"/><path d="M5 21h14"/></svg>',
  refresh:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
  plus:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
};

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===
let currentOrganizer = null;

function moveVacancy(fromCatIdx, fromVIdx, toCatIdx, toVIdx) {
  if (currentOrganizer) {
    currentOrganizer.moveVacancy(fromCatIdx, fromVIdx, toCatIdx, toVIdx);
  }
}

function moveVacancyToUncategorized(catIdx, vIdx) {
  if (currentOrganizer) {
    currentOrganizer.moveVacancyToUncategorized(catIdx, vIdx);
  }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function getVacancyData(a) {
  const href = a.getAttribute("href") || "#";

  // Заголовок
  let titleElement =
    a.querySelector(".titleText--sZxcF") ||
    a.querySelector(".titleText--CVA7z") ||
    a.querySelector('[class*="titleText--"]');
  const title = titleElement
    ? titleElement.textContent.trim()
    : a.innerText || "";

  // Подзаголовок
  const subtitleElement =
    a.querySelector(".subtitleText--Zrh4S") ||
    a.querySelector('[class*="subtitleText--"]');
  const subtitle = subtitleElement ? subtitleElement.textContent.trim() : "";
  const subtitleHTML = subtitleElement ? subtitleElement.innerHTML : "";

  // Иконка (берём html первого элемента внутри .icons--Byggd)
  let iconHTML = "";
  const iconNode = a.querySelector(".icons--Byggd .icon--oJdBi");
  if (iconNode) {
    iconHTML = iconNode.outerHTML;
  }

  const vacIdMatch = href.match(/\/vacancy\/(\d+)/);
  const id = vacIdMatch ? vacIdMatch[1] : href;

  return {
    id,
    text: title,
    subtitle: subtitle,
    href: href,
    icon: iconHTML,
    subtitleHTML: subtitleHTML,
  };
}

class HuntflowMenuOrganizer {
  constructor(menuContainerSelector, vacancySelector) {
    this.menuContainerSelector = menuContainerSelector;
    this.vacancySelector = vacancySelector;
    this.structure = [];
    this.menuContainer = null;
    this._navListenersWired = false;
    this.init();
  }

  init() {
    this.waitForMenuAndInit();
  }

  _debounce(fn, ms = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  saveStructure() {
    chrome.storage.local.set({ menuOrganizerAccordion: this.structure });
  }

  loadStructure(callback) {
    chrome.storage.local.get("menuOrganizerAccordion", (data) => {
      callback(data.menuOrganizerAccordion || null);
    });
  }

  getSourceNodes() {
    if (!this.sourceContainer) return [];
    return this.sourceContainer.querySelectorAll(this.vacancySelector);
  }

  isVacancyActive(vacHref) {
    try {
      const curHref = window.location.href;
      const curHash = window.location.hash || "";
      const u = new URL(vacHref, curHref);

      // 1) Прямое сравнение hash
      if (u.hash) {
        return curHash === u.hash;
      }

      // 2) Сравнение по id из /vacancy/:id (и в hash, и в pathname)
      const idFrom = (str) => (str.match(/\/vacancy\/(\d+)/) || [])[1];
      const curId = idFrom(curHref);
      const linkId = idFrom(u.href);
      if (curId && linkId) return curId === linkId;

      // 3) Фоллбек — обычный путь
      return (
        u.pathname === window.location.pathname &&
        u.search === window.location.search
      );
    } catch {
      return false;
    }
  }

  updateActiveVacancy() {
    if (!this.menuContainer) return;
    const links = this.menuContainer.querySelectorAll("a.sidebar-vacancy");
    links.forEach((el) => {
      const href = el.getAttribute("href") || "";
      if (this.isVacancyActive(href)) el.classList.add("active-vacancy");
      else el.classList.remove("active-vacancy");
    });
  }

  wireNavigationListeners() {
    if (this._navListenersWired) return;
    this._navListenersWired = true;
    // Для hash-роутера достаточно hashchange, но на всякий — ещё popstate
    window.addEventListener("hashchange", () => this.updateActiveVacancy());
    window.addEventListener("popstate", () => this.updateActiveVacancy());
  }

  createCategoryElement(category, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = `[${category.name}] ${category.collapsed ? "►" : "▼"}`;
    header.onclick = () => {
      category.collapsed = !category.collapsed;
      this.saveStructure();
      this.renderMenu();
    };

    const controls = document.createElement("div");
    controls.className = "controls";

    const renameBtn = document.createElement("button");
    renameBtn.innerHTML = ICONS.pencil;
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      const newName = prompt("Новое имя категории:", category.name);
      if (newName) {
        category.name = newName;
        this.saveStructure();
        this.renderMenu();
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = ICONS.trash;
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (
        confirm(
          "Удалить категорию? Вакансии будут перемещены в 'Без категории'."
        )
      ) {
        const uncategorized = this.structure.find(
          (c) => c.type === "uncategorized"
        );
        uncategorized.vacancies.push(...category.vacancies);
        this.structure.splice(index, 1);
        this.saveStructure();
        this.renderMenu();
      }
    };

    controls.appendChild(renameBtn);
    controls.appendChild(deleteBtn);
    header.appendChild(controls);

    const body = this.createCategoryBody(category, index);

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    // Drag & drop для перемещения категорий
    wrapper.draggable = true;
    wrapper.ondragstart = (e) => {
      e.dataTransfer.setData("application/x-category", String(index));
      wrapper.classList.add("menu-organizer-dragging");
    };
    wrapper.ondragend = () => wrapper.classList.remove("menu-organizer-dragging");
    wrapper.addEventListener("dragover", (e) => {
      // Обрабатываем только перетаскивание категорий
      if (!e.dataTransfer.types.includes("application/x-category")) return;
      e.preventDefault();
      e.stopPropagation();
      wrapper.classList.add("menu-organizer-drag-over-category");
    });
    wrapper.addEventListener("dragleave", (e) => {
      // Убираем подсветку только при выходе за пределы wrapper
      if (!wrapper.contains(e.relatedTarget)) {
        wrapper.classList.remove("menu-organizer-drag-over-category");
      }
    });
    wrapper.addEventListener("drop", (e) => {
      if (!e.dataTransfer.types.includes("application/x-category")) return;
      e.preventDefault();
      e.stopPropagation();
      wrapper.classList.remove("menu-organizer-drag-over-category");
      const fromIdx = parseInt(e.dataTransfer.getData("application/x-category"), 10);
      if (fromIdx !== index) {
        this.moveCategory(fromIdx, index);
      }
    });

    return wrapper;
  }

  createCategoryBody(category, index) {
    const body = document.createElement("div");
    body.className = "category-body";
    if (category.collapsed) body.classList.add("collapsed");

    body.ondragover = (e) => {
      e.preventDefault();
      body.classList.add("menu-organizer-drag-over");
    };
    body.ondragleave = () => body.classList.remove("menu-organizer-drag-over");
    body.ondrop = (e) => {
      e.preventDefault();
      body.classList.remove("menu-organizer-drag-over");
      this.handleDropVacancy(e, index);
    };

    if (category.vacancies.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Перетащите сюда вакансию";
      body.appendChild(empty);
    } else {
      category.vacancies.forEach((vac, vIdx) => {
        const a = this.createVacancyElement(vac, index, vIdx);
        body.appendChild(a);
      });
    }
    return body;
  }

  createUncategorizedElement(category) {
    const wrapper = document.createElement("div");
    wrapper.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = "[Без категории]";

    const body = this.createCategoryBody(
      category,
      this.structure.findIndex((c) => c.type === "uncategorized")
    );

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
  }

  createVacancyElement(vac, catIdx, vIdx) {
    const a = document.createElement("a");
    a.href = vac.href || "#";
    a.className = "sidebar-vacancy";
    a.setAttribute("data-id", vac.id || "");
    a.draggable = true;

    // Левая колонка с иконкой
    const iconsDiv = document.createElement("div");
    iconsDiv.className = "icons--Byggd";
    if (vac.icon) {
      iconsDiv.innerHTML = vac.icon;
    } else {
      const priorityIcon = document.createElement("svg");
      priorityIcon.setAttribute("width", "12");
      priorityIcon.setAttribute("height", "12");
      priorityIcon.setAttribute("viewBox", "0 0 12 12");
      priorityIcon.innerHTML = '<path fill="#ff6b35" d="M2 2h8v8H2z"/>';
      iconsDiv.appendChild(priorityIcon);
    }

    if (this.isVacancyActive(vac.href)) {
      a.classList.add("active-vacancy");
    }

    // Текстовая часть
    const textDiv = document.createElement("div");
    textDiv.className = "text--QN1Gf";

    const titleDiv = document.createElement("div");
    titleDiv.className = "title--dg32n";

    const titleSpan = document.createElement("span");
    titleSpan.className = "titleText--sZxcF";
    titleSpan.textContent = vac.text || "";
    titleDiv.appendChild(titleSpan);

    const subtitleDiv = document.createElement("div");
    subtitleDiv.className = "subtitle--lD9pR";

    const subtitleSpan = document.createElement("span");
    subtitleSpan.className = "subtitleText--Zrh4S";

    // если ранее сохранили HTML сабтайтла — рендерим его (тогда иконка «паузы» появится)
    if (vac.subtitleHTML) {
      subtitleSpan.innerHTML = vac.subtitleHTML;
    } else {
      subtitleSpan.textContent = vac.subtitle || "Описание вакансии";
    }

    // ВАЖНО: добавить subtitleSpan внутрь subtitleDiv
    subtitleDiv.appendChild(subtitleSpan);

    textDiv.appendChild(titleDiv);
    textDiv.appendChild(subtitleDiv);

    // Кнопки управления
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "vacancy-controls";

    const removeBtn = document.createElement("button");
    removeBtn.innerHTML = ICONS.eject;
    removeBtn.title = 'Переместить в "Без категории"';
    removeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      moveVacancyToUncategorized(catIdx, vIdx);
    };
    controlsDiv.appendChild(removeBtn);

    // Сборка
    a.appendChild(iconsDiv);
    a.appendChild(textDiv);
    a.appendChild(controlsDiv);

    // Drag-and-drop
    a.ondragstart = (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ catIdx, vIdx }));
      a.classList.add("menu-organizer-dragging");
    };
    a.ondragend = () => a.classList.remove("menu-organizer-dragging");
    a.ondragover = (e) => {
      e.preventDefault();
      a.classList.add("menu-organizer-drag-over");
    };
    a.ondragleave = () => a.classList.remove("menu-organizer-drag-over");
    a.ondrop = (e) => {
      e.preventDefault();
      a.classList.remove("menu-organizer-drag-over");
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.catIdx !== catIdx || data.vIdx !== vIdx) {
        moveVacancy(data.catIdx, data.vIdx, catIdx, vIdx);
      }
    };

    return a;
  }

  handleDropVacancy(e, targetCatIdx) {
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;
    const { catIdx, vIdx } = JSON.parse(data);
    if (catIdx === targetCatIdx) return;

    const vac = this.structure[catIdx].vacancies.splice(vIdx, 1)[0];
    this.structure[targetCatIdx].vacancies.push(vac);
    this.saveStructure();
    this.renderMenu();
  }

  handleDropVacancyOnVacancy(e, targetCatIdx, targetVIdx) {
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;
    const { catIdx, vIdx } = JSON.parse(data);
    if (catIdx === targetCatIdx && vIdx === targetVIdx) return;

    const vac = this.structure[catIdx].vacancies.splice(vIdx, 1)[0];
    this.structure[targetCatIdx].vacancies.splice(targetVIdx, 0, vac);
    this.saveStructure();
    this.renderMenu();
  }

  moveCategory(fromIdx, toIdx) {
    const [cat] = this.structure.splice(fromIdx, 1);
    this.structure.splice(toIdx, 0, cat);
    this.saveStructure();
    this.renderMenu();
  }

  moveVacancy(fromCatIdx, fromVIdx, toCatIdx, toVIdx) {
    const vac = this.structure[fromCatIdx].vacancies.splice(fromVIdx, 1)[0];
    if (fromCatIdx === toCatIdx && fromVIdx < toVIdx) {
      toVIdx--;
    }
    this.structure[toCatIdx].vacancies.splice(toVIdx, 0, vac);
    this.saveStructure();
    this.renderMenu();
  }

  moveVacancyToUncategorized(catIdx, vIdx) {
    const vac = this.structure[catIdx].vacancies.splice(vIdx, 1)[0];
    const uncategorized = this.structure.find(
      (c) => c.type === "uncategorized"
    );
    uncategorized.vacancies.push(vac);
    this.saveStructure();
    this.renderMenu();
  }

  addCategory(name) {
    this.structure.splice(this.structure.length - 1, 0, {
      type: "category",
      name,
      collapsed: false,
      vacancies: [],
    });
    this.saveStructure();
    this.renderMenu();
  }

  buildInitialStructure() {
    const nodes = this.getSourceNodes();
    const vacancies = Array.from(nodes).map((node) => getVacancyData(node));
    this.structure.push({ type: "uncategorized", vacancies });
    this.saveStructure();
  }

  renderMenu() {
    this.menuContainer.innerHTML = "";
    this.menuContainer.appendChild(this.createControlsBar());
    this.structure.forEach((item, idx) => {
      if (item.type === "category") {
        this.menuContainer.appendChild(this.createCategoryElement(item, idx));
      }
    });
    const uncategorized = this.structure.find(
      (c) => c.type === "uncategorized"
    );
    if (uncategorized) {
      this.menuContainer.appendChild(
        this.createUncategorizedElement(uncategorized)
      );
    }
    this.updateActiveVacancy();
  }

  createControlsBar() {
    // гарантируем нашу сетку, даже если страница переопределяет
    const bar = document.createElement("div");
    bar.className = "menu-organizer-controls";
    bar.style.display = "grid";
    bar.style.gridTemplateColumns = "1fr 1fr";
    bar.style.gap = "8px";
    bar.style.margin = "12px 0";

    bar.appendChild(this.createAddBtn());
    bar.appendChild(this.createHardSyncBtn());
    return bar;
  }

  createAddBtn() {
    const addBtn = document.createElement("button");
    addBtn.innerHTML = ICONS.plus + " Добавить категорию";
    addBtn.className = "menu-organizer-add-btn";
    addBtn.type = "button";
    // ключевое — не даём занять всю строку в флекс/грид-контейнере
    addBtn.style.width = "100%";
    addBtn.style.display = "block";
    addBtn.onclick = () => {
      const name = prompt("Название категории:");
      if (name) this.addCategory(name);
    };
    return addBtn;
  }

  createHardSyncBtn() {
    const btn = document.createElement("button");
    btn.innerHTML = ICONS.refresh + " Синхронизировать";
    btn.className = "menu-organizer-refresh-btn";
    btn.type = "button";
    btn.style.width = "100%";
    btn.style.display = "block";
    btn.title = "Обновить список из DOM и удалить исчезнувшие вакансии";
    btn.onclick = () => this.refreshFromDOM({ pruneMissing: true });
    return btn;
  }

  // Добавь метод обновления (если его ещё нет)
  refreshFromDOM({ pruneMissing = false } = {}) {
    try {
      const freshNodes = this.getSourceNodes();
      const fresh = Array.from(freshNodes).map(getVacancyData);
      const freshMap = new Map(fresh.map((v) => [v.id, v]));

      // 1) обновляем существующих
      for (const cat of this.structure) {
        for (const v of cat.vacancies) {
          const nv = freshMap.get(v.id);
          if (nv) {
            v.text = nv.text;
            v.subtitle = nv.subtitle;
            v.subtitleHTML = nv.subtitleHTML; // <<< добавь это
            v.href = nv.href;
            v.icon = nv.icon;
          }
        }
      }

      // 2) добавляем новых в "Без категории"
      const uncategorized =
        this.structure.find((c) => c.type === "uncategorized") ||
        (() => {
          const u = { type: "uncategorized", vacancies: [] };
          this.structure.push(u);
          return u;
        })();

      const knownIds = new Set(
        this.structure.flatMap((c) => c.vacancies.map((v) => v.id))
      );
      let added = 0;
      for (const v of fresh) {
        if (!knownIds.has(v.id)) {
          uncategorized.vacancies.push(v);
          knownIds.add(v.id);
          added++;
        }
      }

      // 3) (опционально) убрать исчезнувшие со страницы
      if (pruneMissing) {
        const freshIds = new Set(fresh.map((v) => v.id));
        for (const cat of this.structure) {
          cat.vacancies = cat.vacancies.filter((v) => freshIds.has(v.id));
        }
      }

      this.saveStructure();
      this.renderMenu();
      console.info(
        `[MenuOrganizer] Обновление завершено. Новых вакансий: ${added}`
      );
    } catch (e) {
      console.error("[MenuOrganizer] Ошибка refreshFromDOM:", e);
      alert("Не удалось обновить список вакансий. Подробности в консоли.");
    }
  }

  observeSourceDOM() {
    if (!this.sourceContainer || this._observer) return;

    const debouncedSync =
      this._debouncedSync ||
      (this._debouncedSync = this._debounce(
        () => this.refreshFromDOM({ pruneMissing: true }),
        500
      ));

    this._observer = new MutationObserver((mutations) => {
      // Любые изменения в DOM исходного меню — пробуем синхронизироваться
      debouncedSync();
    });

    this._observer.observe(this.sourceContainer, {
      childList: true,
      subtree: true,
    });
  }

  // Подстраховка против агрессивных стилей страницы
  injectStyles() {
    const css = `
      .menu-organizer-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;}
      .menu-organizer-add-btn,.menu-organizer-refresh-btn{
        width:100% !important; display:block; padding:12px 16px;
        border-radius:16px; border:1px solid rgba(255,255,255,.12); cursor:pointer;
      }
      .category-body.collapsed { display: none !important; }
      .category-header { cursor: pointer; user-select: none; }
      /* Подсветка текущей вакансии */
      a.sidebar-vacancy.active-vacancy{
        background: rgba(76, 175, 80, .12);
        border-left: 3px solid #4caf50;
        border-radius: 12px;
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  waitForMenuAndInit() {
    const interval = setInterval(() => {
      const src = document.querySelector(this.menuContainerSelector);
      const hasVacancy = src && src.querySelector(this.vacancySelector);
      if (!src || !hasVacancy) return;

      clearInterval(interval);

      this.injectStyles();

      // (1) сохраняем исходный контейнер
      this.sourceContainer = src;

      // (2) создаём контейнер плагина и ВСТАВЛЯЕМ его в DOM
      this.pluginContainer = document.createElement("div");
      this.pluginContainer.className = "hf-plugin-container";
      // показываем плагин перед «родным» меню
      this.sourceContainer.insertAdjacentElement(
        "beforebegin",
        this.pluginContainer
      );

      this.sourceContainer.setAttribute("data-hf-hidden", "true");
      this.sourceContainer.style.display = "none";
      
      // (3) весь рендер пойдёт в pluginContainer
      this.menuContainer = this.pluginContainer;

      this.observeSourceDOM();

      this.loadStructure((loaded) => {
        if (loaded) {
          this.structure = loaded;
          if (!this.structure.find((c) => c.type === "uncategorized")) {
            this.structure.push({ type: "uncategorized", vacancies: [] });
          }
        } else {
          this.buildInitialStructure();
        }
        this.renderMenu();
        this.wireNavigationListeners();
      });
    }, 500);
  }
}

// === ИНИЦИАЛИЗАЦИЯ ===
// Инициализируем плагин для блока "Мои вакансии"
if (typeof chrome !== "undefined" && chrome.storage) {
  currentOrganizer = new HuntflowMenuOrganizer(
    '[data-qa="vacancy-list"] [data-qa="content"] > div',
    'a[data-qa="sidebar-vacancy-title"]'
  );
}

// Экспорт для тестов (в браузере module не определён)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getVacancyData, HuntflowMenuOrganizer };
}
