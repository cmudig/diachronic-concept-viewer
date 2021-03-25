import {
  buildKdTree,
  neighborMotionDifferencePreviewIntensities,
  projectionNeighborSimilarityPreviewIntensities,
  neighborSimilarityPreviewIntensities,
  precomputedPreviewIntensities,
  bundledPreviewIntensities,
} from "./preview_intensity.js";
import * as d3 from "d3";
import { transformPoint } from "../utils/helpers.js";

export function Dataset(rawData, colorKey, r = 4.0) {
  if (rawData["data"]) {
    // There are other keys
    this.frames = rawData.data;
    this.previews = rawData.previews;
    this.frameLabels = rawData.frameLabels;
    this.previewMode = rawData.previewMode || "projectionNeighborSimilarity";
  } else {
    // Old format
    this.frames = rawData;
    this.frameLabels = this.frames.map((f, i) => "Frame " + (i + 1));
    this.previewMode = "projectionNeighborSimilarity";
  }
  this.frameTransformations = [];

  this.getXExtent = function () {
    if (!this._xExtent) {
      let flatXs = this.map((d) => Object.values(d.xs)).flat();
      this._xExtent = d3.extent(flatXs);
    }
    return this._xExtent;
  };

  this.getYExtent = function () {
    if (!this._yExtent) {
      let flatYs = this.map((d) => Object.values(d.ys)).flat();
      this._yExtent = d3.extent(flatYs);
    }
    return this._yExtent;
  };

  this.getColorExtent = function (categorical = false) {
    if (!this._colorExtent) {
      let flatColors = this.map((d) => Object.values(d.colors)).flat();
      if (categorical) {
        this._colorExtent = Array.from(new Set(flatColors)).sort();
      } else {
        this._colorExtent = d3.extent(flatColors);
      }
    }
    return this._colorExtent;
  };

  this.at = function (idx) {
    return this.points[idx];
  };

  this.byID = function (id) {
    return this.index[id];
  };

  this.atFrame = function (id, frame) {
    if (!this.index[id]) return undefined;
    let el = this.index[id];
    if (!el.visibleFlags[frame]) return undefined;
    return {
      id,
      x: el.xs[frame],
      y: el.ys[frame],
      color: el.colors[frame],
      alpha: el.alphas[frame],
      halo: el.halos[frame],
      highlightIndexes: el.highlightIndexes[frame],
      r: el.rs[frame],
      visible: el.visibleFlags[frame],
      previewLineWidths: el.previewLineWidths[frame],
      previewLineAlphas: el.previewLineAlphas[frame],
      previewPaths: el.previewPaths[frame],
    };
  };

  this.frame = function (frameNumber) {
    return this.frames[frameNumber];
  };

  this.map = function (mapper) {
    return this.points.map(mapper);
  };

  this.filter = function (filterer) {
    return this.points.filter(filterer);
  };

  this.forEach = function (fn) {
    this.points.forEach(fn);
  };

  this.reformat = function () {
    if (this.frames.length == 0) return [];

    // First scan the frames to see how many points there are
    let pointIDs = new Set();
    this.frames.forEach((frame) => {
      Object.keys(frame).forEach((k) => pointIDs.add(k));
    });

    // Make point templates
    let points = {};
    pointIDs.forEach(
      (id) =>
        (points[id] = {
          id,
          hoverText: null,
          xs: {},
          ys: {},
          colors: {},
          alphas: {},
          halos: {},
          highlightIndexes: {},
          rs: {},
          visibleFlags: {},
          previewLineWidths: {},
          previewLineAlphas: {},
          previewPaths: {},
        })
    );

    this.frames.forEach((frame, f) => {
      Object.keys(frame).forEach((id) => {
        let el = frame[id];
        points[id].hoverText = el.hoverText;
        let point = [el.x, el.y];
        if (
          !!this.frameTransformations &&
          this.frameTransformations.length > f
        ) {
          point = transformPoint(this.frameTransformations[f], point);
        }
        points[id].xs[f] = point[0];
        points[id].ys[f] = point[1];
        points[id].colors[f] =
          colorKey == "constant" ? 0.0 : el[colorKey] || 0.0;
        points[id].alphas[f] = el.alpha != undefined ? el.alpha : 1.0;
        points[id].halos[f] = el.halo;
        points[id].highlightIndexes[f] = el.highlight.map((h) => "" + h);
        points[id].visibleFlags[f] = true;
        points[id].rs[f] = r;
        if (!!el.hoverText) points[id].label = { text: el.hoverText };
      });
    });

    this.points = Object.values(points);
    this.index = points;
    this.length = this.points.length;

    let xex = this.getXExtent();
    let yex = this.getYExtent();
    let neighborScale = (xex[1] - xex[0] + yex[1] - yex[0]) / 2.0;

    if (!this.neighborTrees) {
      this.neighborTrees = [];
      this.frames.forEach((frame, i) => {
        this.neighborTrees.push(buildKdTree(points, i));
      });
    }

    this.frames.forEach((frame, i) => {
      Object.keys(points).forEach((id, j) => {
        if (!frame[id]) return;

        if (!!frame[id].previewLineWidths) {
          points[id].previewLineWidths[i] = frame[id].previewLineWidths;
          if (!frame[id].previewLineAlphas)
            frame[id].previewLineAlphas = this.frames.map((_) => 0.1);
        }
        if (!!frame[id].previewLineAlphas) {
          points[id].previewLineAlphas[i] = frame[id].previewLineAlphas;
          if (!frame[id].previewLineWidths)
            frame[id].previewLineWidths = this.frames.map((_) => 0.1);
        }
        if (!frame[id].previewLineWidths && !frame[id].previewLineAlphas) {
          let intensities;
          if (this.hasPreviews) {
            if (this.previewMode == "bundled") {
              intensities = bundledPreviewIntensities(points[id], this, i);
              points[id].previewPaths[i] = {};
              if (!!this.previews[i]) {
                Object.keys(this.previews[i]).forEach((previewNum) => {
                  points[id].previewPaths[i][previewNum] =
                    (this.previews[i][previewNum][id] || {}).path || [];
                });
              }
            } else {
              intensities = precomputedPreviewIntensities(
                points[id],
                this,
                i,
                neighborScale
              );
            }
          } else if (this.previewMode == "neighborSimilarity") {
            intensities = neighborSimilarityPreviewIntensities(points[id], i);
          } else {
            // this.previewMode == "projectionNeighborSimilarity"
            intensities = projectionNeighborSimilarityPreviewIntensities(
              points[id],
              this.neighborTrees,
              i
            );
          }

          points[id].previewLineAlphas[i] = {};
          points[id].previewLineWidths[i] = {};
          Object.keys(intensities).forEach((frameNum) => {
            points[id].previewLineAlphas[i][frameNum] =
              intensities[frameNum].lineAlpha;
            points[id].previewLineWidths[i][frameNum] =
              intensities[frameNum].lineWidth;
          });
        }
      });
    });
  };

  this.getPreviewIDs = function (frame, previewFrame) {
    if (!this.previews) return new Set();

    let allIDs = new Set();
    this.previews[frame][previewFrame].forEach((p) => {
      p.component.forEach((id) => allIDs.add(id));
    });
    return allIDs;
  };

  // Only works for precomputed (component-based) previews
  this.previewFrameHasID = function (frame, previewFrame, pointID) {
    if (!this.previews) return false;

    if (!this.previews[frame] || !this.previews[frame][previewFrame])
      return false;

    if (this.previewMode == "mixed") {
      let pointPreviews = this.previews[frame][previewFrame].points;
      if (!pointPreviews) return false;
      return !!pointPreviews[pointID];
    }

    for (var comp of this.previews[frame][previewFrame]) {
      if (comp.component.includes(pointID)) return true;
    }
    return false;
  };

  this.previewDistance = function (frame, previewFrame, pointID) {
    if (!this.previews) return null;

    if (!this.previews[frame] || !this.previews[frame][previewFrame])
      return null;

    if (this.previewMode == "bundled") {
      if (!this.previews[frame][previewFrame][pointID]) return null;
      return this.previews[frame][previewFrame][pointID].distance;
    } else if (this.previewMode == "mixed") {
      let pointPreviews = this.previews[frame][previewFrame].points;
      if (!pointPreviews || !pointPreviews[pointID]) return null;
      return pointPreviews[pointID].distance;
    }

    for (var comp of this.previews[frame][previewFrame]) {
      if (comp.component.includes(pointID)) return comp.distance;
    }
    return null;
  };

  this.previewComponentSize = function (frame, previewFrame, pointID) {
    if (!this.previews) return 1;

    if (!this.previews[frame] || !this.previews[frame][previewFrame]) return 1;

    if (this.previewMode == "bundled") {
      if (!this.previews[frame][previewFrame][pointID]) return 1;
      return this.previews[frame][previewFrame][pointID].componentSize || 1;
    } else if (this.previewMode == "mixed") {
      console.warn("previewComponentSize doesn't work with mixed previews");
      return null;
    }

    for (var comp of this.previews[frame][previewFrame]) {
      if (comp.component.includes(pointID)) return comp.component.length;
    }
    return null;
  };

  // If previewMode is "mixed", returns previews from the "clusters" category
  this.clusterPreviews = function (frame, previewFrame) {
    if (this.previewMode != "mixed") return [];

    if (!this.previews) return [];
    if (!this.previews[frame] || !this.previews[frame][previewFrame]) return [];
    return this.previews[frame][previewFrame].clusters || [];
  };

  // Gets the IDs of
  this.neighborsInFrame = function (pointID, frame, k) {
    return this.neighborTrees[frame]
      .nearest(pointID, k)
      .map((point) => point.id);
  };

  this.transform = function (frameTransformations) {
    this.frameTransformations = frameTransformations;
    let points = this.index;
    this.frames.forEach((frame, f) => {
      Object.keys(frame).forEach((id) => {
        let el = frame[id];
        points[id].hoverText = el.hoverText;
        let point = [el.x, el.y];
        if (
          !!this.frameTransformations &&
          this.frameTransformations.length > f
        ) {
          point = transformPoint(this.frameTransformations[f], point);
        }
        points[id].xs[f] = point[0];
        points[id].ys[f] = point[1];
        points[id].colors[f] =
          colorKey == "constant" ? 0.0 : el[colorKey] || 0.0;
        points[id].alphas[f] = el.alpha != undefined ? el.alpha : 1.0;
        points[id].halos[f] = el.halo;
        points[id].highlightIndexes[f] = el.highlight.map((h) => "" + h);
        points[id].visibleFlags[f] = true;
        points[id].rs[f] = r;
      });
    });
  };

  // Adds metadata to each point based on the given thumbnails.json data
  this.addThumbnails = function (thumbnailData) {
    if (thumbnailData.format == "spritesheet") {
      this.spritesheets = thumbnailData.spritesheets;
      Object.keys(thumbnailData.items).forEach((id) => {
        let item = thumbnailData.items[id];
        this.index[id].label = {
          sheet: item.sheet,
          texture: item.texture,
        };
      });
    } else if (thumbnailData.format == "text_descriptions") {
      Object.keys(thumbnailData.items).forEach((id) => {
        let item = thumbnailData.items[id];
        this.index[id].label = {
          text: item.name,
        };
      });
    }
  };

  this.frameCount = this.frames.length;
  this.hasPreviews = !!this.previews;
  this.spritesheets = null;
  this.reformat();
}
