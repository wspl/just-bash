import type { FeatureCoverageWriter } from "../../../types.js";

export interface CoverageSnapshot {
  features: Record<string, number>;
}

export class FeatureCoverage implements FeatureCoverageWriter {
  private readonly hits: Map<string, number> = new Map();

  hit(feature: string): void {
    const normalized = feature.trim();
    if (normalized.length === 0) return;
    this.hits.set(normalized, (this.hits.get(normalized) ?? 0) + 1);
  }

  snapshot(): CoverageSnapshot {
    return {
      features: Object.fromEntries([...this.hits.entries()].sort()),
    };
  }
}
