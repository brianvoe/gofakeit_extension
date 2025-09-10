// UUID Generator functionality
export class UuidGenerator {
  private modal: HTMLElement;
  private uuidOutput: HTMLInputElement;
  private versionSelect: HTMLSelectElement;
  private generateBtn: HTMLButtonElement;
  private copyBtn: HTMLButtonElement;
  private openBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;

  constructor() {
    this.modal = document.getElementById("uuid-modal") as HTMLElement;
    this.uuidOutput = document.getElementById(
      "uuid-output"
    ) as HTMLInputElement;
    this.versionSelect = document.getElementById(
      "uuid-version"
    ) as HTMLSelectElement;
    this.generateBtn = document.getElementById(
      "generate-uuid"
    ) as HTMLButtonElement;
    this.copyBtn = document.getElementById("copy-uuid") as HTMLButtonElement;
    this.openBtn = document.getElementById(
      "open-uuid-modal"
    ) as HTMLButtonElement;
    this.closeBtn = document.getElementById(
      "close-uuid-modal"
    ) as HTMLButtonElement;

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Modal open/close
    this.openBtn.addEventListener("click", () => {
      this.openModal();
    });

    this.closeBtn.addEventListener("click", () => {
      this.closeModal();
    });

    // Close modal when clicking outside
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal.classList.contains("active")) {
        this.closeModal();
      }
    });

    // Generate UUID button
    this.generateBtn.addEventListener("click", async () => {
      this.generateBtn.disabled = true;
      this.generateBtn.textContent = "Generating...";
      await this.generateUuid();
      this.generateBtn.disabled = false;
      this.generateBtn.textContent = "Generate UUID";
    });

    // Copy UUID button
    this.copyBtn.addEventListener("click", () => {
      this.copyUuid();
    });
  }

  private openModal(): void {
    this.modal.classList.add("active");
    // Focus the first input for better accessibility
    this.uuidOutput.focus();
  }

  private closeModal(): void {
    this.modal.classList.remove("active");
  }

  private async generateUuid(): Promise<void> {
    try {
      // Build query parameters based on user selection
      const params = new URLSearchParams();
      params.append("version", this.versionSelect.value);

      // Fetch UUID from Gofakeit API
      const response = await fetch(
        `https://api.gofakeit.com/funcs/uuid?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const uuid = await response.text();
      this.uuidOutput.value = uuid;
      this.uuidOutput.style.color = "";
    } catch (error) {
      console.error("[Gofakeit] Error generating UUID:", error);
      this.uuidOutput.value = "Error generating UUID";
      this.uuidOutput.style.color = 'var(--gofakeit-error)';
    }
  }

  private async copyUuid(): Promise<void> {
    if (
      !this.uuidOutput.value ||
      this.uuidOutput.value === "Error generating UUID"
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.uuidOutput.value);

      // Visual feedback
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = "Copied!";
      this.copyBtn.style.backgroundColor = 'var(--gofakeit-success)';

      setTimeout(() => {
        this.copyBtn.textContent = originalText;
        this.copyBtn.style.backgroundColor = "";
      }, 200);
    } catch (error) {
      console.error("Failed to copy UUID:", error);
      this.copyBtn.textContent = "Failed";
      this.copyBtn.style.backgroundColor = 'var(--gofakeit-error)';

      setTimeout(() => {
        this.copyBtn.textContent = "Copy";
        this.copyBtn.style.backgroundColor = "";
      }, 200);
    }
  }
}
