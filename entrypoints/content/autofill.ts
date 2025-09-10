import { autofill as gofakeitAutofill } from 'gofakeit';
import { showNotification } from './notifications';

// Use the gofakeit package's showFieldError if available, otherwise use a fallback
const showFieldError = ((element: Element, message: string) => {
  console.warn(`[Gofakeit] Field error: ${message}`, element);
});

// ============================================================================
// CHROME EXTENSION INTEGRATION WRAPPER
// ============================================================================

// Read smart-fill setting from Chrome storage
async function isSmartFillEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get({ gofakeitSmartFill: true }, (items) => {
          resolve(!!items.gofakeitSmartFill);
        });
      } else {
        resolve(true); // Default to enabled if Chrome API not available
      }
    } catch {
      resolve(false);
    }
  });
}

// Enhanced autofill element with Chrome extension features
export async function autofillElement(element: Element): Promise<boolean> {
  const gofakeitFunc = element.getAttribute('data-gofakeit');
  if (typeof gofakeitFunc === 'string' && gofakeitFunc.trim().toLowerCase() === 'false') {
    return false;
  }
  const smartEnabled = await isSmartFillEnabled();
  
  if (!gofakeitFunc && !smartEnabled) {
    return false;
  }

  try {
    await gofakeitAutofill(element);
    return true;
  } catch (error) {
    console.error('[Gofakeit] Error autofilling element:', error);
    return false;
  }
}

// Enhanced autofill all with Chrome extension features
export async function autofillAll(): Promise<void> {
  const smartEnabled = await isSmartFillEnabled();
  
  if (!smartEnabled) {
    // Check if there are any data-gofakeit fields
    const elements = document.querySelectorAll('[data-gofakeit]');
    if (elements.length === 0) {
      showNotification('No data-gofakeit fields exist. Turn on Smart-fill to fill this page.', 'info');
      return;
    }
  }

  try {
    await gofakeitAutofill();
    showNotification('Autofill completed successfully!', 'success');
  } catch (error) {
    console.error('[Gofakeit] Error during autofill:', error);
    showNotification('Autofill failed. Please try again.', 'error');
  }
}

// Enhanced autofill container with Chrome extension features
export async function autofillContainer(container: HTMLElement): Promise<void> {
  const smartEnabled = await isSmartFillEnabled();
  
  if (!smartEnabled) {
    // Check if there are any data-gofakeit fields in the container
    const elements = container.querySelectorAll('[data-gofakeit]');
    if (elements.length === 0) {
      showNotification('No data-gofakeit fields exist in this section. Turn on Smart-fill to fill it.', 'info');
      return;
    }
  }

  try {
    await gofakeitAutofill(container);
    showNotification('Container autofill completed successfully!', 'success');
  } catch (error) {
    console.error('[Gofakeit] Error during container autofill:', error);
    showNotification('Container autofill failed. Please try again.', 'error');
  }
}

// Handle error display and field highlighting
export function handleError(element: Element, error: string, functionName?: string): void {
  if (element instanceof HTMLElement) {
    element.classList.add('error-highlight');
    
    setTimeout(() => {
      element.classList.remove('error-highlight');
    }, 3000);
  }
  
  const message = functionName ? `Invalid function: ${functionName}` : error;
  showFieldError(element, message);
}

// Check if an element contains form fields with data-gofakeit attributes
export function hasFormFields(element: HTMLElement): boolean {
  const formFields = element.querySelectorAll('input[data-gofakeit], textarea[data-gofakeit], select[data-gofakeit]');
  return formFields.length > 0;
}

// Check if an element is a form field with data-gofakeit attribute
export function isFormField(element: HTMLElement): boolean {
  return (
    (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') &&
    element.hasAttribute('data-gofakeit')
  );
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
