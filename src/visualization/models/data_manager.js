import {
  Mark,
  MarkSet,
  interpolateTo,
  easeInOut,
  Decoration,
  Animator,
  interpolateToFunction,
  interpolateAlongPath,
} from "./data_items.js";
import { ClusterPreviewHalo, DecorationStarGraph } from "./decorations.js";
import { getWithFallback } from "./helpers.js";
import * as d3 from "d3";
import AnimationPool from "./animation_pool.js";

const animationDuration = 4000;
const previewAnimDuration = 1000;
const dimmedAlpha = 0.3;
const dimmedRFactor = 0.7;

// The purpose of the DatasetManager is to convert user interactions on data into visual attributes
// of marks.
export function DatasetManager(
  dataset,
  colorScale,
  xScale,
  yScale,
  currentFrame = 0
) {
  this.data = dataset;
  this.currentFrameNumber = currentFrame;
  this.previewFrameNumber = -1; // no preview

  this.xScale = xScale;
  this.yScale = yScale;
  this.colorScale = colorScale;

  let colorGen; // = new ColorGenerator();
  this._colorMap = {};

  this.dimmedPoints = new Set();
  this.filterVisiblePoints = new Set();

  this.marks = new MarkSet(
    this.data.map((d, i) => {
      let colorID = "white"; //colorGen.next();
      this._colorMap[colorID] = { type: "mark", id: d.id };
      return new Mark(
        d.id,
        {
          x: {
            value: getWithFallback(d.xs, this.currentFrameNumber, 0.0),
            transform: (v) => this.xScale(v),
          },
          y: {
            value: getWithFallback(d.ys, this.currentFrameNumber, 0.0),
            transform: (v) => this.yScale(v),
          },
          halo: 0.0, // halo is now only to be used for preview frames
          x2: {
            value: getWithFallback(d.xs, this.currentFrameNumber, 0.0),
            transform: (v) => this.xScale(v),
          },
          y2: {
            value: getWithFallback(d.ys, this.currentFrameNumber, 0.0),
            transform: (v) => this.yScale(v),
          },
          fillStyle: {
            value: getWithFallback(d.colors, this.currentFrameNumber, 0.0),
            transform: (c) => d3.color(this.colorScale(c)).formatHex(),
            cache: true,
          },
          alpha: { valueFn: () => this._getPointAlpha(d) },
          r: { valueFn: () => this._getPointRadius(d) },
          visible: d.visibleFlags[this.currentFrameNumber] || false,
          colorID,
          hoverText: d.hoverText || null,
          textPriority: null,
          lineWidth: { valueFn: () => this._getLineWidth(d) },
          lineAlpha: { valueFn: () => this._getLineAlpha(d) },
          previewPath: {
            value: [],
            transform: (v) =>
              v.map((point) => [this.xScale(point[0]), this.yScale(point[1])]),
          },
          previewPathStart: 0.0,
          previewPathEnd: 0.0,
        }
        // special
      );
    })
  );

  this.getElementByColorID = function (color) {
    let selected = this._colorMap[color];
    if (selected == undefined) {
      return null;
    }
    return selected;
  };

  this._useHalos = false;

  this._getPointAlpha = function (dataItem) {
    if (
      this.filterVisiblePoints.size > 0 &&
      !this.filterVisiblePoints.has(dataItem.id)
    )
      return 0.0;

    let alpha = getWithFallback(dataItem.alphas, this.currentFrameNumber, 0.0);

    // Dimmed for a hover/selection
    if (this.dimmedPoints.has(dataItem.id)) alpha *= dimmedAlpha;
    if (
      (this.dimmedPoints.size == 0 || this.dimmedPoints.has(dataItem.id)) &&
      this.previewFrameNumber >= 0 &&
      this.previewFrameNumber != this.currentFrameNumber &&
      !this._useHalos &&
      !previewHaloIDs.has(dataItem.id)
    ) {
      // Dimmed for a preview frame
      if (previewLineAlphas == null) return 0.0;
      alpha *= previewLineAlphas[dataItem.id] || 0.0;
    }
    return alpha;
  };

  let previewLineAlphas = null;

  this._getLineAlpha = function (dataItem) {
    if (
      this.filterVisiblePoints.size > 0 &&
      !this.filterVisiblePoints.has(dataItem.id)
    )
      return 0.0;

    if (
      this.previewFrameNumber < 0 ||
      this.previewFrameNumber == this.currentFrameNumber
    )
      return 0.0;

    if (previewLineAlphas == null) return 0.0;
    let alpha = previewLineAlphas[dataItem.id] || 0.0;

    // Dimmed for a hover/selection
    // if (this.dimmedPoints.has(dataItem.id)) alpha *= dimmedAlpha;
    return alpha;
  };

  this._getLineWidth = function (dataItem) {
    if (
      this.previewFrameNumber < 0 ||
      this.previewFrameNumber == this.currentFrameNumber
    )
      return 0.0;

    let previewWidths = dataItem.previewLineWidths[this.currentFrameNumber];

    if (!previewWidths) return 0.0;
    return previewWidths[this.previewFrameNumber] || 0.0;
  };

  this._getPointRadius = function (dataItem) {
    let r = getWithFallback(dataItem.rs, this.currentFrameNumber, 0.0);

    // Dimmed for a hover/selection
    if (this.dimmedPoints.has(dataItem.id)) r *= dimmedRFactor;

    // Dimmed for a preview frame
    if (
      this.previewFrameNumber >= 0 &&
      this.previewFrameNumber != this.currentFrameNumber &&
      this._useHalos
    ) {
      let previewAlphas = dataItem.previewLineAlphas[this.currentFrameNumber];
      if (!!previewAlphas)
        r *= !!previewAlphas[this.previewFrameNumber] ? 1.0 : 0.2;
    }
    return r;
  };

  // Sets the current displayed frame
  this.setFrame = function (frameNumber, animated = true) {
    let oldFrame = this.currentFrameNumber;
    if (animated) {
      // Set positions for marks that were hidden before. This prevents
      // them from appearing to move
      this.marks.forEach((mark, i) => {
        if (
          mark.attr("r") < 0.001 &&
          this.data.at(i).visibleFlags[frameNumber]
        ) {
          mark.setAttr(
            "x",
            getWithFallback(this.data.at(i).xs, frameNumber, mark.data("x"))
          );
          mark.setAttr(
            "y",
            getWithFallback(this.data.at(i).ys, frameNumber, mark.data("y"))
          );
          mark.setAttr(
            "x2",
            getWithFallback(this.data.at(i).xs, frameNumber, mark.data("x"))
          );
          mark.setAttr(
            "y2",
            getWithFallback(this.data.at(i).ys, frameNumber, mark.data("y"))
          );
          mark.setAttr(
            "fillStyle",
            getWithFallback(
              this.data.at(i).colors,
              frameNumber,
              mark.data("fillStyle")
            )
          );
        }
      });

      this.currentFrameNumber = frameNumber;
      previewLineAlphas = null;

      // Update visible flag
      this.marks.setAll(
        "visible",
        (_, i) => this.data.at(i).visibleFlags[frameNumber] || false
      );

      // Register animations
      if (this.data.previewMode == "bundled") {
        this.marks.animateAll(
          "x",
          (mark, i) => {
            let finalValue = getWithFallback(
              this.data.at(i).xs,
              frameNumber,
              getWithFallback(this.data.at(i).xs, oldFrame, mark.data("x"))
            );
            let path = mark.attr("previewPath", false);
            if (!!path && path.length > 0) {
              return interpolateAlongPath([
                ...path.map((p) => p[0]),
                finalValue,
              ]);
            }
            return interpolateTo(finalValue);
          },
          animationDuration,
          easeInOut
        );
        this.marks.animateAll(
          "y",
          (mark, i) => {
            let finalValue = getWithFallback(
              this.data.at(i).ys,
              frameNumber,
              getWithFallback(this.data.at(i).ys, oldFrame, mark.data("y"))
            );
            let path = mark.attr("previewPath", false);
            if (!!path && path.length > 0) {
              return interpolateAlongPath([
                ...path.map((p) => p[1]),
                finalValue,
              ]);
            }
            return interpolateTo(finalValue);
          },
          animationDuration,
          easeInOut
        );
        this.marks.animateAll(
          "previewPathStart",
          () => interpolateTo(1.0),
          animationDuration,
          easeInOut
        );
      } else {
        this.marks.animateAll(
          "x",
          (mark, i) =>
            interpolateTo(
              getWithFallback(
                this.data.at(i).xs,
                frameNumber,
                getWithFallback(this.data.at(i).xs, oldFrame, mark.data("x"))
              )
            ),
          animationDuration,
          easeInOut
        );
        this.marks.animateAll(
          "y",
          (mark, i) =>
            interpolateTo(
              getWithFallback(
                this.data.at(i).ys,
                frameNumber,
                getWithFallback(this.data.at(i).ys, oldFrame, mark.data("y"))
              )
            ),
          animationDuration,
          easeInOut
        );
      }

      this.marks.animateAll(
        "x2",
        (mark, i) =>
          interpolateTo(
            getWithFallback(
              this.data.at(i).xs,
              frameNumber,
              getWithFallback(this.data.at(i).xs, oldFrame, mark.data("x"))
            )
          ),
        animationDuration,
        easeInOut
      );
      this.marks.animateAll(
        "y2",
        (mark, i) =>
          interpolateTo(
            getWithFallback(
              this.data.at(i).ys,
              frameNumber,
              getWithFallback(this.data.at(i).ys, oldFrame, mark.data("y"))
            )
          ),
        animationDuration,
        easeInOut
      );
      this.marks.animateAll(
        "halo",
        (mark, i) =>
          interpolateTo(
            getWithFallback(
              this.data.at(i).halos,
              frameNumber,
              mark.data("halo")
            )
          ),
        animationDuration,
        easeInOut
      );
      this.marks.animateAll(
        "fillStyle",
        (mark, i) =>
          interpolateTo(
            getWithFallback(
              this.data.at(i).colors,
              frameNumber,
              mark.data("fillStyle")
            )
          ),
        animationDuration,
        easeInOut
      );
      this.marks.animateComputed(
        "r",
        interpolateTo,
        animationDuration,
        easeInOut
      );
      this.marks.animateComputed(
        "alpha",
        interpolateTo,
        animationDuration,
        easeInOut
      );
      this.marks.animateComputed(
        "lineAlpha",
        interpolateTo,
        animationDuration,
        easeInOut
      );
      this.marks.animateComputed(
        "lineWidth",
        interpolateTo,
        animationDuration,
        easeInOut
      );
    } else {
      this.currentFrameNumber = frameNumber;

      this.marks.setAll("x", (mark, i) =>
        getWithFallback(this.data.at(i).xs, frameNumber, mark.data("x"))
      );
      this.marks.setAll("y", (mark, i) =>
        getWithFallback(this.data.at(i).ys, frameNumber, mark.data("y"))
      );
      this.marks.setAll("x2", (mark, i) =>
        getWithFallback(this.data.at(i).xs, frameNumber, mark.data("x"))
      );
      this.marks.setAll("y2", (mark, i) =>
        getWithFallback(this.data.at(i).ys, frameNumber, mark.data("y"))
      );
      this.marks.setAll("halo", (mark, i) =>
        getWithFallback(this.data.at(i).halos, frameNumber, mark.data("halo"))
      );
      this.marks.setAll("lineWidth", () => 0.0);
      this.marks.setAll("fillStyle", (mark, i) =>
        getWithFallback(
          this.data.at(i).colors,
          frameNumber,
          mark.data("fillStyle")
        )
      );
    }

    this.updatePreviewHalos(animated ? animationDuration : 0);
    this.updateTextPriority();
  };

  // Sets the frame previewed using semitransparent lines (or halos, if halos is true)
  this.previewFrame = function (
    previewFrameNumber,
    animated = true,
    halos = false
  ) {
    this.previewFrameNumber = previewFrameNumber;
    let duration = animated ? previewAnimDuration : 0;
    this._useHalos = halos;

    // Compute destination attributes first
    let destFrame =
      previewFrameNumber >= 0 ? previewFrameNumber : this.currentFrameNumber;

    // Animate properties
    if (halos) {
      this.marks.animateAll(
        "halo",
        (_, i) => {
          if (destFrame != this.currentFrameNumber) {
            let previewWidths = this.data.at(i).previewLineWidths[
              this.currentFrameNumber
            ];

            if (!previewWidths) return interpolateTo(0.0);
            return interpolateTo(previewWidths[destFrame] || 0.0);
          }
          return interpolateTo(0.0);
        },
        duration,
        easeInOut
      );
    }
    if (this.data.previewMode == "bundled") {
      if (destFrame != this.currentFrameNumber) {
        this.marks.setAll("previewPath", (_, i) => {
          let paths = this.data.at(i).previewPaths[this.currentFrameNumber];
          if (!paths) return [];
          if (!paths[destFrame]) return [];
          return paths[destFrame];
        });
      }
      this.marks.setAll("previewPathStart", () => 0.0, duration, easeInOut);
      this.marks.animateAll(
        "previewPathEnd",
        () => interpolateTo(destFrame == this.currentFrameNumber ? 0.0 : 1.0),
        duration,
        easeInOut
      );
    }
    this.marks.animateAll(
      "x2",
      (mark, i) =>
        interpolateTo(
          getWithFallback(
            this.data.at(i).xs,
            destFrame,
            getWithFallback(
              this.data.at(i).xs,
              this.currentFrameNumber,
              mark.data("x")
            )
          )
        ),
      duration,
      easeInOut
    );
    this.marks.animateAll(
      "y2",
      (mark, i) =>
        interpolateTo(
          getWithFallback(
            this.data.at(i).ys,
            destFrame,
            getWithFallback(
              this.data.at(i).ys,
              this.currentFrameNumber,
              mark.data("y")
            )
          )
        ),
      duration,
      easeInOut
    );

    if (destFrame == this.currentFrameNumber) {
      previewLineAlphas = null;
    } else {
      this.updatePreviewLineAlphas();
    }

    this.updatePreviewHalos(duration);

    this.marks.animateComputed("alpha", interpolateTo, duration, easeInOut);
    this.marks.animateComputed("r", interpolateTo, duration, easeInOut);
    this.marks.animateComputed("lineWidth", interpolateTo, duration, easeInOut);
    this.marks.animateComputed("lineAlpha", interpolateTo, duration, easeInOut);

    this.updateTextPriority();
  };

  // Cluster preview halos (if using previewMode "mixed")
  let previewHalos = [];
  let previewHaloIDs = new Set();

  this.updatePreviewHalos = function (duration) {
    // Remove old halos
    let oldPreviewHalos = previewHalos;
    oldPreviewHalos.forEach((halo) => {
      halo.exit(this.marks, duration, easeInOut);
    });
    setTimeout(() => {
      oldPreviewHalos
        .map((halo) => halo.getDecorations())
        .flat()
        .forEach((dec) => this.marks.removeDecoration(dec));
    }, duration);
    previewHalos = [];
    previewHaloIDs = new Set();

    if (
      this.previewFrameNumber != -1 &&
      this.previewFrameNumber != this.currentFrameNumber
    ) {
      // Preview halos
      let clusterPreviews = this.data.clusterPreviews(
        this.currentFrameNumber,
        this.previewFrameNumber
      );
      clusterPreviews.forEach((prev) => {
        prev.component.forEach((id) => previewHaloIDs.add(id));
        if (this.filterVisiblePoints.size > 0) {
          // If filtered, at least one point in the component must be in the
          // filter set
          let foundVisiblePoint = false;
          for (let point of prev.component) {
            if (this.filterVisiblePoints.has(point)) {
              foundVisiblePoint = true;
              break;
            }
          }
          if (!foundVisiblePoint) return;
        }
        let colorID = "white"; // colorGen.next();
        let halo = new ClusterPreviewHalo(
          prev.component
            .map((id) => this.marks.getMarkByID(id))
            .filter((mark) => !!mark),
          "steelblue",
          prev.distance,
          colorID
        );
        this._colorMap[colorID] = { type: "halo", ids: prev.component, halo };
        halo.getDecorations().forEach((dec) => this.marks.addDecoration(dec));
        halo.enter(this.marks, duration);
        previewHalos.push(halo);
      });
    }
  };

  this.updatePreviewLineAlphas = function () {
    let lineAlphaList = [];
    this.data.points.forEach((dataItem) => {
      if (
        this.filterVisiblePoints.size > 0 &&
        !this.filterVisiblePoints.has(dataItem.id)
      )
        return;

      let previewAlphas = dataItem.previewLineAlphas[this.currentFrameNumber];
      if (!previewAlphas || !previewAlphas[this.previewFrameNumber]) return;
      lineAlphaList.push({
        id: dataItem.id,
        alpha: previewAlphas[this.previewFrameNumber],
      });
    });
    lineAlphaList.sort((a, b) => (a.alpha < b.alpha ? -1 : 1));
    previewLineAlphas = {};
    lineAlphaList.forEach((item, i) => {
      previewLineAlphas[item.id] = Math.pow(i / lineAlphaList.length, 2);
    });
  };

  // Highlighting subgraphs

  const highlightDuration = 300;

  let starGraphPool = new AnimationPool({
    create: (nodeID, info) => {
      let graph = new DecorationStarGraph(
        this.marks.getMarkByID(nodeID),
        info.linkedNodeIDs
          .map((id) => this.marks.getMarkByID(id))
          .filter((m) => !!m)
      );
      info.highlightedNodes = [nodeID, ...info.linkedNodeIDs];
      info.transient = info.transient || false;
      graph.getDecorations().forEach((d) => this.marks.addDecoration(d));
      return graph;
    },
    show: (element) => {
      element.enter(this.marks, highlightDuration);
      this.updateDimmedPoints(true);
      return new Promise((resolve) => setTimeout(resolve, highlightDuration));
    },
    hide: (element) => {
      element.exit(this.marks, highlightDuration);
      this.updateDimmedPoints(true);
      return new Promise((resolve) => setTimeout(resolve, highlightDuration));
    },
    destroy: (element) => {
      element.getDecorations().forEach((d) => this.marks.removeDecoration(d));
    },
  });

  this.setStarGraphTransient = function (nodeID, transient) {
    let info = starGraphPool.getInfo(nodeID);
    if (!!info) info.transient = transient;
  };

  this.updateStarGraph = function (nodeID, animated = true) {
    let info = starGraphPool.getInfo(nodeID);
    let element = starGraphPool.getElement(nodeID);
    if (!element) {
      this.showStarGraph(nodeID);
      return;
    }

    let item = this.data.atFrame(nodeID, this.currentFrameNumber);
    if (item) {
      let newNeighbors = (item.highlightIndexes || []).map((i) => "" + i);
      info.highlightedNodes = [info.highlightedNodes[0], ...newNeighbors];
      element.updateNeighborMarks(
        newNeighbors.map((id) => this.marks.getMarkByID(id)).filter((m) => !!m),
        this.marks,
        animated ? highlightDuration : 0
      );
      this.updateDimmedPoints(animated);
    } else {
      starGraphPool.hide(nodeID);
    }
  };

  this.showStarGraph = function (id, transient = false) {
    this.setStarGraphTransient(id, transient);
    starGraphPool.show(id, () => {
      let item = this.data.atFrame(id, this.currentFrameNumber);
      if (!item) return;
      let neighbors = (item.highlightIndexes || []).map((i) => "" + i);
      return {
        linkedNodeIDs: neighbors,
        transient,
      };
    });
  };

  this.updateStarGraphVisibility = function () {
    // Only show for hovered ID and single clicked ID
    let visibleGraphs = new Set();
    let transientID = null;
    if (!!hoveredElement && hoveredElement.type == "mark") {
      visibleGraphs.add(hoveredElement.id);
      transientID = hoveredElement.id;
    }
    if (selectedPoints.size == 1) {
      let selected = Array.from(selectedPoints)[0];
      this.setStarGraphTransient(selected, false);
      visibleGraphs.add(selected);
      if (transientID == selected) transientID = null;
    }
    Object.keys(starGraphPool.getAll()).forEach((key) => {
      if (!visibleGraphs.has(key)) starGraphPool.hide(key);
    });
    visibleGraphs.forEach((key) => {
      this.showStarGraph(key, key == transientID);
    });
  };

  // Highlighting

  this._computeHighlightedPoints = function () {
    let highlightedPointIDs = new Set();

    let displayedGraphs = starGraphPool.getAllVisible();
    Object.keys(displayedGraphs).forEach((graphID) => {
      let info = displayedGraphs[graphID].info;
      if (info.transient) {
        highlightedPointIDs.add(info.highlightedNodes[0]);
      } else {
        info.highlightedNodes.forEach((n) => highlightedPointIDs.add(n));
      }
    });
    return highlightedPointIDs;
  };

  this.updateDimmedPoints = function (animated = true) {
    let highlightedPointIDs = this._computeHighlightedPoints();
    let newDimmedPoints =
      highlightedPointIDs.size == 0
        ? new Set()
        : new Set(
            this.data
              .filter((d, i) => !highlightedPointIDs.has(d.id))
              .map((d) => d.id)
          );
    if (newDimmedPoints == this.dimmedPoints) {
      return;
    }
    this.dimmedPoints = newDimmedPoints;

    this.updateTextPriority();

    if (animated) {
      this.marks.animateComputed("alpha", interpolateTo, highlightDuration);
      this.marks.animateComputed("r", interpolateTo, highlightDuration);
      this.marks.animateComputed("lineAlpha", interpolateTo, highlightDuration);
    }
  };

  this.updateTextPriority = function () {
    let visibleGraphs = Object.values(starGraphPool.getAllVisible());
    let centerIDs = new Set(
      visibleGraphs.map((graphInfo) => graphInfo.element.centerMark.id)
    );
    let transientIDs = new Set(
      visibleGraphs
        .filter((graphInfo) => graphInfo.info.transient)
        .map((graphInfo) => graphInfo.element.centerMark.id)
    );
    let neighborIDs = new Set(
      visibleGraphs
        .map((graphInfo) =>
          !graphInfo.info.transient
            ? graphInfo.element.neighborMarks.map((m) => m.id)
            : []
        )
        .flat()
    );
    this.marks.setAll("textPriority", (mark, i) => {
      if (
        this.filterVisiblePoints.size > 0 &&
        !this.filterVisiblePoints.has(mark.id)
      )
        return null;
      if (transientIDs.has(mark.id)) return TransientSelectionTextPriority;
      if (centerIDs.has(mark.id) || selectedPoints.has(mark.id))
        return SelectionTextPriority;
      else if (neighborIDs.has(mark.id)) return NeighborTextPriority;
      // else if (this.filterVisiblePoints.has(mark.id)) return FilterTextPriority;
      else if (
        this.previewFrameNumber != -1 &&
        this.previewFrameNumber != this.currentFrameNumber
      ) {
        let bestPriority = 0;
        // if (previewHaloIDs.has(mark.id)) bestPriority = PreviewHaloTextPriority;
        let lineAlpha = mark.data("lineAlpha");
        if (lineAlpha > 0.1)
          bestPriority = Math.max(
            bestPriority,
            PreviewMinTextPriority +
              lineAlpha * (PreviewMaxTextPriority - PreviewMinTextPriority)
          );
        return bestPriority > 0 ? bestPriority : null;
      }
      return null;
    });
  };

  this.filter = function (visibleIDs) {
    this.filterVisiblePoints = new Set(visibleIDs);
    if (
      this.previewFrameNumber != -1 &&
      this.previewFrameNumber != this.currentFrameNumber
    ) {
      this.updatePreviewLineAlphas();
      this.updatePreviewHalos();
    }

    this.marks.animateComputed("alpha", interpolateTo, highlightDuration);
    if (
      this.previewFrameNumber >= 0 &&
      this.previewFrameNumber != this.currentFrameNumber
    )
      this.marks.animateComputed("lineAlpha", interpolateTo, highlightDuration);
  };

  this.clearFilter = function () {
    if (this.filterVisiblePoints.size == 0) return;

    this.filterVisiblePoints = new Set();
    if (
      this.previewFrameNumber != -1 &&
      this.previewFrameNumber != this.currentFrameNumber
    ) {
      this.updatePreviewLineAlphas();
      this.updatePreviewHalos();
    }

    this.marks.animateComputed("alpha", interpolateTo, highlightDuration);
    if (
      this.previewFrameNumber >= 0 &&
      this.previewFrameNumber != this.currentFrameNumber
    )
      this.marks.animateComputed("lineAlpha", interpolateTo, highlightDuration);
  };

  let hoveredElement = null;
  let selectedPoints = new Set();
  let selectionDecorations = [];

  const TransientSelectionTextPriority = 150;
  const SelectionTextPriority = 100;
  const NeighborTextPriority = 50;
  const FilterTextPriority = 25;
  const PreviewMaxTextPriority = 20;
  const PreviewMinTextPriority = 10;
  const PreviewHaloTextPriority = 9;

  this.showHoverText = function (hoverTextFn) {
    this.marks.setAll("textPriority", (_, i) =>
      hoverTextFn(this.data.at(i), i) ? SelectionTextPriority : null
    );
  };

  this.setHoveredElement = function (element, animated = true) {
    if (!!hoveredElement && hoveredElement.type == "halo") {
      hoveredElement.halo.animateHover(this.marks, false);
    }
    hoveredElement = element;
    if (!!hoveredElement && hoveredElement.type == "halo") {
      hoveredElement.halo.animateHover(this.marks, true);
    }

    this.updateStarGraphVisibility();
    this.updateDimmedPoints(animated);
  };

  this.selectElement = function (element, multi, animated = true) {
    if (!element) {
      this.setSelectedPoints([], animated);
      return [];
    } else if (element.type == "mark") {
      let selection = new Set(selectedPoints);
      if (multi) {
        if (selection.has(element.id)) selection.delete(element.id);
        else selection.add(element.id);
      } else {
        selection = new Set([element.id]);
      }
      selection = Array.from(selection);
      this.setSelectedPoints(selection, animated);
      return selection;
    } else if (element.type == "halo") {
      this.setSelectedPoints(element.ids, animated);
      return element.ids;
    }
  };

  this.setSelectedPoints = function (pointIDs, animated = true) {
    selectionDecorations.forEach((dec) => this.marks.removeDecoration(dec));
    selectionDecorations = pointIDs
      .map((id) => {
        let mark = this.marks.getMarkByID(id);
        if (!mark) return null;
        return new Decoration("outline", [mark], {
          r: {
            valueFn: () => mark.attr("r") + 3.0,
          },
          color: "007bff",
          lineWidth: 2.0,
        });
      })
      .filter((dec) => !!dec);
    selectionDecorations.forEach((dec) => this.marks.addDecoration(dec));

    selectedPoints = new Set(pointIDs);
    this.updateStarGraphVisibility();
    this.updateDimmedPoints(animated);
  };

  // Takes a dictionary with possible values colorScale, xScale, yScale
  this.rescale = function (options = {}) {
    this.xScale = options.xScale || this.xScale;
    this.yScale = options.yScale || this.yScale;
    this.colorScale = options.colorScale || this.colorScale;
    this.marks.updateAllDecorations();
  };
}
