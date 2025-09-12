import { fetchFunc } from 'gofakeit';

// UUID Generator functionality
export class UuidGenerator {
  private modal: HTMLElement;
  private uuidOutput: HTMLInputElement;
  private generateBtn: HTMLButtonElement;
  private copyBtn: HTMLButtonElement;
  private openBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private debounceTimer: number | null = null;
  private scrambleInterval: number | null = null;
  private targetUuid: string = '';
  private currentUuid: string = '';
  private characterPositions: number[] = [];
  private animationStartTime: number = 0;

  constructor() {
    this.modal = document.getElementById("uuid-modal") as HTMLElement;
    this.uuidOutput = document.getElementById(
      "uuid-output"
    ) as HTMLInputElement;
    this.generateBtn = document.getElementById(
      "generate-uuid"
    ) as HTMLButtonElement;
    this.copyBtn = document.getElementById("copy-uuid") as HTMLButtonElement;
    this.openBtn = document.getElementById(
      "open-uuid-modal"
    ) as HTMLButtonElement;
    this.closeBtn = document.getElementById(
      "close-uuid-modal"
    ) as HTMLButtonElement;

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Modal open/close
    this.openBtn.addEventListener("click", () => {
      this.openModal();
    });

    this.closeBtn.addEventListener("click", () => {
      this.closeModal();
    });

    // Close modal when clicking outside
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal.classList.contains("active")) {
        this.closeModal();
      }
    });

    // Generate UUID button
    this.generateBtn.addEventListener("click", async () => {
      this.generateBtn.style.backgroundColor = 'var(--gfi-secondary)';
      
      await this.generateUuid();
      
      setTimeout(() => {
        this.generateBtn.style.backgroundColor = '';
      }, 500);
    });

    // Copy UUID button
    this.copyBtn.addEventListener("click", () => {
      this.copyUuid();
    });
  }

  private openModal(): void {
    this.modal.classList.add("active");
    // Focus the first input for better accessibility
    this.uuidOutput.focus();
    // Generate UUID immediately when modal opens
    this.generateUuid();
  }

  private closeModal(): void {
    this.modal.classList.remove("active");
  }

  private async generateUuid(): Promise<void> {
    try {
      // Start scramble animation
      this.startScrambleAnimation();
      
      // Use gofakeit plugin's fetchFunc - uuid function takes no parameters
      const result = await fetchFunc('uuid');

      if (result.success && result.data) {
        // Stop animation and reveal final UUID
        this.revealUuid(result.data);
      } else {
        this.stopScrambleAnimation();
        throw new Error(result.error || 'Failed to generate UUID');
      }
    } catch (error) {
      console.error("[Gofakeit] Error generating UUID:", error);
      this.stopScrambleAnimation();
      this.uuidOutput.value = "Error generating UUID";
      this.uuidOutput.style.color = 'var(--gofakeit-error)';
    }
  }

  private async copyUuid(): Promise<void> {
    if (
      !this.uuidOutput.value ||
      this.uuidOutput.value === "Error generating UUID"
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.uuidOutput.value);
      
      // Clear text feedback
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = 'Copied!';
      
      setTimeout(() => {
        this.copyBtn.textContent = originalText;
      }, 1200);
    } catch (error) {
      console.error("Failed to copy UUID:", error);
    }
  }

  private startScrambleAnimation(): void {
    const characters = '0123456789abcdef-';
    
    // Clear any existing animation
    this.stopScrambleAnimation();
    
    // Record animation start time
    this.animationStartTime = Date.now();
    
    // Initialize with random characters (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    this.currentUuid = '';
    this.characterPositions = [];
    
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        this.currentUuid += '-';
        this.characterPositions.push(16); // Index for '-'
      } else {
        const randomChar = characters[Math.floor(Math.random() * 16)]; // 0-9, a-f
        this.currentUuid += randomChar;
        this.characterPositions.push(characters.indexOf(randomChar));
      }
    }
    
    this.uuidOutput.value = this.currentUuid;
    this.uuidOutput.style.color = 'var(--gfi-info)';
    
    // Add smooth transition for progressive glow
    this.uuidOutput.style.transition = 'box-shadow 0.1s ease-out';
    
    // Start the flip animation
    this.scrambleInterval = window.setInterval(() => {
      let hasChanges = false;
      let newUuid = '';
      
      for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
          newUuid += '-';
        } else {
          // If we don't have a target yet, just keep flipping randomly
          if (!this.targetUuid) {
            this.characterPositions[i] = (this.characterPositions[i] + 1) % 16;
            newUuid += characters[this.characterPositions[i]];
            hasChanges = true;
          } else {
            // If we have a target, flip towards it
            const targetChar = this.targetUuid[i];
            const targetIndex = characters.indexOf(targetChar);
            const currentIndex = this.characterPositions[i];
            
            if (currentIndex !== targetIndex) {
              // Move towards target character
              if (currentIndex < targetIndex) {
                this.characterPositions[i] = (currentIndex + 1) % 16;
              } else {
                this.characterPositions[i] = (currentIndex - 1 + 16) % 16;
              }
              newUuid += characters[this.characterPositions[i]];
              hasChanges = true;
            } else {
              newUuid += characters[currentIndex];
            }
          }
        }
      }
      
      this.currentUuid = newUuid;
      this.uuidOutput.value = this.currentUuid;
      
      // Progressive glow during animation
      this.updateProgressiveGlow();
      
      // If no changes and we have a target, we're done
      if (!hasChanges && this.targetUuid) {
        this.stopScrambleAnimation();
        this.revealUuidImmediately(this.targetUuid);
      }
    }, 60); // Match password generator speed
  }

  private updateProgressiveGlow(): void {
    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(elapsed / 1000, 1); // 1 second to reach full glow
    
    // Calculate glow intensity based on progress
    const glowIntensity = progress * 0.6; // Max 0.6 opacity
    const glowSize = 5 + (progress * 10); // 5px to 15px blur
    
    this.uuidOutput.style.boxShadow = `0 0 ${glowSize}px rgba(255, 160, 0, ${glowIntensity})`;
  }

  private stopScrambleAnimation(): void {
    if (this.scrambleInterval) {
      clearInterval(this.scrambleInterval);
      this.scrambleInterval = null;
    }
  }

  private revealUuid(finalUuid: string): void {
    // Set the target UUID - the animation will automatically flip to it
    this.targetUuid = finalUuid;
  }

  private revealUuidImmediately(finalUuid: string): void {
    // This is called when the animation completes - immediate success glow!
    this.uuidOutput.style.color = '';
    
    // BIG SUCCESS GLOW! 🎉 - happens immediately when last character completes
    this.uuidOutput.style.transition = 'box-shadow 0.3s ease-out';
    this.uuidOutput.style.boxShadow = '0 0 25px rgba(255, 160, 0, 0.8), 0 0 50px rgba(255, 160, 0, 0.4)';
    
    // Hold the big glow for a moment, then fade away
    setTimeout(() => {
      this.uuidOutput.style.transition = 'box-shadow 1.5s ease-in-out';
      this.uuidOutput.style.boxShadow = '0 0 0px rgba(255, 160, 0, 0)';
      
      // Remove transition after animation completes
      setTimeout(() => {
        this.uuidOutput.style.transition = '';
      }, 1500);
    }, 800); // Hold the success glow for 800ms
  }
}
