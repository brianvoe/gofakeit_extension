// Notification type definitions
type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'persistent';

interface QueuedNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  persistent?: boolean;
  duration?: number;
}

// Notification class for managing notifications
export class Notification {
  private notificationContainer: HTMLElement | null = null;
  private activeNotifications: HTMLElement[] = [];
  private notificationQueue: QueuedNotification[] = [];
  private isProcessingQueue = false;
  private defaultDuration = 5000; // Default duration in milliseconds

  // Main method to show notifications
  public show(
    type: NotificationType,
    message: string,
    duration?: number
  ): void {
    // Add notification to queue
    const queuedNotification: QueuedNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: Date.now(),
      persistent: type === "persistent",
      duration,
    };

    this.notificationQueue.push(queuedNotification);

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processNextNotification();
    }
  }

  // Initialize the notification container
  private initNotificationContainer(): void {
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement("div");
      this.notificationContainer.id = "gofakeit-notifications";
      this.notificationContainer.className = "gfi-notifications";
      document.body.appendChild(this.notificationContainer);
    }
  }

  // Remove a notification from the list and reposition others
  private removeNotification(notification: HTMLElement): void {
    const index = this.activeNotifications.indexOf(notification);
    if (index > -1) {
      this.activeNotifications.splice(index, 1);
    }

    if (this.notificationContainer && notification.parentNode) {
      this.notificationContainer.removeChild(notification);
    }
  }


  // Create visual indicator for selection mode
  private createSelectionIndicator(): HTMLElement {
    const indicator = document.createElement("div");
    indicator.className = "gfi-selection-indicator";

    // Create cursor icon
    const cursorIcon = document.createElement("div");
    cursorIcon.innerHTML = "👆";
    cursorIcon.className = "gfi-cursor-icon";

    const text = document.createElement("span");
    text.textContent = "Hover over form fields or containers to highlight them";

    indicator.appendChild(cursorIcon);
    indicator.appendChild(text);

    return indicator;
  }

  // Process the next notification in the queue
  private async processNextNotification(): Promise<void> {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Get the next notification from the queue
    const queuedNotification = this.notificationQueue.shift()!;

    // Initialize container if needed
    this.initNotificationContainer();

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `gfi-notification gfi-${queuedNotification.type}`;
    notification.dataset.gofakeitPersistent = queuedNotification.persistent ? "true" : "false";

    // Create message element
    const message = document.createElement("div");
    message.className = "gfi-notification-message";
    
    // Check if message contains HTML tags
    if (queuedNotification.message.includes('<')) {
      message.innerHTML = queuedNotification.message;
    } else {
      message.textContent = queuedNotification.message;
    }

    // Add message to notification
    notification.appendChild(message);

    // Add to container and active list
    this.notificationContainer!.appendChild(notification);
    this.activeNotifications.push(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add("gfi-visible");
    });

    // Only auto-remove non-persistent notifications
    if (queuedNotification.type !== "persistent") {
      const duration = queuedNotification.duration || this.defaultDuration;
      setTimeout(() => {
        // Animate out
        notification.classList.add("gfi-exiting");
        
        setTimeout(() => {
          this.removeNotification(notification);
        }, 300);
      }, duration);
    }

    this.isProcessingQueue = false;
  }


  // Function to dismiss all persistent notifications
  public dismissAllPersistentNotifications(): void {
    this.activeNotifications.forEach((notification) => {
      if (
        (notification as any).dataset &&
        (notification as any).dataset.gofakeitPersistent === "true"
      ) {
        notification.classList.add("gfi-exiting");
        setTimeout(() => {
          this.removeNotification(notification);
        }, 300);
      }
    });
  }
}
