// BuzzChat - Business UI Components
// Business tier UI for accounts and API keys

import { settings } from '../core/state.js';
import { loadSettings } from '../core/storage.js';
import { formatAccountDate } from '../core/utils.js';
import { Toast, Loading } from './toast.js';
import { elements } from './elements.js';
import { initUI } from './init.js';
import { AccountManager } from '../business/accounts.js';
import { ApiKeyManager } from '../business/apiKeys.js';

// Initialize Business tier features (account selector & API access)
export async function initBusinessFeatures() {
  const isBusiness = settings.tier === 'business';

  // Account Selector
  if (elements.accountSelectorContainer) {
    if (isBusiness) {
      elements.accountSelectorContainer.style.display = 'flex';
      await refreshAccountSelector();
    } else {
      elements.accountSelectorContainer.style.display = 'none';
    }
  }

  // API Access Section
  if (elements.apiSection && elements.apiLocked) {
    if (isBusiness) {
      elements.apiSection.style.display = 'block';
      elements.apiLocked.style.display = 'none';
      await refreshApiKeysList();
    } else {
      elements.apiSection.style.display = 'none';
      elements.apiLocked.style.display = 'block';
    }
  }

  // Set up event listeners for Business features
  initBusinessEventListeners();
}

// Initialize Business tier event listeners
export function initBusinessEventListeners() {
  // Account Selector events
  if (elements.accountSelect) {
    elements.accountSelect.addEventListener('change', async () => {
      const newAccountId = elements.accountSelect.value;
      try {
        await AccountManager.setActiveAccount(newAccountId);
        await loadSettings();
        initUI();
        Toast.success('Switched setup');
      } catch (error) {
        Toast.error('Failed to switch setup');
        console.error('[BuzzChat] Account switch error:', error);
      }
    });
  }

  if (elements.newAccountBtn) {
    elements.newAccountBtn.addEventListener('click', async () => {
      const name = prompt('Enter a name for the new setup:', 'My New Setup');
      if (!name) return;

      try {
        const account = await AccountManager.createAccount(name);
        await AccountManager.setActiveAccount(account.id);
        await loadSettings();
        initUI();
        Toast.success(`Created "${account.name}"`);
      } catch (error) {
        Toast.error(error.message || 'Failed to create setup');
        console.error('[BuzzChat] Account create error:', error);
      }
    });
  }

  if (elements.manageAccountsBtn) {
    elements.manageAccountsBtn.addEventListener('click', async () => {
      await refreshAccountsList();
      elements.accountManagerModal?.classList.add('active');
    });
  }

  if (elements.closeAccountManagerBtn) {
    elements.closeAccountManagerBtn.addEventListener('click', () => {
      elements.accountManagerModal?.classList.remove('active');
    });
  }

  if (elements.createAccountModalBtn) {
    elements.createAccountModalBtn.addEventListener('click', () => {
      if (elements.createAccountForm) {
        elements.createAccountForm.style.display = 'block';
        elements.createAccountModalBtn.style.display = 'none';
        elements.newAccountName?.focus();
      }
    });
  }

  if (elements.cancelCreateAccountBtn) {
    elements.cancelCreateAccountBtn.addEventListener('click', () => {
      if (elements.createAccountForm) {
        elements.createAccountForm.style.display = 'none';
        elements.createAccountModalBtn.style.display = 'block';
        if (elements.newAccountName) elements.newAccountName.value = '';
      }
    });
  }

  if (elements.confirmCreateAccountBtn) {
    elements.confirmCreateAccountBtn.addEventListener('click', async () => {
      const name = elements.newAccountName?.value?.trim();
      if (!name) {
        Toast.warning('Please enter a setup name');
        return;
      }

      try {
        Loading.show(elements.confirmCreateAccountBtn);
        const account = await AccountManager.createAccount(name);
        await refreshAccountsList();
        await refreshAccountSelector();

        elements.createAccountForm.style.display = 'none';
        elements.createAccountModalBtn.style.display = 'block';
        elements.newAccountName.value = '';

        Toast.success(`Created "${account.name}"`);
      } catch (error) {
        Toast.error(error.message || 'Failed to create setup');
      } finally {
        Loading.hide(elements.confirmCreateAccountBtn);
      }
    });
  }

  // API Key events
  if (elements.createApiKeyBtn) {
    elements.createApiKeyBtn.addEventListener('click', async () => {
      const name = prompt('Enter a name for this API key:', 'My API Key');
      if (!name) return;

      try {
        Loading.show(elements.createApiKeyBtn);
        const keyData = await ApiKeyManager.createKey(name);

        // Show the key to the user (only time they'll see it)
        if (elements.newApiKeyValue) {
          elements.newApiKeyValue.textContent = keyData.key;
        }
        if (elements.apiKeyCreated) {
          elements.apiKeyCreated.style.display = 'block';
        }

        await refreshApiKeysList();
        Toast.success('API key created');
      } catch (error) {
        Toast.error(error.message || 'Failed to create API key');
      } finally {
        Loading.hide(elements.createApiKeyBtn);
      }
    });
  }

  if (elements.copyNewApiKeyBtn) {
    elements.copyNewApiKeyBtn.addEventListener('click', async () => {
      const key = elements.newApiKeyValue?.textContent;
      if (!key) return;

      try {
        await navigator.clipboard.writeText(key);
        elements.copyNewApiKeyBtn.textContent = 'Copied!';
        Toast.success('API key copied to clipboard');
        setTimeout(() => {
          elements.copyNewApiKeyBtn.textContent = 'Copy';
        }, 2000);
      } catch (err) {
        Toast.error('Failed to copy to clipboard');
      }
    });
  }

  if (elements.closeApiKeyCreatedBtn) {
    elements.closeApiKeyCreatedBtn.addEventListener('click', () => {
      if (elements.apiKeyCreated) {
        elements.apiKeyCreated.style.display = 'none';
      }
      if (elements.newApiKeyValue) {
        elements.newApiKeyValue.textContent = '';
      }
    });
  }

  if (elements.unlockApiBtn) {
    elements.unlockApiBtn.addEventListener('click', () => {
      elements.upgradeModal?.classList.add('active');
    });
  }
}

// Refresh account selector dropdown
export async function refreshAccountSelector() {
  if (!elements.accountSelect) return;

  const accountList = await AccountManager.getAccountList();

  // Clear existing options safely
  while (elements.accountSelect.firstChild) {
    elements.accountSelect.removeChild(elements.accountSelect.firstChild);
  }

  // Build options using safe DOM methods
  accountList.forEach(account => {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = account.name;
    if (account.isActive) {
      option.selected = true;
    }
    elements.accountSelect.appendChild(option);
  });
}

// Refresh accounts list in modal
export async function refreshAccountsList() {
  if (!elements.accountsList) return;

  const accountList = await AccountManager.getAccountList();

  // Clear existing content safely
  while (elements.accountsList.firstChild) {
    elements.accountsList.removeChild(elements.accountsList.firstChild);
  }

  // Build account items using safe DOM methods
  accountList.forEach(account => {
    const item = document.createElement('div');
    item.className = `account-item ${account.isActive ? 'active' : ''}`;
    item.dataset.accountId = account.id;

    // Account info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'account-item-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'account-item-name';
    nameDiv.textContent = account.name;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'account-item-meta';
    metaDiv.textContent = `Created ${formatAccountDate(account.createdAt)}`;

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(metaDiv);
    item.appendChild(infoDiv);

    // Active badge
    if (account.isActive) {
      const badge = document.createElement('span');
      badge.className = 'account-item-badge';
      badge.textContent = 'Active';
      item.appendChild(badge);
    }

    // Actions section
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'account-item-actions';

    // Switch button (only for non-active accounts)
    if (!account.isActive) {
      const switchBtn = document.createElement('button');
      switchBtn.className = 'icon-btn switch-account-btn';
      switchBtn.title = 'Switch to this setup';
      switchBtn.dataset.id = account.id;
      switchBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
      actionsDiv.appendChild(switchBtn);
    }

    // Delete button (only for non-default accounts)
    if (account.id !== 'default') {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn danger delete-account-btn';
      deleteBtn.title = 'Delete setup';
      deleteBtn.dataset.id = account.id;
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
      actionsDiv.appendChild(deleteBtn);
    }

    item.appendChild(actionsDiv);
    elements.accountsList.appendChild(item);
  });

  // Attach event listeners
  elements.accountsList.querySelectorAll('.switch-account-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const accountId = btn.dataset.id;
      try {
        await AccountManager.setActiveAccount(accountId);
        await loadSettings();
        initUI();
        await refreshAccountsList();
        await refreshAccountSelector();
        Toast.success('Switched setup');
      } catch (error) {
        Toast.error('Failed to switch setup');
      }
    });
  });

  elements.accountsList.querySelectorAll('.delete-account-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const accountId = btn.dataset.id;
      if (!confirm('Delete this setup? All settings will be lost. This cannot be undone.')) return;

      try {
        await AccountManager.deleteAccount(accountId);
        await loadSettings();
        initUI();
        await refreshAccountsList();
        await refreshAccountSelector();
        Toast.success('Setup deleted');
      } catch (error) {
        Toast.error(error.message || 'Failed to delete setup');
      }
    });
  });
}

// Refresh API keys list
export async function refreshApiKeysList() {
  if (!elements.apiKeysList) return;

  const keyList = await ApiKeyManager.getKeyList();

  // Clear existing content safely
  while (elements.apiKeysList.firstChild) {
    elements.apiKeysList.removeChild(elements.apiKeysList.firstChild);
  }

  if (keyList.length === 0) {
    if (elements.emptyKeysMessage) {
      elements.emptyKeysMessage.style.display = 'block';
    }
    return;
  }

  if (elements.emptyKeysMessage) {
    elements.emptyKeysMessage.style.display = 'none';
  }

  // Build API key items using safe DOM methods
  keyList.forEach(key => {
    const item = document.createElement('div');
    item.className = 'api-key-item';
    item.dataset.keyId = key.id;

    // Key info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'api-key-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'api-key-name';
    nameDiv.textContent = key.name;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'api-key-preview';
    previewDiv.textContent = key.keyPreview;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'api-key-meta';
    metaDiv.textContent = `Last used: ${ApiKeyManager.formatLastUsed(key.lastUsed)}`;

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(previewDiv);
    infoDiv.appendChild(metaDiv);
    item.appendChild(infoDiv);

    // Actions section
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'api-key-actions';

    const revokeBtn = document.createElement('button');
    revokeBtn.className = 'btn btn-danger btn-sm revoke-key-btn';
    revokeBtn.dataset.id = key.id;
    revokeBtn.textContent = 'Revoke';

    actionsDiv.appendChild(revokeBtn);
    item.appendChild(actionsDiv);

    elements.apiKeysList.appendChild(item);
  });

  // Attach event listeners
  elements.apiKeysList.querySelectorAll('.revoke-key-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const keyId = btn.dataset.id;
      if (!confirm('Revoke this API key? Any applications using it will stop working.')) return;

      try {
        Loading.show(btn);
        await ApiKeyManager.revokeKey(keyId);
        await refreshApiKeysList();
        Toast.success('API key revoked');
      } catch (error) {
        Toast.error(error.message || 'Failed to revoke API key');
      } finally {
        Loading.hide(btn);
      }
    });
  });
}
