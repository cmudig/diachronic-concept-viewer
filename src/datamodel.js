// Interface for working with the backend.

// Caches
let visualizationData;
let allEntities;

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
  if (!!visualizationData) {
    return visualizationData;
  }

  let result = await fetch(`/visualization`);
  result = await result.json();
  visualizationData = result;
  return result;
}

export async function getFrameLabels() {
  if (!!visualizationData) {
    await getVisualizationData();
  }
  return visualizationData.frameLabels;
}

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
  if (!!allEntities) return allEntities;
  let result = await fetch("/entities");
  allEntities = await result.json();
  return allEntities;
}

/**
 * Get the pairwise similarity over time for the given pair of entity IDs.
 *
 * @param firstID the CUI of the first concept
 * @param secondID the CUI of the second concept
 *
 * @return An object with a 'result' object containing the following keys:
 *   "firstName": name of the first concept
 *   "secondName": name of the second concept
 *   "similarities": an array whose values are objects
 *      that contain the following keys:
 *    - "label": The label for the frame
 *    - "meanSimilarity": A floating point value indicating the similarity
 *    - "stdSimilarity": A floating point value for the standard deviation of
 *      similarity at this point
 *  The object can also contain a 'progress' object if 'result' is null. The
 *  progress object should include a 'progress' key (0-1 scale) and a
 *  'progressMessage' key with a string describing the current activity.
 */
export async function getPairwiseSimilarity(firstID, secondID) {
  let result = await fetch(`/pairwise/${firstID}/${secondID}`);
  return await result.json();
}
