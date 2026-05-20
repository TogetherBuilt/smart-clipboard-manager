# Smart Clipboard Manager — Future Roadmap

This document captures plans and initial requirements for features and improvements beyond the `0.1.0` milestone. It is intended as a living reference for maintainers and contributors scoping the next rounds of work.

---

## 1. Paste Transformations

### Goal

Allow users to paste a clipboard entry in a transformed format — for example, converting raw text to camelCase, wrapping a value as a JSON string, or formatting it as a Markdown table — without permanently altering the stored clip.

### Proposed Commands

| Command ID | Description |
|---|---|
| `smart-clipboard.pasteAsCamelCase` | Convert whitespace-/underscore-/hyphen-separated text to `camelCase` before pasting |
| `smart-clipboard.pasteAsSnakeCase` | Convert to `snake_case` |
| `smart-clipboard.pasteAsPascalCase` | Convert to `PascalCase` |
| `smart-clipboard.pasteAsJSONString` | Escape the value and wrap it in double quotes as a valid JSON string literal |
| `smart-clipboard.pasteAsMarkdownTable` | Interpret CSV/TSV clipboard content and emit a Markdown table |
| `smart-clipboard.pasteAsBase64` | Base-64-encode the value before pasting |
| `smart-clipboard.pasteFromBase64` | Base-64-decode the value before pasting |

These command IDs follow the existing convention defined in `src/commands/common.ts` (`commandList` enum).

### Hook Point in `src/commands/pickAndPaste.ts`

The transformation step should be injected in `PickAndPasteCommand.execute()` immediately **after** the user confirms a pick and **before** the value is written to the clipboard:

```typescript
// line ~126 in src/commands/pickAndPaste.ts
// Update current clip in clipboard
await this._manager.setClipboardValue(pick.clip.value);
```

A clean approach is to make `PickAndPasteCommand` accept an optional `transform` callback:

```typescript
// Conceptual sketch — not yet implemented
export class PickAndPasteCommand implements vscode.Disposable {
  constructor(
    protected _manager: ClipboardManager,
    protected _transform?: (value: string) => string
  ) { ... }
}
```

Each transformation command would then instantiate its own subclass of `PickAndPasteCommand` (or `HistoryTreeDoubleClickCommand`) with the appropriate transform function, and register itself in `src/extension.ts` alongside the existing commands.

---

## 2. WebView-Based Rich Previews

### Goal

Show a rich, syntax-highlighted preview of a clipboard entry — including metadata like creation date, copy count, and detected language — inside a `vscode.WebviewPanel` rather than the plain quick-pick list.

### Integration Point

The `ClipboardTreeDataProvider` in `src/tree/history.ts` drives the **Clipboard History** sidebar panel. Each node is a `ClipHistoryItem` that already carries the full `IClipboardItem` object, which exposes:

| Field | Type | Notes |
|---|---|---|
| `value` | `string` | Raw clipboard text |
| `createdAt` | `number` | Unix timestamp (ms) |
| `copyCount` | `number` | How many times copied |
| `useCount` | `number` | How many times pasted |
| `language` | `string \| undefined` | Language ID of the source file |
| `createdLocation` | `vscode.Location \| undefined` | Source file URI and range |

### Proposed Implementation

1. **Add a `previewClipboard` command** (`smart-clipboard.history.preview`) registered in `src/commands/common.ts`.
2. **Create `src/commands/previewClipboard.ts`** — a command handler that opens a `vscode.WebviewPanel` and renders the clip content.
3. The WebView HTML should:
   - Use [highlight.js](https://highlightjs.org/) (already bundled as a CDN script, no new npm dependency needed) to syntax-highlight `value` using `clip.language` as the language hint.
   - Display a metadata table: **Created**, **Copied**, **Pasted**, **Source file** (if `createdLocation` is set).
   - Include a **Paste** button that posts a message back to the extension host to trigger `setClipboardValue` + paste.
4. Wire the command to the `ClipHistoryItem` context menu by adding an entry in `package.json` under `"contributes.menus"` → `"view/item/context"` with `"when": "viewItem =~ /^clipHistoryItem:/"`.

### Example WebView Content Structure

```html
<article>
  <pre><code class="language-typescript">/* syntax-highlighted clip value */</code></pre>
  <table>
    <tr><th>Created</th><td>2024-06-01 14:32</td></tr>
    <tr><th>Copied</th><td>3 times</td></tr>
    <tr><th>Pasted</th><td>1 time</td></tr>
    <tr><th>Source</th><td>src/manager.ts:126</td></tr>
  </table>
  <button id="paste">Paste</button>
</article>
```

---

## 3. Privacy Modes and Storage Options

### Goal

Give users control over where and how clipboard history is persisted, and add an optional privacy mode that prevents sensitive clips from being written to disk at all.

### Existing Abstraction

The `getStoreFile()` method in `src/manager.ts` (lines 144–168) already acts as a storage-path resolver and is the natural abstraction boundary for plugging in alternative backends:

```typescript
protected getStoreFile(): string | false {
  // Returns a file path, or false (= do not persist)
  const saveTo = config.get<string | null | boolean>("saveTo");
  if (typeof saveTo === "string") return saveTo;   // custom path
  if (saveTo === false) return false;              // disabled
  return filePath;                                 // default path
}
```

The corresponding `saveClips()` and `loadClips()` methods call `getStoreFile()` as their single entry point, so any new backend only needs to replace these three methods.

### Proposed Storage Providers (v0.2.0+)

| Mode | Config value | Implementation notes |
|---|---|---|
| **JSON file** (current) | `saveTo: "<path>"` or default | No change needed |
| **Disabled / privacy mode** | `saveTo: false` | Already supported; consider adding an explicit `"privacy"` config flag that auto-sets `saveTo: false` and also suppresses clipboard monitoring for marked sessions |
| **Local SQLite** | `saveTo: "sqlite"` | Use the `better-sqlite3` package; subclass `ClipboardManager` with `SqliteClipboardManager` overriding `saveClips`, `loadClips`, and `getStoreFile` |
| **Cloud sync** | `saveTo: "cloud"` | Define a `IStorageProvider` interface with `save(clips)` / `load()` / `clear()` methods; provide an HTTP-based implementation; authenticate via VS Code's `SecretStorage` API |

### Cloud Sync: Security and Privacy Requirements

Cloud sync transmits and stores users' clipboard history — which may contain passwords, API keys, personal data, or other sensitive content — outside the local machine. Any cloud sync implementation **must** address the following concerns before shipping.

#### User Consent

- Cloud sync must be **explicitly opt-in**. It must never be enabled by default.
- The first time a user sets `saveTo: "cloud"`, the extension must present a clear consent prompt that explains what data will be transmitted, where it will be stored, and how it will be protected.
- Users must be able to revoke consent and delete their remote data at any time from within the extension.

#### Authentication

- Use VS Code's [`SecretStorage` API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage) to store all credentials and tokens. Never write secrets to settings, workspace state, or log output.
- Prefer OAuth 2.0 / PKCE flows over username/password authentication to avoid handling raw credentials.
- Implement token refresh and revocation so that compromised credentials can be invalidated without requiring the user to reconfigure the extension.

#### Encryption

| Concern | Requirement |
|---|---|
| **In transit** | All HTTP requests to the sync backend must use HTTPS (TLS 1.2+). Reject connections that present invalid or self-signed certificates. |
| **At rest** | The sync backend must encrypt stored data at rest (e.g., AES-256). Document the encryption scheme in user-facing documentation so users can make an informed trust decision. |
| **Local cache** | Any local cache of remote clips should be stored in VS Code's `globalStorageUri` directory (not a world-readable path) and should not contain plaintext credentials. |

#### Risks and Best Practices

- **Sensitive clipboard content**: Clipboard history frequently contains credentials, tokens, and private data. Consider allowing users to mark individual clips as "do not sync" (similar to the per-clip privacy tagging described below) and to configure a maximum sync age so stale sensitive entries are automatically excluded.
- **Credential leakage**: Avoid logging request headers, response bodies, or authentication tokens at any log level. Use VS Code's `OutputChannel` carefully.
- **Data minimisation**: Only transmit the clip fields required for sync (`value`, `createdAt`, `copyCount`, `useCount`, `language`). Do not transmit `createdLocation` (which contains local file URIs) unless the user explicitly enables it.
- **Sync conflicts**: Define a clear last-write-wins or merge strategy to prevent data loss when the same account is used on multiple machines simultaneously.
- **Third-party backend trust**: If the default backend is a hosted service, publish a privacy policy and provide instructions for self-hosting so privacy-conscious users can run their own server.

### Privacy Mode Details

- New config key: `smart-clipboard.privacyMode` (`boolean`, default `false`).
- When `true`: force `saveTo: false` regardless of other config, and optionally show a padlock icon in the status bar.
- Future: allow per-clip privacy tagging so individual entries can be excluded from persistence while the rest of the history is still saved.

---

## 4. Testing and CI/CD Improvements

### Current State

The `src/test/` directory contains the following test files:

| File | Coverage area |
|---|---|
| `extension.test.ts` | Extension activation check only |
| `pickAndPaste.test.ts` | Pick-and-paste command with preview |
| `monitor.test.ts` | Clipboard change monitor |
| `completion.test.ts` | Completion provider |
| `defaultClipboard.test.ts` | Low-level clipboard read/write |

No tests currently cover `ClipboardManager` directly (pin/unpin, max-clip trimming, multi-workspace persistence) or any tree-view commands.

### Recommended Integration Tests for v0.2.0

**`ClipboardManager` unit tests (`src/test/manager.test.ts`)**

- Add a clip and verify it appears at index 0 in `manager.clips`.
- Add more clips than `smart-clipboard.maxClips` and verify the list is trimmed to the configured limit (`updateClipList` in `src/manager.ts` line ~86).
- Call `removeClipboardValue(value)` and verify the clip is removed.
- Call `clearAll()` and verify `manager.clips` is empty.
- Verify `saveClips()` writes valid JSON to the file returned by `getStoreFile()`.
- Verify `loadClips()` correctly restores clips (both v1 and v2 JSON formats; see migration logic in `src/manager.ts`).
- Verify `checkClipsUpdate()` detects file changes from a simulated second workspace and reloads.

**`ClipboardTreeDataProvider` tests (`src/test/historyTree.test.ts`)**

- Verify `getChildren()` returns the correct number of `ClipHistoryItem` nodes after clips are added.
- Verify `onDidChangeTreeData` fires when `ClipboardManager.onDidChangeClipList` fires.

**`PickAndPasteCommand` transformation tests (extend `src/test/pickAndPaste.test.ts`)**

- Once transformation commands are implemented, verify that selecting a clip via `smart-clipboard.pasteAsCamelCase` inserts the correctly-transformed value.

### CI/CD Improvements

- **GitHub Actions workflow**: Add `.github/workflows/ci.yml` that runs `npm run compile` and `npm test` on every push and pull request targeting `main`.
- **Coverage reporting**: Wire `istanbul`/`nyc` (the `coverconfig.json` already exists) to produce an LCOV report and upload it to Codecov (`.codecov.yml` is already present in the repository root).
- **Lint gate**: Add `npm run lint` as a required CI step; failures should block merges.
- **Release automation**: The `.release-it.yml` config is present; document the release process in `CONTRIBUTING.md` so contributors know how to trigger a release.

---

## Milestone Summary

| Feature area | Target milestone |
|---|---|
| Paste transformations (camelCase, JSON string) | v0.2.0 |
| WebView rich preview | v0.2.0 |
| Privacy mode (`saveTo: false` with status bar indicator) | v0.2.0 |
| `ClipboardManager` integration tests | v0.2.0 |
| GitHub Actions CI workflow | v0.2.0 |
| Local SQLite storage provider | v0.3.0 |
| Additional transformations (Markdown table, Base64) | v0.3.0 |
| Cloud sync storage provider (with consent, auth, and encryption — see security requirements above) | v1.0.0 |
