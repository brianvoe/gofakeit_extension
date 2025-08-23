import { 
  autofillAll as gofakeitAutofillAll, 
  autofillContainer as gofakeitAutofillContainer, 
  autofillElement as gofakeitAutofillElement
} from 'gofakeit';
import { GOFAKEIT_COLORS, GOFAKEIT_FONT, GOFAKEIT_SPACING, GOFAKEIT_BORDER, GOFAKEIT_TIMING, GOFAKEIT_ZINDEX } from './styles';
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
      chrome.storage.sync.get({ gofakeitSmartFill: true }, (items) => {
        resolve(!!items.gofakeitSmartFill);
      });
    } catch {
      resolve(false);
    }
  });
}

// Display a small badge showing the function used for this field
function showFunctionBadge(element: Element, funcName: string): void {
  if (!(element instanceof HTMLElement)) return;

  const badge = document.createElement('div');
  badge.textContent = funcName;
  badge.style.position = 'fixed';
  badge.style.background = GOFAKEIT_COLORS.primary;
  badge.style.color = '#000';
  badge.style.fontFamily = GOFAKEIT_FONT.family;
  badge.style.fontSize = `${GOFAKEIT_FONT.size - 3}px`;
  badge.style.padding = `${GOFAKEIT_SPACING.quarter}px ${GOFAKEIT_SPACING.quarter}px`;
  badge.style.borderRadius = `${GOFAKEIT_BORDER.radius}px`;
  badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
  badge.style.zIndex = GOFAKEIT_ZINDEX.badge.toString();
  badge.style.opacity = '0';
  badge.style.transform = `translateY(-${GOFAKEIT_SPACING.quarter}px)`;
  badge.style.transition = `opacity ${GOFAKEIT_TIMING.fast}ms ease, transform ${GOFAKEIT_TIMING.fast}ms ease`;
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
    const top = rect.top - GOFAKEIT_SPACING.quarter;
    const left = rect.left;
    badge.style.top = `${top}px`;
    badge.style.left = `${left}px`;
  };

  document.body.appendChild(badge);
  updatePosition();

  // Animate in
  requestAnimationFrame(() => {
    badge.style.opacity = '1';
    badge.style.transform = `translateY(-${GOFAKEIT_SPACING.half}px)`;
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
    badge.style.transform = `translateY(-${GOFAKEIT_SPACING.quarter}px)`;
    setTimeout(() => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize, true);
      if (ro) {
        try { ro.disconnect(); } catch {}
        ro = null;
      }
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    }, GOFAKEIT_TIMING.fast + 20);
  }, DISPLAY_MS);
}

// Enhanced autofill element with Chrome extension features
async function autofillElementWithExtension(element: Element): Promise<boolean> {
  const gofakeitFunc = element.getAttribute('data-gofakeit');
  if (typeof gofakeitFunc === 'string' && gofakeitFunc.trim().toLowerCase() === 'false') {
    return false;
  }
  const smartEnabled = await isSmartFillEnabled();
  
  if (!gofakeitFunc && !smartEnabled) {
    return false;
  }

  try {
    const success = await gofakeitAutofillElement(element);
    
    // Show function badge if successful
    if (success && gofakeitFunc && gofakeitFunc !== 'true') {
      showFunctionBadge(element, gofakeitFunc);
    }
    
    return success;
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
    await gofakeitAutofillAll();
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
    await gofakeitAutofillContainer(container);
    showNotification('Container autofill completed successfully!', 'success');
  } catch (error) {
    console.error('[Gofakeit] Error during container autofill:', error);
    showNotification('Container autofill failed. Please try again.', 'error');
  }
}

// Enhanced autofill element with Chrome extension features
export async function autofillElement(element: Element): Promise<boolean> {
  return autofillElementWithExtension(element);
}

// Handle error display and field highlighting
export function handleError(element: Element, error: string, functionName?: string): void {
  if (element instanceof HTMLElement) {
    element.style.border = `${GOFAKEIT_BORDER.width}px solid ${GOFAKEIT_COLORS.error}`;
    
    setTimeout(() => {
      element.style.border = '';
    }, GOFAKEIT_TIMING.slow);
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
