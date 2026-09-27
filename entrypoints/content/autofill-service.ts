import {
  Autofill,
  AutofillElement,
  AutofillSettings,
  AutofillStatus,
} from 'gofakeit';
import { Notification } from './notifications';

export const DEFAULT_AUTOFILL_SETTINGS = {
  mode: 'auto',
  stagger: 50,
  badges: 3000,
  debug: false,
} as const;

export type AutofillSettingsValues = {
  mode: 'auto' | 'manual';
  stagger: number;
  badges: number;
  debug: boolean;
};

// Autofill service class for managing autofill operations
export class AutofillService {
  private autofillInstance: Autofill;
  private notification: Notification;
  private lastAutofillElements: AutofillElement[] = [];

  constructor(notification: Notification) {
    this.notification = notification;
    this.autofillInstance = new Autofill(
      this.buildSettings(DEFAULT_AUTOFILL_SETTINGS)
    );
  }

  // Build the gofakeit settings, wiring status/function callbacks to
  // notifications. Kept in one place so the defaults and the storage-backed
  // settings cannot drift apart.
  private buildSettings(values: AutofillSettingsValues): AutofillSettings {
    return {
      mode: values.mode,
      stagger: values.stagger,
      badges: values.badges,
      debug: values.debug,
      onStatusChange: (status: AutofillStatus, elements: AutofillElement[]) => {
        switch (status) {
          case AutofillStatus.FOUND:
            if (elements.length > 0) {
              this.notification.show(
                'info',
                `Found ${elements.length} fillable field${elements.length === 1 ? '' : 's'}`
              );
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
      },
      onFunctionDetermined: (element: AutofillElement, result) => {
        if (!values.debug) return;
        console.log(
          `[Gofakeit] ${element.name || element.id} -> ${element.function}`,
          {
            resolvedBy: element.resolvedBy,
            score: element.score,
            reasons: element.reasons ?? result?.reasons,
          }
        );
      },
    };
  }

  // Get settings from storage, falling back to defaults
  async getSettings(): Promise<AutofillSettings> {
    const [mode, stagger, badges, debug] = await Promise.all([
      storage.getItem<string>('sync:gofakeitMode'),
      storage.getItem<number>('sync:gofakeitStagger'),
      storage.getItem<number>('sync:gofakeitBadges'),
      storage.getItem<boolean>('sync:gofakeitDebug'),
    ]);

    return this.buildSettings({
      mode: (mode as 'auto' | 'manual') ?? DEFAULT_AUTOFILL_SETTINGS.mode,
      stagger: stagger ?? DEFAULT_AUTOFILL_SETTINGS.stagger,
      badges: badges ?? DEFAULT_AUTOFILL_SETTINGS.badges,
      debug: debug ?? DEFAULT_AUTOFILL_SETTINGS.debug,
    });
  }

  // Show autofill results notifications
  showAutofillResults(
    elements: AutofillElement[],
    context: string = 'form fields'
  ): void {
    if (elements.length === 0) {
      this.notification.show('error', `No fillable ${context} found`);
      return;
    }

    const successful = elements.filter(el => el.value && !el.error).length;
    const failed = elements.filter(el => el.error).length;

    if (successful > 0 && failed === 0) {
      this.notification.show(
        'success',
        `✅ Successfully filled ${successful} ${context}${successful === 1 ? '' : 's'}!`
      );
    } else if (successful > 0 && failed > 0) {
      this.notification.show(
        'warning',
        `⚠️ Filled ${successful} ${context}${successful === 1 ? '' : 's'}, ${failed} failed`
      );
    } else if (failed > 0) {
      this.notification.show(
        'error',
        `❌ Failed to fill ${failed} ${context}${failed === 1 ? '' : 's'}`
      );
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
  async applyContextMenuFunction(
    funcName: string,
    targetElement: HTMLElement
  ): Promise<void> {
    this.notification.show('info', `🔍 Applying ${funcName} function...`);

    const settings = await this.getSettings();
    this.autofillInstance = new Autofill(settings);

    // Pass the function name to the fill method
    await this.autofillInstance.fill(targetElement, funcName);
  }

  // Last elements processed, useful for diagnostics
  getLastAutofillElements(): AutofillElement[] {
    return this.lastAutofillElements;
  }
}
