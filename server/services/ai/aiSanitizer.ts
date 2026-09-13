/**
 * AI Sanitizer
 * Responsible for masking PII before sending data to AI providers,
 * and filtering AI outputs for safety.
 */

export class AISanitizer {
  
  /**
   * Masks obvious PII from text
   */
  static redactPII(text: string): string {
    if (!text) return text;
    
    // Mask emails
    let sanitized = text.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[EMAIL]');
    
    // Mask typical phone numbers (basic heuristics)
    sanitized = sanitized.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]');
    
    return sanitized;
  }

  /**
   * Validates output from the AI to ensure no prompt injection triggered dangerous outputs.
   * This is a basic filter for demonstration.
   */
  static validateOutput(text: string): boolean {
    if (!text) return true;
    
    const dangerousPhrases = [
      'ignore previous instructions',
      'system prompt:',
      'you are an ai'
    ];
    
    const lower = text.toLowerCase();
    for (const phrase of dangerousPhrases) {
      if (lower.includes(phrase)) {
        return false;
      }
    }
    
    return true;
  }
}
