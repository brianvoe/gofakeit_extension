// Show error message as a floating tooltip over a form field
export function showFieldError(element: Element, message: string): void {
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
