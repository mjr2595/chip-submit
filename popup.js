const FORM_CONFIG = {
  baseUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfNKFVaVkShWlBfthGcSIebWM5WrbMJDaEewg-UNjeS916hww/viewform',
  entryIds: {
    email: 'emailAddress',
    name: 'entry.1223262904',
    ambassadorCode: 'entry.214453620',
    linkToPost: 'entry.708215965'
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

  try {
    // Google Forms blocks direct POST due to CORS, so we open a pre-filled form
    // in a new tab with query parameters for the user to review and submit
    const formData = {
      [FORM_CONFIG.entryIds.email]: settings.email,
      [FORM_CONFIG.entryIds.name]: settings.name,
      [FORM_CONFIG.entryIds.ambassadorCode]: settings.ambassadorCode,
      [FORM_CONFIG.entryIds.linkToPost]: currentTabUrl
    };

    const params = Object.entries(formData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    const prefilledUrl = `${FORM_CONFIG.baseUrl}?${params}`;

    await chrome.tabs.create({
      url: prefilledUrl,
      active: true
    });

    showStatus('submitStatus', 'success', 'Form opened in new tab. Please review and click Submit.');

    setTimeout(() => {
      window.close();
    }, 1500);

  } catch (error) {
    console.error('Submission error:', error);
    showStatus('submitStatus', 'error', 'Failed to open form: ' + error.message);
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
