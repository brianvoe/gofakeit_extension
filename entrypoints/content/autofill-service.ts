import { Autofill, AutofillSettings, AutofillStatus } from 'gofakeit';
import { Notification } from './notifications';

// Autofill service class for managing autofill operations
export class AutofillService {
  private autofillInstance: Autofill;
  private notification: Notification;
  private lastAutofillElements: any[] = [];

  constructor(notification: Notification) {
    this.notification = notification;
    this.autofillInstance = new Autofill(this.getDefaultSettings());
  }

  // Get default autofill settings
  private getDefaultSettings(): AutofillSettings {
    return {
      mode: 'auto',
      stagger: 50,
      badges: 3000,
      debug: false,
      onStatusChange: (status: AutofillStatus, elements: any[]) => {
        switch (status) {
          case AutofillStatus.FOUND:
            if (elements.length > 0) {
              this.notification.show('info', `Found ${elements.length} fillable field${elements.length === 1 ? '' : 's'}`);
            } else {
              this.notification.show('error', 'No fillable fields found');
            }
            break;
          case AutofillStatus.COMPLETED:
            this.lastAutofillElements = elements;
            this.showAutofillResults(elements, 'form field');
            break;
          case AutofillStatus.ERROR:
            this.notification.show('error', 'An error occurred during autofill');
            break;
        }
      }
    };
  }

  // Get settings from storage
  async getSettings(): Promise<AutofillSettings> {
    const [mode, stagger, badges] = await Promise.all([
      storage.getItem<string>('sync:gofakeitMode') ?? 'auto',
      storage.getItem<number>('sync:gofakeitStagger') ?? 50,
      storage.getItem<number>('sync:gofakeitBadges') ?? 3000
    ]);

    return {
      mode: mode as 'auto' | 'manual',
      stagger: stagger ?? 50,
      badges: badges ?? 3000,
      debug: false,
      onStatusChange: (status: AutofillStatus, elements: any[]) => {
        switch (status) {
          case AutofillStatus.FOUND:
            if (elements.length > 0) {
              this.notification.show('info', `Found ${elements.length} fillable field${elements.length === 1 ? '' : 's'}`);
            } else {
              this.notification.show('error', 'No fillable fields found');
            }
            break;
          case AutofillStatus.COMPLETED:
            this.lastAutofillElements = elements;
            this.showAutofillResults(elements, 'form field');
            break;
          case AutofillStatus.ERROR:
            this.notification.show('error', 'An error occurred during autofill');
            break;
        }
      }
    };
  }

  // Show autofill results notifications
  showAutofillResults(elements: any[], context: string = 'form fields'): void {
    if (elements.length === 0) {
      this.notification.show('error', `No fillable ${context} found`);
    } else {
      const successful = elements.filter(el => el.value && !el.error).length;
      const failed = elements.filter(el => el.error).length;
      
      if (successful > 0 && failed === 0) {
        this.notification.show('success', `✅ Successfully filled ${successful} ${context}${successful === 1 ? '' : 's'}!`);
      } else if (successful > 0 && failed > 0) {
        this.notification.show('warning', `⚠️ Filled ${successful} ${context}${successful === 1 ? '' : 's'}, ${failed} failed`);
      } else if (failed > 0) {
        this.notification.show('error', `❌ Failed to fill ${failed} ${context}${failed === 1 ? '' : 's'}`);
      }
    }
  }

  // Autofill all form elements
  async autofillAll(): Promise<void> {
    const settings = await this.getSettings();
    this.autofillInstance = new Autofill(settings);
    
    await this.autofillInstance.fill();
  }

  // Autofill selected element
  async autofillSelected(element: HTMLElement): Promise<void> {
    const settings = await this.getSettings();
    this.autofillInstance = new Autofill(settings);
    
    await this.autofillInstance.fill(element);
  }

  // Apply context menu function to element
  async applyContextMenuFunction(funcName: string, targetElement: HTMLElement): Promise<void> {
    this.notification.show('info', `🔍 Applying ${funcName} function...`);
    
    const settings = await this.getSettings();
    this.autofillInstance = new Autofill(settings);
    
    // Pass the function name to the fill method
    await this.autofillInstance.fill(targetElement, funcName);
  }
}
