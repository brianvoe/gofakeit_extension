// Check if content script is already injected
async function isContentScriptInjected(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, { command: 'ping' });
    return true;
  } catch {
    return false;
  }
}

// Inject content script if not already injected
async function injectContentScriptIfNeeded(tabId: number): Promise<void> {
  const isInjected = await isContentScriptInjected(tabId);
  if (!isInjected) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }
}

// Runs when the user clicks the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await injectContentScriptIfNeeded(tab.id);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'trigger-autofill') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      await injectContentScriptIfNeeded(tab.id);
    }
  }
});
