// Interface for working with the backend.

import { dummyData } from "./dummy-data/data.js";

export async function getVisualizationData() {
  return dummyData;
}
