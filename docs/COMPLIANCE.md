# BuzzChat — Chrome Web Store Compliance Checklist

## Chrome Web Store Rules We MUST Follow

### 1. Single Purpose ✅
> "An extension must have a single purpose that is narrow and easy to understand"
- **Our purpose:** "Automate live selling chat interactions"
- All features (welcome, timer, FAQ, giveaway) serve this single purpose ✅
- No bundled unrelated functionality ✅

### 2. Permissions — Minimal & Justified ⚠️
Chrome reviewers will scrutinize every permission. Current permissions:
- `storage` — Needed for settings ✅
- `alarms` — Needed for timers ✅
- `nativeMessaging` — ⚠️ **REMOVE if MCP server not shipping v1** — this triggers extra review scrutiny

**Action:** Remove `nativeMessaging` from manifest if not needed for launch.

### 3. Privacy Policy Required ✅
- Must link to a privacy policy in CWS listing
- Already have `docs/PRIVACY_POLICY.md` ✅
- Host it on GitHub Pages at buzzchat landing page

### 4. No Deceptive Behavior ✅
- Extension does what it says ✅
- No hidden functionality ✅
- No misleading marketing ✅

### 5. No Keyword Spam ⚠️
- Max 5 mentions of primary keyword in description
- Don't list more than 5 supported websites/brands in description
- **Action:** Keep CWS description clean and natural

### 6. Content Security Policy ✅
- Manifest V3 enforced ✅
- No remote code execution ✅
- No eval() ✅

### 7. Data Disclosure ⚠️
- Chrome Web Store requires a "Privacy practices" tab
- Must disclose: what data is collected, how it's used, whether it's sold
- **Our disclosure:**
  - Collected: Usage analytics (local only), settings (synced via Chrome)
  - NOT collected: Chat content, usernames, browsing history
  - NOT sold: Any data

### 8. User Consent for Chat Automation ⚠️
- Extension automates sending messages on behalf of the user
- **Must be clear:** User explicitly enables each feature
- **Must be clear:** User writes their own messages (we don't generate spam)
- Bot toggle must be OFF by default ✅ (already is)

### 9. No Injecting Ads ✅
- We don't inject ads into web pages ✅

### 10. Host Permissions Justification ⚠️
- We request access to 5 platforms
- Each must be justified in the CWS listing
- **Action:** Explain in description that we support Whatnot, YouTube, eBay, Twitch, Kick

## Potential Review Red Flags

| Risk | Mitigation |
|------|------------|
| "Chat automation" sounds like spam | Emphasize: user-configured messages, rate-limited, for sellers on their own streams |
| AI-generated responses | Emphasize: opt-in, user provides API key, transparent to stream viewers |
| Multiple host permissions | Explain multi-platform support clearly |
| `nativeMessaging` permission | Remove if not needed for v1 |

## Recommended CWS Description (SEO-optimized, compliant)

```
BuzzChat — Auto-Welcome, Timer Messages & FAQ Replies for Live Sellers

Save hours during your live selling shows. BuzzChat automatically welcomes new viewers, sends timed promotional messages, and responds to common questions — so you can focus on selling.

✅ Auto-welcome new viewers with personalized messages
✅ Timer messages for shipping deals, coupon codes, reminders
✅ FAQ auto-replies for common questions (shipping, payment, returns)
✅ Giveaway tracking and management
✅ Works on Whatnot, YouTube, eBay, Twitch, and Kick

Free to use with generous limits. Upgrade to Pro for unlimited messages.

Built by sellers, for sellers. All data stays on your device.
```
