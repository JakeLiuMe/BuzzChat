// BuzzChat - Feature Access Control
// Check if user can add more features based on tier

import { settings } from '../core/state.js';
import { VALIDATION } from '../core/config.js';
import { Toast } from '../ui/toast.js';
import { updateTierBanner } from '../ui/theme.js';

// Check if user can add more features (tier check)
// NOTE: Free tier now has access to ALL features - only message count is limited
export function canAddFeature() {
  // All tiers can add features - the limit is on message count, not feature count
  return true;
}

// Check if can add more items (with specific limits)
export function canAddItem(type) {
  let count, max, name;
  const isPro = settings.tier === 'pro' || settings.tier === 'business';

  switch (type) {
    case 'timer':
      count = settings.timer.messages.length;
      max = VALIDATION.MAX_TIMER_MESSAGES;
      name = 'timer messages';
      break;
    case 'faq':
      count = settings.faq.rules.length;
      // Free tier gets 3 FAQ rules, Pro/Business get 20
      max = isPro ? VALIDATION.MAX_FAQ_RULES : VALIDATION.MAX_FAQ_RULES_FREE;
      name = 'FAQ rules';
      break;
    case 'command':
      count = settings.commands?.list?.length || 0;
      // Free tier gets 5 commands, Pro/Business get 50
      max = isPro ? VALIDATION.MAX_COMMANDS : VALIDATION.MAX_COMMANDS_FREE;
      name = 'commands';
      break;
    case 'template':
      count = settings.templates.length;
      max = VALIDATION.MAX_TEMPLATES;
      name = 'templates';
      break;
    default:
      return true;
  }

  if (count >= max) {
    if ((type === 'faq' || type === 'command') && !isPro) {
      Toast.warning(`Free plan allows ${max} ${name}. Upgrade to Pro for unlimited!`);
    } else {
      Toast.warning(`Maximum of ${max} ${name} reached`);
    }
    // Update tier banner to show upgrade prompt
    updateTierBanner();
    return false;
  }
  return true;
}
