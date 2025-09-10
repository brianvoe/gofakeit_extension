import { PasswordGenerator } from './password-generator';
import { UuidGenerator } from './uuid-generator';

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

const sendCommand = async (command: string) => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      // First, ensure the content script is injected
      await injectContentScriptIfNeeded(tab.id);
      
      // Then send the message
      await chrome.tabs.sendMessage(tab.id, { command });
      
      // Close the popup for interactive commands
      if (command === 'autofill-all' || command === 'autofill-selected') {
        window.close();
      }
    }
  } catch (error) {
    console.error('Error sending command:', error);
  }
};

// Set the correct SVG URL for the logo
const logoImg = document.querySelector('.header img') as HTMLImageElement;
if (logoImg) {
  logoImg.src = chrome.runtime.getURL('assets/images/full.svg');
}

document.getElementById('autofill-all')?.addEventListener('click', () => sendCommand('autofill-all'));
document.getElementById('autofill-selected')?.addEventListener('click', () => sendCommand('autofill-selected'));

// Settings: Smart-fill toggle persistence with chrome.storage
const fallbackToggle = document.getElementById('toggle-fallback') as HTMLInputElement | null;
if (fallbackToggle) {
  chrome.storage.sync.get({ gofakeitSmartFill: true }, (items) => {
    fallbackToggle!.checked = !!items.gofakeitSmartFill;
  });

  fallbackToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ gofakeitSmartFill: fallbackToggle!.checked });
  });
}

// Initialize password generator
new PasswordGenerator();

// Initialize UUID generator
new UuidGenerator();
