import { notification } from './index';

// Selection state interface
interface SelectionState {
  isActive: boolean;
  highlightedElement: HTMLElement | null;
}

// Selection class for managing selection mode
export class Selection {
  private selectionState: SelectionState = {
    isActive: false,
    highlightedElement: null
  };
  
  private selectionCallback: ((element: HTMLElement) => void) | null = null;
  private highlightOverlay: HTMLElement | null = null;
  private selectionMode: 'auto' | 'manual' = 'auto';

  constructor() {
    this.readAutoFillSetting();
  }

  // Auto detection helpers
  private async readAutoFillSetting(): Promise<void> {
    const mode = await storage.getItem<string>('sync:gofakeitMode');
    this.selectionMode = (mode === 'auto' || mode === 'manual') ? mode : 'auto';
  }

  // Enable selection mode for clicking on form containers and fields
  public enableSelectionMode(callback: (element: HTMLElement) => void): void {
    if (this.selectionState.isActive) {
      return; // Already active
    }
    
    this.selectionState.isActive = true;
    this.selectionCallback = callback;
    notification.show('persistent', 'Click on a form field or container to autofill', () => {
      // Dismiss callback - exit selection mode when notification is dismissed
      this.disableSelectionMode();
    });
    
    // Add event listeners for mouse events
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  // Disable selection mode and clean up
  public disableSelectionMode(): void {
    if (!this.selectionState.isActive) return;
    
    this.selectionState.isActive = false;
    this.selectionState.highlightedElement = null;
    this.selectionCallback = null;
    
    // Remove event listeners
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    document.removeEventListener('click', this.handleClick.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Remove highlight overlay
    if (this.highlightOverlay && this.highlightOverlay.parentNode) {
      this.highlightOverlay.parentNode.removeChild(this.highlightOverlay);
    }
    this.highlightOverlay = null;
    
    // Dismiss all persistent notifications
    notification.dismissAllPersistentNotifications();
  }

  // Overlay for high-visibility highlighting that won't be affected by host CSS
  private ensureHighlightOverlay(): HTMLElement {
    if (!this.highlightOverlay) {
      this.highlightOverlay = document.createElement('div');
      this.highlightOverlay.className = 'highlight-overlay';
      this.highlightOverlay.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 999999;
        border: 3px solid #4CAF50;
        background: rgba(76, 175, 80, 0.1);
        border-radius: 4px;
        transition: all 0.2s ease;
        opacity: 0;
        transform: scale(0.95);
      `;
      document.body.appendChild(this.highlightOverlay);
    }
    return this.highlightOverlay;
  }

  // Position overlay for a specific element
  private positionOverlayForElement(element: HTMLElement): void {
    const overlay = this.ensureHighlightOverlay();
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    overlay.style.left = (rect.left + scrollX - 3) + 'px';
    overlay.style.top = (rect.top + scrollY - 3) + 'px';
    overlay.style.width = (rect.width + 6) + 'px';
    overlay.style.height = (rect.height + 6) + 'px';
    
    // Show overlay with animation
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      overlay.style.opacity = '1';
      overlay.style.transform = 'scale(1)';
    });
  }

  // Hide the highlight overlay
  private hideOverlay(): void {
    if (this.highlightOverlay) {
      this.highlightOverlay.classList.remove('visible');
      this.highlightOverlay.style.opacity = '0';
      this.highlightOverlay.style.transform = 'scale(0.95)';
    }
  }

  // Handle mouse over events to highlight potential containers and fields
  private handleMouseOver(event: MouseEvent): void {
    if (!this.selectionState.isActive) return;
    
    const target = event.target as HTMLElement;
    if (!target) return;
    
    // Check if it's a candidate field or container
    if (this.isCandidateField(target)) {
      this.selectionState.highlightedElement = target;
      this.positionOverlayForElement(target);
    } else {
      const container = this.findFormContainerSmart(target);
      if (container) {
        this.selectionState.highlightedElement = container;
        this.positionOverlayForElement(container);
      } else {
        this.hideOverlay();
        this.selectionState.highlightedElement = null;
      }
    }
  }

  // Handle mouse out events
  private handleMouseOut(event: MouseEvent): void {
    if (!this.selectionState.isActive) return;
    
    const target = event.target as HTMLElement;
    if (target === this.selectionState.highlightedElement) {
      this.hideOverlay();
      this.selectionState.highlightedElement = null;
    }
  }

  // Handle click events to trigger autofill
  private async handleClick(event: MouseEvent): Promise<void> {
    if (!this.selectionState.isActive) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    if (!target) return;
    
    // Check if clicked on a form field
    if (this.isCandidateField(target)) {
      if (this.selectionCallback) {
        this.selectionCallback(target);
      }
      this.disableSelectionMode();
      return;
    }
    
    // Check if clicked on a container
    const container = this.findFormContainerSmart(target);
    if (container) {
      if (this.selectionCallback) {
        this.selectionCallback(container);
      }
      this.disableSelectionMode();
    }
  }

  // Handle key events (escape to exit selection mode)
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.selectionState.isActive) return;
    
    if (event.key === 'Escape') {
      this.disableSelectionMode();
    }
  }

  // Check if an element is a candidate field for autofill
  private isCandidateField(element: HTMLElement): boolean {
    const tag = element.tagName;
    const isForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (!isForm) return false;
    
    if (element instanceof HTMLInputElement) {
      if (element.type === 'hidden' || element.disabled || element.readOnly) return false;
    }
    if (element instanceof HTMLSelectElement) {
      if (element.disabled) return false;
    }
    
    // In manual mode, only select fields with data-gofakeit attribute
    if (this.selectionMode === 'manual') {
      return element.hasAttribute('data-gofakeit');
    }
    
    // In auto mode, select any valid form field
    return true;
  }

  // Find the closest container that has form fields with data-gofakeit attributes
  private findFormContainer(element: HTMLElement): HTMLElement | null {
    // Check if the current element has form fields
    if (this.hasFormFields(element)) {
      return element;
    }
    
    // Check parent elements
    let parent = element.parentElement;
    while (parent) {
      if (this.hasFormFields(parent)) {
        return parent;
      }
      parent = parent.parentElement;
    }
    
    return null;
  }

  // Check if an element contains form fields with data-gofakeit attributes
  private hasFormFields(element: HTMLElement): boolean {
    const formFields = element.querySelectorAll('input[data-gofakeit], textarea[data-gofakeit], select[data-gofakeit]');
    return formFields.length > 0;
  }

  // Smart container detection that considers both data-gofakeit fields and auto-detection
  private findFormContainerSmart(element: HTMLElement): HTMLElement | null {
    // First try to find a container with data-gofakeit fields
    let current = element;
    while (current && current !== document.body) {
      if (this.hasFormFields(current)) {
        return current;
      }
      current = current.parentElement as HTMLElement;
    }
    
    // If in auto mode, look for any container with form fields
    if (this.selectionMode === 'auto') {
      current = element;
      while (current && current !== document.body) {
        const formFields = current.querySelectorAll('input, textarea, select');
        if (formFields.length > 0) {
          return current;
        }
        current = current.parentElement as HTMLElement;
      }
    }
    
    return null;
  }

  // Handle repositioning when window is resized or scrolled
  public handleReposition(): void {
    if (!this.selectionState.isActive || !this.selectionState.highlightedElement) return;
    this.positionOverlayForElement(this.selectionState.highlightedElement);
  }
}

// Create and export a singleton instance
export const selection = new Selection();

// Legacy function for backward compatibility
export function enableSelectionMode(callback: (element: HTMLElement) => void): void {
  selection.enableSelectionMode(callback);
}