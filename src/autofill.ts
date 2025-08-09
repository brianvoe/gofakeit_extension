import { fetchGofakeitData, ApiResponse } from './api';
import { showNotification } from './notifications';

// Show error message as a floating tooltip over a form field
function showFieldError(element: Element, message: string): void {
  // Remove any existing error message
  const existingError = document.querySelector('.gofakeit-error-tooltip');
  if (existingError) {
    existingError.remove();
  }

  // Create error tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'gofakeit-error-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    z-index: 10001;
    color: var(--color-error);
    font-size: var(--font-size);
    font-family: var(--font-family);
    background-color: var(--color-background);
    padding: var(--spacing-quarter) var(--spacing-half);
    border-radius: var(--border-radius);
    border: 1px solid var(--color-error);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 300px;
    word-wrap: break-word;
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
  `;
  tooltip.textContent = message;

  // Add to body
  document.body.appendChild(tooltip);

  // Function to update tooltip position
  function updateTooltipPosition() {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    const left = rect.left + scrollLeft;
    const top = rect.top + scrollTop - tooltip.offsetHeight - 8;
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  // Initial positioning
  updateTooltipPosition();

  // Add scroll and resize listeners
  const scrollHandler = () => updateTooltipPosition();
  const resizeHandler = () => updateTooltipPosition();
  
  // Listen to scroll events on window and all scrollable elements
  window.addEventListener('scroll', scrollHandler, { passive: true });
  window.addEventListener('resize', resizeHandler, { passive: true });
  
  // Also listen to scroll events on all elements with overflow scroll
  const scrollableElements = document.querySelectorAll('*');
  const scrollableListeners: Array<{ element: Element, handler: () => void }> = [];
  
  scrollableElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.overflow === 'scroll' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflowY === 'auto') {
      const listener = () => updateTooltipPosition();
      el.addEventListener('scroll', listener, { passive: true });
      scrollableListeners.push({ element: el, handler: listener });
    }
  });

  // Fade in
  requestAnimationFrame(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(0)';
  });

  // Remove tooltip after 5 seconds with fade out
  setTimeout(() => {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(-10px)';
    
    // Remove event listeners
    window.removeEventListener('scroll', scrollHandler);
    window.removeEventListener('resize', resizeHandler);
    
    // Remove scrollable element listeners
    scrollableListeners.forEach(({ element, handler }) => {
      element.removeEventListener('scroll', handler);
    });
    
    setTimeout(() => {
      if (tooltip.parentElement) {
        tooltip.parentElement.removeChild(tooltip);
      }
    }, 300);
  }, 5000);
}

// Autofill a single form element
export async function autofillElement(element: Element): Promise<void> {
  const gofakeitFunc = element.getAttribute('data-gofakeit');
  
  if (!gofakeitFunc) {
    console.warn('[Gofakeit Autofill] Element missing data-gofakeit attribute:', element);
    return;
  }

  const response = await fetchGofakeitData(gofakeitFunc);
  
  if (!response.success) {
    console.warn(`[Gofakeit Autofill] Error for function ${gofakeitFunc}:`, response.error);
    
    // Handle 400 Bad Request specifically
    if (response.status === 400) {
      // Highlight the field with red border only
      if (element instanceof HTMLElement) {
        element.style.border = `2px solid var(--color-error)`;
        
        // Remove highlighting after 5 seconds
        setTimeout(() => {
          element.style.border = '';
        }, 5000);
      }
      
      // Show error message to the top left of the field
      showFieldError(element, `Invalid function: ${gofakeitFunc}`);
    }
    return;
  }
  
  if (element instanceof HTMLTextAreaElement) {
    element.value = response.data!;
  } else if (element instanceof HTMLInputElement) {
    // Handle different input types
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        // For boolean inputs, check if the returned data suggests true/false
        const boolValue = response.data!.toLowerCase();
        element.checked = boolValue === 'true' || boolValue === '1' || Math.random() < 0.5;
        break;
      default:
        element.value = response.data!;
    }
  }
}

// Autofill all form fields on the page
export async function autofillFormFields(): Promise<void> {
  const elements = document.querySelectorAll('input[data-gofakeit], textarea[data-gofakeit]');

  if (elements.length === 0) {
    console.log('[Gofakeit Autofill] No elements with data-gofakeit attribute found');
    showNotification('No form fields found with data-gofakeit attributes', 'info');
    return;
  }

  console.log(`[Gofakeit Autofill] Found ${elements.length} elements to autofill`);
  showNotification(`Starting autofill for ${elements.length} fields...`, 'info');

  // Process elements in batches to avoid overwhelming the API
  const promises: Promise<void>[] = [];

  elements.forEach((element) => {
    const promise = autofillElement(element);
    promises.push(promise);
  });

  try {
    await Promise.all(promises);
    console.log('[Gofakeit Autofill] Autofill completed successfully');
    showNotification(`Successfully autofilled ${elements.length} fields!`, 'success');
  } catch (error) {
    console.error('[Gofakeit Autofill] Error during autofill:', error);
    showNotification('Some fields failed to autofill. Check console for details.', 'error');
  }
}

// Autofill all fields within a specific container
export async function autofillContainer(container: HTMLElement): Promise<void> {
  const elements = container.querySelectorAll('input[data-gofakeit], textarea[data-gofakeit]');
  
  if (elements.length === 0) {
    showNotification('No form fields found in this container', 'info');
    return;
  }
  
  console.log(`[Gofakeit Autofill] Found ${elements.length} elements to autofill in container`);
  showNotification(`Starting autofill for ${elements.length} fields...`, 'info');
  
  const promises: Promise<void>[] = [];

  elements.forEach((element) => {
    const promise = autofillElement(element);
    promises.push(promise);
  });

  try {
    await Promise.all(promises);
    console.log('[Gofakeit Autofill] Container autofill completed successfully');
    showNotification(`Successfully autofilled ${elements.length} fields!`, 'success');
  } catch (error) {
    console.error('[Gofakeit Autofill] Error during container autofill:', error);
    showNotification('Some fields failed to autofill. Check console for details.', 'error');
  }
}

// Check if an element contains form fields with data-gofakeit attributes
export function hasFormFields(element: HTMLElement): boolean {
  const formFields = element.querySelectorAll('input[data-gofakeit], textarea[data-gofakeit]');
  return formFields.length > 0;
}

// Check if an element is a form field with data-gofakeit attribute
export function isFormField(element: HTMLElement): boolean {
  return element.hasAttribute('data-gofakeit') && 
         (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA');
}

// Find the closest container that has form fields with data-gofakeit attributes
export function findFormContainer(element: HTMLElement): HTMLElement | null {
  // Check if the current element has form fields
  if (hasFormFields(element)) {
    return element;
  }
  
  // Check parent elements
  let parent = element.parentElement;
  while (parent) {
    if (hasFormFields(parent)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  
  return null;
}
