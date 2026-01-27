// BuzzChat - Tab Navigation
// Tab navigation with ARIA support and keyboard navigation

// Tab navigation with ARIA support
export function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      // Update tab buttons
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });

      // Update tab panels
      tabPanels.forEach(p => p.classList.remove('active'));

      // Activate selected tab
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const panel = document.getElementById(`${tabId}-panel`);
      if (panel) {
        panel.classList.add('active');
      }
    });

    // Keyboard navigation for tabs
    btn.addEventListener('keydown', (e) => {
      const tabs = Array.from(tabBtns);
      const currentIndex = tabs.indexOf(btn);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        tabs[prevIndex].focus();
        tabs[prevIndex].click();
      }
    });
  });
}
