import { Autofill, AutofillSettings } from 'gofakeit';
import { Selection } from './selection';
import { Notification } from './notifications';
import './styles.css';

// Initialize single notification instance and export it
export const notification = new Notification();

// Initialize gofakeit autofill instance with storage values
let autofillInstance: Autofill;

// Message interface for communication between popup and content script
interface GofakeitMessage {
  command: 'autofill-all' | 'autofill-selected' | 'ping' | 'context-menu';
  function?: string;
}

// Get Settings
async function getSettings(): Promise<AutofillSettings> {
  const [mode, stagger, badges] = await Promise.all([
    storage.getItem<string>('sync:gofakeitMode') ?? 'auto',
    storage.getItem<number>('sync:gofakeitStagger') ?? 50,
    storage.getItem<number>('sync:gofakeitBadges') ?? 3000
  ]);

  return {
    mode: mode as 'auto' | 'manual',
    stagger: stagger ?? 50,
    badges: badges ?? 3000,
    debug: false
  };
}

// Helper function to show autofill results notifications
function showAutofillResults(result: any, context: string = 'form fields'): void {
  if (result.success === 0 && result.failed === 0) {
    // No fields found - show info and stop
    notification.show('info', `ℹ️ No fillable ${context} found`);
  } else {
    // Fields were found and processed - show detailed results
    if (result.success > 0 && result.failed === 0) {
      notification.show('success', `✅ Successfully filled ${result.success} ${context}${result.success === 1 ? '' : 's'}!`);
    } else if (result.success > 0 && result.failed > 0) {
      notification.show('warning', `⚠️ Filled ${result.success} ${context}${result.success === 1 ? '' : 's'}, ${result.failed} failed`);
    } else if (result.failed > 0) {
      notification.show('error', `❌ Failed to fill ${result.failed} ${context}${result.failed === 1 ? '' : 's'}`);
    }
  }
}

// Check if element is a form element
function isFormElement(element: Element): boolean {
  return element instanceof HTMLInputElement || 
         element instanceof HTMLTextAreaElement || 
         element instanceof HTMLSelectElement;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  // runAt: 'document_idle',  // Wait for DOM to be ready (default)
  // runAt: 'document_start', // Run as early as possible
  // runAt: 'document_end',   // Run after DOM is parsed
  async main() {
    const settings = await getSettings();
    // Initialize autofill instance and get settings
    autofillInstance = new Autofill(settings);
   
    // Handle context menu function application
    async function handleContextMenuFunction(funcName: string): Promise<void> {
      // Use the last right-clicked element (can be any element now)
      let targetElement = lastRightClickedElement;
      
      // Fallback to focused element if no right-clicked element
      if (!targetElement) {
        targetElement = document.activeElement as HTMLElement;
      }
      
      // Final fallback: find any form element on the page
      if (!targetElement) {
        const allFormElements = document.querySelectorAll('input, textarea, select');
        if (allFormElements.length > 0) {
          targetElement = allFormElements[0] as HTMLElement;
        }
      }
      
      if (!targetElement) {
        notification.show('error', 'No element found to apply the function');
        return;
      }
      
      // Show initial feedback
      notification.show('info', `🔍 Applying ${funcName} function...`);
      
      const contextResult = await autofillInstance.fill(targetElement);
      
      // Show results with custom context for function application
      if (contextResult.success === 0 && contextResult.failed === 0) {
        notification.show('info', `ℹ️ No fillable form fields found to apply ${funcName} function`);
      } else {
        if (contextResult.success > 0 && contextResult.failed === 0) {
          notification.show('success', `✅ Applied ${funcName} function successfully to ${contextResult.success} field${contextResult.success === 1 ? '' : 's'}`);
        } else if (contextResult.success > 0 && contextResult.failed > 0) {
          notification.show('warning', `⚠️ Applied ${funcName} to ${contextResult.success} field${contextResult.success === 1 ? '' : 's'}, ${contextResult.failed} failed`);
        } else if (contextResult.failed > 0) {
          notification.show('error', `❌ Failed to apply ${funcName} function to ${contextResult.failed} field${contextResult.failed === 1 ? '' : 's'}`);
        }
      }
    }

    // Track the last right-clicked element
    let lastRightClickedElement: HTMLElement | null = null;

    // Prevent duplicate initialization
    if ((window as any).gofakeitExtensionInjected) {
      console.log('[Gofakeit] Content script already initialized, skipping');
      return;
    }
    (window as any).gofakeitExtensionInjected = true; // Mark as initialized

    // Track right-clicks on any element
    document.addEventListener('contextmenu', (event) => {
      const target = event.target as HTMLElement;
      lastRightClickedElement = target;
    }, true);

    // Message listener for handling commands from popup and background script
    chrome.runtime.onMessage.addListener(async (msg: GofakeitMessage, _sender, sendResponse) => {
      try {
        switch (msg.command) {
          // Health check command - confirms content script is loaded and responsive
          case 'ping':
            sendResponse({ status: 'ok' });
            break;
          
          // Autofill all form elements on the current page
          case 'autofill-all':
            // Get latest settings from storage and update autofill instance
            const allSettings = await getSettings();
            autofillInstance.updateSettings(allSettings);
            
            // Show initial feedback
            notification.show('info', '🔍 Scanning for form fields...');
            
            // Perform autofill on all form elements
            const allResult = await autofillInstance.fill();
            
            // Show results using helper function
            showAutofillResults(allResult, 'form field');
            break;
          
          // Enable selection mode for targeted autofill
          case 'autofill-selected':
            // Get latest settings from storage
            const selectedSettings = await getSettings();
            
            // Create selection instance with current settings and notification
            const selection = new Selection({
              mode: selectedSettings.mode as 'auto' | 'manual',
              notification: notification
            });
            
            // Enable selection mode with callback for when element is selected
            await selection.enableSelectionMode(async (element: HTMLElement) => {
              // Show initial feedback
              notification.show('info', '🔍 Scanning selected area...');
              
              // Update autofill settings and fill the selected element
              autofillInstance.updateSettings(selectedSettings);
              const selectedResult = await autofillInstance.fill(element);
              
              // Show results using helper function
              showAutofillResults(selectedResult, 'form field');
            });
            break;
          
          // Handle context menu function application
          case 'context-menu':
            if (msg.function) {
              await handleContextMenuFunction(msg.function);
            }
            break;
          
          // Handle unknown commands gracefully
          default:
            console.warn('[Gofakeit] Unknown command received:', msg.command);
            break;
        }
      } catch (error) {
        // Handle any errors that occur during message processing
        console.error('[Gofakeit] Error processing message:', error);
        notification.show('error', `Error processing command: ${error}`);
      }
    });
  }
});
