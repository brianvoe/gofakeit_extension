// Autofill Options Modal
export class AutofillOptions {
  private modal: HTMLElement;
  private modeToggle: HTMLInputElement;
  private staggerRange: HTMLInputElement;
  private badgesRange: HTMLInputElement;
  private staggerValue: HTMLElement;
  private badgesValue: HTMLElement;
  private closeBtn: HTMLButtonElement;

  constructor() {
    this.modal = document.getElementById('autofill-options-modal')!;
    this.modeToggle = document.getElementById('modal-toggle-mode') as HTMLInputElement;
    this.staggerRange = document.getElementById('modal-range-stagger') as HTMLInputElement;
    this.badgesRange = document.getElementById('modal-range-badges') as HTMLInputElement;
    this.staggerValue = document.getElementById('stagger-value')!;
    this.badgesValue = document.getElementById('badges-value')!;
    this.closeBtn = document.getElementById('autofill-options-close') as HTMLButtonElement;

    this.setupEventListeners();
    this.loadSettings().catch(console.error);
  }

  private setupEventListeners(): void {
    // Open modal
    document.getElementById('autofill-options')?.addEventListener('click', async () => {
      await this.openModal();
    });

    // Close modal
    this.closeBtn.addEventListener('click', () => this.closeModal());
    
    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal || (e.target as HTMLElement).classList.contains('modal-overlay')) {
        this.closeModal();
      }
    });


    // Update range value displays and auto-save
    this.staggerRange.addEventListener('input', async () => {
      this.updateRangeDisplay('stagger');
      await this.saveSettings();
    });

    this.badgesRange.addEventListener('input', async () => {
      this.updateRangeDisplay('badges');
      await this.saveSettings();
    });

    // Auto-save mode toggle changes
    this.modeToggle.addEventListener('change', async () => {
      await this.saveSettings();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  private async openModal(): Promise<void> {
    await this.loadSettings();
    this.modal.classList.add('active');
  }

  private closeModal(): void {
    this.modal.classList.remove('active');
  }

  private formatTimeValue(value: number): string {
    if (value >= 1000) {
      const seconds = value / 1000;
      return `${seconds.toFixed(1)}s`;
    }
    return `${value}ms`;
  }

  private updateRangeDisplay(type: 'stagger' | 'badges'): void {
    const range = type === 'stagger' ? this.staggerRange : this.badgesRange;
    const valueElement = type === 'stagger' ? this.staggerValue : this.badgesValue;
    const value = parseInt(range.value);
    valueElement.textContent = this.formatTimeValue(value);
  }

  private async loadSettings(): Promise<void> {
    try {
      const [mode, stagger, badges] = await Promise.all([
        storage.getItem<string>('sync:gofakeitMode') ?? 'auto',
        storage.getItem<number>('sync:gofakeitStagger') ?? 50,
        storage.getItem<number>('sync:gofakeitBadges') ?? 3000
      ]);

      this.modeToggle.checked = mode === 'auto';
      this.staggerRange.value = (stagger ?? 50).toString();
      this.badgesRange.value = (badges ?? 3000).toString();
      this.updateRangeDisplay('stagger');
      this.updateRangeDisplay('badges');
    } catch (error) {
      console.error('Failed to load autofill settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const modeValue = this.modeToggle.checked ? 'auto' : 'manual';
      await storage.setItems([
        { key: 'sync:gofakeitMode', value: modeValue },
        { key: 'sync:gofakeitStagger', value: parseInt(this.staggerRange.value) },
        { key: 'sync:gofakeitBadges', value: parseInt(this.badgesRange.value) }
      ]);

      // Update the main toggle to match the modal setting
      const mainToggle = document.getElementById('toggle-fallback') as HTMLInputElement;
      if (mainToggle) {
        mainToggle.checked = this.modeToggle.checked;
      }
    } catch (error) {
      console.error('Failed to save autofill settings:', error);
    }
  }
}
