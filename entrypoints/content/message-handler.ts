import { AutofillService } from './autofill-service';
import { Selection } from './selection';
import { Notification } from './notifications';

// Message interface for communication between popup and content script
interface GofakeitMessage {
  command: 'autofill-all' | 'autofill-selection' | 'ping' | 'context-menu';
  function?: string;
}

// Message handler service for managing communication
export class MessageHandler {
  private autofillService: AutofillService;
  private notification: Notification;
  private lastRightClickedElement: HTMLElement | null = null;
  private context: any;

  constructor(notification: Notification, context: any) {
    this.notification = notification;
    this.context = context;
    this.autofillService = new AutofillService(notification);
    this.setupEventListeners();
  }

  // Setup event listeners using context-aware listeners
  private setupEventListeners(): void {
    // Track right-clicks on any element using context-aware listener
    this.context.addEventListener(document, 'contextmenu', (event: Event) => {
      const target = event.target as HTMLElement;
      this.lastRightClickedElement = target;
    }, true);
  }

  // Handle incoming messages
  async handleMessage(msg: GofakeitMessage, _sender: any, sendResponse: any): Promise<void> {
    // Check if context is still valid before processing
    if (this.context.isInvalid) {
      console.log('[Gofakeit] Extension context invalidated, stopping message processing');
      return;
    }

    try {
      switch (msg.command) {
        case 'ping':
          sendResponse({ status: 'ok' });
          break;
        
        case 'autofill-all':
          await this.autofillService.autofillAll();
          break;
        
        case 'autofill-selection':
          await this.handleAutofillSelected();
          break;
        
        case 'context-menu':
          if (msg.function) {
            await this.handleContextMenuFunction(msg.function);
          }
          break;
        
        default:
          console.warn('[Gofakeit] Unknown command received:', msg.command);
          break;
      }
    } catch (error) {
      this.notification.show('error', `Error processing command: ${error}`);
    }
  }

  // Handle autofill selected mode
  private async handleAutofillSelected(): Promise<void> {
    const settings = await this.autofillService.getSettings();
    
    const selection = new Selection({
      mode: settings.mode as 'auto' | 'manual',
      notification: this.notification
    });
    
    await selection.enableSelectionMode(async (element: HTMLElement) => {
      await this.autofillService.autofillSelected(element);
    });
  }

  // Handle context menu function application
  private async handleContextMenuFunction(funcName: string): Promise<void> {
    // Use the last right-clicked element (can be any element now)
    let targetElement = this.lastRightClickedElement;
    
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
      this.notification.show('error', 'No element found to apply the function');
      return;
    }
    
    await this.autofillService.applyContextMenuFunction(funcName, targetElement);
  }
}
