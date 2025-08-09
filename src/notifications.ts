import { NotificationType } from './types';

interface QueuedNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
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
      top: var(--spacing);
      right: var(--spacing);
      z-index: 10000;
      width: 300px;
      display: flex;
      flex-direction: column;
      gap: 8px;
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
    width: 300px;
    padding: var(--spacing-half) var(--spacing);
    border-radius: var(--border-radius);
    color: var(--color-white);
    font-family: var(--font-family);
    font-size: var(--font-size);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateX(100%);
    word-wrap: break-word;
  `;
  
  switch (queuedNotification.type) {
    case 'success':
      notification.style.backgroundColor = 'var(--color-success)';
      break;
    case 'error':
      notification.style.backgroundColor = 'var(--color-error)';
      break;
    default:
      notification.style.backgroundColor = 'var(--color-info)';
  }
  
  notification.textContent = queuedNotification.message;
  
  // Add to container and active list
  notificationContainer!.appendChild(notification);
  activeNotifications.push(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  });
  

  
  // Remove notification after 5 seconds
  setTimeout(() => {
    // Animate out
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      removeNotification(notification);
    }, 300);
  }, 5000);
  
  isProcessingQueue = false;
}

// Create a queued notification system
export function showNotification(message: string, type: NotificationType = 'info'): void {
  // Add notification to queue
  const queuedNotification: QueuedNotification = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    message,
    type,
    timestamp: Date.now()
  };
  
  notificationQueue.push(queuedNotification);
  
  // Process queue if not already processing
  if (!isProcessingQueue) {
    processNextNotification();
  }
}
