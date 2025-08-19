import { GofakeitMessage } from './types';
import { autofillAll, autofillElement } from './autofill';
import { enableSelectionMode } from './selection';
import { showNotification } from './notifications';

// Do not inject shared stylesheet into pages to avoid style conflicts
function injectCSSStyles(): void {
  // Intentionally left blank
}

// Handle context menu function application
async function handleContextMenuFunction(funcName: string): Promise<void> {
  try {
    // Only target the currently focused element
    const targetElement = document.activeElement;
    
    if (!targetElement || !isFormElement(targetElement)) {
      showNotification('Please focus on a form field first, then right-click to apply the function', 'error');
      return;
    }
    
    // Set the data-gofakeit attribute and apply the function
    targetElement.setAttribute('data-gofakeit', funcName);
    const success = await autofillElement(targetElement);
    
    if (success) {
      showNotification(`Applied ${funcName} function successfully`, 'success');
    } else {
      showNotification(`Failed to apply ${funcName} function`, 'error');
    }
    
  } catch (error) {
    console.error('[Gofakeit] Error applying context menu function:', error);
    showNotification(`Error applying ${funcName} function`, 'error');
  }
}

// Check if element is a form element
function isFormElement(element: Element): boolean {
  return element instanceof HTMLInputElement || 
         element instanceof HTMLTextAreaElement || 
         element instanceof HTMLSelectElement;
}

// Wrap everything in an IIFE to prevent global scope pollution
(function() {
  // Check if already initialized - use a more robust check
  if (typeof window !== 'undefined' && (window as any).gofakeitExtensionInjected) {
    console.log('[Gofakeit] Content script already initialized, skipping');
    return;
  }

  // Mark as initialized
  if (typeof window !== 'undefined') {
    (window as any).gofakeitExtensionInjected = true;
  }

  // Do not inject global CSS into the host page
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
        console.error('[Gofakeit] Error during autofill:', error);
      });
    } else if (msg.command === 'autofill-selected') {
      enableSelectionMode();
    } else if (msg.command === 'context-menu') {
      if (msg.function) {
        await handleContextMenuFunction(msg.function);
      }
    }
  });

})();
