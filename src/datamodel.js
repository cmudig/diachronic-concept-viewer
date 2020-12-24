// Interface for working with the backend.

import { dummyData } from "./dummy-data/data.js";

export async function getVisualizationData() {
  return {
    data: dummyData,
    frameLabels: [
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
    ],
  };
}
