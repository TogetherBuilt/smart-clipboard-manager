# Contributing to Smart Clipboard Manager

Thank you for your interest in contributing! This document explains the project workflow, CI/CD pipeline, and release process so you can get started quickly.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Linting](#linting)
3. [Testing](#testing)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Release Process](#release-process)

---

## Development Setup

1. **Prerequisites**: Node.js 18.x and npm.
2. **Clone and install dependencies**:
   ```bash
   git clone https://github.com/TogetherBuilt/smart-clipboard-manager.git
   cd smart-clipboard-manager
   npm install
   ```
3. **Compile TypeScript** (output goes to `./out/`):
   ```bash
   npm run compile
   # or, to recompile on every change:
   npm run watch
   ```
4. **Open in VS Code** and press <kbd>F5</kbd> to launch the Extension Development Host.

---

## Linting

The project uses [ESLint](https://eslint.org/) with the config defined in `.eslintrc.js`. Run the linter locally before pushing:

```bash
npm run lint
```

Lint failures **block merges** — the `lint` CI workflow (`.github/workflows/lint.yml`) runs on every push and pull request and will report ESLint annotations directly on the PR via [reviewdog](https://github.com/reviewdog/action-eslint).

---

## Testing

Tests use [Mocha](https://mochajs.org/) and run inside VS Code's test electron host. Coverage is collected with Istanbul and uploaded to [Codecov](https://codecov.io/).

```bash
npm test
```

`npm test` compiles the TypeScript source first (`npm run compile`) and then executes `node ./out/test/runTests.js`.

Coverage configuration lives in `coverconfig.json`; the Codecov thresholds are defined in `.codecov.yml`.

To skip CI on a commit (e.g., a documentation-only change), add `skip ci` anywhere in the commit message.

---

## CI/CD Pipeline

Three GitHub Actions workflows run automatically:

### `lint` (`.github/workflows/lint.yml`)

| Trigger | Runs on |
|---|---|
| Push to any branch | `ubuntu-latest` |
| Pull request to any branch | `ubuntu-latest` |

Steps: checkout → install Node 18 → `npm ci` → ESLint via reviewdog.

This workflow is a **required gate**; a lint failure will block a pull request from being merged.

### `test` (`.github/workflows/test.yml`)

| Trigger | Runs on |
|---|---|
| Push to any branch | `ubuntu-latest`, `macos-latest`, `windows-latest` |
| Pull request to any branch | `ubuntu-latest`, `macos-latest`, `windows-latest` |

The matrix tests against VS Code `1.65.0`, `stable`, and `insiders`. Test failures on the `insiders` channel are non-blocking (`continue-on-error: true`).

After the test run, coverage results (`coverage-final.json` and `lcov.info`) are uploaded to Codecov. The workflow also packages the extension as a `.vsix` artifact so each commit produces a downloadable build.

### `deploy` (`.github/workflows/deploy.yml`)

| Trigger | Runs on |
|---|---|
| Push of a `v*` tag | `ubuntu-latest` |

This workflow is responsible for publishing a release. It is **triggered automatically by the release process** described below. Steps:

1. Generate the changelog entry for the new tag.
2. Package the extension as `clipboard-manager.vsix`.
3. Create a GitHub Release with the changelog as the body and attach the `.vsix`.
4. Publish to the VS Code Marketplace (requires the `VSCE_TOKEN` repository secret).
5. Publish to the Open VSX Registry (requires the `OVSX_TOKEN` repository secret).

---

## Release Process

Releases are automated with [release-it](https://github.com/release-it/release-it). The configuration lives in `.release-it.yml`:

```yaml
git:
  commitMessage: "chore(release): v${version}"
  tagAnnotation: "chore(release): v${version}"
  tagName: "v${version}"

hooks:
  after:bump:
    - "npm run changelog:update"
    - "npm run organize"

npm:
  publish: false
```

### Prerequisites

- A clean working tree on the `main` branch with all changes committed and pushed.
- All CI checks (lint and tests) passing on the latest commit.
- The `VSCE_TOKEN` and `OVSX_TOKEN` repository secrets configured (only needed if publishing to marketplaces from the deploy workflow).

### Steps to trigger a release

1. **Ensure you are on `main`** with a clean working tree:
   ```bash
   git checkout main
   git pull
   ```
2. **Run release-it** and follow the interactive prompts to choose the next version (patch / minor / major):
   ```bash
   npm run release
   ```
   release-it will:
   - Bump the version in `package.json`.
   - Run `npm run changelog:update` to append the new entry to `CHANGELOG.md`.
   - Run `npm run organize` to re-sort `package.json` fields.
   - Create a git commit `chore(release): vX.Y.Z` and an annotated tag `vX.Y.Z`.
   - Push the commit and tag to `origin`.
3. **Pushing the `vX.Y.Z` tag** automatically triggers the `deploy` workflow, which packages and publishes the extension.

> **Note**: `npm: publish` is set to `false` in `.release-it.yml` because the extension is published via the `deploy` GitHub Actions workflow rather than directly through npm.

### Changelog helpers

You can preview what the next changelog entry will look like before releasing:

```bash
npm run changelog:preview   # preview unreleased changes (does not write to disk)
npm run changelog:last      # show only the most recent released entry
```
