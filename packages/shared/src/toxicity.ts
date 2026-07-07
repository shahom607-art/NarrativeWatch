/**
 * Phase 2 stub — swap for Perspective API or HuggingFace implementation.
 */
export interface ToxicityClassifier {
  classify(text: string): Promise<number | null>;
}

export class StubToxicityClassifier implements ToxicityClassifier {
  async classify(_text: string): Promise<number | null> {
    return null;
  }
}
