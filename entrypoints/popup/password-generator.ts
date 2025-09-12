import { fetchFunc } from 'gofakeit';

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
  private debounceTimer: number | null = null;

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
    this.loadSavedOptions();
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

    // Update length display when slider changes and debounce auto-generation
    this.lengthSlider.addEventListener('input', () => {
      this.lengthValue.textContent = this.lengthSlider.value;
      this.debouncedGeneratePassword();
    });

    // Generate password button
    this.generateBtn.addEventListener('click', async () => {
      this.generateBtn.style.backgroundColor = 'var(--gfi-secondary)';
      
      await this.generatePassword();
      
      setTimeout(() => {
        this.generateBtn.style.backgroundColor = '';
      }, 500);
    });

    // Copy password button
    this.copyBtn.addEventListener('click', () => {
      this.copyPassword();
    });

    // Ensure at least one character type is selected and auto-generate
    [this.includeUppercase, this.includeLowercase, this.includeNumbers, this.includeSymbols].forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.validateOptions();
        this.debouncedGeneratePassword();
        this.saveOptions();
      });
    });

    // Save options when length changes
    this.lengthSlider.addEventListener('input', () => {
      this.saveOptions();
    });
  }

  private openModal(): void {
    this.modal.classList.add('active');
    // Focus the first input for better accessibility
    this.passwordOutput.focus();
    // Generate password immediately when modal opens
    this.generatePassword();
  }

  private closeModal(): void {
    this.modal.classList.remove('active');
  }

  private debouncedGeneratePassword(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Set new timer for 300ms debounce
    this.debounceTimer = window.setTimeout(() => {
      this.generatePassword();
    }, 300);
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
      // Build parameters object for gofakeit fetchFunc
      const params = {
        lower: this.includeLowercase.checked,
        upper: this.includeUppercase.checked,
        numeric: this.includeNumbers.checked,
        special: this.includeSymbols.checked,
        space: false, // We don't have a space option in UI, default to false
        length: parseInt(this.lengthSlider.value),
      };
      
      // Start scramble animation
      this.startScrambleAnimation();
      
      // Use gofakeit plugin's fetchFunc
      const result = await fetchFunc('password', params);
      
      if (result.success && result.data) {
        // Stop animation and reveal final password
        this.revealPassword(result.data);
      } else {
        this.stopScrambleAnimation();
        throw new Error(result.error || 'Failed to generate password');
      }
      
    } catch (error) {
      console.error('[Gofakeit] Error generating password:', error);
      this.stopScrambleAnimation();
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
      
      // Clear text feedback
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = 'Copied!';
      
      setTimeout(() => {
        this.copyBtn.textContent = originalText;
      }, 1200);
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  }

  private scrambleInterval: number | null = null;
  private targetPassword: string = '';
  private currentPassword: string = '';
  private characterPositions: number[] = [];
  private animationStartTime: number = 0;

  private startScrambleAnimation(): void {
    const length = parseInt(this.lengthSlider.value);
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Clear any existing animation
    this.stopScrambleAnimation();
    
    // Record animation start time
    this.animationStartTime = Date.now();
    
    // Initialize with random characters
    this.currentPassword = '';
    this.characterPositions = [];
    
    for (let i = 0; i < length; i++) {
      this.currentPassword += characters[Math.floor(Math.random() * characters.length)];
      this.characterPositions.push(Math.floor(Math.random() * characters.length));
    }
    
    this.passwordOutput.value = this.currentPassword;
    this.passwordOutput.style.color = 'var(--gfi-info)';
    
    // Add smooth transition for progressive glow
    this.passwordOutput.style.transition = 'box-shadow 0.1s ease-out';
    
    // Start the flip animation
    this.scrambleInterval = window.setInterval(() => {
      let hasChanges = false;
      let newPassword = '';
      
      for (let i = 0; i < length; i++) {
        // If we don't have a target yet, just keep flipping randomly
        if (!this.targetPassword) {
          this.characterPositions[i] = (this.characterPositions[i] + 1) % characters.length;
          newPassword += characters[this.characterPositions[i]];
          hasChanges = true;
        } else {
          // If we have a target, flip towards it
          const targetChar = this.targetPassword[i];
          const targetIndex = characters.indexOf(targetChar);
          const currentIndex = this.characterPositions[i];
          
          if (currentIndex !== targetIndex) {
            // Move towards target character
            if (currentIndex < targetIndex) {
              this.characterPositions[i] = (currentIndex + 1) % characters.length;
            } else {
              this.characterPositions[i] = (currentIndex - 1 + characters.length) % characters.length;
            }
            newPassword += characters[this.characterPositions[i]];
            hasChanges = true;
          } else {
            newPassword += characters[currentIndex];
          }
        }
      }
      
      this.currentPassword = newPassword;
      this.passwordOutput.value = this.currentPassword;
      
      // Progressive glow during animation
      this.updateProgressiveGlow();
      
      // If no changes and we have a target, we're done
      if (!hasChanges && this.targetPassword) {
        this.stopScrambleAnimation();
        this.revealPasswordImmediately(this.targetPassword);
      }
    }, 30); // Much faster for quick testing
  }

  private updateProgressiveGlow(): void {
    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(elapsed / 1000, 1); // 1 second to reach full glow
    
    // Calculate glow intensity based on progress
    const glowIntensity = progress * 0.6; // Max 0.6 opacity
    const glowSize = 5 + (progress * 10); // 5px to 15px blur
    
    this.passwordOutput.style.boxShadow = `0 0 ${glowSize}px rgba(255, 160, 0, ${glowIntensity})`;
  }

  private stopScrambleAnimation(): void {
    if (this.scrambleInterval) {
      clearInterval(this.scrambleInterval);
      this.scrambleInterval = null;
    }
  }

  private revealPassword(finalPassword: string): void {
    // Set the target password - the animation will automatically flip to it
    this.targetPassword = finalPassword;
  }

  private revealPasswordImmediately(finalPassword: string): void {
    // This is called when the animation completes - immediate success glow!
    this.passwordOutput.style.color = '';
    
    // BIG SUCCESS GLOW! 🎉 - happens immediately when last character completes
    this.passwordOutput.style.transition = 'box-shadow 0.3s ease-out';
    this.passwordOutput.style.boxShadow = '0 0 25px rgba(255, 160, 0, 0.8), 0 0 50px rgba(255, 160, 0, 0.4)';
    
    // Hold the big glow for a moment, then fade away
    setTimeout(() => {
      this.passwordOutput.style.transition = 'box-shadow 1.5s ease-in-out';
      this.passwordOutput.style.boxShadow = '0 0 0px rgba(255, 160, 0, 0)';
      
      // Remove transition after animation completes
      setTimeout(() => {
        this.passwordOutput.style.transition = '';
      }, 1500);
    }, 800); // Hold the success glow for 800ms
  }

  private async saveOptions(): Promise<void> {
    try {
      const options = {
        length: parseInt(this.lengthSlider.value),
        includeUppercase: this.includeUppercase.checked,
        includeLowercase: this.includeLowercase.checked,
        includeNumbers: this.includeNumbers.checked,
        includeSymbols: this.includeSymbols.checked,
      };

      await storage.setItem('local:passwordGeneratorOptions', options);
    } catch (error) {
      console.error('Failed to save password generator options:', error);
    }
  }

  private async loadSavedOptions(): Promise<void> {
    try {
      const options = await storage.getItem<{
        length: number;
        includeUppercase: boolean;
        includeLowercase: boolean;
        includeNumbers: boolean;
        includeSymbols: boolean;
      }>('local:passwordGeneratorOptions');

      if (options) {
        // Restore length
        if (options.length) {
          this.lengthSlider.value = options.length.toString();
          this.lengthValue.textContent = options.length.toString();
        }

        // Restore checkboxes
        if (typeof options.includeUppercase === 'boolean') {
          this.includeUppercase.checked = options.includeUppercase;
        }
        if (typeof options.includeLowercase === 'boolean') {
          this.includeLowercase.checked = options.includeLowercase;
        }
        if (typeof options.includeNumbers === 'boolean') {
          this.includeNumbers.checked = options.includeNumbers;
        }
        if (typeof options.includeSymbols === 'boolean') {
          this.includeSymbols.checked = options.includeSymbols;
        }

        // Validate options after loading
        this.validateOptions();
      }
    } catch (error) {
      console.error('Failed to load password generator options:', error);
    }
  }
}
