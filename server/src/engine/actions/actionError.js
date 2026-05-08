// Stable error shape for all reducer failures — code is machine-readable, message is human-readable
export class ActionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'ActionError';
  }
}
