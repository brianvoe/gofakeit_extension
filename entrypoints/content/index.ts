import { autofillAll, autofillElement } from './autofill';
import { enableSelectionMode } from './selection';
import { showNotification } from './notifications';

import './styles.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Message interface for communication between popup and content script
    interface GofakeitMessage {
      command: 'autofill-all' | 'autofill-selected' | 'ping' | 'context-menu';
      function?: string;
    }

    // Handle context menu function application
    async function handleContextMenuFunction(funcName: string): Promise<void> {
      try {
        // Use the last right-clicked element if available
        let targetElement = lastRightClickedElement;
        
        // Fallback to focused element if no right-clicked element
        if (!targetElement || !isFormElement(targetElement)) {
          targetElement = document.activeElement as HTMLElement;
        }
        
        // Final fallback: find any form element
        if (!targetElement || !isFormElement(targetElement)) {
          const allFormElements = document.querySelectorAll('input, textarea, select');
          if (allFormElements.length > 0) {
            targetElement = allFormElements[0] as HTMLElement;
            targetElement.focus();
          }
        }
        
        if (!targetElement || !isFormElement(targetElement)) {
          showNotification('Please right-click on a form field to apply the function', 'error');
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

    // Track the last right-clicked element
    let lastRightClickedElement: HTMLElement | null = null;

    // Check if already initialized - use a more robust check
    if (typeof window !== 'undefined' && (window as any).gofakeitExtensionInjected) {
      console.log('[Gofakeit] Content script already initialized, skipping');
      return;
    }

    // Mark as initialized
    if (typeof window !== 'undefined') {
      (window as any).gofakeitExtensionInjected = true;
    }

    // Track right-clicks on form elements
    document.addEventListener('contextmenu', (event) => {
      const target = event.target as HTMLElement;
      if (isFormElement(target)) {
        lastRightClickedElement = target;
      }
    }, true);

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
  }
});
