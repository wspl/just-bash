import { getAllCommandFuzzInfo } from "../../../commands/fuzz-flags.js";
import { SHELL_BUILTINS } from "../../../interpreter/helpers/shell-constants.js";
import type { CoverageSnapshot } from "./feature-coverage.js";

export interface CoverageCategoryReport {
  category: string;
  covered: number;
  total: number;
  percent: number;
  uncovered: string[];
}

export interface CoverageCorpusEntry {
  script: string;
  features: string[];
}

export interface CoverageReport {
  totalCovered: number;
  totalKnown: number;
  totalPercent: number;
  categories: CoverageCategoryReport[];
  corpus: CoverageCorpusEntry[];
}

export class CoverageTracker {
  private readonly knownFeatures: Set<string>;
  private readonly observedCounts: Map<string, number> = new Map();
  private readonly corpusEntries: CoverageCorpusEntry[] = [];

  constructor(knownFeatures: Iterable<string> = DEFAULT_KNOWN_FEATURES) {
    this.knownFeatures = new Set(knownFeatures);
  }

  recordRun(snapshot: CoverageSnapshot, script: string): string[] {
    const features = Object.entries(snapshot.features)
      .filter(([, count]) => count > 0)
      .map(([feature]) => feature)
      .sort();
    const newlyCovered: string[] = [];

    for (const feature of features) {
      this.knownFeatures.add(feature);
      if (!this.observedCounts.has(feature)) {
        newlyCovered.push(feature);
      }
      this.observedCounts.set(
        feature,
        (this.observedCounts.get(feature) ?? 0) +
          (snapshot.features[feature] ?? 0),
      );
    }

    if (newlyCovered.length > 0) {
      this.corpusEntries.push({
        script,
        features: newlyCovered,
      });
    }

    return newlyCovered;
  }

  report(): CoverageReport {
    const categories = new Map<
      string,
      { known: string[]; covered: string[] }
    >();

    for (const feature of [...this.knownFeatures].sort()) {
      const category = categoryFor(feature);
      const entry = categories.get(category) ?? { known: [], covered: [] };
      entry.known.push(feature);
      if (this.observedCounts.has(feature)) {
        entry.covered.push(feature);
      }
      categories.set(category, entry);
    }

    const categoryReports = [...categories.entries()]
      .map(([category, entry]): CoverageCategoryReport => {
        const uncovered = entry.known.filter(
          (feature) => !this.observedCounts.has(feature),
        );
        return {
          category,
          covered: entry.covered.length,
          total: entry.known.length,
          percent: percent(entry.covered.length, entry.known.length),
          uncovered,
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category));

    return {
      totalCovered: this.observedCounts.size,
      totalKnown: this.knownFeatures.size,
      totalPercent: percent(this.observedCounts.size, this.knownFeatures.size),
      categories: categoryReports,
      corpus: [...this.corpusEntries],
    };
  }
}

function categoryFor(feature: string): string {
  const [domain, area] = feature.split(":");
  if (!domain) return "unknown";
  if (!area) return domain;
  return `${domain}:${area}`;
}

function percent(covered: number, total: number): number {
  if (total === 0) return 100;
  return (covered / total) * 100;
}

const BASH_COMMAND_NODE_TYPES = [
  "SimpleCommand",
  "If",
  "For",
  "CStyleFor",
  "While",
  "Until",
  "Case",
  "Subshell",
  "Group",
  "ArithmeticCommand",
  "ConditionalCommand",
  "FunctionDef",
];

const BASH_EXPANSION_FEATURES = [
  "bash:expansion:tilde",
  "bash:expansion:word_split",
  "bash:expansion:word_glob",
  "bash:expansion:default_value",
  "bash:expansion:assign_default",
  "bash:expansion:error_if_unset",
  "bash:expansion:use_alternative",
  "bash:expansion:pattern_removal",
  "bash:expansion:pattern_replacement",
  "bash:expansion:length",
  "bash:expansion:substring",
  "bash:expansion:case_modification",
  "bash:expansion:transform",
  "bash:expansion:indirection",
  "bash:expansion:array_keys",
  "bash:expansion:var_name_prefix",
];

const DEFAULT_KNOWN_FEATURES = [
  ...BASH_COMMAND_NODE_TYPES.map((type) => `bash:cmd:${type}`),
  ...[...SHELL_BUILTINS].map((name) => `bash:builtin:${name}`),
  ...BASH_EXPANSION_FEATURES,
  ...getAllCommandFuzzInfo().flatMap((info) =>
    info.flags.map((flag) => `cmd:flag:${info.name}:${flag.flag}`),
  ),
];
