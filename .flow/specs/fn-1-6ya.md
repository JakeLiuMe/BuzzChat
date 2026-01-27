# fn-1-6ya BuzzChat Strategic Platform Expansion & AI Integration

## Overview
Transform BuzzChat from a Whatnot-only chat bot into the definitive multi-platform live selling automation tool. This initiative adds YouTube, eBay, Twitch, and Kick support with automatic platform detection, implements self-healing AI that adapts to platform changes, and introduces Claude Haiku-powered smart responses for Max tier subscribers.

**Strategic Goals:**
1. **Multi-Platform Dominance** - Support all major live selling platforms with seamless auto-detection
2. **Zero-Touch Operations** - Self-healing selectors and AI that requires no manual intervention
3. **Profitable AI Integration** - Claude Haiku smart responses with credit-based system (70-80% margin target)
4. **Compelling Free Tier** - Generous limits that keep users engaged and converting
5. **Feature Parity+** - Match and exceed competitor features based on community research

## Scope

### In Scope
- **Platform Support**: Whatnot, YouTube Live, eBay Live, Twitch, Kick
- **Auto-Detection**: Hostname-based platform identification with platform-specific selectors
- **Self-Healing System**: Remote selector updates via GitHub Gist, automatic fallback detection
- **AI Smart Responses**: Claude Haiku integration for Max tier (500 credits/month)
- **Pricing Enforcement**: Tier limits (Free: 50 msgs, Pro: 250 msgs, Max: Unlimited + AI)
- **UX Polish**: Seamless onboarding, minimal friction, professional appearance

### Out of Scope
- Mobile app development
- Custom AI model training
- Real-time video analysis
- Payment processing changes (ExtensionPay stays)

## Approach

### Phase 1: Multi-Platform Foundation (Tasks 1-3)
1. Platform detection system with hostname matching
2. Platform-specific selector modules
3. Unified messaging interface that adapts per-platform

### Phase 2: Self-Healing Infrastructure (Tasks 4-5)
4. Remote selector update system via GitHub Gist
5. Automatic fallback detection when selectors fail
6. Health monitoring dashboard in popup

### Phase 3: AI Integration (Tasks 6-8)
6. Claude Haiku API integration with secure key storage
7. Credit tracking and usage limits
8. Smart response generation with personality tones

### Phase 4: Polish & Deployment (Tasks 9-10)
9. UX improvements based on competitor research
10. Production build, testing, and Chrome Web Store submission

## Quick commands
<!-- Required: at least one smoke command for the repo -->
- `npm run lint` - Check code quality
- `npm run build:prod` - Production build
- `npm test` - Run all 227 Playwright tests
- `npm run test:unit` - Run 94 unit tests
- `npm run test:real -- --headed` - Test on real Whatnot stream

## Acceptance
- [ ] Extension loads successfully on: Whatnot, YouTube, eBay, Twitch, Kick
- [ ] Platform auto-detected correctly on each site
- [ ] Chat messages sent successfully on each platform
- [ ] Selector updates pulled from remote Gist when available
- [ ] Fallback selectors activate when primary fails
- [ ] AI responses generated for Max tier users
- [ ] AI credit usage tracked and displayed
- [ ] Free tier limited to 50 messages per show
- [ ] Pro tier limited to 250 messages per show
- [ ] All 227+ tests pass
- [ ] Production build creates valid extension package
- [ ] No console errors in normal operation

## References
- [Chrome Web Store Policy](https://groups.google.com/a/chromium/g/chromium-extensions/c/5TmejOC6tZo) - No obfuscation allowed
- [Claude Haiku Pricing](https://www.anthropic.com/pricing) - $1/$5 per million tokens
- [ExtensionPay Docs](https://extensionpay.com/articles/add-paid-licenses-to-chrome-extensions)
- Competitor Research: Nightbot (free), Moobot (free), StreamElements (free)
- Community Feedback: Limited customization, no multi-platform, basic features only

## Research Findings

### Competitor Analysis
| Platform | Chat Bot Options | Gaps Identified |
|----------|-----------------|-----------------|
| YouTube | Nightbot, Moobot (free) | No AI, basic templates only |
| Twitch | StreamElements, Botrix | Limited live selling features |
| eBay | None dedicated | Major opportunity |
| Whatnot | Basic native only | No automation, manual everything |

### Community Pain Points (from Reddit, Discord, forums)
1. "I need to run 3 different bots for different platforms"
2. "Selectors break every update and I have to wait for fixes"
3. "Template messages feel robotic, wish they were smarter"
4. "Free bots have all features, why pay for Pro?"
5. "Too many clicks to do simple things"

### AI Cost Analysis
- Claude Haiku: $1/M input tokens, $5/M output tokens
- Average response: ~50 tokens = $0.00025
- 500 credits/month = ~$0.125/user/month
- Max tier at $24.99 = 98%+ margin on AI
- Break-even: 10,000 AI responses per user (won't happen)
