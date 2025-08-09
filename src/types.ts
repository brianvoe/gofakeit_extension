export interface GofakeitMessage {
  command: 'autofill-all' | 'autofill-selected' | 'ping';
}

export type NotificationType = 'success' | 'error' | 'info';

export interface SelectionState {
  isActive: boolean;
  highlightedElement: HTMLElement | null;
}

// Extend Window interface for our global state
declare global {
  interface Window {
    gofakeitExtensionInjected?: boolean;
  }
}
