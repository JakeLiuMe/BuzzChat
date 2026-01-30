# BuzzChat Architecture

## Content Script Architecture

BuzzChat supports two content script architectures:

### 1. Legacy Monolithic (`src/scripts/content.js`)

Single 2200-line file containing all content script logic. Currently used in production via manifest.json.

**Pros:** Simple, no build step required
**Cons:** Harder to maintain, no code reuse

### 2. Modular Architecture (`src/scripts/content-entry.js`)

ES6 modules bundled via Rollup into a single file.

```
src/scripts/
├── content-entry.js      # Entry point
└── content/
    ├── init.js           # Initialization manager
    ├── state.js          # Per-tab state management
    ├── messaging.js      # Message processing pipeline
    ├── sender.js         # Chat message sending
    ├── rateLimit.js      # Cooldown management
    ├── analytics.js      # Event tracking
    ├── config.js         # Configuration constants
    ├── ui.js             # Content script UI injection
    └── features/
        ├── welcome.js    # Welcome messages
        ├── faq.js        # FAQ auto-replies
        ├── commands.js   # !command handling
        ├── timers.js     # Timer messages
        ├── moderation.js # Blocked words filter
        └── giveaway.js   # Giveaway entry tracking
```

**Pros:** Modular, testable, maintainable
**Cons:** Requires build step

## Building the Modular Version

```bash
# Development build (with sourcemaps)
npm run build:bundle

# Production build (minified)
npm run build:bundle:prod

# Watch mode
npm run build:bundle:watch
```

Output: `dist/scripts/content.js`

## Switching to Modular Architecture

1. Run `npm run build:bundle`
2. Update `manifest.json`:
   ```json
   "content_scripts": [{
     "js": ["dist/scripts/content.js"]
   }]
   ```
3. Test all features thoroughly
4. Deploy to Chrome Web Store

## Popup Architecture

The popup uses a similar modular pattern:

```
src/popup/
├── popup-entry.js        # Entry point
├── popup.html            # Main HTML
├── popup.css             # Styles
└── popup/
    ├── core/             # State, storage, config
    ├── ui/               # Modals, toast, tabs
    ├── features/         # Timers, FAQ, commands, etc.
    ├── business/         # Subscription, API keys
    └── settings/         # Import/export
```

Build: `npm run build:bundle` produces `dist/popup/popup.js`
