export interface AIConfig {
  models: {
    transcription: string;
    textGeneration: string;
  };
  limits: {
    timeoutMs: number;
    maxOutputTokens: number;
    maxCostPerTenantPerMonth: number;
  };
}

export const aiConfig: AIConfig = {
  models: {
    // Current placeholder/simulated model names often used in demos, or standard names
    transcription: 'gemini-3.5-transcribe', // Map to actual provider model in real prod if needed
    textGeneration: 'gemini-1.5-pro'
  },
  limits: {
    timeoutMs: 30000,
    maxOutputTokens: 2048,
    maxCostPerTenantPerMonth: 50.0 // $50 limit for demo purposes
  }
};
