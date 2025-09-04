// Password Generator functionality
export class PasswordGenerator {
  private modal: HTMLElement;
  private passwordOutput: HTMLInputElement;
  private lengthSlider: HTMLInputElement;
  private lengthValue: HTMLElement;
  private includeUppercase: HTMLInputElement;
  private includeLowercase: HTMLInputElement;
  private includeNumbers: HTMLInputElement;
  private includeSymbols: HTMLInputElement;
  private generateBtn: HTMLButtonElement;
  private copyBtn: HTMLButtonElement;
  private openBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;

  constructor() {
    this.modal = document.getElementById('password-modal') as HTMLElement;
    this.passwordOutput = document.getElementById('password-output') as HTMLInputElement;
    this.lengthSlider = document.getElementById('password-length') as HTMLInputElement;
    this.lengthValue = document.getElementById('length-value') as HTMLElement;
    this.includeUppercase = document.getElementById('include-uppercase') as HTMLInputElement;
    this.includeLowercase = document.getElementById('include-lowercase') as HTMLInputElement;
    this.includeNumbers = document.getElementById('include-numbers') as HTMLInputElement;
    this.includeSymbols = document.getElementById('include-symbols') as HTMLInputElement;
    this.generateBtn = document.getElementById('generate-password') as HTMLButtonElement;
    this.copyBtn = document.getElementById('copy-password') as HTMLButtonElement;
    this.openBtn = document.getElementById('open-password-modal') as HTMLButtonElement;
    this.closeBtn = document.getElementById('close-password-modal') as HTMLButtonElement;

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Modal open/close
    this.openBtn.addEventListener('click', () => {
      this.openModal();
    });

    this.closeBtn.addEventListener('click', () => {
      this.closeModal();
    });

    // Close modal when clicking outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.closeModal();
      }
    });

    // Update length display when slider changes
    this.lengthSlider.addEventListener('input', () => {
      this.lengthValue.textContent = this.lengthSlider.value;
    });

    // Generate password button
    this.generateBtn.addEventListener('click', async () => {
      this.generateBtn.disabled = true;
      this.generateBtn.textContent = 'Generating...';
      await this.generatePassword();
      this.generateBtn.disabled = false;
      this.generateBtn.textContent = 'Generate Password';
    });

    // Copy password button
    this.copyBtn.addEventListener('click', () => {
      this.copyPassword();
    });

    // Ensure at least one character type is selected
    [this.includeUppercase, this.includeLowercase, this.includeNumbers, this.includeSymbols].forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.validateOptions();
      });
    });
  }

  private openModal(): void {
    this.modal.classList.add('active');
    // Focus the first input for better accessibility
    this.passwordOutput.focus();
  }

  private closeModal(): void {
    this.modal.classList.remove('active');
  }

  private validateOptions(): void {
    const hasValidOptions = this.includeUppercase.checked || 
                           this.includeLowercase.checked || 
                           this.includeNumbers.checked || 
                           this.includeSymbols.checked;

    this.generateBtn.disabled = !hasValidOptions;
    
    if (!hasValidOptions) {
      this.passwordOutput.value = 'Please select at least one character type';
      this.passwordOutput.style.color = 'var(--gofakeit-error)';
    } else {
      this.passwordOutput.style.color = '';
    }
  }

  private async generatePassword(): Promise<void> {
    try {
      // Build query parameters based on user selections
      const params = new URLSearchParams();
      
      params.append('lower', this.includeLowercase.checked.toString());
      params.append('upper', this.includeUppercase.checked.toString());
      params.append('numeric', this.includeNumbers.checked.toString());
      params.append('special', this.includeSymbols.checked.toString());
      params.append('space', 'false'); // We don't have a space option in UI, default to false
      params.append('length', this.lengthSlider.value);
      
      // Fetch password from Gofakeit API
      const response = await fetch(`https://api.gofakeit.com/funcs/password?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const password = await response.text();
      this.passwordOutput.value = password;
      this.passwordOutput.style.color = '';
      
    } catch (error) {
      console.error('[Gofakeit] Error generating password:', error);
      this.passwordOutput.value = 'Error generating password';
      this.passwordOutput.style.color = 'var(--gofakeit-error)';
    }
  }

  private async copyPassword(): Promise<void> {
    if (!this.passwordOutput.value || this.passwordOutput.value === 'Please select at least one character type') {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.passwordOutput.value);
      
      // Visual feedback
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = 'Copied!';
      this.copyBtn.style.backgroundColor = 'var(--gofakeit-success)';
      
      setTimeout(() => {
        this.copyBtn.textContent = originalText;
        this.copyBtn.style.backgroundColor = '';
      }, 200);
    } catch (error) {
      console.error('Failed to copy password:', error);
      this.copyBtn.textContent = 'Failed';
      this.copyBtn.style.backgroundColor = 'var(--gofakeit-error)';
      
      setTimeout(() => {
        this.copyBtn.textContent = 'Copy';
        this.copyBtn.style.backgroundColor = '';
      }, 200);
    }
  }
}
