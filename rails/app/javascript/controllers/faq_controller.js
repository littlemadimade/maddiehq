import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["item", "answer", "chevron"]

  connect() {
    this.openIndex = null
  }

  toggle(event) {
    const index = parseInt(event.params.index)
    const answers = this.answerTargets
    const chevrons = this.chevronTargets

    if (this.openIndex === index) {
      // Close current
      answers[index].style.gridTemplateRows = "0fr"
      answers[index].style.opacity = "0"
      chevrons[index].style.transform = "rotate(0deg)"
      this.openIndex = null
    } else {
      // Close previous
      if (this.openIndex !== null && this.openIndex < answers.length) {
        answers[this.openIndex].style.gridTemplateRows = "0fr"
        answers[this.openIndex].style.opacity = "0"
        chevrons[this.openIndex].style.transform = "rotate(0deg)"
      }
      // Open new
      answers[index].style.gridTemplateRows = "1fr"
      answers[index].style.opacity = "1"
      chevrons[index].style.transform = "rotate(180deg)"
      this.openIndex = index
    }
  }
}
