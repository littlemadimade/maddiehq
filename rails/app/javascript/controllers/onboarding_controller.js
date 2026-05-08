import { Controller } from "@hotwired/stimulus"

const STORAGE_KEY = "maddiehq-onboarding-completed"

export default class extends Controller {
  static targets = ["modal", "stepTitle", "stepDescription",
                     "progress", "backButton", "nextLabel", "skipButton", "planNote",
                     "iconSprout", "iconShield", "iconDatabase", "iconZap"]

  connect() {
    this.currentStep = 0
    this.steps = [
      {
        title: "Welcome to MaddieHQ!",
        description: "You've just launched your new app with authentication, database, payments, and email all wired up and ready to go.",
        icon: "sprout"
      },
      {
        title: "Built-in Security",
        description: "Your app comes with secure authentication including OAuth providers, email/password login, two-factor authentication, and password reset flows.",
        icon: "shield"
      },
      {
        title: "Database Ready",
        description: "SQLite is set up with ActiveRecord for fast local development. Add tables, create API routes, and start building your data layer immediately.",
        icon: "database"
      },
      {
        title: "You're All Set!",
        description: "Start building by editing the dashboard page. Your app is ready for development with Stripe payments, email (Resend), and everything configured.",
        icon: "zap"
      }
    ]

    if (!localStorage.getItem(STORAGE_KEY)) {
      this.show()
    }
  }

  show() {
    if (this.hasModalTarget) {
      this.modalTarget.classList.remove("hidden")
      this.renderStep()
    }
  }

  complete() {
    localStorage.setItem(STORAGE_KEY, "true")
    if (this.hasModalTarget) this.modalTarget.classList.add("hidden")
  }

  skip() { this.complete() }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++
      this.renderStep()
    } else {
      this.complete()
    }
  }

  back() {
    if (this.currentStep > 0) {
      this.currentStep--
      this.renderStep()
    }
  }

  renderStep() {
    const step = this.steps[this.currentStep]
    const isLast = this.currentStep === this.steps.length - 1

    if (this.hasStepTitleTarget) this.stepTitleTarget.textContent = step.title
    if (this.hasStepDescriptionTarget) this.stepDescriptionTarget.textContent = step.description

    // Toggle icon visibility
    const iconTargets = { sprout: this.iconSproutTarget, shield: this.iconShieldTarget, database: this.iconDatabaseTarget, zap: this.iconZapTarget }
    Object.entries(iconTargets).forEach(([name, el]) => {
      if (el) el.classList.toggle("hidden", name !== step.icon)
    })

    // Update progress dots
    if (this.hasProgressTarget) {
      this.progressTarget.textContent = ""
      this.steps.forEach((_, i) => {
        const dot = document.createElement("div")
        dot.className = i === this.currentStep
          ? "h-1.5 w-6 rounded-full bg-primary dark:bg-primary transition-all duration-300"
          : i < this.currentStep
            ? "h-1.5 w-3 rounded-full bg-primary dark:bg-primary transition-all duration-300"
            : "h-1.5 w-3 rounded-full bg-gray-200 dark:bg-gray-600 transition-all duration-300"
        this.progressTarget.appendChild(dot)
      })
    }

    if (this.hasBackButtonTarget) this.backButtonTarget.classList.toggle("hidden", this.currentStep === 0)
    if (this.hasNextLabelTarget) this.nextLabelTarget.textContent = isLast ? "Get Started" : "Next"
    if (this.hasSkipButtonTarget) this.skipButtonTarget.classList.toggle("hidden", isLast)
    if (this.hasPlanNoteTarget) this.planNoteTarget.classList.toggle("hidden", this.currentStep !== 0)
  }
}
