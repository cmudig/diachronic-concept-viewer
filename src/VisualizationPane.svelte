<script>
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import SynchronizedScatterplot from "./visualization/SynchronizedScatterplot.svelte";
  import Legend from "./visualization/Legend.svelte";
  import { Dataset } from "./visualization/dataset";

  import * as Model from "./datamodel";
  import ScatterplotThumbnail from "./visualization/ScatterplotThumbnail.svelte";

  let colorChannel = "color";

  let colorScheme = {
    name: "tableau",
    value: d3.schemeTableau10,
    type: "categorical",
  };

  let colorScale;

  let useHalos = false;

  let thumbnailID = null;
  let previewThumbnailID = null;

  var data = null;
  let currentFrame = 0;
  let previewFrame = -1;

  let canvas;

  // Note: it's very important that the callback doesn't READ any properties that
  // it also WRITES
  $: Model.getVisualizationData()
    .then((respJSON) => {
      currentFrame = 0;
      previewFrame = 0;
      initializeData(respJSON);
    })
    .catch((err) => {
      data = null;
    });

  function initializeData(respJSON) {
    data = new Dataset(respJSON, colorChannel, 3);
  }

  function updateThumbnailID(id) {
    thumbnailID = id;
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
    updateThumbnailID(e.detail != null ? e.detail : canvas.clickedID || null);
  }

  function onScatterplotClick(e) {
    updateThumbnailID(e.detail);
  }

  let oldFrame = 0;
  $: if (oldFrame != currentFrame) {
    updateThumbnailID(thumbnailID);
    oldFrame = currentFrame;
  }

  let oldPreviewFrame = -1;

  $: if (oldPreviewFrame != previewFrame) {
    updatePreviewThumbnailID();
    oldPreviewFrame = previewFrame;
  }

  export function selectPoint(pointID) {
    canvas.selectPoint(pointID);
  }
</script>

<style>
  .scatterplot {
    height: 100%;
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

  .thumbnail-container {
    width: 72px;
    border-right: 1px solid #555;
    padding: 8px;
    overflow-y: scroll;
  }

  .legend-container {
    flex-grow: 1;
    height: 100%;
    overflow-y: scroll;
  }
</style>

<div class="vis-container">
  {#if data != null}
    <div class="thumbnail-container">
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
  {/if}

  <div class="scatterplot">
    <SynchronizedScatterplot
      width={600}
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
  </div>
  <div class="legend-container">
    <Legend {colorScale} type={colorScheme.type || 'continuous'} />
  </div>
</div>
