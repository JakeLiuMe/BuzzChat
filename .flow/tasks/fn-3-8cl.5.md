# fn-3-8cl.5 Add Dynamic Message Variables

## Description
Competitors like Nightbot support dynamic variables in messages. BuzzChat only has `{username}` in welcome messages. Add more variables for timer and FAQ messages.

### New Variables to Support
| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{count}` | Command/rule usage count | "47" |
| `{time}` | Current time | "3:45 PM" |
| `{date}` | Current date | "Jan 27, 2026" |
| `{uptime}` | Stream duration | "1h 23m" |
| `{platform}` | Current platform | "Whatnot" |
| `{viewers}` | Current viewer count | "142" |
| `{username}` | Triggering user (existing) | "StreamFan123" |

### Implementation
1. Create `replaceVariables(text, context)` utility function
2. Apply to timer messages before sending
3. Apply to FAQ auto-replies before sending
4. Apply to command responses before sending
5. Add help text showing available variables in UI
6. Add variable preview in message editor

### Example Usage
- Timer: "We've been live for {uptime}! Thanks {viewers} viewers!"
- FAQ: "Hey {username}! This item has been asked about {count} times!"

### Files to Modify
- `src/scripts/content.js` - Variable replacement in message sending
- `src/popup/popup.js` - Variable preview in editor
- `src/popup/popup.html` - Help text for variables

## Acceptance
- [ ] All 7 variables work in timer messages
- [ ] All 7 variables work in FAQ replies
- [ ] Variables show as clickable tags in UI
- [ ] Preview shows replaced values
- [ ] Invalid variables left as-is (no crash)
- [ ] Unit tests for variable replacement

## Done summary
- Task completed
## Evidence
- Commits:
- Tests:
- PRs: