# Smart Clipboard

[![Version](https://vsmarketplacebadges.dev/version-short/TogetherBuilt.smart-clipboard.svg)](https://marketplace.visualstudio.com/items?itemName=TogetherBuilt.smart-clipboard)
[![Installs](https://vsmarketplacebadges.dev/installs-short/TogetherBuilt.smart-clipboard.svg)](https://marketplace.visualstudio.com/items?itemName=TogetherBuilt.smart-clipboard)
[![Ratings](https://vsmarketplacebadges.dev/rating-short/TogetherBuilt.smart-clipboard.svg)](https://marketplace.visualstudio.com/items?itemName=TogetherBuilt.smart-clipboard)

Keep a history of your copied and cut items and re-paste, without override the `Ctrl+C` and `Ctrl+V` keyboard shortcuts.

To pick a copied item, only run `Ctrl+Shift+V`

## Features

1. Save history of all copied and cut items
2. Can check copied items outside the VSCode (`"smart-clipboard.onlyWindowFocused": false`)
3. Paste from history (`Ctrl+Shift+V` => Pick and Paste)
4. Preview the paste
5. Snippets to paste (Ex. `clip01, clip02, ...`)
6. Remove selected item from history
7. Clear all history
8. Open copy location
9. Double click in history view to paste
10. Pin/favourite clips to protect them from auto-removal
11. Status bar item showing clip count — click to open the Pick and Paste picker

## Extension Settings

This extension contributes the following settings (default values):

<!--begin-settings-->
```js
{
  // Avoid duplicate clips in the list
  "smart-clipboard.avoidDuplicates": true,

  // Time in milliseconds to check changes in clipboard. Set zero to disable.
  "smart-clipboard.checkInterval": 500,

  // Maximum clipboard size in bytes.
  "smart-clipboard.maxClipboardSize": 1000000,

  // Maximum number of clips to save in clipboard
  "smart-clipboard.maxClips": 100,

  // Move used clip to top in the list
  "smart-clipboard.moveToTop": true,

  // Get clips only from VSCode
  "smart-clipboard.onlyWindowFocused": true,

  // View a preview while you are choosing the clip
  "smart-clipboard.preview": true,

  // Set location to save the clipboard file, set false to disable
  "smart-clipboard.saveTo": null,

  // Show the Smart Clipboard status bar item with clip count and quick access to Pick and Paste
  "smart-clipboard.showStatusBarItem": true,

  // Enable completion snippets
  "smart-clipboard.snippet.enabled": true,

  // Maximum number of clips to suggests in snippets (Zero for all)
  "smart-clipboard.snippet.max": 10,

  // Default prefix for snippets completion (clip1, clip2, ...)
  "smart-clipboard.snippet.prefix": "clip"
}
```
<!--end-settings-->

## Examples

Copy to history:
![Smart Clipboard - Copy](screenshots/copy.gif)

Pick and Paste:
![Smart Clipboard - Pick and Paste](screenshots/pick-and-paste.gif)

## Pinned / Favourite Clips

You can pin important clipboard entries so they are protected from automatic removal when the history reaches its maximum size (`smart-clipboard.maxClips`).

- **Pin a clip**: Right-click a history item and select **Pin Clip**.
- **Unpin a clip**: Right-click a pinned item and select **Unpin Clip**.
- Pinned clips are shown at the top of the Clipboard History view, prefixed with a pin icon (`$(pin)` VS Code codicon).
- Pinned clips are never removed by the automatic history trimming logic — only unpinned clips are subject to the `maxClips` limit.
- The pinned state is persisted in `clipboard.history.json` and survives editor restarts.
