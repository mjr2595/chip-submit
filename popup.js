const FORM_CONFIG = {
  formResponseUrl: 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSd9v9wI5Pr9v3d80NXKZ0lW8l0cWJJXbjl8lktm1nXjqZlpkA/formResponse',
  entryIds: {
    email: 'emailAddress',
    name: 'entry.440377606',
    ambassadorCode: 'entry.951287370',
    linkToPost: 'entry.385240512'
  }
};

const AMBASSADOR_CODE_PREFIX = 'https://platform.torc.dev/#/r/';

let currentView = 'submit';
let currentTabUrl = '';

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('navSettings').addEventListener('click', () => showView('settings'));
  document.getElementById('navSubmit').addEventListener('click', () => showView('submit'));
  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSave);
  document.getElementById('submitBtn').addEventListener('click', handleSubmit);
  document.getElementById('cancelBtn').addEventListener('click', () => window.close());

  await loadSettings();
  await loadCurrentTabUrl();
  showView('submit');
});

function showView(viewName) {
  currentView = viewName;

  document.getElementById('navSettings').classList.toggle('active', viewName === 'settings');
  document.getElementById('navSubmit').classList.toggle('active', viewName === 'submit');

  document.getElementById('settingsView').style.display = viewName === 'settings' ? 'block' : 'none';
  document.getElementById('submitView').style.display = viewName === 'submit' ? 'block' : 'none';

  if (viewName === 'submit') {
    loadSettings();
    loadCurrentTabUrl();
  }
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get(['email', 'name', 'ambassadorCode']);

  if (settings.email) {
    document.getElementById('email').value = settings.email;
  }
  if (settings.name) {
    document.getElementById('name').value = settings.name;
  }
  if (settings.ambassadorCode) {
    document.getElementById('ambassadorCode').value = settings.ambassadorCode;
  }

  document.getElementById('displayEmail').textContent = settings.email || 'Not set';
  document.getElementById('displayName').textContent = settings.name || 'Not set';
  document.getElementById('displayCode').textContent = settings.ambassadorCode || 'Not set';

  const submitBtn = document.getElementById('submitBtn');
  if (settings.email && settings.name && settings.ambassadorCode) {
    submitBtn.disabled = false;
  } else {
    submitBtn.disabled = true;
  }
}

async function handleSettingsSave(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const name = document.getElementById('name').value;
  const ambassadorCode = document.getElementById('ambassadorCode').value.trim();

  if (!ambassadorCode.startsWith(AMBASSADOR_CODE_PREFIX)) {
    showStatus('settingsStatus', 'error', `Ambassador code must start with: ${AMBASSADOR_CODE_PREFIX}`);
    return;
  }

  await chrome.storage.sync.set({
    email,
    name,
    ambassadorCode
  });

  showStatus('settingsStatus', 'success', 'Settings saved successfully!');

  setTimeout(() => {
    showView('submit');
  }, 1000);
}

async function loadCurrentTabUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      currentTabUrl = tab.url;
      document.getElementById('currentUrl').textContent = tab.url;
    } else {
      document.getElementById('currentUrl').textContent = 'Unable to get current URL';
    }
  } catch (error) {
    console.error('Error getting current tab:', error);
    document.getElementById('currentUrl').textContent = 'Error getting URL';
  }
}

async function handleSubmit() {
  const settings = await chrome.storage.sync.get(['email', 'name', 'ambassadorCode']);

  if (!settings.email || !settings.name || !settings.ambassadorCode) {
    showStatus('submitStatus', 'error', 'Please configure your settings first!');
    return;
  }

  if (!settings.ambassadorCode.startsWith(AMBASSADOR_CODE_PREFIX)) {
    showStatus('submitStatus', 'error', 'Invalid ambassador code format. Please update settings.');
    return;
  }

  if (!currentTabUrl || currentTabUrl.startsWith('chrome://') || currentTabUrl.startsWith('chrome-extension://')) {
    showStatus('submitStatus', 'error', 'Cannot submit from this page. Please navigate to a valid webpage.');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Submitting...';
  submitBtn.disabled = true;

  try {
    // Submit directly to Google Forms using formResponse endpoint
    const formData = new FormData();
    formData.append(FORM_CONFIG.entryIds.email, settings.email);
    formData.append(FORM_CONFIG.entryIds.name, settings.name);
    formData.append(FORM_CONFIG.entryIds.ambassadorCode, settings.ambassadorCode);
    formData.append(FORM_CONFIG.entryIds.linkToPost, currentTabUrl);

    await fetch(FORM_CONFIG.formResponseUrl, {
      method: 'POST',
      body: formData,
      mode: 'no-cors' // Required for Google Forms
    });

    // Show success (no-cors mode means we can't detect actual success)
    showStatus('submitStatus', 'success', '✅ Submitted successfully!');
    submitBtn.textContent = '✅ Submitted!';

    setTimeout(() => {
      window.close();
    }, 1500);

  } catch (error) {
    console.error('Submission error:', error);
    showStatus('submitStatus', 'error', 'Submission failed: ' + error.message);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function showStatus(elementId, type, message) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = `status ${type} show`;

  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 5000);
  }
}
