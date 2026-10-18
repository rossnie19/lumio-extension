# Lumio

A Chrome extension that helps people keep a healthy relationship with AI chat tools (ChatGPT, Claude,
Gemini, Perplexity) and check what those tools tell them.

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
