// BuzzChat - Performance Monitoring Module
// Tracks performance metrics and memory usage

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const PerformanceMonitor = {
  STORAGE_KEY: 'buzzchat_perf_metrics',
  SAMPLING_INTERVAL_MS: 30000, // Sample every 30 seconds
  MAX_SAMPLES: 100, // Keep last 100 samples

  _samples: [],
  _intervalId: null,
  _startTime: null,

  // Initialize performance monitoring
  start() {
    if (this._intervalId) return;

    this._startTime = Date.now();
    this._samples = [];

    // Initial sample
    this._collectSample();

    // Set up periodic sampling
    this._intervalId = setInterval(() => {
      this._collectSample();
    }, this.SAMPLING_INTERVAL_MS);

    console.log('[BuzzChat] Performance monitoring started');
  },

  // Stop performance monitoring
  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }

    console.log('[BuzzChat] Performance monitoring stopped');
  },

  // Collect a performance sample
  _collectSample() {
    const sample = {
      timestamp: Date.now(),
      uptime: Date.now() - this._startTime,
      memory: this._getMemoryUsage(),
      domNodes: this._getDomNodeCount(),
      eventListeners: this._estimateEventListeners()
    };

    this._samples.push(sample);

    // Trim to max samples
    if (this._samples.length > this.MAX_SAMPLES) {
      this._samples = this._samples.slice(-this.MAX_SAMPLES);
    }

    // Check for memory issues
    this._checkMemoryHealth(sample);
  },

  // Get memory usage if available
  _getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  // Count DOM nodes
  _getDomNodeCount() {
    try {
      return document.getElementsByTagName('*').length;
    } catch (e) {
      return null;
    }
  },

  // Estimate event listeners (rough approximation)
  _estimateEventListeners() {
    // This is a rough estimate - actual count requires DevTools
    try {
      const elementsWithHandlers = document.querySelectorAll('[onclick], [onmouseover], [onmouseout], [onchange], [oninput]');
      return elementsWithHandlers.length;
    } catch (e) {
      return null;
    }
  },

  // Check memory health and warn if growing
  _checkMemoryHealth(sample) {
    if (!sample.memory) return;

    const heapUsagePercent = (sample.memory.usedJSHeapSize / sample.memory.jsHeapSizeLimit) * 100;

    // Warn if heap usage is above 80%
    if (heapUsagePercent > 80) {
      console.warn('[BuzzChat] High memory usage:', heapUsagePercent.toFixed(1) + '%');
    }

    // Check for memory growth (potential leak)
    if (this._samples.length >= 10) {
      const recentSamples = this._samples.slice(-10);
      const firstHeap = recentSamples[0].memory?.usedJSHeapSize || 0;
      const lastHeap = recentSamples[recentSamples.length - 1].memory?.usedJSHeapSize || 0;
      const growthRate = ((lastHeap - firstHeap) / firstHeap) * 100;

      // Warn if memory grew more than 50% in last 10 samples
      if (growthRate > 50 && firstHeap > 0) {
        console.warn('[BuzzChat] Possible memory leak detected. Growth:', growthRate.toFixed(1) + '%');
      }
    }
  },

  // Get current metrics summary
  getSummary() {
    if (this._samples.length === 0) {
      return { status: 'no_data', samples: 0 };
    }

    const latest = this._samples[this._samples.length - 1];
    const first = this._samples[0];

    return {
      status: 'ok',
      samples: this._samples.length,
      uptime: latest.uptime,
      uptimeFormatted: this._formatUptime(latest.uptime),
      memory: latest.memory ? {
        usedMB: (latest.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
        totalMB: (latest.memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
        limitMB: (latest.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
        usagePercent: ((latest.memory.usedJSHeapSize / latest.memory.jsHeapSizeLimit) * 100).toFixed(1)
      } : null,
      domNodes: latest.domNodes,
      memoryGrowth: this._samples.length >= 2 ? {
        firstMB: first.memory ? (first.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) : null,
        latestMB: latest.memory ? (latest.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) : null,
        growthPercent: first.memory && latest.memory
          ? (((latest.memory.usedJSHeapSize - first.memory.usedJSHeapSize) / first.memory.usedJSHeapSize) * 100).toFixed(1)
          : null
      } : null
    };
  },

  // Format uptime as human-readable string
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  },

  // Track a specific operation's performance
  track(operationName, fn) {
    const start = performance.now();

    try {
      const result = fn();

      // Handle promises
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const duration = performance.now() - start;
          this._logOperation(operationName, duration);
        });
      }

      const duration = performance.now() - start;
      this._logOperation(operationName, duration);
      return result;

    } catch (error) {
      const duration = performance.now() - start;
      this._logOperation(operationName, duration, error);
      throw error;
    }
  },

  // Log operation timing
  _logOperation(name, duration, error = null) {
    const level = error ? 'warn' : (duration > 100 ? 'warn' : 'debug');

    if (level === 'warn') {
      console.warn(`[BuzzChat] ${name} took ${duration.toFixed(2)}ms`, error ? error : '');
    }
  },

  // Save metrics to storage (for debugging)
  async saveMetrics() {
    const summary = this.getSummary();

    return new Promise(resolve => {
      browserAPI.storage.local.set({
        [this.STORAGE_KEY]: {
          summary,
          savedAt: Date.now()
        }
      }, resolve);
    });
  },

  // Load saved metrics
  async loadMetrics() {
    return new Promise(resolve => {
      browserAPI.storage.local.get([this.STORAGE_KEY], result => {
        resolve(result[this.STORAGE_KEY] || null);
      });
    });
  }
};

// Export for ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}
