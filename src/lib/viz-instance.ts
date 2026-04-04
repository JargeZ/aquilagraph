import { instance, type Viz } from "@viz-js/viz";

let vizPromise: Promise<Viz> | null = null;

export function getVizInstance(): Promise<Viz> {
  if (!vizPromise) {
    vizPromise = instance();
  }
  return vizPromise;
}
