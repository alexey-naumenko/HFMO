# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Huntflow Menu Organizer (HFMO) — Chrome extension (Manifest V3) that replaces the default vacancy list in [Huntflow](https://huntflow.ru) with a categorized, drag-and-drop sidebar. Vanilla JavaScript, no build step, no runtime dependencies.

## Commands

```bash
npm run lint          # ESLint (flat config, ES2022)
npm test              # Jest + jsdom with coverage
npm run lint:fix      # Auto-fix lint issues
npx jest --testPathPattern=tests/content.test.js -t "refreshFromDOM"  # Run single test by name
```

## Architecture

The entire extension is three files loaded directly by Chrome (no bundler):

- **manifest.json** — MV3 manifest; content script injected on `*.huntflow.ru/*` and `*.huntflow.io/*`
- **content.js** — single class `HuntflowMenuOrganizer` that: parses Huntflow's vacancy DOM → stores structure in `chrome.storage.local` → renders its own categorized menu → observes DOM changes via MutationObserver
- **styles.css** — all rules scoped under `.hf-plugin-container` to avoid conflicts with host page

Key data flow: Huntflow DOM → `getVacancyData()` extracts `{id, text, subtitle, href, icon}` → stored as `structure[]` array of categories → `renderMenu()` creates plugin UI → `MutationObserver` + `refreshFromDOM()` keep it in sync.

## Important Constraints

- **No ES modules.** MV3 content scripts don't support `import`/`export`. The file uses `module.exports` guarded by `typeof module !== "undefined"` for Jest only.
- **No build step.** Chrome loads raw files. Don't introduce webpack/rollup/bundlers.
- **CSS-module hashes.** Huntflow uses hashed class names (e.g., `titleText--sZxcF`). Selectors must always include a wildcard fallback like `[class*="titleText--"]` alongside exact matches.
- **Folder naming.** Chrome rejects extensions containing directories starting with `_` (except `_locales`). Test folder is `tests/`, not `__tests__`. CI validates this.

## Release

semantic-release via GitHub Actions. Conventional Commits trigger versioning:
- `fix:` → patch, `feat:` → minor, `feat!:` / `BREAKING CHANGE` → major
- `prepareCmd` updates both `manifest.json` and `package.json` versions
- ZIP artifact is built in CI and attached to GitHub releases

## Testing

Tests use `Object.create(HuntflowMenuOrganizer.prototype)` to construct instances without triggering `init()` / DOM polling. Mock `chrome.storage.local` (`get`, `set`, `remove`) is set up globally. `createVacancyLink()` helper builds DOM elements matching Huntflow's structure.
