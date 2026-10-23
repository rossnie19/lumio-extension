# Lumio

A Chrome extension that helps people keep a healthy relationship with AI chat tools (ChatGPT, Claude,
Gemini, Perplexity) and check what those tools tell them.

## Try it (no coding needed)

1. Download **`lumio-v1.0.0.zip`** from the [latest release](../../releases/latest) (or from the
   [`release/`](release/) folder) and unzip it. You get a folder called `lumio-v1.0.0`.
2. In Chrome, open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `lumio-v1.0.0` folder.
4. Pin Lumio from the puzzle-piece icon in the toolbar.

Then open ChatGPT, Claude, Gemini or Perplexity to meet your companion, highlight a sentence on any page
and right-click **Check with Compass**, or click the Lumio icon and **Open dashboard**.
Works in Chrome 116 or newer (the dashboard uses Chrome's side panel). Keep the unzipped folder where it
is, since Chrome loads the extension from it.

A one-minute demo video is in [`demo/lumio-demo.mp4`](demo/lumio-demo.mp4).

## Privacy

- Your usage stats never leave your browser (`chrome.storage.local`), and are deleted after 60 days.
- Compass only sends the short search keywords to OpenAlex, Europe PMC and Wikipedia when you check a
  claim. Nothing is stored.
- No accounts, no analytics, no servers.

## Features

- **Companion**: a pet from Philippine folklore (Mangkukulam, Manananggal or Tikbalang) whose mood
  follows how you use AI: *Focused*, *Curious*, *Concerned* or *Idle*. It walks along the bottom of AI
  sites and says lines based on its own story.
- **Usage tracking**: time with AI, sessions and checked claims per day, kept for 60 days on your own
  computer (`chrome.storage.local`). Nothing is sent anywhere.
- **Compass**: highlight a claim, right-click, then *Check with Compass*. Chrome's on-device AI turns it
  into search keywords (when available), and Compass shows real papers from OpenAlex and Europe PMC,
  plus Wikipedia background. Only the short keywords leave your computer.
- **Dashboard**: a side panel with Today, Week, Compass and Pet tabs.

## Develop

```bash
cd lumio-extension
npm install
npm run build
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick
`lumio-extension/dist`. After changes, run `npm run build` again and click the reload button on the card.

| Folder | What's in it |
| --- | --- |
| `public/background` | service worker: session tracking, Compass, pet state |
| `public/content-scripts` | Compass sidebar and the walking pet (injected into pages) |
| `public/shared` | logic shared by everything: storage, stats, moods, dialogue, search |
| `pages/src` | the dashboard (React), `styles/theme.css` is shared with the popup |
| `popup` | the toolbar popup |
| `scripts/make_sprites.py` | regenerates the sprite sheets from the character portraits |

Moods and timing are set in `public/shared/constants.js` (`SESSION_CONFIG`).

### Making a release zip

After `npm run build`, zip the contents of `lumio-extension/dist` (with `manifest.json` at the top of the
folder) and attach the zip to a GitHub release. `release/lumio-v1.0.0.zip` was made this way.

## Credits

- Fonts: Press Start 2P and VT323, SIL Open Font License 1.1 (see `assets/fonts/LICENSE.txt`).
- Companion characters are based on figures from Philippine folklore.

## License

The code is released under the [MIT License](LICENSE), copyright (c) 2026 the Lumio team.
