<script>
  import { createEventDispatcher } from "svelte";
  import * as d3 from "d3";
  import SynchronizedScatterplot from "./visualization/SynchronizedScatterplot.svelte";
  import Legend from "./visualization/Legend.svelte";
  import { Dataset } from "./visualization/dataset";
  import { fade } from "svelte/transition";

  import * as Model from "./datamodel";
  import ScatterplotThumbnail from "./visualization/ScatterplotThumbnail.svelte";

  const dispatch = createEventDispatcher();

  let colorChannel = "color";

  let colorScheme = {
    name: "tableau",
    value: d3.schemeTableau10,
    type: "categorical",
  };

  let colorScale;
  let isLoading = false;

  let useHalos = false;

  let oldThumbnailID = null;
  export let thumbnailID = null;
  let previewThumbnailID = null;

  var data = null;
  export let currentFrame = 0;
  export let previewFrame = -1;

  let canvas;

  let showLegend = false;

  // Note: it's very important that the callback doesn't READ any properties that
  // it also WRITES
  $: {
    isLoading = true;
    Model.getVisualizationData()
      .then((respJSON) => {
        currentFrame = 0;
        previewFrame = 0;
        initializeData(respJSON);
        isLoading = false;
      })
      .catch((err) => {
        data = null;
        isLoading = false;
      });
  }

  function initializeData(respJSON) {
    data = new Dataset(respJSON, colorChannel, 3);
  }

  function updateThumbnailID(id) {
    thumbnailID = id;
    dispatch("select", thumbnailID);
  }

  function updatePreviewThumbnailID() {
    if (previewFrame == -1) {
      previewThumbnailID = null;
    } else if (
      thumbnailID != null &&
      data.atFrame(thumbnailID, previewFrame) != null
    ) {
      previewThumbnailID = thumbnailID;
    } else {
      previewThumbnailID = null;
    }
  }

  function onScatterplotHover(e) {
    // updateThumbnailID(e.detail != null ? e.detail : canvas.clickedID || null);
  }

  function onScatterplotClick(e) {
    updateThumbnailID(e.detail);
  }

  let oldFrame = 0;
  $: if (oldFrame != currentFrame) {
    updateThumbnailID(thumbnailID);
    dispatch("changeframe", currentFrame);
    oldFrame = currentFrame;
  }

  let oldPreviewFrame = -1;

  $: if (oldPreviewFrame != previewFrame) {
    updatePreviewThumbnailID();
    oldPreviewFrame = previewFrame;
  }

  $: if (oldThumbnailID != thumbnailID) {
    selectPoint(thumbnailID);
    oldThumbnailID = thumbnailID;
  }

  export function selectPoint(pointID) {
    canvas.selectPoint(pointID);
  }
</script>

<style>
  .scatterplot {
    height: 100%;
    flex: 1 1;
    min-width: 0;
  }

  .scatterplot-parent {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .message-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
  }

  .vis-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-items: stretch;
  }

  .thumbnail-item {
    margin-bottom: 8px;
  }

  .thumbnails-title {
    color: #333;
    font-weight: 600;
    font-size: 10pt;
    margin-bottom: 4px;
    text-align: center;
  }

  .thumbnail-container {
    flex-shrink: 0;
    border-right: 1px solid #bbb;
    overflow-y: scroll;
    padding: 12px;
  }

  .legend-hoverable {
    position: absolute;
    bottom: 12px;
    right: 12px;
    margin-bottom: 0 !important;
  }
  .legend-container {
    position: absolute;
    bottom: 12px;
    right: 12px;
    border-radius: 4px;
    background-color: rgba(225, 225, 225, 0.8);
  }
</style>

<div class="vis-container">
  {#if data != null}
    <div class="thumbnail-container">
      <p class="thumbnails-title">MONTHS</p>
      {#each [...d3.range(data.frameCount)] as i}
        <div class="thumbnail-item">
          <ScatterplotThumbnail
            on:click={() => (currentFrame = i)}
            on:mouseover={() => (previewFrame = i)}
            on:mouseout={() => (previewFrame = -1)}
            isSelected={currentFrame == i}
            {colorScheme}
            {data}
            frame={i} />
        </div>
      {/each}
    </div>

    <div class="scatterplot">
      <div class="scatterplot-parent">
        <SynchronizedScatterplot
          {data}
          hoverable
          {colorScheme}
          {useHalos}
          frame={currentFrame}
          {previewFrame}
          animateTransitions
          bind:this={canvas}
          on:colorScale={(e) => (colorScale = e.detail)}
          on:datahover={onScatterplotHover}
          on:dataclick={onScatterplotClick} />
        {#if showLegend}
          <div
            class="legend-container"
            transition:fade
            on:mouseout={() => {
              showLegend = false;
            }}>
            <Legend {colorScale} type={colorScheme.type || 'continuous'} />
            <p class="small m-2" style="max-width: 300px;">
              The plot shows a subset of semantic types, and includes only
              concepts with high confidence. Some concepts may not be visible
              when selected.
            </p>
          </div>
        {:else}
          <button
            class="btn btn-light btn-sm legend-hoverable"
            on:mouseover={() => {
              showLegend = true;
            }}>Legend</button>
        {/if}
      </div>
    </div>
  {:else if isLoading}
    <div class="message-container">
      <p class="small">Loading visualization...</p>
      <div class="spinner-border text-primary" role="status" />
    </div>
  {/if}
</div>
