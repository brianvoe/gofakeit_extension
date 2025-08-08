import { SelectionState } from './types';
import { showNotification } from './notifications';
import { autofillElement, autofillContainer, isFormField, findFormContainer } from './autofill';

// Global state for selection mode
let selectionState: SelectionState = {
  isActive: false,
  highlightedElement: null
};

/**
 * Enable selection mode for clicking on form containers and fields
 */
export function enableSelectionMode(): void {
  if (selectionState.isActive) {
    return; // Already active
  }
  
  selectionState.isActive = true;
  showNotification('Click on a form field or container to autofill', 'info');
  
  // Add event listeners for mouse events
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick);
  
  // Add escape key listener to exit selection mode
  document.addEventListener('keydown', handleKeyDown);
}

/**
 * Disable selection mode
 */
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
  
  // Remove any existing highlight
  if (selectionState.highlightedElement) {
    selectionState.highlightedElement.style.outline = '';
    selectionState.highlightedElement = null;
  }
  
  showNotification('Selection mode disabled', 'info');
}

/**
 * Handle mouse over events to highlight potential containers and fields
 */
function handleMouseOver(event: MouseEvent): void {
  if (!selectionState.isActive) return;
  
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // Check if the target is a form field with data-gofakeit
  if (isFormField(target)) {
    if (selectionState.highlightedElement !== target) {
      // Remove previous highlight
      if (selectionState.highlightedElement) {
        selectionState.highlightedElement.style.outline = '';
      }
      
      // Add new highlight to the field
      target.style.outline = '2px solid orange';
      selectionState.highlightedElement = target;
    }
    return;
  }
  
  // Find the closest container that has form fields
  const container = findFormContainer(target);
  if (container && container !== selectionState.highlightedElement) {
    // Remove previous highlight
    if (selectionState.highlightedElement) {
      selectionState.highlightedElement.style.outline = '';
    }
    
    // Add new highlight
    container.style.outline = '2px solid orange';
    selectionState.highlightedElement = container;
  }
}

/**
 * Handle mouse out events to remove highlights
 */
function handleMouseOut(event: MouseEvent): void {
  if (!selectionState.isActive) return;
  
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // Only remove highlight if we're not hovering over the highlighted element or its children
  if (selectionState.highlightedElement && !selectionState.highlightedElement.contains(target)) {
    selectionState.highlightedElement.style.outline = '';
    selectionState.highlightedElement = null;
  }
}

/**
 * Handle click events to autofill the selected container or field
 */
async function handleClick(event: MouseEvent): Promise<void> {
  if (!selectionState.isActive) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // Check if clicked on a form field
  if (isFormField(target)) {
    await autofillElement(target);
    disableSelectionMode();
    return;
  }
  
  // Check if clicked on a container
  const container = findFormContainer(target);
  if (container) {
    await autofillContainer(container);
    disableSelectionMode();
  }
}

/**
 * Handle key events (escape to exit selection mode)
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!selectionState.isActive) return;
  
  if (event.key === 'Escape') {
    disableSelectionMode();
  }
}
