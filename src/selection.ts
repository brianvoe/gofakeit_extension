import { showNotification, dismissAllPersistentNotifications } from './notifications';
import { autofillElement, autofillContainer } from './autofill';

// Selection state interface
interface SelectionState {
  isActive: boolean;
  highlightedElement: HTMLElement | null;
}

// Global state for selection mode
let selectionState: SelectionState = {
  isActive: false,
  highlightedElement: null
};

// Overlay for high-visibility highlighting that won't be affected by host CSS
let highlightOverlay: HTMLElement | null = null;

function ensureHighlightOverlay(): HTMLElement {
  if (!highlightOverlay) {
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'gofakeit-highlight-overlay';
    highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #ffa000;
      border-radius: 6px;
      z-index: 2147483647;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08);
      background: transparent;
      display: none;
    `;
    document.body.appendChild(highlightOverlay);
  }
  return highlightOverlay;
}

function positionOverlayForElement(element: HTMLElement): void {
  const overlay = ensureHighlightOverlay();
  const rect = element.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.top = `${Math.max(0, rect.top)}px`;
  overlay.style.left = `${Math.max(0, rect.left)}px`;
  overlay.style.width = `${Math.max(0, rect.width)}px`;
  overlay.style.height = `${Math.max(0, rect.height)}px`;
}

function hideOverlay(): void {
  if (highlightOverlay) {
    highlightOverlay.style.display = 'none';
  }
}

// Enable selection mode for clicking on form containers and fields
export function enableSelectionMode(): void {
  if (selectionState.isActive) {
    return; // Already active
  }
  
  selectionState.isActive = true;
  showNotification('Click on a form field or container to autofill', 'persistent', () => {
    // Dismiss callback - exit selection mode when notification is dismissed
    disableSelectionMode();
  });
  
  // Add event listeners for mouse events
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick);
  
  // Add escape key listener to exit selection mode
  document.addEventListener('keydown', handleKeyDown);

  // Keep overlay aligned on scroll/resize
  window.addEventListener('scroll', handleReposition, true);
  window.addEventListener('resize', handleReposition, true);
}

// Disable selection mode
export function disableSelectionMode(): void {
  if (!selectionState.isActive) {
    return;
  }
  
  selectionState.isActive = false;
  
  // Remove event listeners
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick);
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('scroll', handleReposition, true);
  window.removeEventListener('resize', handleReposition, true);
  
  // Remove any existing highlight
  if (selectionState.highlightedElement) {
    selectionState.highlightedElement = null;
  }
  // Remove overlay
  hideOverlay();
  if (highlightOverlay && highlightOverlay.parentNode) {
    highlightOverlay.parentNode.removeChild(highlightOverlay);
  }
  highlightOverlay = null;
  
  // Dismiss all persistent notifications
  dismissAllPersistentNotifications();
}

// Handle mouse over events to highlight potential containers and fields
function handleMouseOver(event: MouseEvent): void {
  if (!selectionState.isActive) return;
  
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // Check if the target is a form field candidate (respects Smart-fill setting)
  if (isCandidateField(target)) {
    if (selectionState.highlightedElement !== target) {
      // Position overlay over the field
      positionOverlayForElement(target);
      selectionState.highlightedElement = target;
    }
    return;
  }
  
  // Find the closest container that has form fields (respect Smart-fill)
  const container = findFormContainerSmart(target);
  if (container && container !== selectionState.highlightedElement) {
    // Position overlay over the container
    positionOverlayForElement(container);
    selectionState.highlightedElement = container;
  }
}

// Handle mouse out events to remove highlights
function handleMouseOut(event: MouseEvent): void {
  if (!selectionState.isActive) return;
  
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // Only remove highlight if we're not hovering over the highlighted element or its children
  if (selectionState.highlightedElement && !selectionState.highlightedElement.contains(target)) {
    selectionState.highlightedElement = null;
    hideOverlay();
  }
}

// Handle click events to autofill the selected container or field
async function handleClick(event: MouseEvent): Promise<void> {
  if (!selectionState.isActive) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // Check if clicked on a form field
  if (isCandidateField(target)) {
    await autofillElement(target);
    disableSelectionMode();
    return;
  }
  
  // Check if clicked on a container
  const container = findFormContainerSmart(target);
  if (container) {
    await autofillContainer(container);
    disableSelectionMode();
  }
}

// Handle key events (escape to exit selection mode)
function handleKeyDown(event: KeyboardEvent): void {
  if (!selectionState.isActive) return;
  
  if (event.key === 'Escape') {
    disableSelectionMode();
  }
}

function handleReposition(): void {
  if (!selectionState.isActive || !selectionState.highlightedElement) return;
  positionOverlayForElement(selectionState.highlightedElement as HTMLElement);
}

// Smart detection helpers
let smartFillEnabledForSelection = true;

function readSmartFillSetting(): void {
  try {
    chrome.storage.sync.get({ gofakeitSmartFill: true }, (items) => {
      smartFillEnabledForSelection = !!items.gofakeitSmartFill;
    });
  } catch {
    smartFillEnabledForSelection = true;
  }
}

readSmartFillSetting();

function isCandidateField(element: HTMLElement): boolean {
  const tag = element.tagName;
  const isForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (!isForm) return false;
  if (element instanceof HTMLInputElement) {
    if (element.type === 'hidden' || element.disabled || element.readOnly) return false;
  }
  if (element instanceof HTMLSelectElement) {
    if (element.disabled) return false;
  }
  if (!smartFillEnabledForSelection) {
    return element.hasAttribute('data-gofakeit');
  }
  return true;
}

function findFormContainerSmart(element: HTMLElement): HTMLElement | null {
  let parent: HTMLElement | null = element;
  while (parent) {
    const fields = parent.querySelectorAll('input, textarea, select');
    for (const node of Array.from(fields)) {
      if (isCandidateField(node as HTMLElement)) return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}
