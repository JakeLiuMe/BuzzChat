# BuzzChat - Testing Checklist

## Pre-Testing Setup

1. Load extension in Chrome:
   - Navigate to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `whatnot-chat-bot` folder

2. Verify extension loads:
   - [ ] Extension appears in chrome://extensions
   - [ ] No errors shown
   - [ ] Icon appears in toolbar

---

## Manual Testing on Real Whatnot

### Phase 1: Basic Functionality

**Go to a live Whatnot stream** (yours or any public stream)

#### 1. Extension Popup
- [ ] Click BuzzChat icon - popup opens
- [ ] Master toggle switches on/off
- [ ] Status badge shows Active/Inactive correctly
- [ ] All tabs (Home, Messages, FAQ, Mod, Giveaway, Analytics) are accessible

#### 2. Chat Detection
- [ ] Open browser console (F12)
- [ ] Look for `[BuzzChat]` log messages
- [ ] Verify "Chat input detected" message appears
- [ ] If not detected, note the error message

#### 3. Welcome Messages
- [ ] Enable welcome toggle in Home tab
- [ ] Set a welcome message: "Hey {username}! Welcome!"
- [ ] Enable master toggle
- [ ] Wait for new viewer to join OR simulate by reloading page
- [ ] Verify welcome message appears in chat

#### 4. Timer Messages
- [ ] Go to Messages tab
- [ ] Add a timer message: "Check out our deals!" interval: 1 minute
- [ ] Enable timer toggle
- [ ] Wait 1 minute
- [ ] Verify timer message appears in chat

#### 5. FAQ Auto-Replies
- [ ] Go to FAQ tab
- [ ] Add rule: triggers "shipping, ship", reply "We ship worldwide!"
- [ ] Enable FAQ toggle
- [ ] Have someone (or alt account) type "shipping?" in chat
- [ ] Verify auto-reply appears

#### 6. Giveaway Tracking
- [ ] Go to Giveaway tab
- [ ] Set keywords: "enter, entered"
- [ ] Enable giveaway toggle
- [ ] Have someone type "entered" in chat
- [ ] Verify entry appears in the list
- [ ] Verify entry count increments

### Phase 2: Referral System (New Feature)

#### 7. Referral Code Generation
- [ ] Click Settings button
- [ ] Scroll to "Invite Friends" section
- [ ] Verify unique 8-character code is displayed
- [ ] Click "Copy" button
- [ ] Verify code is copied to clipboard
- [ ] Verify "Copied!" feedback appears

#### 8. Referral Code Redemption
- [ ] In Settings, find "Have a referral code?" section
- [ ] Enter a test code (e.g., "TESTCODE")
- [ ] Click "Redeem" button
- [ ] Verify error message for invalid code format
- [ ] Enter valid format code (8 chars, letters/numbers)
- [ ] Verify redemption succeeds
- [ ] Verify +10 bonus messages message appears
- [ ] Verify "Bonus Messages" stat updates
- [ ] Verify redeem button is disabled after use

#### 9. Bonus Message Calculation
- [ ] Check tier banner shows correct message count
- [ ] Enable watermark (+5 bonus)
- [ ] Verify tier banner updates to show "+5 watermark"
- [ ] After referral redemption, verify shows "+10 referral"

### Phase 3: Edge Cases

#### 10. Settings Persistence
- [ ] Change multiple settings
- [ ] Close and reopen popup
- [ ] Verify all settings are preserved

#### 11. Export/Import
- [ ] Click "Export All" in Settings
- [ ] Verify JSON file downloads
- [ ] Make changes to settings
- [ ] Click "Import" and select exported file
- [ ] Verify settings are restored

#### 12. Message Limit
- [ ] Check message limit in tier banner
- [ ] Send messages until approaching limit
- [ ] Verify counter updates correctly
- [ ] Verify warning appears when low

---

## Common Issues & Solutions

### Chat Not Detected
The extension may not find Whatnot's chat input. Check:
1. Is the page fully loaded?
2. Is there an active live stream?
3. Check console for selector errors
4. Try the "Chat Input Selector (Advanced)" setting

### Messages Not Sending
1. Check master toggle is ON
2. Check specific feature toggle (welcome/timer/faq) is ON
3. Check console for errors
4. Verify you haven't hit message limit

### Referral Code Issues
1. Codes are 8 characters (letters/numbers only)
2. You cannot use your own code
3. You can only redeem one code ever

---

## Reporting Issues

If you find bugs:
1. Note the exact steps to reproduce
2. Copy any console errors (F12 > Console)
3. Screenshot the issue if visual
4. Note your Chrome version and OS

---

## Success Criteria

For Chrome Web Store submission:
- [ ] All basic features work on real Whatnot
- [ ] No console errors during normal use
- [ ] Referral system works correctly
- [ ] Settings persist across sessions
- [ ] Export/import works
- [ ] Extension doesn't break Whatnot functionality
