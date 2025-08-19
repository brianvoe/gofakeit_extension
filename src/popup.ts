// Check if content script is already injected
async function isContentScriptInjected(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, { command: 'ping' });
    return true;
  } catch {
    return false;
  }
}

// Inject content script if not already injected
async function injectContentScriptIfNeeded(tabId: number): Promise<void> {
  const isInjected = await isContentScriptInjected(tabId);
  if (!isInjected) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }
}

const sendCommand = async (command: string) => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      // First, ensure the content script is injected
      await injectContentScriptIfNeeded(tab.id);
      
      // Then send the message
      await chrome.tabs.sendMessage(tab.id, { command });
      
      // Close the popup for interactive commands
      if (command === 'autofill-selected' || command === 'autofill-all') {
        window.close();
      }
    }
  } catch (error) {
    console.error('Error sending command:', error);
  }
};

// Set the correct SVG URL for the logo
const logoImg = document.querySelector('.header img') as HTMLImageElement;
if (logoImg) {
  logoImg.src = chrome.runtime.getURL('assets/images/full.svg');
}

document.getElementById('autofill-all')?.addEventListener('click', () => sendCommand('autofill-all'));
document.getElementById('autofill-selected')?.addEventListener('click', () => sendCommand('autofill-selected'));

// Settings: Smart-fill toggle persistence with chrome.storage
const fallbackToggle = document.getElementById('toggle-fallback') as HTMLInputElement | null;
if (fallbackToggle) {
  chrome.storage.sync.get({ gofakeitSmartFill: true }, (items) => {
    fallbackToggle!.checked = !!items.gofakeitSmartFill;
  });

  fallbackToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ gofakeitSmartFill: fallbackToggle!.checked });
  });
}

// Password Generator functionality
class PasswordGenerator {
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
      this.passwordOutput.style.color = '#ff6b6b';
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
      this.passwordOutput.style.color = '#ff6b6b';
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
      this.copyBtn.style.backgroundColor = '#4CAF50';
      
      setTimeout(() => {
        this.copyBtn.textContent = originalText;
        this.copyBtn.style.backgroundColor = '';
      }, 1000);
    } catch (error) {
      console.error('Failed to copy password:', error);
      this.copyBtn.textContent = 'Failed';
      this.copyBtn.style.backgroundColor = '#ff6b6b';
      
      setTimeout(() => {
        this.copyBtn.textContent = 'Copy';
        this.copyBtn.style.backgroundColor = '';
      }, 1000);
    }
  }
}

// Initialize password generator
new PasswordGenerator();

// Dice Generator functionality
class DiceGenerator {
  private modal: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container3d: HTMLElement;
  private diceCountSlider: HTMLInputElement;
  private diceCountValue: HTMLElement;
  private diceFacesSlider: HTMLInputElement;
  private diceFacesValue: HTMLElement;
  private rollBtn: HTMLButtonElement;
  private openBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private resultsText: HTMLElement;
  private totalText: HTMLElement;
  private animationId: number | null = null;
  private isRolling = false;

  constructor() {
    this.modal = document.getElementById('dice-modal') as HTMLElement;
    this.canvas = document.getElementById('dice-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.container3d = document.getElementById('dice-3d-container') as HTMLElement;
    this.diceCountSlider = document.getElementById('dice-count') as HTMLInputElement;
    this.diceCountValue = document.getElementById('dice-count-value') as HTMLElement;
    this.diceFacesSlider = document.getElementById('dice-faces') as HTMLInputElement;
    this.diceFacesValue = document.getElementById('dice-faces-value') as HTMLElement;
    this.rollBtn = document.getElementById('roll-dice') as HTMLButtonElement;
    this.openBtn = document.getElementById('open-dice-modal') as HTMLButtonElement;
    this.closeBtn = document.getElementById('close-dice-modal') as HTMLButtonElement;
    this.resultsText = document.getElementById('dice-results-text') as HTMLElement;
    this.totalText = document.getElementById('dice-total') as HTMLElement;

    this.initializeEventListeners();
    this.syncModeAndRender();
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

    // Update sliders
    this.diceCountSlider.addEventListener('input', () => {
      this.diceCountValue.textContent = this.diceCountSlider.value;
      this.drawDice();
    });

    this.diceFacesSlider.addEventListener('input', () => {
      this.diceFacesValue.textContent = this.diceFacesSlider.value;
      this.syncModeAndRender();
    });

    // Roll dice button
    this.rollBtn.addEventListener('click', () => {
      if (!this.isRolling) {
        this.rollDice();
      }
    });
  }

  private openModal(): void {
    this.modal.classList.add('active');
    this.syncModeAndRender();
  }

  private closeModal(): void {
    this.modal.classList.remove('active');
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isRolling = false;
  }

  private syncModeAndRender(): void {
    const faces = parseInt(this.diceFacesSlider.value);
    if (faces === 6) {
      // Show 3D dice, hide canvas
      this.container3d.style.display = 'flex';
      (this.canvas.parentElement as HTMLElement).style.display = 'none';
      this.render3DDice();
    } else {
      // Show canvas fallback
      this.container3d.style.display = 'none';
      (this.canvas.parentElement as HTMLElement).style.display = 'flex';
      this.drawDice();
    }
  }

  private render3DDice(values?: number[]): void {
    const diceCount = parseInt(this.diceCountSlider.value);
    // Clear existing 3D dice
    this.container3d.innerHTML = '';
    for (let i = 0; i < diceCount; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'dice-wrapper';

      const cube = document.createElement('div');
      cube.className = 'cube';

      const faces: Array<{ className: string; value: number }> = [
        { className: 'face-front', value: 1 },
        { className: 'face-back', value: 6 },
        { className: 'face-right', value: 3 },
        { className: 'face-left', value: 4 },
        { className: 'face-top', value: 5 },
        { className: 'face-bottom', value: 2 }
      ];

      faces.forEach(f => {
        const face = document.createElement('div');
        face.className = `cube-face ${f.className}`;
        face.textContent = String(f.value);
        cube.appendChild(face);
      });

      const valueOverlay = document.createElement('div');
      valueOverlay.className = 'dice-value';
      valueOverlay.textContent = values && values[i] ? String(values[i]) : '';

      wrapper.appendChild(cube);
      wrapper.appendChild(valueOverlay);
      this.container3d.appendChild(wrapper);
    }
  }

  private drawDice(results: number[] = []): void {
    const diceCount = parseInt(this.diceCountSlider.value);
    const diceSize = 40;
    const spacing = 20;
    const startX = (this.canvas.width - (diceCount * (diceSize + spacing) - spacing)) / 2;
    const startY = (this.canvas.height - diceSize) / 2;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw dice
    for (let i = 0; i < diceCount; i++) {
      const x = startX + i * (diceSize + spacing);
      const y = startY;
      
      // Draw die background
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#333333';
      this.ctx.lineWidth = 2;
      this.ctx.fillRect(x, y, diceSize, diceSize);
      this.ctx.strokeRect(x, y, diceSize, diceSize);

      // Draw die value
      const value = results[i] || Math.floor(Math.random() * parseInt(this.diceFacesSlider.value)) + 1;
      this.ctx.fillStyle = '#333333';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(value.toString(), x + diceSize / 2, y + diceSize / 2);
    }
  }

  private async rollDice(): Promise<void> {
    if (this.isRolling) return;

    this.isRolling = true;
    this.rollBtn.disabled = true;
    this.rollBtn.textContent = 'Rolling...';
    this.resultsText.textContent = 'Rolling dice...';
    this.totalText.textContent = '';

    const diceCount = parseInt(this.diceCountSlider.value);
    const diceFaces = parseInt(this.diceFacesSlider.value);
    const results: number[] = [];

    // Generate final results
    for (let i = 0; i < diceCount; i++) {
      results.push(Math.floor(Math.random() * diceFaces) + 1);
    }

    // Animate dice rolling
    const animationDuration = 2000; // 2 seconds
    const startTime = Date.now();
    const faces = diceFaces;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // Generate random values for animation
      const animatedResults = results.map(() => Math.floor(Math.random() * faces) + 1);

      // Show final results near the end of animation
      const finalResults = progress > 0.8 ? results : animatedResults;

      // Render based on mode
      if (faces === 6) {
        // Apply random rotations for animation
        const wrappers = Array.from(this.container3d.querySelectorAll('.dice-wrapper')) as HTMLElement[];
        wrappers.forEach((wrapper, index) => {
          const cube = wrapper.querySelector('.cube') as HTMLElement;
          // Random rotation each frame; snap to final orientation near the end
          const randomX = Math.floor(Math.random() * 4) * 90 + Math.floor(Math.random() * 30);
          const randomY = Math.floor(Math.random() * 4) * 90 + Math.floor(Math.random() * 30);
          const randomZ = Math.floor(Math.random() * 4) * 90;
          if (progress > 0.8) {
            // Map value to a fixed orientation
            const value = results[index];
            const orientation = this.orientationForValue(value);
            cube.style.transform = `rotateX(${orientation.x}deg) rotateY(${orientation.y}deg) rotateZ(${orientation.z}deg)`;
            const overlay = wrapper.querySelector('.dice-value') as HTMLElement;
            overlay.textContent = String(value);
          } else {
            cube.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg) rotateZ(${randomZ}deg)`;
          }
        });
        // Also ensure 3D dice are present
        if (this.container3d.children.length !== diceCount) {
          this.render3DDice(finalResults);
        }
      } else {
        this.drawDice(finalResults);
      }
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        // Animation complete
        this.isRolling = false;
        this.rollBtn.disabled = false;
        this.rollBtn.textContent = 'Roll Dice';
        
        // Display results
        const resultText = results.map((r, i) => `Die ${i + 1}: ${r}`).join(', ');
        this.resultsText.textContent = resultText;
        
        const total = results.reduce((sum, r) => sum + r, 0);
        this.totalText.textContent = `Total: ${total}`;
      }
    };

    // Initialize 3D dice structure before animation if needed
    if (faces === 6) {
      this.container3d.style.display = 'flex';
      (this.canvas.parentElement as HTMLElement).style.display = 'none';
      this.render3DDice(results);
    } else {
      this.container3d.style.display = 'none';
      (this.canvas.parentElement as HTMLElement).style.display = 'flex';
      this.drawDice(results);
    }

    animate();
  }

  private orientationForValue(value: number): { x: number; y: number; z: number } {
    // Orientations to bring the face value to the front
    // Base mapping assuming faces assignment in render3DDice
    switch (value) {
      case 1: return { x: 0, y: 0, z: 0 };
      case 2: return { x: 90, y: 0, z: 0 }; // bottom to front
      case 3: return { x: 0, y: -90, z: 0 }; // right to front
      case 4: return { x: 0, y: 90, z: 0 }; // left to front
      case 5: return { x: -90, y: 0, z: 0 }; // top to front
      case 6: return { x: 0, y: 180, z: 0 }; // back to front
      default: return { x: 0, y: 0, z: 0 };
    }
  }
}

// Initialize dice generator
new DiceGenerator();
