import OpenAI from "openai";

export interface ToxicityResult {
  score: number | null;
  breakdown: Record<string, number> | null;
}

export interface ToxicityClassifier {
  classify(text: string): Promise<ToxicityResult>;
}

export class StubToxicityClassifier implements ToxicityClassifier {
  async classify(_text: string): Promise<ToxicityResult> {
    return { score: null, breakdown: null };
  }
}

export class OpenAIToxicityClassifier implements ToxicityClassifier {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn(
        "[ToxicityClassifier] WARNING: OPENAI_API_KEY environment variable is not configured. Toxicity classification will be disabled."
      );
    }
  }

  async classify(text: string): Promise<ToxicityResult> {
    if (!this.openai) {
      return { score: null, breakdown: null };
    }

    return this.classifyWithRetry(text, 1);
  }

  private async classifyWithRetry(text: string, retries: number): Promise<ToxicityResult> {
    try {
      if (!this.openai) return { score: null, breakdown: null };

      // Call OpenAI Moderation API using the latest model
      const response = await this.openai.moderations.create({
        model: "omni-moderation-latest",
        input: text,
      });

      const result = response.results[0];
      if (!result) {
        return { score: null, breakdown: null };
      }

      const scores = result.category_scores as unknown as Record<string, number>;
      
      // Combine 'hate' and 'harassment' scores specifically.
      // We use Math.max of the two categories to ensure that if a post is extremely hateful
      // but not harassing (or vice versa), the severity is not diluted by averaging.
      // We scale the 0.0 - 1.0 confidence float to 0 - 100.
      const hateScore = scores.hate || 0;
      const harassmentScore = scores.harassment || 0;
      const combinedScore = Math.max(hateScore, harassmentScore) * 100;

      return {
        score: combinedScore,
        breakdown: scores,
      };
    } catch (err: any) {
      console.warn(
        `[ToxicityClassifier] OpenAI Moderation API call failed: ${err.message}`
      );
      if (retries > 0) {
        console.log(
          `[ToxicityClassifier] Retrying API call... (remaining retries: ${retries})`
        );
        // Wait 500ms before retry for transient/rate-limiting errors
        await new Promise((resolve) => setTimeout(resolve, 500));
        return this.classifyWithRetry(text, retries - 1);
      }
      return { score: null, breakdown: null };
    }
  }
}
