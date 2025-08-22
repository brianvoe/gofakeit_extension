import { fetchGofakeitData } from './api';
import { handleError } from './autofill';

// Handle number input elements
export async function handleNumberInput(element: HTMLInputElement, gofakeitFunc: string): Promise<{ success: boolean, usedFunc: string }> {
  // Use number function if 'true' is passed, otherwise use the provided function
  const functionToCall = gofakeitFunc === 'true' ? 'number' : gofakeitFunc;
  const response = await fetchGofakeitData(functionToCall);
  
  if (!response.success) {
    console.warn(`[Gofakeit Autofill] Error for function ${functionToCall}:`, response.error);
    
    if (response.status === 400) {
      handleError(element, '', functionToCall);
    }
    return { success: false, usedFunc: functionToCall };
  }
  
  element.value = response.data!;
  
  // Trigger events to ensure any listeners are notified
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  return { success: true, usedFunc: functionToCall };
}

// Handle range input elements
export async function handleRangeInput(element: HTMLInputElement, gofakeitFunc: string): Promise<{ success: boolean, usedFunc: string }> {
  // For range inputs, always use gofakeit API with min/max from the element
  const min = parseFloat(element.min) || 0;
  const max = parseFloat(element.max) || 100;
  
  // Use number function with min/max parameters
  const functionToCall = `number?min=${min}&max=${max}`;
  const response = await fetchGofakeitData(functionToCall);
  
  if (!response.success) {
    console.warn(`[Gofakeit Autofill] Error for range input:`, response.error);
    
    if (response.status === 400) {
      handleError(element, 'Failed to get random number for range');
    }
    return { success: false, usedFunc: functionToCall };
  }
  
  element.value = response.data!;
  
  // Trigger events to ensure any listeners are notified
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  return { success: true, usedFunc: functionToCall };
}
