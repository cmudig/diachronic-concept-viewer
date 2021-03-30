<!-- A script-only component that reactively manages the state of the scatterplot -->
<svelte:options accessors />

<script>
  import * as d3 from "d3";
  import { getWithFallback } from "../utils/helpers";
  import {
    MarkSet,
    Mark,
    Decoration,
    interpolateTo,
    easeInOut,
  } from "../models/data_items";
  import AnimationPool from "../models/animation_pool";
  import {
    DecorationStarGraph,
    WideningLineDecoration,
  } from "../models/decorations";
  import { onDestroy } from "svelte";

  // State variables - these should fully encode the visual state of the scatterplot,
  // except for visibility due to scaling

  export let data = null;
  export let colorScale = null;
  export let xScale = null;
  export let yScale = null;

  export let hoveredID = null;
  export let selectedIDs = [];
  export let alignedIDs = [];

  export let frame = 0;
  export let previewFrame = -1;
  export let previewProgress = 0.0; // From 0 to 1, where 0 is frame and 1 is previewFrame

  export let thumbnail = false;

  // Additional props

  export let marks = null;
  export let colorMap; // For hidden IDs
  export let filter = new Set();

  // Mark styles may be specified in different formats for different renderers
  export let colorFormat = "hex";

  // Constants

  const frameDuration = 4000;
  const previewAnimDuration = 1000;
  const defaultDuration = 500;
  const decorationDuration = 300;

  // Initialization

  $: if (!!data && !!colorScale && !!xScale && !!yScale && !!colorMap) {
    initializeMarks();
  }

  function initializeMarks() {
    marks = new MarkSet(
      data.map((d, i) => {
        let colorID = colorMap.id(d.id, { type: "mark", id: d.id });
        return new Mark(
          d.id,
          {
            x: {
              valueFn: (mark) => {
                let base = getWithFallback(
                  d.xs,
                  frame,
                  mark.attributes.x.last() || 0.0
                );
                if (
                  previewFrame != -1 &&
                  previewFrame != frame &&
                  previewProgress > 0.0
                ) {
                  let dest = getWithFallback(d.xs, previewFrame, base);
                  return base * (1 - previewProgress) + dest * previewProgress;
                }
                return base;
              },
              transform: (v) => xScale(v),
              lazy: true,
            },
            y: {
              valueFn: (mark) => {
                let base = getWithFallback(
                  d.ys,
                  frame,
                  mark.attributes.y.last() || 0.0
                );
                if (
                  previewFrame != -1 &&
                  previewFrame != frame &&
                  previewProgress > 0.0
                ) {
                  let dest = getWithFallback(d.ys, previewFrame, base);
                  return base * (1 - previewProgress) + dest * previewProgress;
                }
                return base;
              },
              transform: (v) => yScale(v),
              lazy: true,
            },
            /* zIndex: {
              valueFn: () => _getZIndex(d),
              lazy: true,
            },*/
            halo: 0.0,
            x2: {
              value: getWithFallback(d.xs, frame, 0.0),
              transform: (v) => xScale(v),
            },
            y2: {
              value: getWithFallback(d.ys, frame, 0.0),
              transform: (v) => yScale(v),
            },
            fillStyle: {
              valueFn: () => getWithFallback(d.colors, frame, 0.0),
              transform: (c) => {
                let color = d3.color(colorScale(c));
                if (colorFormat == "hex") return color.formatHex();
                else if (colorFormat == "rgb") return color.formatRgb();
                else if (colorFormat == "rgbArray") {
                  color = color.rgb();
                  return [color.r / 255.0, color.g / 255.0, color.b / 255.0];
                }
                return c;
              },
              cached: true,
            },
            alpha: { valueFn: () => _getPointAlpha(d), lazy: true },
            r: { valueFn: () => _getPointRadius(d), lazy: true },
            visible: d.visibleFlags[frame] || false,
            colorID,
            hoverText: d.hoverText || null,
            // textPriority: { valueFn: () => _getLabelPriority(d), lazy: true },
            lineWidth: { valueFn: () => _getLineWidth(d) },
            lineAlpha: { valueFn: () => _getLineAlpha(d) },
          }
          // special
        );
      })
    );
    marks.registerPreloadableProperty("x");
    marks.registerPreloadableProperty("y");
    marks.registerPreloadableProperty("r");
    marks.registerPreloadableProperty("alpha");

    setupDecorationPools();
  }

  export function destroyMarks() {
    marks = null;
  }

  onDestroy(() => {
    destroyMarks();
    data = null;
  });

  // Computed attributes

  let highlightedPoints = new Set();

  function _getPointAlpha(dataItem) {
    if (filter.size > 0 && !filter.has(dataItem.id)) return 0.0;
    let alpha = getWithFallback(dataItem.alphas, frame, 0.0);

    if (highlightedPoints.size != 0 && !highlightedPoints.has(dataItem.id))
      alpha *= 0.3;

    return alpha;
  }

  function _getPointRadius(dataItem) {
    let r = getWithFallback(dataItem.rs, frame, 0.0);
    if (highlightedPoints.size != 0 && !highlightedPoints.has(dataItem.id))
      r *= 0.7;
    if (selectedIDs.includes(dataItem.id)) r *= 1.5;
    return r;
  }

  function _getLineAlpha(dataItem) {
    if (filter.size > 0 && !filter.has(dataItem.id)) return 0.0;

    if (previewFrame < 0 || previewFrame == frame) return 0.0;

    let previewAlphas = dataItem.previewLineAlphas[frame];

    if (!previewAlphas) return 0.0;
    return previewAlphas[previewFrame] || 0.0;
  }

  function _getLineWidth(dataItem) {
    if (previewFrame < 0 || previewFrame == frame) return 0.0;

    let previewWidths = dataItem.previewLineWidths[frame];

    if (!previewWidths) return 0.0;
    return previewWidths[previewFrame] || 0.0;
  }

  const SelectionOutlineZIndex = 20;
  const StarGraphZIndex = 15;

  const HoverTextPriority = 150;
  const SelectionTextPriority = 100;
  const NeighborTextPriority = 50;
  const FilterTextPriority = 25;

  function _getLabelPriority(mark) {
    if (mark.id == hoveredID) return HoverTextPriority;
    else if (selectedIDs.includes(mark.id)) return SelectionTextPriority;
    else if (highlightedPoints.has(mark.id)) return NeighborTextPriority;

    return null;
  }

  // Frame transitions

  let previousFrame = 0;
  $: if (!!marks && previousFrame != frame) {
    setFrame(previousFrame, frame, !thumbnail);
    if (!thumbnail) {
      updatePreviewLines();
      updateSelectionState(
        hoveredID,
        hoveredID,
        selectedIDs,
        selectedIDs,
        alignedIDs,
        alignedIDs
      );
    }
    previousFrame = frame;
  }

  function setFrame(oldFrame, newFrame, animated = true) {
    previewProgress = 0.0;

    if (animated) {
      // Set positions for marks that were hidden before. This prevents
      // them from appearing to move
      marks.forEach((mark, i) => {
        if (
          !data.at(i).visibleFlags[oldFrame] &&
          data.at(i).visibleFlags[newFrame]
        ) {
          mark.attributes.x.compute();
          mark.attributes.y.compute();
          mark.attributes.fillStyle.compute();
        }
      });

      // Update visible flag
      marks.setAll(
        "visible",
        (_, i) => data.at(i).visibleFlags[newFrame] || false
      );

      // Register animations
      marks.animateComputed("x", interpolateTo, frameDuration, easeInOut);
      marks.animateComputed("y", interpolateTo, frameDuration, easeInOut);

      marks.animateComputed(
        "fillStyle",
        interpolateTo,
        frameDuration,
        easeInOut
      );
      marks.animateComputed("r", interpolateTo, frameDuration, easeInOut);
      marks.animateComputed("alpha", interpolateTo, frameDuration, easeInOut);
      marks.animateComputed(
        "lineAlpha",
        interpolateTo,
        frameDuration,
        easeInOut
      );
      marks.animateComputed(
        "lineWidth",
        interpolateTo,
        frameDuration,
        easeInOut
      );
    }

    Object.keys(starGraphPool.getAllVisible()).forEach((id) => {
      updateStarGraph(id, animated);
    });
  }

  export function animateDatasetUpdate() {
    marks.animateComputed("x", interpolateTo, frameDuration, easeInOut);
    marks.animateComputed("y", interpolateTo, frameDuration, easeInOut);
    marks.animateComputed("r", interpolateTo, frameDuration, easeInOut);
    marks.animateComputed("alpha", interpolateTo, frameDuration, easeInOut);
    marks.animateComputed("fillStyle", interpolateTo, frameDuration, easeInOut);
  }

  // Preview frames

  let oldPreviewProgress = 0.0;
  let oldPreviewFrame = -1;

  $: if (
    previewFrame != -1 &&
    previewFrame != frame &&
    oldPreviewProgress != previewProgress
  ) {
    marks.updateComputed("x");
    marks.updateComputed("y");
    oldPreviewProgress = previewProgress;
  }

  $: if (oldPreviewFrame != previewFrame) {
    if (previewProgress != 0.0) {
      if (previewFrame == -1 || previewFrame == frame) previewProgress = 0.0;
      marks.animateComputed("x", interpolateTo, frameDuration, easeInOut);
      marks.animateComputed("y", interpolateTo, frameDuration, easeInOut);
      oldPreviewProgress = previewProgress;
    }
    updatePreviewLines();
    oldPreviewFrame = previewFrame;
  }

  function updatePreviewLines() {
    if (previewFrame >= 0 && previewFrame != frame) {
      data.forEach((d) => {
        if (_getLineAlpha(d) <= 0.01) {
          previewLinePool.hide(d.id);
        } else {
          previewLinePool.show(d.id);
        }
      });
      Object.values(previewLinePool.getAllVisible()).forEach((item) => {
        let dec = item.element;
        dec.animateToFrames(
          marks,
          frame,
          previewFrame >= 0 ? previewFrame : frame,
          previewAnimDuration
        );
        dec.updateLineAppearance(marks, previewAnimDuration);
      });
    } else {
      Object.keys(previewLinePool.getAllVisible()).forEach((id) => {
        previewLinePool.hide(id);
      });
    }
  }

  // Hover and select

  var prevHoverID = null;
  var prevSelectedIDs = [];
  var prevAlignedIDs = [];
  var prevFilter = [];
  let starGraphPool;
  let previewLinePool;
  let selectionDecorationPool;
  let alignDecorationPool;
  let labelPool;

  $: if (
    !!marks &&
    (prevHoverID != hoveredID ||
      prevSelectedIDs != selectedIDs ||
      prevAlignedIDs != alignedIDs)
  ) {
    updateSelectionState(
      prevHoverID,
      hoveredID,
      prevSelectedIDs,
      selectedIDs,
      prevAlignedIDs,
      alignedIDs
    );
    prevHoverID = hoveredID;
    prevSelectedIDs = selectedIDs;
  }

  $: if (!!marks && prevFilter != filter) {
    marks.animateComputed("r", interpolateTo, defaultDuration);
    marks.animateComputed("alpha", interpolateTo, defaultDuration);
    updateAlignmentDecorations();
    updateStarGraphVisibility();
    updateLabelVisibility();
    prevFilter = filter;
  }

  export function selectElement(element, multi) {
    if (!element) {
      selectedIDs = [];
    } else if (element.type == "mark") {
      let selection = new Set(selectedIDs);
      if (multi) {
        if (selection.has(element.id)) selection.delete(element.id);
        else selection.add(element.id);
      } else {
        selection = new Set([element.id]);
      }
      selectedIDs = Array.from(selection);
    } else if (element.type == "halo") {
      selectedIDs = element.ids;
    }
    hoveredID = null;
  }

  // This function should make ALL the mutations that arise from selection/alignment
  // changes
  function updateSelectionState(
    oldHoveredID,
    newHoveredID,
    oldSelectedIDs,
    newSelectedIDs,
    oldAlignedIDs,
    newAlignedIDs
  ) {
    oldSelectedIDs.forEach((id) => selectionDecorationPool.hide(id));
    newSelectedIDs.forEach((id) => {
      if (!!data.atFrame(id, frame)) selectionDecorationPool.show(id);
    });

    updateAlignmentDecorations();
    updateStarGraphVisibility();
    updateLabelVisibility();
  }

  $: if (!!marks) {
    highlightedPoints = new Set(
      selectedIDs
        .map((id) => {
          let item = data.atFrame(id, frame);
          if (!item) return [];
          return [id, ...item.highlightIndexes];
        })
        .flat()
    );
    marks.animateComputed("r", interpolateTo, defaultDuration);
    marks.animateComputed("alpha", interpolateTo, defaultDuration);
    updateLabelVisibility();
  }

  function setupDecorationPools() {
    previewLinePool = new AnimationPool({
      create: (nodeID) => {
        let dataItem = data.byID(nodeID);
        if (!dataItem) return null;
        let mark = marks.getMarkByID(nodeID);
        if (!mark) return null;
        let dec = new WideningLineDecoration(
          mark,
          dataItem,
          frame,
          _getLineWidth,
          _getLineAlpha
        );
        marks.addDecoration(dec);
        return dec;
      },
      show: (element) => {
        element.animateToFrames(
          marks,
          frame,
          previewFrame,
          previewAnimDuration
        );
        element.updateLineAppearance(marks, previewAnimDuration);
        return new Promise((resolve) =>
          setTimeout(resolve, previewAnimDuration)
        );
      },
      hide: (element) => {
        element.animateToFrames(marks, frame, frame, previewAnimDuration);
        element.updateLineAppearance(marks, previewAnimDuration);
        return new Promise((resolve) =>
          setTimeout(resolve, previewAnimDuration)
        );
      },
      destroy: (element) => {
        marks.removeDecoration(element);
      },
    });

    starGraphPool = new AnimationPool({
      create: (nodeID, info) => {
        if (!info) return null;
        let graph = new DecorationStarGraph(
          marks.getMarkByID(nodeID),
          info.linkedNodeIDs
            .filter((id) => {
              let datapt = data.byID(id);
              if (!datapt) return false;
              return !!datapt.visibleFlags[frame];
            })
            .map((id) => marks.getMarkByID(id))
            .filter((m) => !!m),
          SelectionOutlineZIndex,
          StarGraphZIndex
        );
        info.highlightedNodes = [nodeID, ...info.linkedNodeIDs];
        info.transient = info.transient || false;
        graph.getDecorations().forEach((d) => marks.addDecoration(d));
        return graph;
      },
      show: (element) => {
        element.enter(marks, decorationDuration);
        return new Promise((resolve) =>
          setTimeout(resolve, decorationDuration)
        );
      },
      hide: (element) => {
        element.exit(marks, decorationDuration);
        return new Promise((resolve) =>
          setTimeout(resolve, decorationDuration)
        );
      },
      destroy: (element) => {
        element.getDecorations().forEach((d) => marks.removeDecoration(d));
      },
    });

    selectionDecorationPool = new AnimationPool({
      create: (nodeID) => {
        let mark = marks.getMarkByID(nodeID);
        if (!mark) return null;
        return new Decoration("outline", [mark], {
          r: {
            valueFn: () => mark.attr("r") + 3.0,
          },
          color: "007bff",
          lineWidth: 2.0,
          zIndex: SelectionOutlineZIndex,
        });
      },
      show: async (element) => marks.addDecoration(element),
      hide: async (element) => marks.removeDecoration(element),
      destroy: () => {},
    });

    alignDecorationPool = new AnimationPool({
      create: (nodeID) => {
        let mark = marks.getMarkByID(nodeID);
        if (!mark) return null;
        return new Decoration("outline", [mark], {
          r: {
            valueFn: () => mark.attr("r") + 3.0,
          },
          color: "#aaaaaa",
          lineWidth: 2.0,
          zIndex: SelectionOutlineZIndex,
        });
      },
      show: async (element) => marks.addDecoration(element),
      hide: async (element) => marks.removeDecoration(element),
      destroy: () => {},
    });

    labelPool = new AnimationPool({
      create: (nodeID) => {
        let mark = marks.getMarkByID(nodeID);
        let dataItem = data.byID(nodeID);
        if (
          !mark ||
          !dataItem ||
          !dataItem.label ||
          !dataItem.visibleFlags[frame]
        )
          return null;
        if (!!dataItem.label.text) {
          return new Decoration("text", [mark], {
            color: "black",
            text: dataItem.hoverText,
            priority: { valueFn: () => _getLabelPriority(mark), lazy: true },
            textScale: 1.0,
            alpha: 0.0,
          });
        } else if (!!dataItem.label.sheet) {
          return new Decoration("image", [mark], {
            color: null,
            labelInfo: dataItem.label,
            priority: { valueFn: () => _getLabelPriority(mark), lazy: true },
            alpha: 0.0,
            maxDim: 16.0, // maximum width or height
          });
        }
      },
      show: async (element) => marks.addDecoration(element),
      hide: async (element) => marks.removeDecoration(element),
      destroy: () => {},
    });
  }

  function setStarGraphTransient(nodeID, transient) {
    let info = starGraphPool.getInfo(nodeID);
    if (!!info) info.transient = transient;
  }

  function updateStarGraph(nodeID, animated = true) {
    let info = starGraphPool.getInfo(nodeID);
    let element = starGraphPool.getElement(nodeID);
    if (!element) {
      showStarGraph(nodeID);
      return;
    }

    let item = data.atFrame(nodeID, frame);
    if (item) {
      let newNeighbors = (item.highlightIndexes || []).map((i) => "" + i);
      info.highlightedNodes = [info.highlightedNodes[0], ...newNeighbors];
      element.updateNeighborMarks(
        newNeighbors.map((id) => marks.getMarkByID(id)).filter((m) => !!m),
        marks,
        animated ? decorationDuration : 0
      );
    } else {
      starGraphPool.hide(nodeID);
    }
  }

  function showStarGraph(id, transient = false) {
    setStarGraphTransient(id, transient);
    starGraphPool.show(id, () => {
      let item = data.atFrame(id, frame);
      if (!item) return;
      let neighbors = (item.highlightIndexes || []).map((i) => "" + i);
      return {
        linkedNodeIDs: neighbors,
        transient,
      };
    });
  }

  function updateStarGraphVisibility() {
    if (!starGraphPool) return;

    // Only show for hovered ID and single clicked ID
    let visibleGraphs = new Set();
    let transientID = null;
    if (!!hoveredID) {
      visibleGraphs.add(hoveredID);
      transientID = hoveredID;
    }
    if (selectedIDs.length == 1) {
      let selected = selectedIDs[0];
      setStarGraphTransient(selected, false);
      visibleGraphs.add(selected);
      if (transientID == selected) transientID = null;
    }
    Object.keys(starGraphPool.getAll()).forEach((key) => {
      if (!visibleGraphs.has(key) || !data.atFrame(key, frame))
        starGraphPool.hide(key);
    });
    visibleGraphs.forEach((key) => {
      if (!!data.atFrame(key, frame)) showStarGraph(key, key == transientID);
    });
  }

  function updateAlignmentDecorations() {
    // Only show for points in alignedIDs but not selectedIDs
    let idsToShow = new Set();
    alignedIDs.forEach((id) => idsToShow.add(id));
    selectedIDs.forEach((id) => idsToShow.delete(id));

    Object.keys(alignDecorationPool.getAllVisible()).forEach((id) => {
      alignDecorationPool.hide(id);
    });
    idsToShow.forEach((id) => alignDecorationPool.show(id));
  }

  function updateLabelVisibility() {
    Object.keys(labelPool.getAll()).forEach((key) => {
      if (!highlightedPoints.has(key) && hoveredID != key) labelPool.hide(key);
    });
    highlightedPoints.forEach((id) => labelPool.show(id));
    if (!!hoveredID) labelPool.show(hoveredID);
  }
</script>
