import { GofakeitMessage } from './types';
import { autofillAll } from './autofill';
import { enableSelectionMode } from './selection';

// Inject CSS styles into the page
function injectCSSStyles(): void {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('assets/css/styles.css');
  document.head.appendChild(link);
}

// Wrap everything in an IIFE to prevent global scope pollution
(function() {
  // Check if already initialized
  if (window.gofakeitExtensionInjected) {
    console.log('[Gofakeit Autofill] Content script already initialized, skipping');
    return;
  }

  // Mark as initialized
  window.gofakeitExtensionInjected = true;

  // Inject CSS styles
  injectCSSStyles();

  // Log to verify it only runs when injected
  console.log('[Gofakeit Autofill] Content script injected');

  // Message listener for handling commands from popup
  chrome.runtime.onMessage.addListener(async (msg: GofakeitMessage, _sender, _sendResponse) => {
    if (msg.command === 'ping') {
      // Respond to ping to confirm content script is injected
      _sendResponse({ status: 'ok' });
    } else if (msg.command === 'autofill-all') {
      autofillAll().catch(error => {
        console.error('[Gofakeit Autofill] Error during autofill:', error);
      });
    } else if (msg.command === 'autofill-selected') {
      enableSelectionMode();
    }
  });

})();
