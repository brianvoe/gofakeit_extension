import { fetchGofakeitData, fetchRandomString, ApiResponse, fetchFunctionList } from './api';
import { GOFAKEIT_COLORS } from './styles';
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
  const smartEnabled = await isSmartFillEnabled();

  const targets = smartEnabled
    ? elements
    : elements.filter((el) => (el as Element).hasAttribute('data-gofakeit'));

  if (targets.length === 0) {
    if (!smartEnabled) {
      showNotification('No data-gofakeit fields exist. Turn on Smart-fill to fill this page.', 'info');
    } else {
      showNotification('No form fields found to autofill', 'info');
    }
    return;
  }

  console.log(`[Gofakeit] Found ${targets.length} elements to generate data for`);
  showNotification(`Starting data generation for ${targets.length} fields...`, 'info');

  const results = await processElements(targets, 'Autofill');
  showResults(results.success, results.failed, 'Autofill');
}

// Autofill all fields within a specific container
export async function autofillContainer(container: HTMLElement): Promise<void> {
  const elements = queryFormElements(container);
  const smartEnabled = await isSmartFillEnabled();

  const targets = smartEnabled
    ? elements
    : elements.filter((el) => (el as Element).hasAttribute('data-gofakeit'));

  if (targets.length === 0) {
    if (!smartEnabled) {
      showNotification('No data-gofakeit fields exist in this section. Turn on Smart-fill to fill it.', 'info');
    } else {
      showNotification('No form fields found in this container', 'info');
    }
    return;
  }
  
  console.log(`[Gofakeit] Found ${targets.length} elements to generate data for in container`);
  showNotification(`Starting data generation for ${targets.length} fields...`, 'info');
  
  const results = await processElements(targets, 'Container autofill');
  showResults(results.success, results.failed, 'Container autofill');
}

// Main autofill function that routes to specific handlers
export async function autofillElement(element: Element): Promise<boolean> {
  const gofakeitFunc = element.getAttribute('data-gofakeit');
  const smartEnabled = await isSmartFillEnabled();
  
  if (!gofakeitFunc && !smartEnabled) {
    return false;
  }

  try {
    // Handle select dropdowns
    if (element instanceof HTMLSelectElement) {
      const funcToUse = (gofakeitFunc ?? 'true');
      const success = await handleSelectWithFunction(element, funcToUse);
      if (success) {
        // Show label 'random' if no explicit function was provided
        showFunctionBadge(element, gofakeitFunc ? funcToUse : 'random');
      }
      return success;
    }
    
    // Handle textarea elements
    if (element instanceof HTMLTextAreaElement) {
      const funcToUse = (gofakeitFunc ?? 'sentence');
      const success = await handleTextarea(element, funcToUse);
      if (success) {
        showFunctionBadge(element, funcToUse);
      }
      return success;
    }
    
    // Handle input elements
    if (element instanceof HTMLInputElement) {
      const inputType = element.type.toLowerCase();
      
      // Handle checkbox inputs
      if (inputType === 'checkbox') {
        const funcToUse = (gofakeitFunc ?? 'bool');
        const success = await handleCheckbox(element, (gofakeitFunc ?? 'true'));
        if (success) {
          showFunctionBadge(element, funcToUse);
        }
        return success;
      }
      
      // Handle radio inputs
      if (inputType === 'radio') {
        const funcToUse = (gofakeitFunc ?? 'bool');
        const success = await handleRadio(element, (gofakeitFunc ?? 'true'));
        if (success) {
          showFunctionBadge(element, funcToUse);
        }
        return success;
      }
      
      // Handle number inputs
      if (inputType === 'number') {
        const inferred = gofakeitFunc ?? (await inferFunctionForInput(element));
        const success = await handleNumberInput(element, inferred);
        if (success) {
          showFunctionBadge(element, inferred);
        }
        return success;
      }
      
      // Handle range inputs
      if (inputType === 'range') {
        const inferred = gofakeitFunc ?? (await inferFunctionForInput(element));
        const success = await handleRangeInput(element, inferred);
        if (success) {
          showFunctionBadge(element, inferred);
        }
        return success;
      }
      
      // Handle date/time inputs
      if (inputType === 'date' || inputType === 'time' || inputType === 'datetime-local' || 
          inputType === 'month' || inputType === 'week') {
        const inferred = gofakeitFunc ?? (await inferFunctionForInput(element));
        const success = await handleDateTimeInput(element, inferred);
        if (success) {
          showFunctionBadge(element, inferred);
        }
        return success;
      }
      
      // Handle text inputs (text, email, tel, password, search, url, color, etc.)
      const inferred = gofakeitFunc ?? (await inferFunctionForInput(element));
      const success = await handleTextInput(element, inferred);
      if (success) {
        showFunctionBadge(element, inferred);
      }
      return success;
    }
    
    console.warn('[Gofakeit] Unsupported element type:', element);
    return false;
    
  } catch (error) {
    console.error('[Gofakeit] Unexpected error generating data for element:', element, error);
    return false;
  }
}

// ============================================================================
// PROCESSING FUNCTIONS (Called by main functions)
// ============================================================================

// Query all form elements that can be autofilled
function queryFormElements(container?: HTMLElement): Element[] {
  const selector = 'input, textarea, select';
  const nodeList = container ? container.querySelectorAll(selector) : document.querySelectorAll(selector);
  const elements: Element[] = [];
  nodeList.forEach((el) => {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'hidden' || el.disabled || el.readOnly) return;
      elements.push(el);
    } else if (el instanceof HTMLTextAreaElement) {
      if (el.disabled || el.readOnly) return;
      elements.push(el);
    } else if (el instanceof HTMLSelectElement) {
      if (el.disabled) return;
      elements.push(el);
    }
  });
  return elements;
}

// (Smart detection merged into autofillElement via setting; unified query returns all fields)

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
    console.log(`[Gofakeit] ${context} completed successfully for ${successfulCount} fields`);
    showNotification(`Successfully generated data for ${successfulCount} fields!`, 'success');
  }
  
  // Show failed count notification
  if (failedCount > 0) {
    console.error(`[Gofakeit] ${context} failed for ${failedCount} fields`);
    showNotification(`Failed to generate data for ${failedCount} fields.`, 'error');
  }
  
  // If no fields were processed at all
  if (successfulCount === 0 && failedCount === 0) {
    console.log(`[Gofakeit] ${context} - no fields were processed`);
    showNotification(`No fields were processed.`, 'info');
  }
}

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
  return (
    (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') &&
    element.hasAttribute('data-gofakeit')
  );
}

// Display a small badge showing the function used for this field
function showFunctionBadge(element: Element, funcName: string): void {
  if (!(element instanceof HTMLElement)) return;
  const rect = element.getBoundingClientRect();
  const badge = document.createElement('div');
  badge.textContent = funcName;
  badge.style.position = 'fixed';
  badge.style.top = `${Math.max(0, rect.top - 8)}px`;
  badge.style.left = `${Math.max(0, rect.left)}px`;
  badge.style.background = GOFAKEIT_COLORS.primary;
  badge.style.color = '#000';
  badge.style.fontFamily = 'Arial, sans-serif';
  badge.style.fontSize = '11px';
  badge.style.padding = '3px 8px';
  badge.style.borderRadius = '6px';
  badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
  badge.style.zIndex = '2147483647';
  badge.style.opacity = '0';
  badge.style.transform = 'translateY(-6px)';
  badge.style.transition = 'opacity 200ms ease, transform 200ms ease';
  badge.style.pointerEvents = 'none';

  document.body.appendChild(badge);

  // Animate in
  requestAnimationFrame(() => {
    badge.style.opacity = '1';
    badge.style.transform = 'translateY(-12px)';
  });

  // Animate out and remove after extended delay
  const DISPLAY_MS = 6000;
  setTimeout(() => {
    badge.style.opacity = '0';
    badge.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    }, 220);
  }, DISPLAY_MS);
}

// Read smart-fill setting
async function isSmartFillEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get({ gofakeitSmartFill: true }, (items) => {
        resolve(!!items.gofakeitSmartFill);
      });
    } catch {
      resolve(false);
    }
  });
}

// Infer best-fit function name for an input based on type/name/placeholder
async function inferFunctionForInput(input: HTMLInputElement): Promise<string> {
  const type = input.type.toLowerCase();
  const name = (input.name || '').toLowerCase();
  const id = (input.id || '').toLowerCase();
  const placeholder = (input.placeholder || '').toLowerCase();

  const text = `${name} ${id} ${placeholder}`;

  // Direct type mappings
  if (type === 'email' || /email/.test(text)) return 'email';
  if (type === 'password' || /password|pass/.test(text)) return 'password';
  if (type === 'tel' || /phone|tel|mobile/.test(text)) return 'phone';
  if (type === 'url' || /url|website/.test(text)) return 'url';
  if (type === 'color' || /color/.test(text)) return 'hexcolor';
  if (type === 'number' || /age|qty|quantity|count|amount/.test(text)) return 'number?min=1&max=9999';
  if (type === 'date' || /date|dob|birthday/.test(text)) return 'date';
  if (type === 'time' || /time/.test(text)) return 'date';
  if (type === 'datetime-local' || /datetime|appointment/.test(text)) return 'date';

  // Common field heuristics
  if (/first\s*name|firstname|first_name|given/.test(text)) return 'firstname';
  if (/last\s*name|lastname|last_name|surname|family/.test(text)) return 'lastname';
  if (/full\s*name|fullname/.test(text)) return 'name';
  if (/city/.test(text)) return 'city';
  if (/state|province|region/.test(text)) return 'state';
  if (/zip|postal/.test(text)) return 'zip';
  if (/address|street/.test(text)) return 'street';
  if (/company|organization|org/.test(text)) return 'company';
  if (/job|title|role/.test(text)) return 'jobtitle';
  if (/website|domain/.test(text)) return 'url';
  if (/username|user\b/.test(text)) return 'username';

  // Fallbacks
  if (type === 'search') return 'word';
  // Validate fallback function exists via function list (best-effort)
  try {
    const list = await fetchFunctionList();
    if (list.success && list.data && list.data['word']) return 'word';
  } catch {}
  return 'word';
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
