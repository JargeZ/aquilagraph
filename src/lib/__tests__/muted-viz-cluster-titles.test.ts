import { describe, expect, it } from "vitest";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import { DEFAULT_ANALYSIS_CONFIG } from "@/core/config/analysis-config";
import { ExecutableElement } from "@/core/model/executable-element";
import { mutedClusterTitlesForMutedElements } from "../muted-viz-cluster-titles";

const base = {
  decorators: [] as string[],
  parentClasses: [] as string[],
  sourceFile: "x.py",
  startLine: 1,
  endLine: 2,
};

describe("mutedClusterTitlesForMutedElements", () => {
  it("adds class and bucket cluster titles for bucketed muted type", () => {
    const elements = [
      new ExecutableElement({
        ...base,
        reference: "mod.A.foo",
        module: "mod",
        className: "A",
        name: "foo",
        type: "cat_m",
      }),
    ];
    const config: AnalysisConfig = {
      ...DEFAULT_ANALYSIS_CONFIG,
      moduleDepth: 1,
      classifications: [
        {
          id: "cat_m",
          name: "Muted",
          color: "#FF0000",
          selectors: {},
          groupInBucket: true,
          exclude: false,
          mute: true,
        },
      ],
    };
    const titles = mutedClusterTitlesForMutedElements(elements, config);
    expect(titles.has("cluster_mod_bucket_cat_m")).toBe(true);
    expect(titles.has("cluster_mod_bucket_cat_m_A")).toBe(true);
  });

  it("adds class cluster title for non-bucket muted type", () => {
    const elements = [
      new ExecutableElement({
        ...base,
        reference: "mod.A.foo",
        module: "mod",
        className: "A",
        name: "foo",
        type: "cat_m",
      }),
    ];
    const config: AnalysisConfig = {
      ...DEFAULT_ANALYSIS_CONFIG,
      moduleDepth: 1,
      classifications: [
        {
          id: "cat_m",
          name: "Muted",
          color: "#FF0000",
          selectors: {},
          groupInBucket: false,
          exclude: false,
          mute: true,
        },
      ],
    };
    const titles = mutedClusterTitlesForMutedElements(elements, config);
    expect(titles.has("cluster_mod_A")).toBe(true);
    expect([...titles].some((t) => t.includes("bucket"))).toBe(false);
  });

  it("escapes classification id like graph-builder safeGraphId", () => {
    const elements = [
      new ExecutableElement({
        ...base,
        reference: "m.X",
        module: "m",
        className: null,
        name: "x",
        type: "a-b",
      }),
    ];
    const config: AnalysisConfig = {
      ...DEFAULT_ANALYSIS_CONFIG,
      moduleDepth: 1,
      classifications: [
        {
          id: "a-b",
          name: "AB",
          color: "#00FF00",
          selectors: {},
          groupInBucket: true,
          exclude: false,
          mute: true,
        },
      ],
    };
    const titles = mutedClusterTitlesForMutedElements(elements, config);
    expect(titles.has("cluster_m_bucket_a_b")).toBe(true);
  });
});
