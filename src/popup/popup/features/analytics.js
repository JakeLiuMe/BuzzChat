// BuzzChat - Analytics Feature
// Analytics module with charts and CSV export

import { browserAPI } from '../core/config.js';
import { settings } from '../core/state.js';
import { Toast, Loading } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { triggerConfetti } from './giveaway.js';

// Analytics Module
export const Analytics = {
  STORAGE_KEY: 'buzzchatAnalytics',

  getDefaultData() {
    return {
      totalMessagesSent: 0,
      welcomeMessagesSent: 0,
      faqRepliesSent: 0,
      timerMessagesSent: 0,
      templatesSent: 0,
      sessionsCount: 0,
      lastSessionDate: null,
      dailyStats: {},
      hourlyActivity: new Array(24).fill(0),
      topFaqTriggers: {},
      milestonesAchieved: []
    };
  },

  async load() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get([this.STORAGE_KEY], (result) => {
        resolve(result[this.STORAGE_KEY] || this.getDefaultData());
      });
    });
  },

  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  },

  async getSummary() {
    const data = await this.load();
    const today = this.getTodayKey();
    const todayStats = data.dailyStats[today] || { messages: 0, welcomes: 0, faqs: 0, timers: 0, templates: 0 };

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      last7Days.push({
        date: key,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        ...(data.dailyStats[key] || { messages: 0, welcomes: 0, faqs: 0, timers: 0, templates: 0 })
      });
    }

    const topTriggers = Object.entries(data.topFaqTriggers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }));

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
              text-anchor="middle" font-size="10" fill="currentColor">${d.label}</text>
        <text x="${x + barWidth * 0.4}" y="${y - 5}"
              text-anchor="middle" font-size="9" fill="currentColor">${d.messages || ''}</text>
      `;
    }).join('');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <line x1="30" y1="0" x2="30" y2="${height - 20}" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
        <line x1="30" y1="${height - 20}" x2="${width}" y2="${height - 20}" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
        ${bars}
      </svg>
    `;
  },

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

    let currentAngle = -90;
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

  async checkMilestones() {
    const data = await this.load();
    const milestones = [
      { id: 'messages_1000', type: 'messages', value: 1000, title: '🎉', message: '1,000 messages sent!' },
      { id: 'messages_5000', type: 'messages', value: 5000, title: '🚀', message: '5,000 messages sent!' },
      { id: 'messages_10000', type: 'messages', value: 10000, title: '⭐', message: '10,000 messages sent!' },
      { id: 'welcomes_100', type: 'welcomes', value: 100, title: '👋', message: '100 viewers welcomed!' },
      { id: 'welcomes_500', type: 'welcomes', value: 500, title: '🌟', message: '500 viewers welcomed!' },
      { id: 'faq_100', type: 'faq', value: 100, title: '❓', message: '100 FAQ replies sent!' }
    ];

    const newMilestones = [];
    const achieved = data.milestonesAchieved || [];

    for (const milestone of milestones) {
      if (achieved.includes(milestone.id)) continue;

      let count = 0;
      switch (milestone.type) {
        case 'messages':
          count = data.totalMessagesSent;
          break;
        case 'welcomes':
          count = data.welcomeMessagesSent;
          break;
        case 'faq':
          count = data.faqRepliesSent;
          break;
      }

      if (count >= milestone.value) {
        newMilestones.push(milestone);
        achieved.push(milestone.id);
      }
    }

    if (newMilestones.length > 0) {
      data.milestonesAchieved = achieved;
      await new Promise(resolve => {
        browserAPI.storage.local.set({ [this.STORAGE_KEY]: data }, resolve);
      });
    }

    return newMilestones;
  },

  async getImpactSummary() {
    const data = await this.load();
    const totalMessages = data.totalMessagesSent;

    // Calculate time saved (5 seconds per message)
    const totalSeconds = totalMessages * 5;
    const hoursSaved = totalSeconds / 3600;

    return {
      viewersEngaged: data.welcomeMessagesSent,
      hoursSaved: hoursSaved >= 1 ? hoursSaved.toFixed(1) : (totalSeconds / 60).toFixed(0),
      hoursSavedUnit: hoursSaved >= 1 ? 'Hours' : 'Minutes',
      questionsAnswered: data.faqRepliesSent,
      growthPercent: 0,
      isGrowing: true
    };
  }
};

// Initialize analytics tab
export async function initAnalytics() {
  const isPro = settings.tier === 'pro' || settings.tier === 'business';

  if (elements.analyticsLocked && elements.analyticsContent) {
    // Show analytics for all users - free users get limited view
    elements.analyticsLocked.style.display = 'none';
    elements.analyticsContent.style.display = 'block';
    await loadAnalyticsData();

    // Hide export button for free users (Pro feature)
    if (elements.exportAnalyticsBtn) {
      elements.exportAnalyticsBtn.style.display = isPro ? 'inline-flex' : 'none';
    }
  }
}

// Load and display analytics data
export async function loadAnalyticsData() {
  try {
    const summary = await Analytics.getSummary();

    // Update stat cards
    if (elements.statTotalMessages) {
      elements.statTotalMessages.textContent = summary.totalMessages.toLocaleString();
    }
    if (elements.statTodayMessages) {
      elements.statTodayMessages.textContent = summary.todayMessages.toLocaleString();
    }
    if (elements.statPeakHour) {
      elements.statPeakHour.textContent = summary.totalMessages > 0 ? summary.peakHour : '--';
    }

    // Generate weekly chart
    if (elements.weeklyChart) {
      elements.weeklyChart.innerHTML = Analytics.generateWeeklyChart(summary.last7Days);
    }

    // Generate pie chart
    if (elements.typePieChart) {
      elements.typePieChart.innerHTML = Analytics.generateTypePieChart(summary);
    }

    // Update legend
    if (elements.legendWelcome) elements.legendWelcome.textContent = summary.welcomesSent;
    if (elements.legendFaq) elements.legendFaq.textContent = summary.faqReplies;
    if (elements.legendTimer) elements.legendTimer.textContent = summary.timerMessages;
    if (elements.legendTemplate) elements.legendTemplate.textContent = summary.templatesSent;

    // Update top FAQ triggers using safe DOM methods
    if (elements.faqTriggersList) {
      while (elements.faqTriggersList.firstChild) {
        elements.faqTriggersList.removeChild(elements.faqTriggersList.firstChild);
      }

      if (summary.topTriggers.length > 0) {
        summary.topTriggers.forEach(t => {
          const item = document.createElement('div');
          item.className = 'trigger-item';

          const keywordSpan = document.createElement('span');
          keywordSpan.className = 'trigger-keyword';
          keywordSpan.textContent = t.trigger;

          const countSpan = document.createElement('span');
          countSpan.className = 'trigger-count';
          countSpan.textContent = t.count;

          item.appendChild(keywordSpan);
          item.appendChild(countSpan);
          elements.faqTriggersList.appendChild(item);
        });
      } else {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-triggers';
        emptyMsg.textContent = 'No FAQ triggers yet';
        elements.faqTriggersList.appendChild(emptyMsg);
      }
    }

    // Load impact summary for VIP users
    await loadImpactSummary();
  } catch (error) {
    console.error('[BuzzChat] Failed to load analytics data:', error);
  }
}

// Check and celebrate milestones
export async function checkMilestones() {
  try {
    const newMilestones = await Analytics.checkMilestones();

    if (newMilestones.length > 0) {
      // Celebrate the first milestone (most important one)
      const milestone = newMilestones[0];

      // Show confetti!
      triggerConfetti();

      // Show celebratory toast
      Toast.success(`${milestone.title} ${milestone.message}`);

      // If multiple milestones, show a note
      if (newMilestones.length > 1) {
        setTimeout(() => {
          Toast.info(`+${newMilestones.length - 1} more milestone${newMilestones.length > 2 ? 's' : ''} unlocked!`);
        }, 3000);
      }
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to check milestones:', error);
  }
}

// Load emotionally rewarding impact summary for VIP users
async function loadImpactSummary() {
  const isPro = settings.tier === 'pro' || settings.tier === 'business';
  const impactSummary = document.getElementById('impactSummary');

  if (!impactSummary) return;

  // Only show impact summary for Pro/Business users
  if (!isPro) {
    impactSummary.style.display = 'none';
    return;
  }

  impactSummary.style.display = 'block';

  try {
    const impact = await Analytics.getImpactSummary();

    // Update impact values
    const impactViewers = document.getElementById('impactViewers');
    const impactTimeSaved = document.getElementById('impactTimeSaved');
    const impactTimeLabel = document.getElementById('impactTimeLabel');
    const impactQuestions = document.getElementById('impactQuestions');
    const impactGrowth = document.getElementById('impactGrowth');

    if (impactViewers) {
      impactViewers.textContent = impact.viewersEngaged.toLocaleString();
    }

    if (impactTimeSaved) {
      impactTimeSaved.textContent = impact.hoursSaved;
    }

    if (impactTimeLabel) {
      impactTimeLabel.textContent = `${impact.hoursSavedUnit} Saved`;
    }

    if (impactQuestions) {
      impactQuestions.textContent = impact.questionsAnswered.toLocaleString();
    }

    // Show growth indicator if we have comparison data
    if (impactGrowth && impact.growthPercent !== 0) {
      impactGrowth.style.display = 'inline';
      impactGrowth.className = `impact-growth ${impact.isGrowing ? 'positive' : 'negative'}`;
      impactGrowth.textContent = `${impact.isGrowing ? '+' : ''}${impact.growthPercent}% vs last month`;
    } else if (impactGrowth) {
      impactGrowth.style.display = 'none';
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to load impact summary:', error);
  }
}
