import { NotificationType } from './types';
import { GOFAKEIT_BORDER, GOFAKEIT_COLORS, GOFAKEIT_SPACING } from './styles';

interface QueuedNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  persistent?: boolean;
  dismissCallback?: () => void;
}

// Global notification container
let notificationContainer: HTMLElement | null = null;
let activeNotifications: HTMLElement[] = [];
let notificationQueue: QueuedNotification[] = [];
let isProcessingQueue = false;

// Initialize the notification container
function initNotificationContainer(): void {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'gofakeit-notifications';
    notificationContainer.style.cssText = `
      position: fixed;
      top: ${GOFAKEIT_SPACING.base}px;
      right: ${GOFAKEIT_SPACING.base}px;
      z-index: 1000000;
      width: 300px;
      display: flex;
      flex-direction: column;
      gap: ${GOFAKEIT_SPACING.quarter}px;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(notificationContainer);
  }
}

// Remove a notification from the list and reposition others
function removeNotification(notification: HTMLElement): void {
  const index = activeNotifications.indexOf(notification);
  if (index > -1) {
    activeNotifications.splice(index, 1);
  }
  
  if (notification.parentNode) {
    notification.parentNode.removeChild(notification);
  }
  
  // Process next notification in queue
  processNextNotification();
}

// Create a dismiss button for persistent notifications
function createDismissButton(notification: HTMLElement, dismissCallback?: () => void): HTMLElement {
  const dismissBtn = document.createElement('button');
  dismissBtn.innerHTML = '&times;';
  dismissBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: none;
    color: ${GOFAKEIT_COLORS.white};
    font-size: 18px;
    cursor: pointer;
    opacity: 0.7;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  dismissBtn.addEventListener('mouseenter', () => {
    dismissBtn.style.opacity = '1';
  });
  
  dismissBtn.addEventListener('mouseleave', () => {
    dismissBtn.style.opacity = '0.7';
  });
  
  dismissBtn.addEventListener('click', () => {
    // Animate out
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      removeNotification(notification);
      if (dismissCallback) {
        dismissCallback();
      }
    }, 300);
  });
  
  return dismissBtn;
}

// Create visual indicator for selection mode
function createSelectionIndicator(): HTMLElement {
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-size: 12px;
  `;
  
  // Create cursor icon
  const cursorIcon = document.createElement('div');
  cursorIcon.innerHTML = '👆';
  cursorIcon.style.cssText = `
    font-size: 16px;
    animation: gofakeit-pulse 2s infinite;
  `;
  
  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes gofakeit-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(2); }
    }
  `;
  document.head.appendChild(style);
  
  const text = document.createElement('span');
  text.textContent = 'Hover over form fields or containers to highlight them';
  
  indicator.appendChild(cursorIcon);
  indicator.appendChild(text);
  
  return indicator;
}

// Process the next notification in the queue
async function processNextNotification(): Promise<void> {
  if (isProcessingQueue || notificationQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  // Get the next notification from the queue
  const queuedNotification = notificationQueue.shift()!;
  
  // Initialize container if needed
  initNotificationContainer();
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: relative;
    padding: ${GOFAKEIT_SPACING.half}px ${GOFAKEIT_SPACING.base}px;
    border-radius: ${GOFAKEIT_BORDER.radius}px;
    color: ${GOFAKEIT_COLORS.text};
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateX(100%);
    word-wrap: break-word;
  `;
  
  switch (queuedNotification.type) {
    case 'success':
      notification.style.backgroundColor = GOFAKEIT_COLORS.success;
      break;
    case 'error':
      notification.style.backgroundColor = GOFAKEIT_COLORS.error;
      break;
    case 'persistent':
      notification.style.backgroundColor = GOFAKEIT_COLORS.info;
      notification.style.border = `${GOFAKEIT_BORDER.width}px solid ${GOFAKEIT_COLORS.primary}`;
      break;
    default:
      notification.style.backgroundColor = GOFAKEIT_COLORS.info;
  }
  
  notification.textContent = queuedNotification.message;
  
  // Add dismiss button for persistent notifications
  if (queuedNotification.type === 'persistent') {
    (notification as any).dataset.gofakeitPersistent = 'true';
    const dismissBtn = createDismissButton(notification, queuedNotification.dismissCallback);
    notification.appendChild(dismissBtn);
    
    // Add selection indicator for selection mode
    if (queuedNotification.message.includes('Click on a form field')) {
      const indicator = createSelectionIndicator();
      notification.appendChild(indicator);
    }
  }
  
  // Add to container and active list
  notificationContainer!.appendChild(notification);
  activeNotifications.push(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  });
  
  // Only auto-remove non-persistent notifications after 5 seconds
  if (queuedNotification.type !== 'persistent') {
    setTimeout(() => {
      // Animate out
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        removeNotification(notification);
      }, 300);
    }, 5000);
  }
  
  isProcessingQueue = false;
}

// Create a queued notification system
export function showNotification(message: string, type: NotificationType = 'info', dismissCallback?: () => void): void {
  // Add notification to queue
  const queuedNotification: QueuedNotification = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    message,
    type,
    timestamp: Date.now(),
    persistent: type === 'persistent',
    dismissCallback
  };
  
  notificationQueue.push(queuedNotification);
  
  // Process queue if not already processing
  if (!isProcessingQueue) {
    processNextNotification();
  }
}

// Function to dismiss all persistent notifications
export function dismissAllPersistentNotifications(): void {
  activeNotifications.forEach(notification => {
    if ((notification as any).dataset && (notification as any).dataset.gofakeitPersistent === 'true') {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        removeNotification(notification);
      }, 300);
    }
  });
}
