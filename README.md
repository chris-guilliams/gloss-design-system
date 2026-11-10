# Gloss Design System

Gloss is the design system for University of Utah Health. It provides a shared foundation for clinical and academic digital experiences, including accessible interface patterns, styles, JavaScript behaviors, design tokens, and documentation.

## Status

Gloss Design System 3 is in pre-alpha development (`3.0.0-alpha.0`). The repository currently contains only the initial project foundation. APIs, file structure, build commands, and components are subject to change.

Gloss 3 is intended to replace and unify the work currently split between:

- `gloss-source`, the UIkit-based CSS and JavaScript source;
- `gloss-docs`, the separate documentation website.

Those repositories are migration references during early development. They are not modified as part of this project unless explicitly requested.

## Goals

Gloss 3 aims to provide:

- UIkit as an npm dependency rather than a maintained fork;
- a central, versioned design-token source;
- modern CSS enhancements layered over a stable UIkit foundation;
- accessible, tested, documented components;
- automated JavaScript and CSS linting and formatting;
- automated behavioral, accessibility, and visual regression checks;
- a single repository for source code, tokens, documentation, and build automation;
- a clear boundary between open-source code and licensed University assets.

## Planned structure

The structure will be introduced incrementally as the project develops. The planned direction is:

```text
src/tokens/       Canonical design tokens
src/styles/       UIkit overrides, generated token CSS, and Gloss styling
src/js/           Gloss JavaScript and component behavior
dist/             Generated, versioned CSS and JavaScript distribution files
docs/             Jekyll documentation and examples
tests/            Unit, accessibility, interaction, and visual tests
assets-private/   Locally supplied licensed assets; not open-source code
```

Generated files are clearly identified, must not be edited by hand, and are verified by automated checks.

The files in `dist/` are generated distribution artifacts and are intentionally
tracked. They are part of Gloss's public release surface so downstream teams
can consume a specific Git tag through a CDN. Regenerate them with
`npm run build`; never edit them directly.

## Getting started & local testing

### 1. Prerequisites & asset setup

Per the [architectural boundary between open-source code and proprietary assets](#license-and-assets), licensed brand typography (**Sofia Pro**) and proprietary brand icons reside in private repositories. The test suite gracefully falls back to open-source system stacks if they are absent, but to test with full brand fidelity:

```bash
# Install root development dependencies
npm install

# Pull & build proprietary brand assets (requires GitHub org access)
npm run setup:icons  # Clones & builds utahhealthcare/gloss-icons into assets-private/
npm run setup:fonts  # Clones utahhealthcare/gloss-fonts into assets-private/

# Or run both setup tasks at once:
npm run setup
```

### 2. Building distribution assets

The test pages and downstream consumers rely on compiled artifacts in `dist/`. Build all design tokens, stylesheets, JavaScript bundles, and icon transforms:

```bash
npm run build
```

Key build tasks:

- `npm run build:css`: Compiles Sass to expanded and minified CSS (`dist/css/gloss.css`).
- `npm run build:js`: Transforms UIkit JavaScript and public icons into `dist/js/gloss.js` and `dist/js/gloss-icons.js`.
- `npm run build:tokens`: Generates CSS custom properties from design tokens.

### 3. Running `/tests`

To launch the interactive test suite with live reload:

```bash
npm test
# or:
npm run serve
```

This starts a BrowserSync server on port 3000 at `/tests/index.html`. The test suite automatically detects and injects:

- Core compiled styles from `dist/css/gloss.css`
- UIkit/Gloss behaviors from `dist/js/gloss.js`
- Brand typography from `assets-private/brand-fonts/` (if present)
- Brand icons from `assets-private/brand-icons/` (if present)
- A component navigation dropdown to preview individual test pages (`stat-card.html`, `button.html`, `grid.html`, etc.)

### 4. Running documentation locally (`docs/`)

To prepare assets and preview the Jekyll documentation site in Docker:

```bash
# Build documentation assets (synchronizes changelog, compiles styles)
npm run build:docs

# Launch Jekyll container (mounting assets-private for brand assets):
docker run --rm -it \
  --volume "$PWD/docs:/srv/jekyll" \
  --volume "$PWD/assets-private:/srv/jekyll/assets-private" \
  --publish 4000:4000 \
  --publish 35729:35729 \
  jekyll/jekyll:pages \
  jekyll serve --host 0.0.0.0 --baseurl="" --livereload --force_polling
```

Open <http://localhost:4000/> to browse the documentation site.

## Development principles

- Prefer standards-based HTML, CSS, and JavaScript.
- Treat accessibility as part of a component's definition of done.
- Keep public APIs small, documented, and backwards-compatible within a major version.
- Extend UIkit through supported variables and hooks instead of copying or modifying its source.
- Prefer progressive enhancement when introducing newer browser features.
- Keep dependencies intentional and review them periodically.
- Do not commit copyrighted or restricted assets without confirmed redistribution rights.

## Visual regression testing (Local)

Gloss includes a lightweight, local-only visual snapshot testing tool powered by Playwright to catch unintended visual regressions across viewports (Desktop `1200px`, Tablet `768px`, Mobile `375px`) without committing binary images to Git.

Snapshot baselines and test reports are kept local and ignored by `.gitignore` (`tests/visual/__snapshots__/`, `playwright-report/`).

### Prerequisites

Ensure the Playwright Chromium browser is installed locally:

```bash
npx playwright install chromium
```

### Comparing branches

You can compare any two Git branches locally. The script automatically checks out the base branch, compiles its CSS, captures baseline snapshots, switches to the target branch, compiles its CSS, runs the visual diff comparison, and returns you safely to your starting branch:

```bash
# Compare any two branches across all test fixtures:
npm run test:visual:diff -- <base-branch> <target-branch>

# Compare any two branches for a specific fixture (e.g., button, body, list):
npm run test:visual:diff -- <base-branch> <target-branch> [fixture-filter]

# Examples:
npm run test:visual:diff -- main my-feature-branch
npm run test:visual:diff -- main my-feature-branch button
```

### Inspecting visual diffs

If visual differences are detected, open Playwright's interactive visual report:

```bash
npx playwright show-report
```

This launches a local browser view with interactive slider/swipe and side-by-side modes highlighting the exact pixel diffs between the two branches.

### Single-branch testing

To run visual checks or update baselines on your current branch without switching branches:

```bash
# Run comparison against existing local baselines:
npm run test:visual

# Generate or update local baselines on the current branch:
npm run test:visual:update

# Run on a single fixture:
VISUAL_TEST=body npm run test:visual
```

## Roadmap

Development will proceed in small, validated stages:

1. Establish the repository, package metadata, developer guidance, and CI foundation.
2. Define the token model and generate the first CSS custom properties.
3. Add UIkit as a dependency and prove the override/theme layer.
4. Build one representative component with documentation and automated tests.
5. Expand the component library and migrate selected 2.x behavior.
6. Bring the documentation site into this repository and publish it with GitHub Pages.
7. Prepare migration guidance and an alpha release for consumers.

## Contributing

Contribution guidance, coding standards, testing commands, release procedures, and AI-assisted development guidance will be added as the project foundation is established. Until then, please treat this repository as pre-alpha work in progress and expect the structure to change.

## License and assets

Gloss's original source code is released under the BSD-3-Clause license. See [LICENSE](LICENSE) for the full text.

Fonts, University marks, icons, photography, and other restricted assets may be distributed separately and must not be added to this repository unless their licensing and redistribution terms have been confirmed. The Gloss code license does not grant permission to use University trademarks or branding.
