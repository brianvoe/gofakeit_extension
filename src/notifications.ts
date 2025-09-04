// Notification type definitions
type NotificationType = 'success' | 'error' | 'info' | 'persistent';

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
    notificationContainer = document.createElement("div");
    notificationContainer.id = "gofakeit-notifications";
    notificationContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 1000000;
      width: 300px;
      gap: 8px;
      font-family: "Helvetica, Arial, sans-serif";
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
function createDismissButton(
  notification: HTMLElement,
  dismissCallback?: () => void
): HTMLElement {
  const dismissBtn = document.createElement("button");
  dismissBtn.innerHTML = "&times;";
  dismissBtn.style.cssText = `
    display: flex;
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.7;
    padding: 0;
    width: 20px;
    height: 20px;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s ease;
  `;

  dismissBtn.addEventListener("mouseenter", () => {
    dismissBtn.style.opacity = "1";
  });

  dismissBtn.addEventListener("mouseleave", () => {
    dismissBtn.style.opacity = "0.7";
  });

  dismissBtn.addEventListener("click", () => {
    // Animate out
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";

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
  const indicator = document.createElement("div");
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
  const cursorIcon = document.createElement("div");
  cursorIcon.innerHTML = "👆";
  cursorIcon.style.cssText = `
    font-size: 16px;
    animation: gofakeit-pulse 2s infinite;
  `;

  // Add pulse animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes gofakeit-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(2); }
    }
  `;
  document.head.appendChild(style);

  const text = document.createElement("span");
  text.textContent = "Hover over form fields or containers to highlight them";

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

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: relative;
    padding: 12px 24px;
    border-radius: 6px;
    color: #ffffff;
    font-family: "Helvetica, Arial, sans-serif";
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateX(100%);
    word-wrap: break-word;
  `;

  // Apply type-specific styling
  switch (queuedNotification.type) {
    case "success":
      notification.style.backgroundColor = "#48c774";
      break;
    case "error":
      notification.style.backgroundColor = "#ff3860";
      break;
    case "persistent":
      notification.style.backgroundColor = "#209cee";
      notification.style.border = "2px solid #ffa000";
      break;
    default:
      notification.style.backgroundColor = "#209cee";
  }

  notification.textContent = queuedNotification.message;

  // Add dismiss button for persistent notifications
  if (queuedNotification.type === "persistent") {
    (notification as any).dataset.gofakeitPersistent = "true";
    const dismissBtn = createDismissButton(
      notification,
      queuedNotification.dismissCallback
    );
    notification.appendChild(dismissBtn);

    // Add selection indicator for selection mode
    if (queuedNotification.message.includes("Click on a form field")) {
      const indicator = createSelectionIndicator();
      notification.appendChild(indicator);
    }
  }

  // Add to container and active list
  notificationContainer!.appendChild(notification);
  activeNotifications.push(notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateX(0)";
  });

  // Only auto-remove non-persistent notifications after 5 seconds
  if (queuedNotification.type !== "persistent") {
        setTimeout(() => {
          // Animate out
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    
    setTimeout(() => {
      removeNotification(notification);
    }, 300);
    }, 500);
  }

  isProcessingQueue = false;
}

// Create a queued notification system
export function showNotification(
  message: string,
  type: NotificationType = "info",
  dismissCallback?: () => void
): void {
  // Add notification to queue
  const queuedNotification: QueuedNotification = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    message,
    type,
    timestamp: Date.now(),
    persistent: type === "persistent",
    dismissCallback,
  };

  notificationQueue.push(queuedNotification);

  // Process queue if not already processing
  if (!isProcessingQueue) {
    processNextNotification();
  }
}

// Function to dismiss all persistent notifications
export function dismissAllPersistentNotifications(): void {
  activeNotifications.forEach((notification) => {
    if (
      (notification as any).dataset &&
      (notification as any).dataset.gofakeitPersistent === "true"
    ) {
      notification.classList.add("gfi-exit");

      setTimeout(() => {
        removeNotification(notification);
      }, 300);
    }
  });
}
