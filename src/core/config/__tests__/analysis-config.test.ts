import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANALYSIS_CONFIG,
  MAX_CLASSIFICATIONS,
  normalizeAnalysisConfig,
} from "../analysis-config";

describe("normalizeAnalysisConfig", () => {
  it("returns defaults for non-object input", () => {
    expect(normalizeAnalysisConfig(null)).toEqual(DEFAULT_ANALYSIS_CONFIG);
    expect(normalizeAnalysisConfig(undefined)).toEqual(DEFAULT_ANALYSIS_CONFIG);
    expect(normalizeAnalysisConfig("x")).toEqual(DEFAULT_ANALYSIS_CONFIG);
  });

  it("fills missing fields and keeps valid classifications", () => {
    const raw = {
      include: ["a"],
      classifications: [
        {
          id: "c1",
          name: "One",
          color: "#4A90D9",
          selectors: { childsOf: ["X"] },
          groupInBucket: true,
          exclude: false,
          mute: false,
        },
      ],
    };
    const n = normalizeAnalysisConfig(raw);
    expect(n.include).toEqual(["a"]);
    expect(n.classifications).toHaveLength(1);
    expect(n.classifications[0].id).toBe("c1");
    expect(n.classifications[0].name).toBe("One");
    expect(n.moduleDepth).toBe(DEFAULT_ANALYSIS_CONFIG.moduleDepth);
  });

  it("drops classifications without id", () => {
    const n = normalizeAnalysisConfig({
      classifications: [{ id: "", name: "Bad" }],
    });
    expect(n.classifications).toHaveLength(0);
  });

  it("clamps classifications to MAX_CLASSIFICATIONS", () => {
    const list = Array.from({ length: MAX_CLASSIFICATIONS + 5 }, (_, i) => ({
      id: `id${i}`,
      name: `N${i}`,
      color: "#4A90D9",
      selectors: {},
      groupInBucket: false,
      exclude: false,
      mute: false,
    }));
    const n = normalizeAnalysisConfig({ classifications: list });
    expect(n.classifications).toHaveLength(MAX_CLASSIFICATIONS);
  });

  it("replaces invalid color with palette default", () => {
    const n = normalizeAnalysisConfig({
      classifications: [
        {
          id: "x",
          name: "X",
          color: "not-a-palette-color",
          selectors: {},
          groupInBucket: false,
          exclude: false,
          mute: false,
        },
      ],
    });
    expect(n.classifications[0].color).toMatch(/^#/);
  });
});
