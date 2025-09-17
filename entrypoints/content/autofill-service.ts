import { Autofill, AutofillSettings } from 'gofakeit';
import { Notification } from './notifications';

// Autofill service class for managing autofill operations
export class AutofillService {
  private autofillInstance: Autofill;
  private notification: Notification;

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
      onStatusChange: (status: any, elements: any[]) => {
        switch (status) {
          case 'found':
            if (elements.length > 0) {
              this.notification.show('info', `Found ${elements.length} fillable field${elements.length === 1 ? '' : 's'}`);
            } else {
              this.notification.show('error', 'No fillable fields found');
            }
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
      onStatusChange: (status: any, elements: any[]) => {
        switch (status) {
          case 'found':
            if (elements.length > 0) {
              this.notification.show('info', `Found ${elements.length} fillable field${elements.length === 1 ? '' : 's'}`);
            } else {
              this.notification.show('error', 'No fillable fields found');
            }
            break;
        }
      }
    };
  }

  // Show autofill results notifications
  showAutofillResults(result: any, context: string = 'form fields'): void {
    if (result.success === 0 && result.failed === 0) {
      this.notification.show('error', `No fillable ${context} found`);
    } else {
      if (result.success > 0 && result.failed === 0) {
        this.notification.show('success', `✅ Successfully filled ${result.success} ${context}${result.success === 1 ? '' : 's'}!`);
      } else if (result.success > 0 && result.failed > 0) {
        this.notification.show('warning', `⚠️ Filled ${result.success} ${context}${result.success === 1 ? '' : 's'}, ${result.failed} failed`);
      } else if (result.failed > 0) {
        this.notification.show('error', `❌ Failed to fill ${result.failed} ${context}${result.failed === 1 ? '' : 's'}`);
      }
    }
  }

  // Autofill all form elements
  async autofillAll(): Promise<void> {
    const settings = await this.getSettings();
    this.autofillInstance.updateSettings(settings);
    
    const result = await this.autofillInstance.fill();
    this.showAutofillResults(result, 'form field');
  }

  // Autofill selected element
  async autofillSelected(element: HTMLElement): Promise<void> {
    const settings = await this.getSettings();
    this.autofillInstance.updateSettings(settings);
    
    const result = await this.autofillInstance.fill(element);
    this.showAutofillResults(result, 'form field');
  }

  // Apply context menu function to element
  async applyContextMenuFunction(funcName: string, targetElement: HTMLElement): Promise<void> {
    this.notification.show('info', `🔍 Applying ${funcName} function...`);
    
    // Pass the function name to the fill method
    const result = await this.autofillInstance.fill(targetElement, funcName);
    
    if (result.success === 0 && result.failed === 0) {
      this.notification.show('error', `No fillable form fields found to apply ${funcName} function`);
    } else {
      if (result.success > 0 && result.failed === 0) {
        this.notification.show('success', `✅ Applied ${funcName} function successfully to ${result.success} field${result.success === 1 ? '' : 's'}`);
      } else if (result.success > 0 && result.failed > 0) {
        this.notification.show('warning', `⚠️ Applied ${funcName} to ${result.success} field${result.success === 1 ? '' : 's'}, ${result.failed} failed`);
      } else if (result.failed > 0) {
        this.notification.show('error', `❌ Failed to apply ${funcName} function to ${result.failed} field${result.failed === 1 ? '' : 's'}`);
      }
    }
  }
}
