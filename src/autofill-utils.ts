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
