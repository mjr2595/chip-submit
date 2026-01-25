const FORM_CONFIG = {
  formResponseUrl: 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSfNKFVaVkShWlBfthGcSIebWM5WrbMJDaEewg-UNjeS916hww/formResponse',
  entryIds: {
    email: 'emailAddress',
    name: 'entry.271625725',
    ambassadorCode: 'entry.690154667',
    linkToPost: 'entry.355586873'
  }
};

// injects an alert msg into dom
async function alert(msg){
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [msg],
    func: (msg) => {
    alert(msg);
    }
  });
}

// modified logic to not use DOM
async function handleSubmit() {
  const settings = await chrome.storage.sync.get(['email', 'name', 'ambassadorCode']);

  if (!settings.email || !settings.name || !settings.ambassadorCode) {
    alert('Please configure your settings first!');
    return;
  }

  if (!settings.ambassadorCode.startsWith(AMBASSADOR_CODE_PREFIX)) {
    alert('Invalid ambassador code format. Please update settings.');
    return;
  }

  if (!currentTabUrl || currentTabUrl.startsWith('chrome://') || currentTabUrl.startsWith('chrome-extension://')) {
    alert('Cannot submit from this page. Please navigate to a valid webpage.');
    return;
  }

  try {
    // Submit directly to Google Forms using formResponse endpoint
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const formData = new FormData();
    formData.append(FORM_CONFIG.entryIds.email, settings.email);
    formData.append(FORM_CONFIG.entryIds.name, settings.name);
    formData.append(FORM_CONFIG.entryIds.ambassadorCode, settings.ambassadorCode);
    formData.append(FORM_CONFIG.entryIds.linkToPost, tab.url);

    await fetch(FORM_CONFIG.formResponseUrl, {
      method: 'POST',
      body: formData,
      mode: 'no-cors' // Required for Google Forms
    });

  } catch (error) {
    alert("Submission error:", error)
    console.error('Submission error:', error);
  }
}


chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendData",
    title: "Send to ambassador form",
    contexts: ["all"] // Appears everywhere on right-click
  });
});

// Handle the click event
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendData") {
    alert("running")
    handleSubmit()
  }
});
