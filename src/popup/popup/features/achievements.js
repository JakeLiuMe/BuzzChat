// BuzzChat - Achievements System
// Gamify the selling experience!

import { browserAPI } from '../core/config.js';
import { showAchievement } from '../ui/celebrations.js';

const STORAGE_KEY = 'buzzchatAchievements';

// Achievement definitions
const ACHIEVEMENTS = {
  // Getting Started
  first_welcome: {
    id: 'first_welcome',
    title: 'Hello World! 👋',
    description: 'Send your first welcome message',
    icon: '👋',
    category: 'getting_started',
    secret: false
  },
  first_sale: {
    id: 'first_sale',
    title: 'Cha-Ching! 💰',
    description: 'Make your first sale',
    icon: '💰',
    category: 'sales',
    secret: false
  },
  first_faq: {
    id: 'first_faq',
    title: 'Auto-Pilot 🤖',
    description: 'Set up your first FAQ rule',
    icon: '🤖',
    category: 'getting_started',
    secret: false
  },
  
  // Sales Milestones
  sales_10: {
    id: 'sales_10',
    title: 'Getting Warmed Up 🔥',
    description: 'Make 10 sales',
    icon: '🔥',
    category: 'sales',
    requirement: 10
  },
  sales_50: {
    id: 'sales_50',
    title: 'On a Roll! 🎯',
    description: 'Make 50 sales',
    icon: '🎯',
    category: 'sales',
    requirement: 50
  },
  sales_100: {
    id: 'sales_100',
    title: 'Century Club 💯',
    description: 'Make 100 sales',
    icon: '💯',
    category: 'sales',
    requirement: 100
  },
  sales_500: {
    id: 'sales_500',
    title: 'Sales Machine 🏭',
    description: 'Make 500 sales',
    icon: '🏭',
    category: 'sales',
    requirement: 500
  },
  sales_1000: {
    id: 'sales_1000',
    title: 'Legendary Seller 👑',
    description: 'Make 1,000 sales',
    icon: '👑',
    category: 'sales',
    requirement: 1000
  },
  
  // Revenue Milestones
  revenue_100: {
    id: 'revenue_100',
    title: 'First Hundred 💵',
    description: 'Reach $100 in tracked sales',
    icon: '💵',
    category: 'revenue',
    requirement: 100
  },
  revenue_1000: {
    id: 'revenue_1000',
    title: 'Four Figures 🏦',
    description: 'Reach $1,000 in tracked sales',
    icon: '🏦',
    category: 'revenue',
    requirement: 1000
  },
  revenue_10000: {
    id: 'revenue_10000',
    title: 'Big Money 💎',
    description: 'Reach $10,000 in tracked sales',
    icon: '💎',
    category: 'revenue',
    requirement: 10000
  },
  
  // Engagement
  welcomes_100: {
    id: 'welcomes_100',
    title: 'Friendly Host 🤗',
    description: 'Welcome 100 viewers',
    icon: '🤗',
    category: 'engagement',
    requirement: 100
  },
  welcomes_1000: {
    id: 'welcomes_1000',
    title: 'Community Builder 🏘️',
    description: 'Welcome 1,000 viewers',
    icon: '🏘️',
    category: 'engagement',
    requirement: 1000
  },
  faq_answered_100: {
    id: 'faq_answered_100',
    title: 'Question Master 🎓',
    description: 'Auto-answer 100 questions',
    icon: '🎓',
    category: 'engagement',
    requirement: 100
  },
  
  // Streaks
  streak_3: {
    id: 'streak_3',
    title: 'Getting Consistent 📅',
    description: 'Stream 3 days in a row',
    icon: '📅',
    category: 'streaks',
    requirement: 3
  },
  streak_7: {
    id: 'streak_7',
    title: 'Week Warrior ⚔️',
    description: 'Stream 7 days in a row',
    icon: '⚔️',
    category: 'streaks',
    requirement: 7
  },
  streak_30: {
    id: 'streak_30',
    title: 'Monthly Master 🗓️',
    description: 'Stream 30 days in a row',
    icon: '🗓️',
    category: 'streaks',
    requirement: 30
  },
  
  // VIP Customers
  vip_first: {
    id: 'vip_first',
    title: 'VIP Treatment ⭐',
    description: 'Get your first VIP customer (3+ purchases)',
    icon: '⭐',
    category: 'customers',
    secret: false
  },
  vip_10: {
    id: 'vip_10',
    title: 'VIP Club 🌟',
    description: 'Have 10 VIP customers',
    icon: '🌟',
    category: 'customers',
    requirement: 10
  },
  
  // Special
  night_owl: {
    id: 'night_owl',
    title: 'Night Owl 🦉',
    description: 'Make a sale after midnight',
    icon: '🦉',
    category: 'special',
    secret: true
  },
  early_bird: {
    id: 'early_bird',
    title: 'Early Bird 🐦',
    description: 'Make a sale before 6 AM',
    icon: '🐦',
    category: 'special',
    secret: true
  },
  speed_demon: {
    id: 'speed_demon',
    title: 'Speed Demon ⚡',
    description: 'Make 5 sales in under 5 minutes',
    icon: '⚡',
    category: 'special',
    secret: true
  },
  big_spender: {
    id: 'big_spender',
    title: 'Big Spender 🎰',
    description: 'Sell a single item for $500+',
    icon: '🎰',
    category: 'special',
    secret: true
  }
};

/**
 * Get all achievements with unlock status
 */
export async function getAchievements() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEY], (result) => {
      const unlocked = result[STORAGE_KEY] || {};
      
      const achievements = Object.values(ACHIEVEMENTS).map(achievement => ({
        ...achievement,
        unlocked: !!unlocked[achievement.id],
        unlockedAt: unlocked[achievement.id] || null
      }));
      
      resolve(achievements);
    });
  });
}

/**
 * Get achievement stats
 */
export async function getAchievementStats() {
  const achievements = await getAchievements();
  const total = achievements.filter(a => !a.secret).length;
  const unlocked = achievements.filter(a => a.unlocked && !a.secret).length;
  
  return {
    total,
    unlocked,
    percentage: Math.round((unlocked / total) * 100),
    recent: achievements
      .filter(a => a.unlocked)
      .sort((a, b) => b.unlockedAt - a.unlockedAt)
      .slice(0, 3)
  };
}

/**
 * Unlock an achievement
 */
export async function unlockAchievement(achievementId) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEY], (result) => {
      const unlocked = result[STORAGE_KEY] || {};
      
      // Already unlocked?
      if (unlocked[achievementId]) {
        resolve(false);
        return;
      }
      
      const achievement = ACHIEVEMENTS[achievementId];
      if (!achievement) {
        resolve(false);
        return;
      }
      
      // Unlock it!
      unlocked[achievementId] = Date.now();
      
      browserAPI.storage.local.set({ [STORAGE_KEY]: unlocked }, () => {
        // Show celebration!
        showAchievement(achievement.title, achievement.description, achievement.icon);
        resolve(true);
      });
    });
  });
}

/**
 * Check and unlock achievements based on stats
 */
export async function checkAchievements(stats) {
  const { 
    totalSales = 0, 
    totalRevenue = 0, 
    totalWelcomes = 0,
    totalFaqAnswered = 0,
    vipCount = 0,
    currentStreak = 0,
    lastSalePrice = 0,
    lastSaleHour = new Date().getHours(),
    recentSalesCount = 0, // sales in last 5 minutes
  } = stats;
  
  const checks = [
    // Sales milestones
    { id: 'first_sale', condition: totalSales >= 1 },
    { id: 'sales_10', condition: totalSales >= 10 },
    { id: 'sales_50', condition: totalSales >= 50 },
    { id: 'sales_100', condition: totalSales >= 100 },
    { id: 'sales_500', condition: totalSales >= 500 },
    { id: 'sales_1000', condition: totalSales >= 1000 },
    
    // Revenue milestones
    { id: 'revenue_100', condition: totalRevenue >= 100 },
    { id: 'revenue_1000', condition: totalRevenue >= 1000 },
    { id: 'revenue_10000', condition: totalRevenue >= 10000 },
    
    // Engagement
    { id: 'welcomes_100', condition: totalWelcomes >= 100 },
    { id: 'welcomes_1000', condition: totalWelcomes >= 1000 },
    { id: 'faq_answered_100', condition: totalFaqAnswered >= 100 },
    
    // Streaks
    { id: 'streak_3', condition: currentStreak >= 3 },
    { id: 'streak_7', condition: currentStreak >= 7 },
    { id: 'streak_30', condition: currentStreak >= 30 },
    
    // VIPs
    { id: 'vip_first', condition: vipCount >= 1 },
    { id: 'vip_10', condition: vipCount >= 10 },
    
    // Special
    { id: 'night_owl', condition: totalSales > 0 && lastSaleHour >= 0 && lastSaleHour < 5 },
    { id: 'early_bird', condition: totalSales > 0 && lastSaleHour >= 5 && lastSaleHour < 6 },
    { id: 'speed_demon', condition: recentSalesCount >= 5 },
    { id: 'big_spender', condition: lastSalePrice >= 500 }
  ];
  
  for (const check of checks) {
    if (check.condition) {
      await unlockAchievement(check.id);
    }
  }
}

/**
 * Get achievements by category
 */
export async function getAchievementsByCategory() {
  const achievements = await getAchievements();
  
  const categories = {
    getting_started: { name: '🚀 Getting Started', achievements: [] },
    sales: { name: '💰 Sales', achievements: [] },
    revenue: { name: '💎 Revenue', achievements: [] },
    engagement: { name: '💬 Engagement', achievements: [] },
    customers: { name: '👥 Customers', achievements: [] },
    streaks: { name: '🔥 Streaks', achievements: [] },
    special: { name: '✨ Special', achievements: [] }
  };
  
  achievements.forEach(a => {
    if (categories[a.category]) {
      // Hide locked secret achievements
      if (a.secret && !a.unlocked) return;
      categories[a.category].achievements.push(a);
    }
  });
  
  return categories;
}

/**
 * Reset all achievements (for testing)
 */
export async function resetAchievements() {
  return new Promise((resolve) => {
    browserAPI.storage.local.remove([STORAGE_KEY], resolve);
  });
}

// Track stats for achievement checking
let currentStats = {
  totalSales: 0,
  totalRevenue: 0,
  totalWelcomes: 0,
  totalFaqAnswered: 0,
  vipCount: 0,
  currentStreak: 0,
  lastSalePrice: 0,
  recentSales: [] // timestamps
};

/**
 * Record a sale for achievements
 */
export async function recordSaleForAchievements(price) {
  const now = Date.now();
  currentStats.totalSales++;
  currentStats.totalRevenue += price;
  currentStats.lastSalePrice = price;
  currentStats.recentSales.push(now);
  
  // Keep only sales from last 5 minutes
  const fiveMinAgo = now - (5 * 60 * 1000);
  currentStats.recentSales = currentStats.recentSales.filter(t => t > fiveMinAgo);
  
  await checkAchievements({
    ...currentStats,
    lastSaleHour: new Date().getHours(),
    recentSalesCount: currentStats.recentSales.length
  });
}

/**
 * Record a welcome for achievements
 */
export async function recordWelcomeForAchievements() {
  currentStats.totalWelcomes++;
  if (currentStats.totalWelcomes === 1) {
    await unlockAchievement('first_welcome');
  }
  await checkAchievements(currentStats);
}

/**
 * Record FAQ answered for achievements
 */
export async function recordFaqForAchievements() {
  currentStats.totalFaqAnswered++;
  if (currentStats.totalFaqAnswered === 1) {
    await unlockAchievement('first_faq');
  }
  await checkAchievements(currentStats);
}

export default {
  ACHIEVEMENTS,
  getAchievements,
  getAchievementStats,
  unlockAchievement,
  checkAchievements,
  getAchievementsByCategory,
  resetAchievements,
  recordSaleForAchievements,
  recordWelcomeForAchievements,
  recordFaqForAchievements
};
