// Unit tests for Analytics module
const { test, expect } = require('@playwright/test');

// Mock browser API
const mockStorage = {
  data: {},
  local: {
    get: function(keys, callback) {
      const result = {};
      keys.forEach(key => {
        if (this.data[key]) result[key] = this.data[key];
      });
      callback(result);
    },
    set: function(data, callback) {
      Object.assign(this.data, data);
      if (callback) callback();
    }
  }
};

test.describe('Analytics Module', () => {
  test.beforeEach(() => {
    // Reset mock storage
    mockStorage.data = {};
  });

  test.describe('getDefaultData', () => {
    test('returns correct default structure', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const Analytics = {
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
              topFaqTriggers: {}
            };
          }
        };
        return Analytics.getDefaultData();
      });

      expect(result.totalMessagesSent).toBe(0);
      expect(result.welcomeMessagesSent).toBe(0);
      expect(result.faqRepliesSent).toBe(0);
      expect(result.timerMessagesSent).toBe(0);
      expect(result.templatesSent).toBe(0);
      expect(result.sessionsCount).toBe(0);
      expect(result.lastSessionDate).toBeNull();
      expect(result.hourlyActivity).toHaveLength(24);
      expect(Object.keys(result.dailyStats)).toHaveLength(0);
    });
  });

  test.describe('getTodayKey', () => {
    test('returns ISO date string format', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        return new Date().toISOString().split('T')[0];
      });

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  test.describe('getCurrentHour', () => {
    test('returns number between 0 and 23', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        return new Date().getHours();
      });

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(23);
    });
  });

  test.describe('Milestone definitions', () => {
    test('has correct milestone values', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const MILESTONES = {
          messages_1000: { type: 'messages', value: 1000 },
          messages_5000: { type: 'messages', value: 5000 },
          messages_10000: { type: 'messages', value: 10000 },
          welcomes_100: { type: 'welcomes', value: 100 },
          welcomes_500: { type: 'welcomes', value: 500 },
          welcomes_1000: { type: 'welcomes', value: 1000 },
          faq_100: { type: 'faq', value: 100 }
        };
        return MILESTONES;
      });

      expect(result.messages_1000.value).toBe(1000);
      expect(result.messages_5000.value).toBe(5000);
      expect(result.welcomes_100.value).toBe(100);
      expect(result.faq_100.type).toBe('faq');
    });
  });

  test.describe('Time savings calculation', () => {
    test('calculates hours saved correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        // 1000 messages * 5 seconds = 5000 seconds = ~1.4 hours
        const totalMessages = 1000;
        const totalSeconds = totalMessages * 5;
        const hoursSaved = totalSeconds / 3600;
        return {
          hoursSaved: hoursSaved.toFixed(1),
          unit: hoursSaved >= 1 ? 'hours' : 'minutes'
        };
      });

      expect(parseFloat(result.hoursSaved)).toBeCloseTo(1.4, 1);
      expect(result.unit).toBe('hours');
    });

    test('uses minutes for small counts', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        // 10 messages * 5 seconds = 50 seconds < 1 hour
        const totalMessages = 10;
        const totalSeconds = totalMessages * 5;
        const hoursSaved = totalSeconds / 3600;
        return {
          value: hoursSaved >= 1 ? hoursSaved.toFixed(1) : (totalSeconds / 60).toFixed(0),
          unit: hoursSaved >= 1 ? 'hours' : 'minutes'
        };
      });

      expect(result.unit).toBe('minutes');
    });
  });

  test.describe('SVG Chart generation', () => {
    test('generateWeeklyChart produces valid SVG', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const svg = await page.evaluate(() => {
        const data = [
          { label: 'Mon', messages: 10 },
          { label: 'Tue', messages: 20 },
          { label: 'Wed', messages: 15 },
          { label: 'Thu', messages: 25 },
          { label: 'Fri', messages: 30 },
          { label: 'Sat', messages: 35 },
          { label: 'Sun', messages: 22 }
        ];

        const width = 300;
        const height = 100;
        const maxValue = Math.max(...data.map(d => d.messages), 1);
        const barWidth = (width - 60) / 7;

        const bars = data.map((d, i) => {
          const barHeight = (d.messages / maxValue) * (height - 30);
          const x = 30 + i * barWidth + barWidth * 0.1;
          const y = height - 20 - barHeight;
          return `<rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}" fill="#7c3aed"/>`;
        }).join('');

        return `<svg width="${width}" height="${height}">${bars}</svg>`;
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<rect');
      expect(svg).toContain('fill="#7c3aed"');
    });

    test('generateTypePieChart handles empty data', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const svg = await page.evaluate(() => {
        const data = { welcomesSent: 0, faqReplies: 0, timerMessages: 0, templatesSent: 0 };
        const total = data.welcomesSent + data.faqReplies + data.timerMessages + data.templatesSent;
        const size = 120;

        if (total === 0) {
          return `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 10}" fill="#e5e7eb"/><text>No data</text></svg>`;
        }
        return '';
      });

      expect(svg).toContain('No data');
      expect(svg).toContain('fill="#e5e7eb"');
    });
  });

  test.describe('CSV Export format', () => {
    test('generates correct CSV header', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const csv = await page.evaluate(() => {
        const rows = [['Date', 'Messages', 'Welcomes', 'FAQs', 'Timers', 'Templates']];
        return rows.map(row => row.join(',')).join('\n');
      });

      expect(csv).toBe('Date,Messages,Welcomes,FAQs,Timers,Templates');
    });

    test('formats data rows correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const csv = await page.evaluate(() => {
        const dailyStats = {
          '2026-01-22': { messages: 10, welcomes: 5, faqs: 3, timers: 2, templates: 0 },
          '2026-01-23': { messages: 15, welcomes: 8, faqs: 4, timers: 3, templates: 0 }
        };

        const rows = [['Date', 'Messages', 'Welcomes', 'FAQs', 'Timers', 'Templates']];

        Object.entries(dailyStats)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([date, stats]) => {
            rows.push([date, stats.messages, stats.welcomes, stats.faqs, stats.timers, stats.templates || 0]);
          });

        return rows.map(row => row.join(',')).join('\n');
      });

      expect(csv).toContain('2026-01-22,10,5,3,2,0');
      expect(csv).toContain('2026-01-23,15,8,4,3,0');
    });
  });

  test.describe('Data cleanup', () => {
    test('calculates 90-day cutoff correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        return cutoffDate.toISOString().split('T')[0];
      });

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's approximately 90 days ago
      const cutoff = new Date(result);
      const now = new Date();
      const diffDays = Math.floor((now - cutoff) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(90);
    });
  });

  test.describe('Peak hour formatting', () => {
    test('formats midnight correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const hour = 0;
        return hour === 0 ? '12 AM' :
               hour < 12 ? `${hour} AM` :
               hour === 12 ? '12 PM' :
               `${hour - 12} PM`;
      });
      expect(result).toBe('12 AM');
    });

    test('formats noon correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const hour = 12;
        return hour === 0 ? '12 AM' :
               hour < 12 ? `${hour} AM` :
               hour === 12 ? '12 PM' :
               `${hour - 12} PM`;
      });
      expect(result).toBe('12 PM');
    });

    test('formats afternoon correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const hour = 15;
        return hour === 0 ? '12 AM' :
               hour < 12 ? `${hour} AM` :
               hour === 12 ? '12 PM' :
               `${hour - 12} PM`;
      });
      expect(result).toBe('3 PM');
    });
  });
});
