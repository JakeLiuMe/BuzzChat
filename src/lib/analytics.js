// Analytics Module for BuzzChat
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// Tracks local-only metrics for Pro tier features

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const Analytics = {
  // SECURITY: Verification marker to confirm this is the legitimate extension module
  __BUZZCHAT_VERIFIED: true,

  STORAGE_KEY: 'buzzchatAnalytics',

  // Default analytics structure
  getDefaultData() {
    return {
      totalMessagesSent: 0,
      welcomeMessagesSent: 0,
      faqRepliesSent: 0,
      timerMessagesSent: 0,
      templatesSent: 0,
      sessionsCount: 0,
      lastSessionDate: null,
      dailyStats: {}, // { '2026-01-22': { messages: 5, welcomes: 2, faqs: 1, timers: 2 } }
      hourlyActivity: new Array(24).fill(0), // Messages per hour
      topFaqTriggers: {} // { 'shipping': 15, 'payment': 10 }
    };
  },

  // Load analytics from storage
  async load() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get([this.STORAGE_KEY], (result) => {
        resolve(result[this.STORAGE_KEY] || this.getDefaultData());
      });
    });
  },

  // Save analytics to storage
  async save(data) {
    return new Promise((resolve) => {
      browserAPI.storage.local.set({ [this.STORAGE_KEY]: data }, resolve);
    });
  },

  // Get today's date key
  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  },

  // Get current hour (0-23)
  getCurrentHour() {
    return new Date().getHours();
  },

  // Track a message sent
  async trackMessage(type = 'general', metadata = {}) {
    const data = await this.load();
    const today = this.getTodayKey();
    const hour = this.getCurrentHour();

    // Initialize today's stats if needed
    if (!data.dailyStats[today]) {
      data.dailyStats[today] = { messages: 0, welcomes: 0, faqs: 0, timers: 0, templates: 0 };
    }

    // Update counters
    data.totalMessagesSent++;
    data.dailyStats[today].messages++;
    data.hourlyActivity[hour]++;

    // Update type-specific counters
    switch (type) {
      case 'welcome':
        data.welcomeMessagesSent++;
        data.dailyStats[today].welcomes++;
        break;
      case 'faq':
        data.faqRepliesSent++;
        data.dailyStats[today].faqs++;
        // Track FAQ trigger if provided
        if (metadata.trigger) {
          data.topFaqTriggers[metadata.trigger] = (data.topFaqTriggers[metadata.trigger] || 0) + 1;
        }
        break;
      case 'timer':
        data.timerMessagesSent++;
        data.dailyStats[today].timers++;
        break;
      case 'template':
        data.templatesSent++;
        data.dailyStats[today].templates++;
        break;
    }

    await this.save(data);
    return data;
  },

  // Track a new session
  async trackSession() {
    const data = await this.load();
    const today = this.getTodayKey();

    // Only count as new session if last session was a different day
    if (data.lastSessionDate !== today) {
      data.sessionsCount++;
      data.lastSessionDate = today;
      await this.save(data);
    }

    return data;
  },

  // Get analytics summary
  async getSummary() {
    const data = await this.load();
    const today = this.getTodayKey();
    const todayStats = data.dailyStats[today] || { messages: 0, welcomes: 0, faqs: 0, timers: 0 };

    // Get last 7 days of data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      last7Days.push({
        date: key,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        ...( data.dailyStats[key] || { messages: 0, welcomes: 0, faqs: 0, timers: 0 })
      });
    }

    // Get top 5 FAQ triggers
    const topTriggers = Object.entries(data.topFaqTriggers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }));

    // Find peak activity hour
    const peakHour = data.hourlyActivity.indexOf(Math.max(...data.hourlyActivity));
    const peakHourLabel = peakHour === 0 ? '12 AM' :
      peakHour < 12 ? `${peakHour} AM` :
        peakHour === 12 ? '12 PM' :
          `${peakHour - 12} PM`;

    return {
      totalMessages: data.totalMessagesSent,
      todayMessages: todayStats.messages,
      welcomesSent: data.welcomeMessagesSent,
      faqReplies: data.faqRepliesSent,
      timerMessages: data.timerMessagesSent,
      templatesSent: data.templatesSent,
      sessionsCount: data.sessionsCount,
      last7Days,
      hourlyActivity: data.hourlyActivity,
      topTriggers,
      peakHour: peakHourLabel
    };
  },

  // Generate SVG bar chart for last 7 days
  generateWeeklyChart(data, width = 300, height = 100) {
    const maxValue = Math.max(...data.map(d => d.messages), 1);
    const barWidth = (width - 60) / 7;
    const bars = data.map((d, i) => {
      const barHeight = (d.messages / maxValue) * (height - 30);
      const x = 30 + i * barWidth + barWidth * 0.1;
      const y = height - 20 - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}"
              fill="#7c3aed" rx="2"/>
        <text x="${x + barWidth * 0.4}" y="${height - 5}"
              text-anchor="middle" font-size="10" fill="#6b7280">${d.label}</text>
        <text x="${x + barWidth * 0.4}" y="${y - 5}"
              text-anchor="middle" font-size="9" fill="#374151">${d.messages || ''}</text>
      `;
    }).join('');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <line x1="30" y1="0" x2="30" y2="${height - 20}" stroke="#e5e7eb" stroke-width="1"/>
        <line x1="30" y1="${height - 20}" x2="${width}" y2="${height - 20}" stroke="#e5e7eb" stroke-width="1"/>
        ${bars}
      </svg>
    `;
  },

  // Generate SVG pie chart for message types
  generateTypePieChart(data, size = 120) {
    const total = data.welcomesSent + data.faqReplies + data.timerMessages + data.templatesSent;
    if (total === 0) {
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 10}" fill="#e5e7eb"/>
          <text x="${size/2}" y="${size/2}" text-anchor="middle" dy="4" font-size="12" fill="#6b7280">No data</text>
        </svg>
      `;
    }

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;

    const segments = [
      { value: data.welcomesSent, color: '#10b981', label: 'Welcome' },
      { value: data.faqReplies, color: '#f59e0b', label: 'FAQ' },
      { value: data.timerMessages, color: '#7c3aed', label: 'Timer' },
      { value: data.templatesSent, color: '#3b82f6', label: 'Template' }
    ].filter(s => s.value > 0);

    let currentAngle = -90; // Start from top
    const paths = segments.map(segment => {
      const angle = (segment.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
      const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
      const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
      const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);

      const largeArc = angle > 180 ? 1 : 0;

      currentAngle = endAngle;

      return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z"
                    fill="${segment.color}"/>`;
    }).join('');

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${paths}
      </svg>
    `;
  },

  // Export analytics as CSV
  async exportCSV() {
    const data = await this.load();
    const rows = [['Date', 'Messages', 'Welcomes', 'FAQs', 'Timers', 'Templates']];

    Object.entries(data.dailyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, stats]) => {
        rows.push([
          date,
          stats.messages,
          stats.welcomes,
          stats.faqs,
          stats.timers,
          stats.templates || 0
        ]);
      });

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `buzzchat-analytics-${this.getTodayKey()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  },

  // Clean up old data (keep last 90 days)
  async cleanupOldData() {
    const data = await this.load();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffKey = cutoffDate.toISOString().split('T')[0];

    Object.keys(data.dailyStats).forEach(key => {
      if (key < cutoffKey) {
        delete data.dailyStats[key];
      }
    });

    await this.save(data);
  },

  // Milestone definitions - triggers celebration when reached
  MILESTONES: {
    messages_1000: { type: 'messages', value: 1000, title: '1,000 Messages!', message: 'You\'ve sent 1,000 automated messages!' },
    messages_5000: { type: 'messages', value: 5000, title: '5,000 Messages!', message: 'Incredible! 5,000 messages sent!' },
    messages_10000: { type: 'messages', value: 10000, title: '10,000 Messages!', message: 'You\'re a chat automation master!' },
    welcomes_100: { type: 'welcomes', value: 100, title: '100 Viewers Welcomed!', message: 'You\'ve greeted 100 viewers!' },
    welcomes_500: { type: 'welcomes', value: 500, title: '500 Viewers Welcomed!', message: 'Amazing! 500 viewers welcomed!' },
    welcomes_1000: { type: 'welcomes', value: 1000, title: '1,000 Viewers!', message: 'You\'re a community builder!' },
    faq_100: { type: 'faq', value: 100, title: '100 Questions Answered!', message: 'Your bot has helped 100 viewers!' }
  },

  // Check if any milestones have been reached and return new ones
  async checkMilestones() {
    const data = await this.load();
    const celebratedKey = 'buzzchatCelebratedMilestones';

    // Get already celebrated milestones from storage
    const result = await new Promise(resolve => {
      browserAPI.storage.local.get([celebratedKey], resolve);
    });
    const celebrated = result[celebratedKey] || [];

    const newMilestones = [];

    // Check each milestone
    for (const [id, milestone] of Object.entries(this.MILESTONES)) {
      if (celebrated.includes(id)) continue;

      let currentValue = 0;
      switch (milestone.type) {
        case 'messages':
          currentValue = data.totalMessagesSent || 0;
          break;
        case 'welcomes':
          currentValue = data.welcomeMessagesSent || 0;
          break;
        case 'faq':
          currentValue = data.faqRepliesSent || 0;
          break;
      }

      if (currentValue >= milestone.value) {
        newMilestones.push({ id, ...milestone });
        celebrated.push(id);
      }
    }

    // Save newly celebrated milestones
    if (newMilestones.length > 0) {
      await new Promise(resolve => {
        browserAPI.storage.local.set({ [celebratedKey]: celebrated }, resolve);
      });
    }

    return newMilestones;
  },

  // Get emotionally rewarding impact summary for VIP users
  async getImpactSummary() {
    const data = await this.load();
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Calculate this month's stats
    let monthlyWelcomes = 0;
    let monthlyTotal = 0;
    let monthlyFaqs = 0;

    // Calculate last month's stats for comparison
    let lastMonthTotal = 0;

    Object.entries(data.dailyStats).forEach(([dateStr, stats]) => {
      const date = new Date(dateStr);
      if (date >= monthStart) {
        monthlyWelcomes += stats.welcomes || 0;
        monthlyTotal += stats.messages || 0;
        monthlyFaqs += stats.faqs || 0;
      } else if (date >= lastMonthStart && date <= lastMonthEnd) {
        lastMonthTotal += stats.messages || 0;
      }
    });

    // Estimate time saved (avg 5 seconds per manual message typing)
    const totalSeconds = data.totalMessagesSent * 5;
    const hoursSaved = totalSeconds / 3600;

    // Calculate growth percentage
    const growthPercent = lastMonthTotal > 0
      ? Math.round(((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : 0;

    // Estimate viewers engaged (welcomes = unique viewers greeted)
    const viewersEngaged = data.welcomeMessagesSent;

    // Questions answered automatically
    const questionsAnswered = data.faqRepliesSent;

    return {
      // This month
      monthlyWelcomes,
      monthlyTotal,
      monthlyFaqs,

      // All time
      totalMessages: data.totalMessagesSent,
      viewersEngaged,
      questionsAnswered,

      // Time savings
      hoursSaved: hoursSaved >= 1 ? hoursSaved.toFixed(1) : (totalSeconds / 60).toFixed(0),
      hoursSavedUnit: hoursSaved >= 1 ? 'hours' : 'minutes',

      // Growth
      growthPercent,
      isGrowing: growthPercent > 0,

      // Sessions
      sessionsCount: data.sessionsCount
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Analytics;
}
