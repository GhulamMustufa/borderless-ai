import type { Requirement, TargetRegion } from "./types";

export type PathwayDomain = {
  id: string;
  region: TargetRegion;
  country: string;
  name: string;
  shortDescription: string;
  requirements: Requirement[];
  baseScoreThreshold?: number; 
};

import pathwayData from "../data/pathways.json";

export const PATHWAY_REGISTRY: PathwayDomain[] = pathwayData as PathwayDomain[];

export function getPathwaysForRegion(region: TargetRegion): PathwayDomain[] {
  return PATHWAY_REGISTRY.filter(p => p.region === region);
}
