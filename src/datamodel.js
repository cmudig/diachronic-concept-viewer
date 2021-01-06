// Interface for working with the backend.

import { dummyData } from "./dummy-data/data.js";
import { thumbnailData } from "./dummy-data/thumbnails.js";
import * as d3 from "d3";

const frameLabels = [
  "2020-03-27",
  "2020-04-24",
  "2020-05-31",
  "2020-06-30",
  "2020-07-31",
  "2020-08-29",
  "2020-09-28",
  "2020-10-31",
];
/**
 * Get the visualization data as a JSON object. The structure of the returned
 * data should be as follows:
 *
 * {
 *   data: [
 *     { // frame
 *        cui: {
 *          x: float,
 *          y: float,
 *          alpha: (optional) float,
 *          halo: (optional) float,
 *          highlight: [cui1, cui2, cui3, ...]
 *          previewLineWidths: (optional) {
 *            frameNum: float
 *          },
 *          previewLineAlphas: (optional) {
 *            frameNum: float
 *          }
 *        }
 *      },
 *      // more frames
 *    ],
 *    frameLabels: [
 *      // string label for each frame
 *    ],
 *    previews: (optional) {
 *      <frameNum>: {
 *        <previewFrameNum>: [
 *          {
 *            component: [cui1, cui2, cui3, ...]
 *          },
 *          // more components
 *        ]
 *      }
 *    }
 *  }
 */
export async function getVisualizationData() {
  // TODO Call API
  return {
    data: dummyData,
    frameLabels,
  };
}

export async function getFrameLabels() {
  return frameLabels;
}

// TODO remove when using API
let thumbnailInfo = thumbnailData.items;

/**
 * Get info about a given entity/concept.
 *
 * @param {*} entityID the ID string for the entity
 * @param {*} options A dictionary of options. Allowed keys:
 *  - numNeighbors: The number of neighbors to retrieve per frame.
 *
 * @return An object representing the entity. Available fields:
 *  - name: The name of the entity
 *  - description: A potentially multiline string containing other properties
 *    about the entity
 *  - frameDescriptions: An object keyed by frame numbers with strings specific
 *    to each frame
 *  - neighbors: An object keyed by frame numbers with lists of objects for the
 *    neighbors in each frame, where each neighbor object contains the following
 *    fields: "id", "name", "distance"
 *  - confidences: An object keyed by frame numbers with values representing the
 *    confidence in each frame
 */
export async function getEntityInfo(entityID, options = {}) {
  let result = await fetch(`/info/${entityID}`);
  return await result.json();
}

/**
 * Retrieve the list of entities.
 *
 * @return A list of objects, where each object contains the following fields:
 *  - id: The CUI for the entity
 *  - name: The name of the entity
 */
export async function getAllEntities() {
  // TODO use API
  return Object.keys(thumbnailInfo).map((id) => ({
    id,
    name: thumbnailInfo[id].name,
  }));
}

/**
 * Get the pairwise similarity over time for the given pair of entity IDs.
 *
 * @param firstID the CUI of the first concept
 * @param secondID the CUI of the second concept
 *
 * @return An object with the following keys:
 *   "firstName": name of the first concept
 *   "secondName": name of the second concept
 *   "similarities": an object keyed by frame number whose values are objects
 *      that contain the following keys:
 *    - "label": The label for the frame
 *    - "meanSimilarity": A floating point value indicating the similarity
 *    - "stdSimilarity": A floating point value for the standard deviation of
 *      similarity at this point
 */
export async function getPairwiseSimilarity(firstID, secondID) {
  let result = await fetch(`/pairwise/${firstID}/${secondID}`);
  return await result.json();
}
