import { hasFunc } from './funcs-short';
import { fetchGofakeitData } from './api';
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

  const targetsBase = smartEnabled
    ? elements
    : elements.filter((el) => (el as Element).hasAttribute('data-gofakeit'));
  const targets = targetsBase.filter((el) => !isDataGofakeitFalse(el));

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

  const targetsBase = smartEnabled
    ? elements
    : elements.filter((el) => (el as Element).hasAttribute('data-gofakeit'));
  const targets = targetsBase.filter((el) => !isDataGofakeitFalse(el));

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
  if (typeof gofakeitFunc === 'string' && gofakeitFunc.trim().toLowerCase() === 'false') {
    return false;
  }
  const smartEnabled = await isSmartFillEnabled();
  
  if (!gofakeitFunc && !smartEnabled) {
    return false;
  }

  try {
    // Handle select dropdowns
    if (element instanceof HTMLSelectElement) {
      const funcToUse = (gofakeitFunc && gofakeitFunc !== 'true') ? gofakeitFunc : 'true';
      const { success, usedFunc } = await handleSelectWithFunction(element, funcToUse);
      if (success) {
        showFunctionBadge(element, usedFunc);
      }
      return success;
    }
    
    // Handle textarea elements
    if (element instanceof HTMLTextAreaElement) {
      const funcToUse = (gofakeitFunc && gofakeitFunc !== 'true') ? gofakeitFunc : 'sentence';
      const { success, usedFunc } = await handleTextarea(element, funcToUse);
      if (success) {
        showFunctionBadge(element, usedFunc);
      }
      return success;
    }
    
    // Handle input elements
    if (element instanceof HTMLInputElement) {
      const inputType = element.type.toLowerCase();
      
      // Handle checkbox inputs
      if (inputType === 'checkbox') {
        const passToHandler = (gofakeitFunc && gofakeitFunc !== 'true') ? gofakeitFunc : 'true';
        const { success, usedFunc } = await handleCheckbox(element, passToHandler);
        if (success) {
          showFunctionBadge(element, usedFunc);
        }
        return success;
      }
      
      // Handle radio inputs
      if (inputType === 'radio') {
        const passToHandler = (gofakeitFunc && gofakeitFunc !== 'true') ? gofakeitFunc : 'true';
        const { success, usedFunc } = await handleRadio(element, passToHandler);
        if (success) {
          showFunctionBadge(element, usedFunc);
        }
        return success;
      }
      
      // Handle number inputs
      if (inputType === 'number') {
        const inferred = (gofakeitFunc && gofakeitFunc !== 'true') ? gofakeitFunc : (await inferFunctionForInput(element));
        const { success, usedFunc } = await handleNumberInput(element, inferred);
        if (success) {
          showFunctionBadge(element, usedFunc);
        }
        return success;
      }
      
      // Handle range inputs
      if (inputType === 'range') {
        const inferred = (gofakeitFunc && gofakeitFunc !== 'true') ? gofakeitFunc : (await inferFunctionForInput(element));
        const { success, usedFunc } = await handleRangeInput(element, inferred);
        if (success) {
          showFunctionBadge(element, usedFunc);
        }
        return success;
      }
      
      // Handle date/time inputs
      if (inputType === 'date' || inputType === 'time' || inputType === 'datetime-local' || 
          inputType === 'month' || inputType === 'week') {
        const inferred = (gofakeitFunc && gofakeitFunc !== 'true') ? gofakeitFunc : (await inferFunctionForInput(element));
        const { success, usedFunc } = await handleDateTimeInput(element, inferred);
        if (success) {
          showFunctionBadge(element, usedFunc);
        }
        return success;
      }
      
      // Handle text inputs (text, email, tel, password, search, url, color, etc.)
      const inferred = (gofakeitFunc && gofakeitFunc !== 'true') ? gofakeitFunc : (await inferFunctionForInput(element));
      const { success, usedFunc } = await handleTextInput(element, inferred);
      if (success) {
        showFunctionBadge(element, usedFunc);
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

function isDataGofakeitFalse(el: Element): boolean {
  const val = (el as Element).getAttribute && (el as Element).getAttribute('data-gofakeit');
  return typeof val === 'string' && val.trim().toLowerCase() === 'false';
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

  const badge = document.createElement('div');
  badge.textContent = funcName;
  badge.style.position = 'fixed';
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

  const updatePosition = () => {
    const rect = element.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;

    // If the element is completely out of the viewport, hide the badge entirely
    const outOfView = rect.bottom <= 0 || rect.top >= vh || rect.right <= 0 || rect.left >= vw;
    if (outOfView) {
      badge.style.display = 'none';
      return;
    }

    // Otherwise, ensure it's visible and position above-left of the field
    if (badge.style.display === 'none') badge.style.display = 'block';
    const top = rect.top - 8;
    const left = rect.left;
    badge.style.top = `${top}px`;
    badge.style.left = `${left}px`;
  };

  document.body.appendChild(badge);
  updatePosition();

  // Animate in
  requestAnimationFrame(() => {
    badge.style.opacity = '1';
    badge.style.transform = 'translateY(-12px)';
  });

  // Track movement while visible
  const onScroll = () => updatePosition();
  const onResize = () => updatePosition();
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize, true);

  // Observe element size/position changes
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => updatePosition());
    try { ro.observe(element); } catch {}
  }

  // Animate out and remove after extended delay
  const DISPLAY_MS = 6000;
  setTimeout(() => {
    badge.style.opacity = '0';
    badge.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize, true);
      if (ro) {
        try { ro.disconnect(); } catch {}
        ro = null;
      }
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

// Extract nearby/associated label text for context
function getAssociatedLabelText(input: HTMLInputElement): string {
  const texts: string[] = [];
  const id = input.id;
  // aria-labelledby
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    labelledBy.split(/\s+/).forEach((ref) => {
      const el = document.getElementById(ref);
      if (el && el.textContent) texts.push(el.textContent);
    });
  }
  // explicit label[for]
  if (id) {
    try {
      const lbl = document.querySelector('label[for="' + id.replace(/"/g, '\\"') + '"]') as HTMLLabelElement | null;
      if (lbl && lbl.textContent) texts.push(lbl.textContent);
    } catch {}
  }
  // implicit parent label
  const closestLabel = input.closest('label');
  if (closestLabel && closestLabel.textContent) texts.push(closestLabel.textContent);
  // previous sibling label (common in some UIs)
  const prev = input.previousElementSibling as HTMLElement | null;
  if (prev && prev.tagName === 'LABEL' && prev.textContent) texts.push(prev.textContent);
  return texts.join(' ').toLowerCase();
}

// Infer best-fit function name for an input based on type/name/placeholder
async function inferFunctionForInput(input: HTMLInputElement): Promise<string> {
  const type = input.type.toLowerCase();
  const name = (input.name || '').toLowerCase();
  const id = (input.id || '').toLowerCase();
  const placeholder = (input.placeholder || '').toLowerCase();
  const autocomplete = (input.autocomplete || '').toLowerCase();
  const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
  const labelText = getAssociatedLabelText(input);

  const text = `${name} ${id} ${placeholder} ${autocomplete} ${ariaLabel} ${labelText}`;

  // Helper to ensure function exists
  const pick = (fn: string, fallback: string = 'word'): string => (hasFunc(fn) ? fn : fallback);

  // Direct type mappings
  if (type === 'email' || /email/.test(text)) return pick('email');
  if (type === 'password' || /password|pass/.test(text)) return pick('password');
  if (type === 'tel' || /phone|tel|mobile/.test(text)) return pick('phone');
  if (type === 'url' || /url|website/.test(text)) return pick('url');
  if (type === 'color' || /color/.test(text)) return pick('hexcolor');
  // Numeric-like hints (avoid matching 'account' via word boundaries)
  if (type === 'number' || /\b(?:age|qty|quantity|count|amount)\b/.test(text)) {
    return hasFunc('number') ? 'number?min=1&max=9999' : 'word';
  }

  // Placeholder-only numeric hint: if no numeric type but placeholder looks numeric
  // Example: placeholder="0.000" → float-like; placeholder="123" → int-like
  if ((type === '' || type === 'text')) {
    const placeholderRaw = (input.placeholder || '').trim();
    if (/^[+-]?\d+$/.test(placeholderRaw)) {
      const digits = Math.min(placeholderRaw.replace(/[^0-9]/g, '').length || 1, 9);
      const max = Math.pow(10, digits) - 1;
      return `number?min=0&max=${max}`;
    }
    if (/^[+-]?\d+\.\d+$/.test(placeholderRaw)) {
      const parts = placeholderRaw.replace(/[^0-9.]/g, '').split('.');
      const fracDigits = Math.min((parts[1] || '2').length, 6);
      return `generate?str={number:0,100}.{generate:${'#'.repeat(fracDigits)}}`;
    }
  }

  // Credit card number detection
  const looksLikeCcField =
    /credit\s*card|card\b|cc\b/.test(text) && /(number|no|num)/.test(text) ||
    /card[-_ ]?number|credit[-_ ]?card[-_ ]?number/.test(text) ||
    ariaLabel.includes('credit card number') ||
    placeholder.includes('••••') ||
    (input.maxLength >= 16 && input.maxLength <= 19 && (/card|credit/.test(text)));
  if (looksLikeCcField) {
    return 'creditcardnumber';
  }

  // Credit card CVV/CVC/Security Code
  if (/\bcvv\b|\bcvc\b|security\s*code|card\s*code|\bcid\b|\bcv2\b/.test(text)) {
    if (hasFunc('creditcardcvv')) return 'creditcardcvv';
  }

  // Credit card Expiry / Expiration date
  if (/\bexp(iry|iration)?\b|valid\s*(thru|through)|mm\s*\/\s*yy|yy\s*\/\s*mm|mm\s*yy|yy\s*mm|expiry\s*date|exp\.?\s*date/.test(text)
      || /\b\d{2}\s*\/\s*\d{2}\b/.test((input.value || '').toLowerCase())) {
    if (hasFunc('creditcardexp')) return 'creditcardexp';
  }

  // After card-specific checks, fall back to general date/time
  if (type === 'date' || /\bdate\b|\bdob\b|birthday/.test(text)) return pick('date');
  if (type === 'time' || /\btime\b/.test(text)) return pick('date');
  if (type === 'datetime-local' || /\bdatetime\b|appointment/.test(text)) return pick('date');

  // Bank account and routing numbers
  if (/\baccount\b\s*(?:number|no)\b|\bacct\b/.test(text) || /\baccount\s*number\b/.test(placeholder)) {
    if (hasFunc('achaccount')) return 'achaccount';
  }
  if (/routing\s*(number|no)|\baba\b/.test(text)) {
    if (hasFunc('achrouting')) return 'achrouting';
  }

  // Common field heuristics
  // Address line 2 / unit identifiers (must come before generic address/street)
  if (/(^|\b)(apartment|apt|suite|unit|floor|bldg|building|room|ste|address[-_ ]?line[-_ ]?2|address2|addr2|line[-_ ]?2)(\b|$)/.test(text)) {
    return pick('unit');
  }
  if (/first\s*name|firstname|first_name|given/.test(text)) return pick('firstname');
  if (/last\s*name|lastname|last_name|surname|family/.test(text)) return pick('lastname');
  if (/full\s*name|fullname/.test(text)) return pick('name');
  if (/city/.test(text)) return pick('city');
  if (/state|province|region/.test(text)) return pick('state');
  if (/\bpostal\b|\bpostal[-_ ]?code\b|\bpostcode\b|\bzip\b|\bzip[-_ ]?code\b/.test(text)) {
    return hasFunc('postcode') ? 'postcode' : 'zip';
  }
  if (/address|street/.test(text)) return pick('street');
  if (/company|organization|org/.test(text)) return pick('company');
  if (/job|title|role/.test(text)) return pick('jobtitle', pick('job'));
  if (/website|domain/.test(text)) return pick('url');
  if (/username|user\b/.test(text)) return pick('username');

  // Fallbacks
  if (type === 'search') return 'word';
  if (hasFunc('word')) return 'word';
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
