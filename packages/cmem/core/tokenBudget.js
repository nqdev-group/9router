export class TokenBudget {
  constructor(maxTokens) {
    this.maxTokens = maxTokens;
    this.used = 0;
  }

  canFit(tokens) {
    return (this.used + tokens) <= this.maxTokens;
  }

  consume(tokens) {
    this.used += tokens;
  }

  remaining() {
    return this.maxTokens - this.used;
  }

  reset() {
    this.used = 0;
  }
}
