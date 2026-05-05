/**
 * @jest-environment jsdom
 */

// Мокаем chrome.storage до загрузки модуля
global.chrome = {
  storage: {
    local: {
      get: jest.fn((key, cb) => cb({})),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
};

const { getVacancyData, HuntflowMenuOrganizer, sanitizeHTML, sanitizeText } = require("../content");

// --- Хелпер: создать DOM-элемент вакансии ---
function createVacancyLink({ href, title, subtitle }) {
  const a = document.createElement("a");
  a.setAttribute("href", href);
  a.setAttribute("data-qa", "sidebar-vacancy-title");

  const titleSpan = document.createElement("span");
  titleSpan.className = "titleText--sZxcF";
  titleSpan.textContent = title;

  const subtitleSpan = document.createElement("span");
  subtitleSpan.className = "subtitleText--Zrh4S";
  subtitleSpan.textContent = subtitle;

  a.appendChild(titleSpan);
  a.appendChild(subtitleSpan);
  return a;
}

// --- Хелпер: создать органайзер с готовой структурой ---
function createOrganizer(structure, { withSource = false } = {}) {
  const org = Object.create(HuntflowMenuOrganizer.prototype);
  org.structure = JSON.parse(JSON.stringify(structure));
  org.menuContainer = document.createElement("div");
  org.vacancySelector = 'a[data-qa="sidebar-vacancy-title"]';
  org.saveStructure = jest.fn();
  org.renderMenu = jest.fn();
  if (withSource) {
    org.sourceContainer = document.createElement("div");
  }
  return org;
}

// --- Хелпер: добавить вакансию в sourceContainer ---
function addSourceVacancy(org, { href, title, subtitle }) {
  const a = createVacancyLink({ href, title, subtitle });
  org.sourceContainer.appendChild(a);
  return a;
}

// ===== Issue #3: стабильный ID вакансий =====
describe("getVacancyData — стабильный ID", () => {
  test("извлекает числовой ID из стандартного href", () => {
    const a = createVacancyLink({
      href: "/my/vacancy/12345",
      title: "Frontend",
      subtitle: "Отдел разработки",
    });
    const data = getVacancyData(a);
    expect(data.id).toBe("12345");
  });

  test("извлекает ID из href с query-параметрами", () => {
    const a = createVacancyLink({
      href: "/my/vacancy/99999?status=open&sort=date",
      title: "Backend",
      subtitle: "",
    });
    const data = getVacancyData(a);
    expect(data.id).toBe("99999");
  });

  test("ID стабилен при разных query-параметрах", () => {
    const a1 = createVacancyLink({
      href: "/my/vacancy/555?a=1&b=2",
      title: "QA",
      subtitle: "",
    });
    const a2 = createVacancyLink({
      href: "/my/vacancy/555?b=2&a=1&extra=3",
      title: "QA",
      subtitle: "",
    });
    expect(getVacancyData(a1).id).toBe(getVacancyData(a2).id);
  });

  test("fallback на полный href если нет /vacancy/:id", () => {
    const a = createVacancyLink({
      href: "/some/other/path",
      title: "Другое",
      subtitle: "",
    });
    const data = getVacancyData(a);
    expect(data.id).toBe("/some/other/path");
  });

  test("корректно читает text и subtitle", () => {
    const a = createVacancyLink({
      href: "/my/vacancy/1",
      title: "  Senior Dev  ",
      subtitle: "  Remote  ",
    });
    const data = getVacancyData(a);
    expect(data.text).toBe("Senior Dev");
    expect(data.subtitle).toBe("Remote");
  });

  test("находит иконку по точному CSS-классу", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/my/vacancy/1");
    const iconsDiv = document.createElement("div");
    iconsDiv.className = "icons--Byggd";
    const icon = document.createElement("i");
    icon.className = "icon--oJdBi";
    icon.textContent = "★";
    iconsDiv.appendChild(icon);
    a.appendChild(iconsDiv);
    const data = getVacancyData(a);
    expect(data.icon).toContain("icon--oJdBi");
  });

  test("находит иконку через wildcard-fallback при изменённых хешах", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/my/vacancy/2");
    const iconsDiv = document.createElement("div");
    iconsDiv.className = "icons--Xz9aB";
    const icon = document.createElement("i");
    icon.className = "icon--Qw3rT";
    icon.textContent = "★";
    iconsDiv.appendChild(icon);
    a.appendChild(iconsDiv);
    const data = getVacancyData(a);
    expect(data.icon).toContain("icon--Qw3rT");
  });

  test("возвращает пустую иконку если элемент отсутствует", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/my/vacancy/3");
    const data = getVacancyData(a);
    expect(data.icon).toBe("");
  });
});

// ===== Issue #2: moveVacancy =====
describe("moveVacancy — перемещение вакансий", () => {
  const baseStructure = [
    {
      type: "category",
      name: "Frontend",
      vacancies: [
        { id: "1", text: "React Dev" },
        { id: "2", text: "Vue Dev" },
        { id: "3", text: "Angular Dev" },
      ],
    },
    {
      type: "category",
      name: "Backend",
      vacancies: [
        { id: "4", text: "Node Dev" },
        { id: "5", text: "Go Dev" },
      ],
    },
    { type: "uncategorized", vacancies: [] },
  ];

  test("перемещение вакансии вниз внутри категории", () => {
    const org = createOrganizer(baseStructure);
    // Перемещаем "React Dev" (idx 0) на позицию 2
    // После splice(0,1): [Vue, Angular], toVIdx корректируется 2→1
    // splice(1, 0, React): [Vue, React, Angular]
    org.moveVacancy(0, 0, 0, 2);
    const names = org.structure[0].vacancies.map((v) => v.text);
    expect(names).toEqual(["Vue Dev", "React Dev", "Angular Dev"]);
  });

  test("перемещение вакансии в конец категории", () => {
    const org = createOrganizer(baseStructure);
    // toVIdx=3 (за последним) → после коррекции 2 → вставка в конец
    org.moveVacancy(0, 0, 0, 3);
    const names = org.structure[0].vacancies.map((v) => v.text);
    expect(names).toEqual(["Vue Dev", "Angular Dev", "React Dev"]);
  });

  test("перемещение вакансии вверх внутри категории", () => {
    const org = createOrganizer(baseStructure);
    // Перемещаем "Angular Dev" (idx 2) на позицию 0
    org.moveVacancy(0, 2, 0, 0);
    const names = org.structure[0].vacancies.map((v) => v.text);
    expect(names).toEqual(["Angular Dev", "React Dev", "Vue Dev"]);
  });

  test("перемещение вакансии между категориями", () => {
    const org = createOrganizer(baseStructure);
    // Перемещаем "React Dev" из Frontend (cat 0, vac 0) в Backend (cat 1, pos 1)
    org.moveVacancy(0, 0, 1, 1);
    expect(org.structure[0].vacancies.map((v) => v.text)).toEqual([
      "Vue Dev",
      "Angular Dev",
    ]);
    expect(org.structure[1].vacancies.map((v) => v.text)).toEqual([
      "Node Dev",
      "React Dev",
      "Go Dev",
    ]);
  });

  test("вызывает saveStructure и renderMenu", () => {
    const org = createOrganizer(baseStructure);
    org.moveVacancy(0, 0, 1, 0);
    expect(org.saveStructure).toHaveBeenCalledTimes(1);
    expect(org.renderMenu).toHaveBeenCalledTimes(1);
  });
});

// ===== Issue #1: moveCategory =====
describe("moveCategory — перемещение категорий", () => {
  const baseStructure = [
    { type: "category", name: "Frontend", vacancies: [{ id: "1" }] },
    { type: "category", name: "Backend", vacancies: [{ id: "2" }] },
    { type: "category", name: "Design", vacancies: [{ id: "3" }] },
    { type: "uncategorized", vacancies: [] },
  ];

  test("перемещение категории вниз", () => {
    const org = createOrganizer(baseStructure);
    // Frontend (0) -> позиция 2
    // splice(0,1): [Backend, Design, uncat], splice(2,0,Frontend): [Backend, Design, Frontend, uncat]
    org.moveCategory(0, 2);
    const names = org.structure
      .filter((c) => c.type === "category")
      .map((c) => c.name);
    expect(names).toEqual(["Backend", "Design", "Frontend"]);
  });

  test("перемещение категории вверх", () => {
    const org = createOrganizer(baseStructure);
    // Design (2) -> позиция Frontend (0)
    org.moveCategory(2, 0);
    const names = org.structure
      .filter((c) => c.type === "category")
      .map((c) => c.name);
    expect(names).toEqual(["Design", "Frontend", "Backend"]);
  });

  test("вакансии перемещаются вместе с категорией", () => {
    const org = createOrganizer(baseStructure);
    org.moveCategory(0, 2);
    // Frontend теперь на индексе 1 (после splice+splice)
    const frontend = org.structure.find((c) => c.name === "Frontend");
    expect(frontend.vacancies[0].id).toBe("1");
  });

  test("uncategorized не затрагивается", () => {
    const org = createOrganizer(baseStructure);
    org.moveCategory(0, 2);
    const last = org.structure[org.structure.length - 1];
    expect(last.type).toBe("uncategorized");
  });

  test("вызывает saveStructure и renderMenu", () => {
    const org = createOrganizer(baseStructure);
    org.moveCategory(0, 1);
    expect(org.saveStructure).toHaveBeenCalledTimes(1);
    expect(org.renderMenu).toHaveBeenCalledTimes(1);
  });
});

// ===== moveVacancyToUncategorized =====
describe("moveVacancyToUncategorized", () => {
  test("перемещает вакансию в Без категории", () => {
    const org = createOrganizer([
      {
        type: "category",
        name: "Dev",
        vacancies: [
          { id: "1", text: "A" },
          { id: "2", text: "B" },
        ],
      },
      { type: "uncategorized", vacancies: [] },
    ]);
    org.moveVacancyToUncategorized(0, 0);
    expect(org.structure[0].vacancies).toHaveLength(1);
    expect(org.structure[0].vacancies[0].id).toBe("2");
    const uncat = org.structure.find((c) => c.type === "uncategorized");
    expect(uncat.vacancies).toHaveLength(1);
    expect(uncat.vacancies[0].id).toBe("1");
  });

});

// ===== refreshFromDOM =====
describe("refreshFromDOM — синхронизация с DOM", () => {
  test("добавляет новые вакансии из DOM в 'Без категории'", () => {
    const org = createOrganizer(
      [
        {
          type: "category",
          name: "Dev",
          vacancies: [{ id: "1", text: "Existing", href: "/my/vacancy/1" }],
        },
        { type: "uncategorized", vacancies: [] },
      ],
      { withSource: true }
    );
    addSourceVacancy(org, {
      href: "/my/vacancy/1",
      title: "Existing",
      subtitle: "",
    });
    addSourceVacancy(org, {
      href: "/my/vacancy/2",
      title: "New One",
      subtitle: "",
    });

    org.refreshFromDOM();

    const uncat = org.structure.find((c) => c.type === "uncategorized");
    expect(uncat.vacancies).toHaveLength(1);
    expect(uncat.vacancies[0].id).toBe("2");
    expect(org.saveStructure).toHaveBeenCalled();
    expect(org.renderMenu).toHaveBeenCalled();
  });

  test("обновляет текст существующих вакансий", () => {
    const org = createOrganizer(
      [
        {
          type: "category",
          name: "Dev",
          vacancies: [
            { id: "1", text: "Old Title", href: "/my/vacancy/1", subtitle: "" },
          ],
        },
        { type: "uncategorized", vacancies: [] },
      ],
      { withSource: true }
    );
    addSourceVacancy(org, {
      href: "/my/vacancy/1",
      title: "New Title",
      subtitle: "Updated",
    });

    org.refreshFromDOM();

    expect(org.structure[0].vacancies[0].text).toBe("New Title");
    expect(org.structure[0].vacancies[0].subtitle).toBe("Updated");
  });

  test("с pruneMissing удаляет вакансии, отсутствующие в DOM", () => {
    const org = createOrganizer(
      [
        {
          type: "category",
          name: "Dev",
          vacancies: [
            { id: "1", text: "Stays", href: "/my/vacancy/1" },
            { id: "99", text: "Removed", href: "/my/vacancy/99" },
          ],
        },
        { type: "uncategorized", vacancies: [] },
      ],
      { withSource: true }
    );
    addSourceVacancy(org, {
      href: "/my/vacancy/1",
      title: "Stays",
      subtitle: "",
    });

    org.refreshFromDOM({ pruneMissing: true });

    expect(org.structure[0].vacancies).toHaveLength(1);
    expect(org.structure[0].vacancies[0].id).toBe("1");
  });

  test("pruneMissing не удаляет если DOM вернул 0 вакансий", () => {
    const org = createOrganizer(
      [
        {
          type: "category",
          name: "Dev",
          vacancies: [{ id: "1", text: "Keep", href: "/my/vacancy/1" }],
        },
        { type: "uncategorized", vacancies: [] },
      ],
      { withSource: true }
    );
    // sourceContainer пуст — 0 вакансий

    org.refreshFromDOM({ pruneMissing: true });

    expect(org.structure[0].vacancies).toHaveLength(1);
    expect(org.renderMenu).not.toHaveBeenCalled();
  });

  test("не падает при отсутствии sourceContainer", () => {
    const org = createOrganizer([
      { type: "uncategorized", vacancies: [] },
    ]);
    org.sourceContainer = null;

    expect(() => org.refreshFromDOM()).not.toThrow();
  });
});

// ===== loadStructure =====
describe("loadStructure — загрузка и миграция", () => {
  beforeEach(() => {
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  test("загружает структуру по ключу с origin", () => {
    const saved = [{ type: "uncategorized", vacancies: [{ id: "1" }] }];
    chrome.storage.local.get.mockImplementation((keys, cb) => {
      cb({ "menuOrganizerAccordion::https://huntflow.ru": saved });
    });

    const org = Object.create(HuntflowMenuOrganizer.prototype);
    // _storageKey — getter, нужен location
    Object.defineProperty(org, "_storageKey", {
      get: () => "menuOrganizerAccordion::https://huntflow.ru",
    });

    let result;
    org.loadStructure((data) => { result = data; });

    expect(result).toEqual(saved);
  });

  test("мигрирует со старого глобального ключа", () => {
    const oldData = [{ type: "uncategorized", vacancies: [{ id: "old" }] }];
    chrome.storage.local.get.mockImplementation((keys, cb) => {
      cb({ menuOrganizerAccordion: oldData });
    });

    const org = Object.create(HuntflowMenuOrganizer.prototype);
    Object.defineProperty(org, "_storageKey", {
      get: () => "menuOrganizerAccordion::https://huntflow.ru",
    });

    let result;
    org.loadStructure((data) => { result = data; });

    expect(result).toEqual(oldData);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      "menuOrganizerAccordion::https://huntflow.ru": oldData,
    });
  });

  test("возвращает null при отсутствии данных", () => {
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));

    const org = Object.create(HuntflowMenuOrganizer.prototype);
    Object.defineProperty(org, "_storageKey", {
      get: () => "menuOrganizerAccordion::https://huntflow.ru",
    });

    let result = "sentinel";
    org.loadStructure((data) => { result = data; });

    expect(result).toBeNull();
  });
});

// ===== sanitizeHTML =====
describe("sanitizeHTML — защита от XSS", () => {
  test("убирает script-теги", () => {
    const result = sanitizeHTML('<script>alert(1)</script><b>safe</b>');
    expect(result).toBe('<b>safe</b>');
  });

  test("убирает on-атрибуты", () => {
    const result = sanitizeHTML('<div onclick="alert(1)" class="ok">text</div>');
    expect(result).toBe('<div class="ok">text</div>');
  });

  test("убирает javascript: в атрибутах", () => {
    const result = sanitizeHTML('<a href="javascript:alert(1)">link</a>');
    expect(result).toBe('<a>link</a>');
  });

  test("убирает iframe, object, embed", () => {
    const result = sanitizeHTML('<iframe src="evil"></iframe><embed><span>ok</span>');
    expect(result.trim()).toBe('<span>ok</span>');
  });

  test("пропускает безопасный SVG и span", () => {
    const result = sanitizeHTML('<span class="icon">\u2665</span>');
    expect(result).toBe('<span class="icon">\u2665</span>');
  });

  test("пропускает пустую строку", () => {
    expect(sanitizeHTML("")).toBe("");
  });
});

// ===== sanitizeText =====
describe("sanitizeText — валидация текста", () => {
  test("обрезает HTML-теги", () => {
    expect(sanitizeText('<b>hello</b>')).toBe('hello');
  });

  test("обрезает длину до maxLen", () => {
    expect(sanitizeText('abcdefghij', 5)).toBe('abcde');
  });

  test("trimит пробелы", () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  test("обрабатывает null/undefined", () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  test("по умолчанию лимит 100 символов", () => {
    const long = 'a'.repeat(150);
    expect(sanitizeText(long).length).toBe(100);
  });
});

// ===== Bounds check =====
describe("moveVacancy — защита от невалидных индексов", () => {
  test("не падает при невалидном fromCatIdx", () => {
    const org = createOrganizer([
      { type: "category", name: "A", vacancies: [{ id: "1" }] },
      { type: "uncategorized", vacancies: [] },
    ]);
    expect(() => org.moveVacancy(99, 0, 0, 0)).not.toThrow();
    expect(org.structure[0].vacancies).toHaveLength(1);
  });

  test("не падает при невалидном toCatIdx", () => {
    const org = createOrganizer([
      { type: "category", name: "A", vacancies: [{ id: "1" }] },
      { type: "uncategorized", vacancies: [] },
    ]);
    expect(() => org.moveVacancy(0, 0, 99, 0)).not.toThrow();
    expect(org.structure[0].vacancies).toHaveLength(1);
  });

  test("не падает при невалидном fromVIdx", () => {
    const org = createOrganizer([
      { type: "category", name: "A", vacancies: [{ id: "1" }] },
      { type: "uncategorized", vacancies: [] },
    ]);
    expect(() => org.moveVacancy(0, 99, 0, 0)).not.toThrow();
    expect(org.structure[0].vacancies).toHaveLength(1);
  });
});

describe("moveCategory — защита от невалидных индексов", () => {
  test("не падает при невалидном fromIdx", () => {
    const org = createOrganizer([
      { type: "category", name: "A", vacancies: [] },
      { type: "uncategorized", vacancies: [] },
    ]);
    expect(() => org.moveCategory(99, 0)).not.toThrow();
    expect(org.structure).toHaveLength(2);
  });

  test("не падает при fromIdx === toIdx", () => {
    const org = createOrganizer([
      { type: "category", name: "A", vacancies: [{ id: "1" }] },
      { type: "uncategorized", vacancies: [] },
    ]);
    org.moveCategory(0, 0);
    expect(org.saveStructure).not.toHaveBeenCalled();
  });
});

describe("moveVacancyToUncategorized — защита от невалидных индексов", () => {
  test("не падает при невалидном vIdx и не портит uncategorized", () => {
    const org = createOrganizer([
      { type: "category", name: "A", vacancies: [{ id: "1" }] },
      { type: "uncategorized", vacancies: [] },
    ]);
    org.moveVacancyToUncategorized(0, 99);
    // Источник не должен измениться
    expect(org.structure[0].vacancies).toHaveLength(1);
    expect(org.structure[0].vacancies[0].id).toBe("1");
    // uncategorized НЕ должен получить undefined (молчаливая порча данных)
    const uncat = org.structure.find((c) => c.type === "uncategorized");
    expect(uncat.vacancies).toHaveLength(0);
    expect(uncat.vacancies.every((v) => v != null)).toBe(true);
  });

  test("не падает при невалидном catIdx", () => {
    const org = createOrganizer([
      { type: "category", name: "A", vacancies: [{ id: "1" }] },
      { type: "uncategorized", vacancies: [] },
    ]);
    org.moveVacancyToUncategorized(99, 0);
    expect(org.structure[0].vacancies).toHaveLength(1);
  });

  test("не падает если uncategorized отсутствует", () => {
    const org = createOrganizer([
      { type: "category", name: "A", vacancies: [{ id: "1" }] },
    ]);
    expect(() => org.moveVacancyToUncategorized(0, 0)).not.toThrow();
    expect(org.structure[0].vacancies).toHaveLength(1);
  });
});

// ===== destroy =====
describe("destroy — очистка ресурсов", () => {
  test("очищает интервал и observer", () => {
    const org = Object.create(HuntflowMenuOrganizer.prototype);
    org.structure = [];
    org._removalChecker = setInterval(() => {}, 9999);
    const disconnect = jest.fn();
    org._observer = { disconnect };
    org._debouncedSync = () => {};
    org.pluginContainer = document.createElement("div");
    org.sourceContainer = document.createElement("div");
    org.menuContainer = document.createElement("div");

    org.destroy();

    expect(org._removalChecker).toBeNull();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(org._observer).toBeNull();
    expect(org._debouncedSync).toBeNull();
    expect(org.pluginContainer).toBeNull();
    expect(org.sourceContainer).toBeNull();
    expect(org.menuContainer).toBeNull();
  });

  test("безопасен при отсутствии observer и interval", () => {
    const org = Object.create(HuntflowMenuOrganizer.prototype);
    org._removalChecker = null;
    org._observer = null;
    org._debouncedSync = null;
    org.pluginContainer = null;
    org.sourceContainer = null;
    org.menuContainer = null;

    expect(() => org.destroy()).not.toThrow();
  });
});

// ===== Интеграционный XSS-тест: createVacancyElement применяет sanitizeHTML =====
describe("createVacancyElement — XSS-защита в реальном рендере", () => {
  test("санитизирует вредоносный subtitleHTML", () => {
    const org = Object.create(HuntflowMenuOrganizer.prototype);
    org.structure = [{ type: "uncategorized", vacancies: [] }];
    org.menuContainer = document.createElement("div");
    org.isVacancyActive = () => false;

    const vac = {
      id: "1",
      text: "Test Vacancy",
      href: "/vacancy/1",
      icon: "",
      subtitle: "",
      subtitleHTML:
        '<span class="ok">Safe</span><script>alert("XSS")</script>',
    };

    const el = org.createVacancyElement(vac, 0, 0);
    const subtitleSpan = el.querySelector(".hfmo-subtitle-text");

    // script-тег должен быть удалён
    expect(subtitleSpan.innerHTML).not.toContain("script");
    // Безопасный span должен остаться
    expect(subtitleSpan.innerHTML).toContain("Safe");
    // Не должно быть on*-атрибутов
    expect(subtitleSpan.innerHTML).not.toContain("onclick");
    expect(subtitleSpan.innerHTML).not.toContain("onerror");
  });

  test("не рендерит javascript: ссылки", () => {
    const org = Object.create(HuntflowMenuOrganizer.prototype);
    org.structure = [{ type: "uncategorized", vacancies: [] }];
    org.menuContainer = document.createElement("div");
    org.isVacancyActive = () => false;

    const vac = {
      id: "2",
      text: "Malicious",
      href: "/vacancy/2",
      icon: "",
      subtitle: "",
      subtitleHTML:
        '<a href="javascript:alert(1)">Click</a>',
    };

    const el = org.createVacancyElement(vac, 0, 0);
    const subtitleSpan = el.querySelector(".hfmo-subtitle-text");
    // javascript: должен быть удалён из href
    expect(subtitleSpan.innerHTML).not.toContain("javascript:");
  });
});
