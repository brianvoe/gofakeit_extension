import { fetchGofakeitData, fetchRandomString, ApiResponse } from './api';
import { showNotification } from './notifications';
import { showFieldError } from './field-error';
import { handleDateTimeInput } from './input-datetime';
import { handleTextInput, handleTextarea } from './input-text';
import { handleCheckbox, handleRadio, handleSelectWithFunction } from './input-misc';
import { handleNumberInput, handleRangeInput } from './input-number';

// ============================================================================
// MAIN PUBLIC FUNCTIONS (Entry Points)
// ============================================================================

// Autofill all form fields on the page
export async function autofillAll(): Promise<void> {
  const elements = queryFormElements();

  if (elements.length === 0) {
    console.log('[Gofakeit Autofill] No elements with data-gofakeit attribute found');
    showNotification('No form fields found with data-gofakeit attributes', 'info');
    return;
  }

  console.log(`[Gofakeit Autofill] Found ${elements.length} elements to autofill`);
  showNotification(`Starting autofill for ${elements.length} fields...`, 'info');

  const results = await processElements(elements, 'Autofill');
  showResults(results.success, results.failed, 'Autofill');
}

// Autofill all fields within a specific container
export async function autofillContainer(container: HTMLElement): Promise<void> {
  const elements = queryFormElements(container);
  
  if (elements.length === 0) {
    showNotification('No form fields found in this container', 'info');
    return;
  }
  
  console.log(`[Gofakeit Autofill] Found ${elements.length} elements to autofill in container`);
  showNotification(`Starting autofill for ${elements.length} fields...`, 'info');
  
  const results = await processElements(elements, 'Container autofill');
  showResults(results.success, results.failed, 'Container autofill');
}

// Main autofill function that routes to specific handlers
export async function autofillElement(element: Element): Promise<boolean> {
  const gofakeitFunc = element.getAttribute('data-gofakeit');
  
  if (!gofakeitFunc) {
    console.warn('[Gofakeit Autofill] Element missing data-gofakeit attribute:', element);
    return false;
  }

  try {
    // Handle select dropdowns
    if (element instanceof HTMLSelectElement) {
      return await handleSelectWithFunction(element, gofakeitFunc);
    }
    
    // Handle textarea elements
    if (element instanceof HTMLTextAreaElement) {
      return await handleTextarea(element, gofakeitFunc);
    }
    
    // Handle input elements
    if (element instanceof HTMLInputElement) {
      const inputType = element.type.toLowerCase();
      
      // Handle checkbox inputs
      if (inputType === 'checkbox') {
        return await handleCheckbox(element, gofakeitFunc);
      }
      
      // Handle radio inputs
      if (inputType === 'radio') {
        return await handleRadio(element, gofakeitFunc);
      }
      
      // Handle number inputs
      if (inputType === 'number') {
        return await handleNumberInput(element, gofakeitFunc);
      }
      
      // Handle range inputs
      if (inputType === 'range') {
        return await handleRangeInput(element, gofakeitFunc);
      }
      
      // Handle date/time inputs
      if (inputType === 'date' || inputType === 'time' || inputType === 'datetime-local' || 
          inputType === 'month' || inputType === 'week') {
        return await handleDateTimeInput(element, gofakeitFunc);
      }
      
      // Handle text inputs (text, email, tel, password, search, url, color, etc.)
      return await handleTextInput(element, gofakeitFunc);
    }
    
    console.warn('[Gofakeit Autofill] Unsupported element type:', element);
    return false;
    
  } catch (error) {
    console.error('[Gofakeit Autofill] Unexpected error autofilling element:', element, error);
    return false;
  }
}

// ============================================================================
// PROCESSING FUNCTIONS (Called by main functions)
// ============================================================================

// Query all form elements that can be autofilled
function queryFormElements(container?: HTMLElement): Element[] {
  const selector = 'input[data-gofakeit], textarea[data-gofakeit], select[data-gofakeit]';
  const elements = container 
    ? container.querySelectorAll(selector)
    : document.querySelectorAll(selector);
  
  return Array.from(elements);
}

// Get unique elements, handling checkbox and radio groups
function getUniqueElements(elements: Element[]): Element[] {
  const uniqueElements: Element[] = [];
  const processedGroups = new Set<string>();
  
  for (const element of elements) {
    if (element instanceof HTMLInputElement) {
      const inputType = element.type.toLowerCase();
      
      if (inputType === 'checkbox' || inputType === 'radio') {
        const name = element.name;
        if (name && processedGroups.has(name)) {
          // Skip if we've already processed this group
          continue;
        }
        if (name) {
          processedGroups.add(name);
        }
      }
    }
    
    uniqueElements.push(element);
  }
  
  return uniqueElements;
}

// Process multiple elements and track results
async function processElements(elements: Element[], context: string): Promise<{ success: number, failed: number }> {
  let successfulCount = 0;
  let failedCount = 0;
  
  // Get unique elements to avoid processing checkbox/radio groups multiple times
  const uniqueElements = getUniqueElements(elements);

  for (const element of uniqueElements) {
    try {
      const success = await autofillElement(element);
      if (success) {
        successfulCount++;
        
        // Monitor if the value gets cleared after a short delay
        setTimeout(() => {
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            if (element.value === '') {
              console.warn('[Gofakeit Autofill] Value was cleared for element:', element);
            }
          } else if (element instanceof HTMLSelectElement) {
            if (element.value === '') {
              console.warn('[Gofakeit Autofill] Value was cleared for select:', element);
            }
          }
        }, 1000);
        
      } else {
        failedCount++;
      }
    } catch (error) {
      failedCount++;
      console.warn(`[Gofakeit Autofill] Failed to autofill element:`, element, error);
    }
  }

  return { success: successfulCount, failed: failedCount };
}

// Show results notification
function showResults(successfulCount: number, failedCount: number, context: string): void {
  // Show successful count notification
  if (successfulCount > 0) {
    console.log(`[Gofakeit Autofill] ${context} completed successfully for ${successfulCount} fields`);
    showNotification(`Successfully autofilled ${successfulCount} fields!`, 'success');
  }
  
  // Show failed count notification
  if (failedCount > 0) {
    console.error(`[Gofakeit Autofill] ${context} failed for ${failedCount} fields`);
    showNotification(`Failed to autofill ${failedCount} fields.`, 'error');
  }
  
  // If no fields were processed at all
  if (successfulCount === 0 && failedCount === 0) {
    console.log(`[Gofakeit Autofill] ${context} - no fields were processed`);
    showNotification(`No fields were processed.`, 'info');
  }
}

// ============================================================================
// FORM TYPE HANDLERS (Called by autofillElement)
// ============================================================================











// ============================================================================
// UTILITY FUNCTIONS (Called by various functions)
// ============================================================================

// Handle error display and field highlighting
export function handleError(element: Element, error: string, functionName?: string): void {
  if (element instanceof HTMLElement) {
    element.style.border = `2px solid var(--color-error)`;
    
    setTimeout(() => {
      element.style.border = '';
    }, 5000);
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
  return element.hasAttribute('data-gofakeit') && 
         (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT');
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
