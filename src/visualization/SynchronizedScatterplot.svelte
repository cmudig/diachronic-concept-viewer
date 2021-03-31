<svelte:options accessors />

<script>
  import { createEventDispatcher, onMount } from "svelte";
  import * as d3 from "d3";
  import { fade } from "svelte/transition";
  import Icon from "fa-svelte";
  import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
  import Scatterplot from "./pixi/Scatterplot.svelte";
  import PreviewSlider from "./components/PreviewSlider.svelte";

  const dispatch = createEventDispatcher();

  let container;

  // Props for this element
  export let backgroundColor = "white";
  export let width = null;
  export let height = null;

  // Props passed directly to scatterplot
  export let padding = 0.3;
  export let rFactor = 1.0;
  export let colorScheme = { value: d3.interpolateTurbo };
  export let animateTransitions = false;

  // Enable/disable interaction
  export let hoverable = false;
  export let thumbnail = false;

  // Frames and previews
  export let frame = 0;
  export let previewFrame = -1; // the frame to preview with translucent lines
  export let showPreviewControls = false;
  export let previewProgress = 0.0;

  // Scatterplot state
  let scalesNeutral = true;
  export let hoveredID = null;
  export let clickedIDs = [];
  export let alignedIDs = [];
  export let filter = new Set();
  let followingIDs = [];

  // Data control
  export let data = null;
  export let alignFunction = null;
  export let allowAlignment = true; // if true, show Align button
  export let allowCentering = false; // if true, show Center button

  // Thumbnails
  export let thumbnailsURL = null;

  let scatterplot;
  let warningMessage = "";

  $: {
    if (!data) warningMessage = "";
    else if (clickedIDs.length > 0) {
      warningMessage = "";
      if (previewFrame >= 0 && previewFrame != frame) {
        let unavailable = countUnavailablePoints(clickedIDs, previewFrame);
        if (unavailable > 0) {
          if (clickedIDs.length > 1)
            warningMessage = `${unavailable} of ${clickedIDs.length} entities do not appear in the plot for the destination month`;
          else
            warningMessage =
              "The selected entity does not appear in the plot for the destination month";
        }
      } else {
        let unavailable = countUnavailablePoints(clickedIDs, frame);
        if (unavailable > 0) {
          if (clickedIDs.length > 1)
            warningMessage = `${unavailable} of ${clickedIDs.length} entities do not appear in this plot (see legend)`;
          else
            warningMessage =
              "The selected entity does not appear in this plot (see legend)";
        }
      }
    } else warningMessage = "";
  }

  function countUnavailablePoints(ids, inFrame) {
    return ids.reduce((tally, id) => tally + !data.atFrame(id, inFrame), 0);
  }

  // Selection

  var prevClickedIDs = null;
  $: if (prevClickedIDs != clickedIDs && !!data) {
    updateSelection();
    prevClickedIDs = clickedIDs;
    dispatch("dataclick", clickedIDs);
  }

  function updateSelection() {
    isCentered = false;
    if (clickedIDs.length > 0) {
      let filteredPoints = new Set();
      clickedIDs.forEach((clickedID) => {
        filteredPoints.add(clickedID);
        d3.range(data.frameCount).forEach((f) => {
          let neighbors = data.neighborsInFrame(clickedID, f, 25);
          neighbors.forEach((n) => filteredPoints.add(n));
          let framePt = data.atFrame(clickedID, f);
          if (!!framePt && !!framePt.highlightIndexes) {
            framePt.highlightIndexes.forEach((n) => filteredPoints.add(n));
          }
        });
      });
      filter = filteredPoints;

      showVicinityOfClickedPoint();
    } else {
      filter = new Set();
      followingIDs = [];
    }
  }

  var prevAlignedIDs = null;
  $: if (prevAlignedIDs != alignedIDs && !!data) {
    alignToPoints(alignedIDs);
    prevAlignedIDs = alignedIDs;
  }

  // Reset button
  let showResetButton = false;
  $: showResetButton =
    !scalesNeutral || clickedIDs.length > 0 || alignedIDs.length > 0;

  // Align button
  let showAlignmentButton = false;
  $: showAlignmentButton = allowAlignment && clickedIDs.length > 0;

  let alignedToSelection = false;
  $: alignedToSelection =
    alignedIDs.length > 0 &&
    JSON.stringify(alignedIDs) ==
      JSON.stringify(getVicinityOfPoints(clickedIDs));

  let alignmentText = "";
  $: alignmentText = getAlignmentText(
    alignedIDs,
    clickedIDs,
    alignedToSelection,
    isCentered
  );

  function _describePoint(pointID) {
    let datapt = data.byID(pointID);
    if (!datapt) return "";
    let detailMessage = datapt.hoverText;
    if (!!detailMessage) detailMessage = " - " + detailMessage;
    else detailMessage = "";
    return `${pointID}${detailMessage}`;
  }

  function _othersMessage(pointIDs) {
    return pointIDs.length > 1 ? ` and ${pointIDs.length - 1} others` : "";
  }

  function getAlignmentText(
    alignPoints,
    clickPoints,
    alignedToSelectedPoints,
    centered
  ) {
    if ((alignPoints.length == 0 && clickPoints.length == 0) || thumbnail) {
      return "";
    }

    let selectionWord = centered ? "centered" : "selected";

    if (clickPoints.length == 0 && alignPoints.length > 0) {
      return `Aligned to <strong>${_describePoint(
        alignPoints[0]
      )}</strong>${_othersMessage(alignPoints)}`;
    } else if (clickPoints.length > 0 && alignPoints.length == 0) {
      return `<strong>${_describePoint(
        clickPoints[0]
      )}</strong>${_othersMessage(clickPoints)} ${selectionWord}`;
    }

    let selectionBase =
      `<strong>${_describePoint(clickPoints[0])}</strong>` +
      `${_othersMessage(clickPoints)} ${selectionWord}`;

    if (alignedToSelectedPoints) return selectionBase + " (aligned)";
    return (
      selectionBase +
      `, aligned to ${alignPoints.length} ` +
      `point${alignPoints.length > 1 ? "s" : ""}`
    );
  }

  async function alignToPoints(pointIDs) {
    if (!alignFunction) return;

    let transformations = await alignFunction(frame, pointIDs);
    if (!!transformations) {
      data.transform(transformations);
      scatterplot.animateDatasetUpdate();
      dispatch("align", alignedIDs);
    }
  }

  // Centering button
  let showCenterButton = false;
  let isCentered = false;
  let centerButtonEnabled = false;
  $: showCenterButton = allowCentering && clickedIDs.length > 0;
  $: centerButtonEnabled = allowCentering && clickedIDs.length == 1;

  export function reset() {
    clickedIDs = [];
    alignedIDs = [];
    followingIDs = [];
    isCentered = false;
    scatterplot.reset();
  }

  function getVicinityOfPoints(pointIDs) {
    let vicinity;
    if (pointIDs.length >= 3) {
      // There are enough points to use them as-is
      vicinity = pointIDs;
    } else {
      // Use the neighbors to help with the alignment
      let filteredPoints = new Set(pointIDs);
      pointIDs.forEach((id) => {
        let point = data.byID(id);
        if (!point) return;
        let highlightIndexes = point.highlightIndexes;
        let allNeighbors = new Set(Object.values(highlightIndexes).flat());
        allNeighbors.forEach((n) => filteredPoints.add(n));
      });
      vicinity = Array.from(filteredPoints);
    }
    return vicinity;
  }

  export function showVicinityOfClickedPoint() {
    followingIDs = getVicinityOfPoints(clickedIDs);
  }
</script>

<div
  style="width: {width != null ? `${width}px` : '100%'}; height: {height != null
    ? `${height}px`
    : '100%'}; background-color: {backgroundColor};"
  id="container"
  bind:this={container}
>
  <Scatterplot
    bind:this={scatterplot}
    {padding}
    {width}
    {height}
    {hoverable}
    {thumbnail}
    {rFactor}
    {colorScheme}
    {animateTransitions}
    {thumbnailsURL}
    centerOnSelection={isCentered}
    bind:frame
    bind:previewFrame
    bind:previewProgress
    bind:clickedIDs
    bind:hoveredID
    bind:alignedIDs
    bind:followingIDs
    bind:filter
    bind:data
    bind:scalesNeutral
    on:mouseover
    on:mouseout
    on:mousedown
    on:mouseup
    on:datahover
    on:dataclick
    on:click
    on:colorScale
  />
  {#if !thumbnail}
    <div id="button-panel">
      {#if showAlignmentButton}
        <button
          disabled={alignedToSelection}
          type="button"
          class="btn btn-primary btn-sm"
          on:click|preventDefault={() =>
            (alignedIDs = getVicinityOfPoints(clickedIDs))}
        >
          Align</button
        >
      {/if}
      {#if showCenterButton}
        <button
          disabled={!centerButtonEnabled}
          type="button"
          class="btn btn-primary btn-sm"
          on:click|preventDefault={() => (isCentered = !isCentered)}
        >
          {#if isCentered}Vicinity{:else}Center{/if}
        </button>
      {/if}
      {#if showResetButton}
        <button
          transition:fade={{ duration: 100 }}
          type="button"
          class="btn btn-dark btn-sm"
          on:click|preventDefault={(e) => {
            reset();
            dispatch("reset");
          }}>Reset</button
        >
      {/if}
    </div>
    <div id="message-panel">
      {#if !!alignmentText}
        {@html alignmentText}
        {#if alignedIDs.length > 0 && !alignedToSelection}
          - <a
            on:click|preventDefault={() => (clickedIDs = alignedIDs)}
            href="#">Select alignment anchors</a
          >
        {/if}
      {/if}
    </div>
    {#if warningMessage.length > 0}
      <div id="warning-panel">
        <Icon icon={faExclamationTriangle} />
        {warningMessage}
      </div>
    {/if}
    {#if showPreviewControls && previewFrame != frame && previewFrame != -1}
      <div id="preview-panel" transition:fade={{ duration: 100 }}>
        <!-- <div>
          Showing {data.frameLabels[frame]} &rsaquo; {data.frameLabels[
            previewFrame
          ]}
        </div>
        <button
          type="button"
          class="btn btn-secondary btn-sm ml-2 mr-1 mb-0"
          on:click|preventDefault={(e) => {
            dispatch("cancelPreview");
          }}>Cancel</button
        >
        <button
          type="button"
          class="btn btn-primary btn-sm mb-0"
          on:click|preventDefault={(e) => {
            dispatch("advancePreview");
          }}>Go</button
        > -->
        <PreviewSlider width={240} bind:progress={previewProgress} />
      </div>
    {/if}
  {/if}
</div>

<style>
  #container {
    position: relative;
    overflow: hidden;
    transition: background-color 0.5s linear;
    border-radius: 8px;
  }
  #button-panel {
    position: absolute;
    right: 12px;
    top: 12px;
  }
  #message-panel {
    position: absolute;
    bottom: 12px;
    left: 12px;
    font-size: small;
    color: #555;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
  }
  #warning-panel {
    position: absolute;
    top: 12px;
    left: 12px;
    border-radius: 4px;
    padding: 6px;
    background-color: goldenrod;
    color: white;
    font-size: small;
  }
  #preview-panel {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 12px;
    font-size: small;
    color: #555;
    display: flex;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
  }
</style>
