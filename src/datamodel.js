// Interface for working with the backend.

import { dummyData } from "./dummy-data/data.js";
import { thumbnailData } from "./dummy-data/thumbnails.js";
import * as d3 from "d3";

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

export async function getFrameLabels() {
  return ["April", "May", "June", "July", "August", "September", "October"];
}

// TODO remove when using API
let thumbnailInfo = thumbnailData.items;

/**
 * Get info about a given entity/concept.
 *
 * @param {*} entityID the ID string for the entity
 * @param {*} options A dictionary of options. Allowed keys:
 *  - numNeighbors: The number of neighbors to retrieve per frame.
 *  - frames: Indexes of frames from which to return neighbors.
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
 *  - presenceFlags: An object keyed by frame numbers with booleans indicating
 *    whether the entity is present in the frame
 *  - confidences: An object keyed by frame numbers with values representing the
 *    confidence in each frame
 */
export async function getEntityInfo(entityID, options = {}) {
  // TODO Call API
  if (!thumbnailInfo[entityID]) {
    return null;
  }

  let info = thumbnailInfo[entityID];
  let neighbors = {};
  let presenceFlags = {};
  let frameDescriptions = {};
  let confidences = {};

  let frameIndexes = options.frames || d3.range(dummyData.length);
  frameIndexes.forEach((f) => {
    let frameItem = dummyData[f][entityID];
    if (!frameItem || !frameItem.highlight) {
      neighbors[f] = [];
      presenceFlags[f] = false;
      return;
    }

    presenceFlags[f] = true;
    let numNeighbors = options.hasOwnProperty("numNeighbors")
      ? options.numNeighbors
      : 10;
    neighbors[f] = frameItem.highlight.slice(0, numNeighbors).map((n) => ({
      id: n,
      name: !!thumbnailInfo[n] ? thumbnailInfo[n].name : "(not found)",
      distance: Math.random() * 0.5,
    }));
    frameDescriptions[f] = `Dummy description for frame ${f}`;
    confidences[f] = Math.random();
  });

  return {
    name: info.name,
    description: info.description,
    neighbors,
    presenceFlags,
    confidences,
    frameDescriptions,
    otherTerms: ["blah", "blah"],
  };
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
 * @return A list of objects where each object specifies a similarity at a given
 *  month. The objects should contain the following keys:
 *  - "date": A date string
 *  - "mean_similarity": A floating point value indicating the similarity
 *  - "std_similarity": A floating point value for the standard deviation of
 *    similarity at this point
 */
export async function getPairwiseSimilarity(firstID, secondID) {
  // TODO use API
  const months = [
    "Apr 1 2020",
    "May 1 2020",
    "Jun 1 2020",
    "Jul 1 2020",
    "Aug 1 2020",
    "Sep 1 2020",
    "Oct 1 2020",
  ];
  return months.map((m) => ({
    date: m,
    mean_similarity: Math.random(),
    std_similarity: Math.random() * 0.4,
  }));
}
