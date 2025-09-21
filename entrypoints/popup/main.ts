import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { PasswordGenerator } from './password-generator';
import { UuidGenerator } from './uuid-generator';
import { AutofillOptions } from './autofill-options';
import './styles.css';

// Check if content script is already injected
async function isContentScriptInjected(tabId: number): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, { command: 'ping' });
    return true;
  } catch {
    return false;
  }
}

// Inject content script if not already injected
async function injectContentScriptIfNeeded(tabId: number): Promise<void> {
  const isInjected = await isContentScriptInjected(tabId);
  if (!isInjected) {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }
}

const sendCommand = async (command: string) => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      // First, ensure the content script is injected
      await injectContentScriptIfNeeded(tab.id);

      // Close the popup for interactive commands
      if (command === 'autofill-all' || command === 'autofill-selection') {
        window.close();
      }
      
      // Then send the message
      await browser.tabs.sendMessage(tab.id, { command });
    }
  } catch (error) {
    console.error('Error sending command:', error);
  }
};

// Set the correct SVG URL for the logo
const logoImg = document.querySelector('.header img') as HTMLImageElement;
if (logoImg) {
  logoImg.src = browser.runtime.getURL('/images/full.svg');
}

document.getElementById('autofill-all')?.addEventListener('click', () => sendCommand('autofill-all'));
document.getElementById('autofill-selection')?.addEventListener('click', () => sendCommand('autofill-selection'));

// Settings: Auto-fill toggle persistence with WXT storage
const fallbackToggle = document.getElementById('toggle-fallback') as HTMLInputElement | null;
if (fallbackToggle) {
  // Load initial state
  storage.getItem<string>('sync:gofakeitMode').then((mode) => {
    fallbackToggle!.checked = mode === 'auto';
  }).catch(console.error);

  // Save changes
  fallbackToggle.addEventListener('change', async () => {
    try {
      const modeValue = fallbackToggle!.checked ? 'auto' : 'manual';
      await storage.setItem('sync:gofakeitMode', modeValue);
    } catch (error) {
      console.error('Failed to save autofill mode:', error);
    }
  });
}

// Initialize autofill options modal
new AutofillOptions();

// Initialize password generator
new PasswordGenerator();

// Initialize UUID generator
new UuidGenerator();
