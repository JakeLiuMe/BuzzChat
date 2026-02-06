# Troubleshooting Guide

Having issues? Let's fix them.

## Common Issues

### BuzzChat Icon Not Appearing

**Solution:**
1. Go to `chrome://extensions`
2. Find BuzzChat → make sure it's **enabled**
3. Click the puzzle icon in toolbar → **pin** BuzzChat
4. Refresh the page

### Bot Not Responding to Messages

**Check these:**

1. **Is the bot active?**
   - Click 🐝 icon → toggle should be ON (green)

2. **Are you on a supported platform?**
   - TikTok Live ✅
   - Facebook Live ✅
   - Instagram Live ✅
   - Whatnot ✅
   - YouTube Live ✅
   - eBay Live ✅
   - Twitch 🔄 (beta)
   - Kick 🔄 (beta)

3. **Is the stream actually live?**
   - BuzzChat only works during active streams
   - VODs/replays are not supported

4. **Check browser console:**
   - Right-click → Inspect → Console tab
   - Look for red errors mentioning BuzzChat

### FAQ Rules Not Triggering

**Solution:**

1. **Check your keywords**
   - Keywords are case-insensitive
   - Use common variations: `ship, shipping, shipped`

2. **Check match mode**
   - "Any word" = triggers if ANY keyword matches
   - "All words" = triggers only if ALL keywords match

3. **Check tier limits**
   - Free: 5 FAQ rules max
   - Pro+: Unlimited

4. **Test with Demo Mode**
   - Click **🎮 Try Demo** to simulate messages

### Timer Messages Not Sending

**Solution:**

1. Verify timer is **enabled** (toggle on)
2. Check interval is reasonable (1-60 minutes)
3. Make sure bot is active
4. Timer only runs while stream is live

### Auto-Welcome Not Working

**Solution:**

1. Enable in **Messages** → **Auto-Welcome**
2. Set appropriate delay (2-5 seconds recommended)
3. Note: Same user won't be welcomed twice in same session

### AI Features Not Working

**Check these:**

1. **Are you on Pro tier or higher?**
   - Free tier has limited AI (50 requests/day)

2. **Have you hit rate limits?**
   - Check dashboard for usage stats
   - Limits reset daily at midnight UTC

3. **Is your API key valid? (Team tier)**
   - Go to Settings → AI Features → verify key starts with `sk-ant-`

4. **Is the feature enabled?**
   - Settings → AI Features → toggle each feature

### Extension Crashing or Freezing

**Solution:**

1. **Disable and re-enable**
   - `chrome://extensions` → toggle BuzzChat off/on

2. **Clear extension data**
   - BuzzChat Settings → **Reset All Settings** (backs up first)

3. **Update Chrome**
   - Chrome needs to be version 100+

4. **Check for conflicts**
   - Disable other extensions temporarily
   - Common conflicts: ad blockers, other chat bots

### Data Not Saving

**Solution:**

1. **Check storage permissions**
   - `chrome://extensions` → BuzzChat → Details
   - Verify "Site access" is correct

2. **Export your data as backup**
   - Settings → **Export Settings**

3. **Try incognito mode**
   - If it works in incognito, clear regular Chrome data

## Platform-Specific Issues

### TikTok Live

- **Chat not detected**: Refresh page, ensure you're on the live view (not preview)
- **Messages delayed**: TikTok rate-limits; BuzzChat respects this

### Facebook Live

- **Can't find chat**: Make sure it's a Facebook Gaming or Facebook Live stream
- **Slow responses**: Facebook's API can be slow; this is normal

### Whatnot

- **Bot replies not appearing**: Check if you're the host or co-host
- **Inventory not syncing**: Use BuzzChat inventory, not Whatnot's

### YouTube Live

- **Chat mode mismatch**: Works best with "Top chat" mode
- **Subscriber-only chat**: BuzzChat can't bypass restrictions

## Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `API key required` | No API key set for AI features | Add key in Settings or stay on free features |
| `Rate limit exceeded` | Too many AI requests | Wait for reset or upgrade tier |
| `Platform not supported` | Unknown streaming site | [Request support](https://github.com/JakeLiuMe/BuzzChat/issues) |
| `Connection lost` | Stream ended or page refreshed | Rejoin stream |
| `Storage quota exceeded` | Too much local data | Export and clear old data |

## Still Stuck?

1. **Search existing issues**: [GitHub Issues](https://github.com/JakeLiuMe/BuzzChat/issues)
2. **Open a new issue**: Include:
   - Chrome version
   - BuzzChat version
   - Platform (TikTok, FB, etc.)
   - Steps to reproduce
   - Screenshots/console errors
3. **Join Discord**: [discord.gg/buzzchat](https://discord.gg/buzzchat)

---

[← Back to Getting Started](GETTING_STARTED.md)
