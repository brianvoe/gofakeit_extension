import { fetchGofakeitData } from './api';
import { showNotification } from './notifications';

/**
 * Autofill a single form element
 */
export async function autofillElement(element: Element): Promise<void> {
  const gofakeitFunc = element.getAttribute('data-gofakeit');
  
  if (!gofakeitFunc) {
    console.warn('[Gofakeit Autofill] Element missing data-gofakeit attribute:', element);
    return;
  }

  const data = await fetchGofakeitData(gofakeitFunc);
  
  if (!data) {
    console.warn(`[Gofakeit Autofill] No data returned for function: ${gofakeitFunc}`);
    return;
  }
  
  if (element instanceof HTMLTextAreaElement) {
    element.value = data;
  } else if (element instanceof HTMLInputElement) {
    // Handle different input types
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        // For boolean inputs, check if the returned data suggests true/false
        const boolValue = data.toLowerCase();
        element.checked = boolValue === 'true' || boolValue === '1' || Math.random() < 0.5;
        break;
      default:
        element.value = data;
    }
  }
}

/**
 * Autofill all form fields on the page
 */
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

/**
 * Autofill all fields within a specific container
 */
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

/**
 * Check if an element contains form fields with data-gofakeit attributes
 */
export function hasFormFields(element: HTMLElement): boolean {
  const formFields = element.querySelectorAll('input[data-gofakeit], textarea[data-gofakeit]');
  return formFields.length > 0;
}

/**
 * Check if an element is a form field with data-gofakeit attribute
 */
export function isFormField(element: HTMLElement): boolean {
  return element.hasAttribute('data-gofakeit') && 
         (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA');
}

/**
 * Find the closest container that has form fields with data-gofakeit attributes
 */
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
