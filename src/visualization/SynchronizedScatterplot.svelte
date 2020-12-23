<script>
  import { createEventDispatcher, onMount } from "svelte";
  import * as d3 from "d3";
  import D3Canvas from "./D3Canvas.svelte";
  import { DatasetManager } from "./data_manager.js";
  import { Scales } from "./scales";
  import { fade } from "svelte/transition";

  const dispatch = createEventDispatcher();

  export let width = 600;
  export let height = 600;
  export let useHalos = false;
  export let hoverable = false;
  export let thumbnail = false;
  export let isSelected = false; // for thumbnails only

  export let rFactor = 1.0;
  export let colorScheme = { value: d3.interpolateTurbo };
  let oldColorScheme;

  let colorScale = (c) => c;

  export let frame = 0;
  export let previewFrame = -1; // the frame to preview with translucent lines
  var prevFrame = -1;
  var prevPreviewFrame = -1;

  export let hoveredID = null;
  export let clickedID = null;

  export let data = null;
  let oldData = null;
  export let animateTransitions = false;
  var marks = null;
  let dataManager;

  let timer;
  let currentTime = 0;

  // Animate point positions on different frames
  $: {
    if (!!dataManager) {
      if (prevFrame != frame) {
        updateFrame(frame);
        prevFrame = frame;
      }
    }
  }

  function updateFrame(newFrame) {
    dataManager.setFrame(newFrame, animateTransitions);
    if (!!hoveredID && !data.atFrame(hoveredID, newFrame)) {
      hideStarGraph(hoveredID);
      hoveredID = null;
    } else if (!!hoveredID) {
      updateStarGraph(hoveredID);
    }
    if (!!clickedID && !data.atFrame(clickedID, newFrame)) {
      hideStarGraph(clickedID);
      selectPoint(null);
      scales.resetZoom();
    } else if (!!clickedID) {
      updateStarGraph(clickedID);
    }

    if (!!canvas && !animateTransitions) {
      canvas.draw();
    }
  }

  // Animate shadow lines when previewing a frame
  $: {
    if (!!dataManager) {
      if (previewFrame != prevPreviewFrame) {
        prevPreviewFrame = previewFrame;
        dataManager.previewFrame(previewFrame, animateTransitions, useHalos);
        if (!!canvas && !animateTransitions) {
          canvas.draw();
        }
      }
    }
  }

  $: if (!!canvas && (oldData != data || oldColorScheme != colorScheme)) {
    oldData = data;
    oldColorScheme = colorScheme;

    initializeDataBinding(data);
  }

  onMount(() => {
    if (animateTransitions) {
      timer = d3.timer((elapsed) => {
        let dt = elapsed - currentTime;
        currentTime = elapsed;
        let update = scales.advance(dt);
        update = (!!marks && marks.advance(dt)) || update;
        if (update) {
          canvas.draw();
        }
      });
    }
  });

  // Temporary initial value
  let scales = new Scales([0, 1], [0, 1], [0, 1], [0, 1]);

  var canvas;
  var hiddenCanvas; // for getting IDs

  var mouseMoveTimeout;

  let canvasBG = "transparent";
  let isHovering = false;
  let isClicking = false;

  $: {
    if (isClicking) {
      canvasBG = "skyblue";
    } else if (isHovering) {
      canvasBG = isSelected ? "deepskyblue" : "skyblue";
    } else {
      canvasBG = isSelected ? "deepskyblue" : "transparent";
    }
  }

  function onMouseover(obj) {
    if (thumbnail) {
      isHovering = true;
      dispatch("mouseover");
    }
  }

  function onMousedown(obj) {
    if (thumbnail) {
      isClicking = true;
    }
  }

  function onMouseup(obj) {
    if (thumbnail) {
      isClicking = false;
    }
  }

  function onMouseout(obj) {
    if (thumbnail) {
      isHovering = false;
      dispatch("mouseout");
    } else if (hoveredID != null) {
      hoveredID = null;
      dispatch("datahover", hoveredID);
    }
  }

  function getIDAtPoint(x, y) {
    if (!dataManager) return null;

    hiddenCanvas.draw();
    var color = hiddenCanvas.getColorAtPoint(x, y);

    var colKey = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
    return dataManager.getPointByColorID(colKey);
  }

  var prevHoverID = null;
  var prevClickedID = null;

  let starGraphs = {};

  function showStarGraph(id) {
    if (!!starGraphs[id]) {
      dataManager.highlightStarGraph(starGraphs[id]).then(
        () => {},
        () => {}
      );
    } else if (!!data.byID(id)) {
      let item = data.atFrame(id, frame);
      if (!item) return;
      let neighbors = (item.highlightIndexes || []).map((i) => "" + i);
      starGraphs[id] = dataManager.createStarGraph(id, neighbors);
      dataManager.highlightStarGraph(starGraphs[id]).then(
        () => {},
        () => {}
      );
    }
  }

  function hideStarGraph(id) {
    if (!!starGraphs[id]) {
      dataManager.unhighlightStarGraph(starGraphs[id]).then(
        () => (starGraphs[id] = undefined),
        () => {}
      );
    }
  }

  function updateStarGraph(id) {
    if (!!starGraphs[id]) {
      let item = data.atFrame(id, frame);
      if (item) {
        let neighbors = (item.highlightIndexes || []).map((i) => "" + i);
        dataManager.updateStarGraph(starGraphs[id], neighbors);
      } else {
        hideStarGraph(id);
      }
    }
  }

  $: if (prevHoverID != hoveredID && !!marks && !!data) {
    if (prevHoverID != null && prevHoverID != clickedID) {
      hideStarGraph(prevHoverID);
    }
    if (hoveredID != null) {
      showStarGraph(hoveredID);
    }
    prevHoverID = hoveredID;
  }

  $: if (prevClickedID != clickedID && !!marks && !!data) {
    if (prevClickedID != null) {
      hideStarGraph(prevClickedID);
    }
    if (clickedID != null) {
      showStarGraph(clickedID);
    }

    prevClickedID = clickedID;
  }

  export function selectPoint(pointID) {
    clickedID = pointID;
    dispatch("dataclick", clickedID);

    if (!!clickedID) {
      // Find the nearest neighbors in all frames and highlight those
      let filteredPoints = new Set([clickedID]);
      let highlightIndexes = data.byID(clickedID).highlightIndexes;
      let allNeighbors = new Set(Object.values(highlightIndexes).flat());
      // Add another round of neighbors
      allNeighbors.forEach((n) => {
        filteredPoints.add(n);
        let highlightIndexes = data.byID(n).highlightIndexes;
        Object.values(highlightIndexes)
          .flat()
          .forEach((id) => filteredPoints.add(id));
      });
      dataManager.filter(filteredPoints);

      if (isCenteredOnPoint) {
        centerOnClickedPoint();
      } else {
        showVicinityOfClickedPoint();
      }

      /*d3.range(data.frameCount).forEach((f) => {
        let neighbors = data.neighborsInFrame(clickedID, f, 25);
        neighbors.forEach((n) => filteredPoints.add(n));
        let framePt = data.atFrame(clickedID, f);
        if (!!framePt && !!framePt.highlightIndexes) {
          framePt.highlightIndexes.forEach((n) => filteredPoints.add(n));
        }
      });*/
    } else {
      dataManager.clearFilter();
      isCenteredOnPoint = false;
    }
  }

  function onMousemove(info) {
    if (!hoverable) return;

    // Get mouse positions from the main canvas.
    var e = info.detail;
    var rect = e.target.getBoundingClientRect();
    var mouseX = e.clientX - rect.left; //x position within the element.
    var mouseY = e.clientY - rect.top; //y position within the element.
    var newHoveredID = getIDAtPoint(mouseX, mouseY);

    if (newHoveredID != hoveredID) {
      hoveredID = newHoveredID;

      dispatch("datahover", hoveredID);
    }
  }

  function onClick(info) {
    if (!hoverable) return;

    // Get mouse positions from the main canvas.
    var e = info.detail;
    var rect = e.target.getBoundingClientRect();
    var mouseX = e.clientX - rect.left; //x position within the element.
    var mouseY = e.clientY - rect.top; //y position within the element.
    var idx = getIDAtPoint(mouseX, mouseY);

    selectPoint(idx);
  }

  let showResetButton = false;

  let showCenterButton = false;
  let isCenteredOnPoint = false;
  $: showCenterButton = clickedID != null;
  let centeredText = "";
  $: centeredText = getCenteredText(isCenteredOnPoint, clickedID);

  function getCenteredText(isCentered, pointID) {
    if (pointID == null || thumbnail) {
      return "";
    }
    let datapt = data.byID(pointID);
    if (!datapt) return "";
    let detailMessage = datapt.hoverText;
    if (!!detailMessage) detailMessage = " - " + detailMessage;
    else detailMessage = "";

    if (isCentered) {
      return `Centered on <strong>${pointID}${detailMessage}</strong>`;
    }
    return `Showing vicinity of <strong>${pointID}${detailMessage}</strong>`;
  }

  function rescale() {
    isCenteredOnPoint = false;
    if (!!dataManager && !!canvas) {
      dataManager.rescale();
      canvas.draw();
    }
  }

  function resetAxisScales() {
    selectPoint(null);
    scales.resetZoom();
    isCenteredOnPoint = false;
    if (!!dataManager && !!canvas) {
      dataManager.rescale();
      canvas.draw();
    }
  }

  function centerOnClickedPoint() {
    let datapt = data.atFrame(clickedID, frame);

    let neighbors = datapt.highlightIndexes;
    scales.centerOn(
      dataManager.marks.getMarkByID(clickedID),
      [clickedID, ...neighbors].map((pt) => dataManager.marks.getMarkByID(pt))
    );
    isCenteredOnPoint = true;
  }

  function showVicinityOfClickedPoint() {
    isCenteredOnPoint = false;

    scales.zoomTo(
      Array.from(dataManager.filterVisiblePoints).map((pt) =>
        dataManager.marks.getMarkByID(pt)
      )
    );
  }

  // Updating the data bindings
  function initializeDataBinding(data) {
    if (!data) {
      dataManager = null;
      return;
    }
    dataManager = new DatasetManager(
      data,
      // These preserve the reference to this object's scales, so the functions' behavior
      // will automatically change as the scales change
      (c) => colorScale(c),
      (x) => scales.scaleX(x),
      (y) => scales.scaleY(y),
      frame
    );
    marks = dataManager.marks;

    let colorType = colorScheme.type || "continuous";
    if (colorType == "categorical") {
      colorScale = d3
        .scaleOrdinal(colorScheme.value)
        .domain(data.getColorExtent(true));
    } else {
      colorScale = d3
        .scaleSequential(colorScheme.value)
        .domain(data.getColorExtent());
    }

    dispatch("colorScale", colorScale);

    // Initialize scales
    scales = new Scales(
      data.getXExtent(),
      data.getYExtent(),
      [canvas.margin.left, width - canvas.margin.right],
      [canvas.margin.top, height - canvas.margin.bottom],
      0.5
    );

    scales.onUpdate(() => {
      showResetButton = !scales.isNeutral() || clickedID != null;
    });
  }
</script>

<style>
  #container {
    position: relative;
  }
  #button-panel {
    position: absolute;
    right: 8px;
    top: 8px;
  }
  #message-panel {
    position: absolute;
    bottom: 0;
    left: 8px;
    font-size: small;
    color: #555;
  }
</style>

<svelte:options accessors />

<div style="width: {width}px; height: {height}px;" id="container">
  <D3Canvas
    {thumbnail}
    backgroundColor={canvasBG}
    {width}
    {height}
    data={marks}
    halosEnabled={useHalos}
    pan={!thumbnail}
    zoom={!thumbnail}
    {rFactor}
    on:click
    on:mousemove={onMousemove}
    on:mouseover={onMouseover}
    on:mousedown={onMousedown}
    on:mouseup={onMouseup}
    on:mouseout={onMouseout}
    on:click={onClick}
    on:scale={(e) => {
      scales.scaleBy(e.detail.ds, e.detail.centerPoint);
      rescale();
    }}
    on:translate={(e) => {
      scales.translateBy(e.detail.x, e.detail.y);
      rescale();
    }}
    bind:this={canvas} />
  {#if hoverable}
    <D3Canvas
      {width}
      {height}
      data={marks}
      bind:this={hiddenCanvas}
      {rFactor}
      hidden />
  {/if}
  {#if !thumbnail}
    <div id="button-panel">
      {#if showCenterButton}
        <button
          transition:fade={{ duration: 100 }}
          type="button"
          class="btn btn-primary btn-sm"
          on:click|preventDefault={!isCenteredOnPoint ? centerOnClickedPoint : showVicinityOfClickedPoint}>
          {#if !isCenteredOnPoint}Center{:else}Vicinity{/if}</button>
      {/if}
      {#if showResetButton}
        <button
          transition:fade={{ duration: 100 }}
          type="button"
          class="btn btn-dark btn-sm"
          on:click|preventDefault={resetAxisScales}>Reset</button>
      {/if}
    </div>
    <div id="message-panel">
      {#if !!centeredText}
        {@html centeredText}
      {/if}
    </div>
  {/if}
</div>