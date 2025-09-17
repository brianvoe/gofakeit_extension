interface Notification {
  show(type: string, message: string): void;
  dismissAllPersistentNotifications(): void;
}

interface SelectionSettings {
  mode: 'auto' | 'manual';
  notification: Notification;
}

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
  private mode: 'auto' | 'manual' = 'auto';
  private notification: Notification;

  constructor(settings: SelectionSettings) {
    this.mode = settings.mode;
    this.notification = settings.notification;
  }

  // Enable selection mode for clicking on form containers and fields
  public async enableSelectionMode(callback: (element: HTMLElement) => void): Promise<void> {
    if (this.selectionState.isActive) {
      return; // Already active
    }
    
    this.selectionState.isActive = true;
    this.selectionCallback = callback;
    this.notification.show('persistent', `
      <div style="text-align: center; margin-bottom: 8px;">
        <strong>🎯 Selection Mode Active</strong>
      </div>
      <div style="font-size: 12px; line-height: 1.4;">
        Click on any element to autofill<br>
        <div style="margin-top: 6px;">
          <span style="color: #ffa000;">🟠 Orange</span> = Has form fields<br>
          <span style="color: #ff3860;">🔴 Red</span> = No form fields
        </div>
      </div>
    `);
    
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
    this.notification.dismissAllPersistentNotifications();
  }

  // Overlay for high-visibility highlighting that won't be affected by host CSS
  private ensureHighlightOverlay(): HTMLElement {
    if (!this.highlightOverlay) {
      this.highlightOverlay = document.createElement('div');
      this.highlightOverlay.className = 'gfi-highlight-overlay';
      document.body.appendChild(this.highlightOverlay);
    }
    return this.highlightOverlay;
  }

  // Position overlay for a specific element with color indication
  private positionOverlayForElement(element: HTMLElement, hasFormInputs: boolean): void {
    const overlay = this.ensureHighlightOverlay();
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Position the overlay
    overlay.style.left = (rect.left + scrollX - 3) + 'px';
    overlay.style.top = (rect.top + scrollY - 3) + 'px';
    overlay.style.width = (rect.width + 3) + 'px';
    overlay.style.height = (rect.height + 3) + 'px';
    
    // Remove existing color classes
    overlay.classList.remove('gfi-found', 'gfi-not-found');
    
    // Add appropriate color class based on whether element has form inputs
    if (hasFormInputs) {
      overlay.classList.add('gfi-found');
    } else {
      overlay.classList.add('gfi-not-found');
    }
    
    // Show overlay with animation
    requestAnimationFrame(() => {
      overlay.classList.add('gfi-visible');
    });
  }

  // Hide the highlight overlay
  private hideOverlay(): void {
    if (this.highlightOverlay) {
      this.highlightOverlay.classList.remove('gfi-visible');
    }
  }

  // Handle mouse over events to highlight all elements
  private handleMouseOver(event: MouseEvent): void {
    if (!this.selectionState.isActive) return;
    
    const target = event.target as HTMLElement;
    if (!target) return;
    
    // Always highlight the element under the mouse
    this.selectionState.highlightedElement = target;
    
    // Check if this element or its children have form inputs
    const hasFormInputs = this.elementHasFormInputs(target);
    
    // Show overlay with appropriate color
    this.positionOverlayForElement(target, hasFormInputs);
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
  private handleClick(event: MouseEvent): void {
    if (!this.selectionState.isActive) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    if (!target) return;
    
    // Check if the clicked element itself has form fields (don't walk up DOM tree)
    if (this.elementHasFormInputs(target)) {
      if (this.selectionCallback) {
        this.selectionCallback(target);
      }
      this.disableSelectionMode();
      return;
    }
    
    // If no form fields found in the clicked element, show notification and exit selection mode without autofilling
    this.notification.show('error', 'No fillable form fields found in selected area');
    this.disableSelectionMode();
  }

  // Handle key events (escape to exit selection mode)
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.selectionState.isActive) return;
    
    if (event.key === 'Escape') {
      this.disableSelectionMode();
    }
  }

  // Check if an element or its children contain form inputs
  private elementHasFormInputs(element: HTMLElement): boolean {
    // Check if the element itself is a form field
    const tag = element.tagName;
    const isForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (isForm) {
      // Check if it's a valid form field
      if (element instanceof HTMLInputElement) {
        if (element.type === 'hidden' || element.disabled || element.readOnly) return false;
      }
      if (element instanceof HTMLSelectElement) {
        if (element.disabled) return false;
      }
      
      // In manual mode, only consider fields with data-gofakeit attribute
      if (this.mode === 'manual') {
        return element.hasAttribute('data-gofakeit');
      }
      
      // In auto mode, any valid form field counts
      return true;
    }
    
    // Check if any child elements are form fields
    const formFields = element.querySelectorAll('input, textarea, select');
    for (const field of formFields) {
      const fieldTag = field.tagName;
      if (fieldTag === 'INPUT' || fieldTag === 'TEXTAREA' || fieldTag === 'SELECT') {
        // Check if it's a valid form field
        if (field instanceof HTMLInputElement) {
          if (field.type === 'hidden' || field.disabled || field.readOnly) continue;
        }
        if (field instanceof HTMLSelectElement) {
          if (field.disabled) continue;
        }
        
        // In manual mode, only consider fields with data-gofakeit attribute
        if (this.mode === 'manual') {
          if (field.hasAttribute('data-gofakeit')) {
            return true;
          }
        } else {
          // In auto mode, any valid form field counts
          return true;
        }
      }
    }
    
    return false;
  }

  // Handle repositioning when window is resized or scrolled
  public handleReposition(): void {
    if (!this.selectionState.isActive || !this.selectionState.highlightedElement) return;
    const hasFormInputs = this.elementHasFormInputs(this.selectionState.highlightedElement);
    this.positionOverlayForElement(this.selectionState.highlightedElement, hasFormInputs);
  }
}
