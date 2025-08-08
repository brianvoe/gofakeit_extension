import { GofakeitMessage } from './types';
import { fetchGofakeitData } from './gofakeit-api';
import { autofillFormFields } from './autofill-core';
import { enableSelectionMode } from './selection-mode';

// Wrap everything in an IIFE to prevent global scope pollution
(function() {
  // Check if already initialized
  if (window.gofakeitExtensionInjected) {
    console.log('[Gofakeit Autofill] Content script already initialized, skipping');
    return;
  }

  // Mark as initialized
  window.gofakeitExtensionInjected = true;

  // Log to verify it only runs when injected
  console.log('[Gofakeit Autofill] Content script injected');

  // Message listener for handling commands from popup
  chrome.runtime.onMessage.addListener(async (msg: GofakeitMessage, _sender, _sendResponse) => {
    if (msg.command === 'autofill-all') {
      autofillFormFields().catch(error => {
        console.error('[Gofakeit Autofill] Error during autofill:', error);
      });
    } else if (msg.command === 'autofill-selected') {
      enableSelectionMode();
    } else if (msg.command === 'random-name') {
      const name = await fetchGofakeitData('name');
      alert(`Random Name: ${name || 'Failed to fetch'}`);
    } else if (msg.command === 'random-email') {
      const email = await fetchGofakeitData('email');
      alert(`Random Email: ${email || 'Failed to fetch'}`);
    }
  });

})();
