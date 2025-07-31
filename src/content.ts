// Fake data generators
const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Eve"];
const lastNames  = ["Smith", "Johnson", "Williams", "Brown", "Jones"];
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomName(): string {
  return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
}
function randomEmail(): string {
  const provider = randomItem(["example.com", "mail.com", "test.com"]);
  return `${randomItem(firstNames).toLowerCase()}.${randomItem(lastNames).toLowerCase()}@${provider}`;
}
function randomInt(): number {
  return Math.floor(Math.random() * 100);
}
function randomWord(): string {
  const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur"];
  return randomItem(words);
}
function randomSentence(): string {
  const wordCount = Math.floor(Math.random() * 5) + 3;
  const sentenceWords = Array.from({ length: wordCount }, () => randomWord());
  // Capitalize first word and add period at end
  sentenceWords[0] = sentenceWords[0][0].toUpperCase() + sentenceWords[0].slice(1);
  return sentenceWords.join(" ") + ".";
}

// Autofill inputs and textareas
document.querySelectorAll('input, textarea').forEach(element => {
  if (element instanceof HTMLTextAreaElement) {
    element.value = randomSentence();  // fill textarea with a random sentence
  } else if (element instanceof HTMLInputElement) {
    switch (element.type.toLowerCase()) {
      case 'text':
        element.value = randomName();
        break;
      case 'email':
        element.value = randomEmail();
        break;
      case 'number':
        element.value = randomInt().toString();
        break;
      case 'checkbox':
      case 'radio':
        // Randomly check half of checkboxes/radios
        element.checked = Math.random() < 0.5;
        break;
      default:
        // Default fill for other input types (e.g. search, url, etc.)
        element.value = randomWord();
    }
  }
});
