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
    notificationContainer.className = "notifications";
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
  dismissBtn.className = "dismiss-btn";

  dismissBtn.addEventListener("click", () => {
    // Animate out
    notification.classList.add("exiting");

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
  indicator.className = "selection-indicator";

  // Create cursor icon
  const cursorIcon = document.createElement("div");
  cursorIcon.innerHTML = "👆";
  cursorIcon.className = "cursor-icon";

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
  notification.className = `notification ${queuedNotification.type}`;

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
    notification.classList.add("visible");
  });

  // Only auto-remove non-persistent notifications after 5 seconds
  if (queuedNotification.type !== "persistent") {
        setTimeout(() => {
          // Animate out
    notification.classList.add("exiting");
    
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
      notification.classList.add("exiting");

      setTimeout(() => {
        removeNotification(notification);
      }, 300);
    }
  });
}
