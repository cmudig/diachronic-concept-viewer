<script>
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import SynchronizedScatterplot from "./visualization/SynchronizedScatterplot.svelte";
  import Legend from "./visualization/Legend.svelte";
  import { Dataset } from "./visualization/dataset";

  import * as Model from "./datamodel";

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
    margin-right: 16px;
    margin-bottom: 16px;
  }
</style>

<div>
  <div class="scatterplot">
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
  </div>

  {#if data != null}
    <table>
      <tr>
        {#each [...d3.range(data.frameCount)] as i}
          <td>
            <SynchronizedScatterplot
              thumbnail
              on:click={() => (currentFrame = i)}
              on:mouseover={() => (previewFrame = i)}
              on:mouseout={() => (previewFrame = -1)}
              isSelected={currentFrame == i}
              {colorScheme}
              {data}
              width={60}
              height={60}
              frame={i}
              rFactor="0.1" />
          </td>
        {/each}
      </tr>
    </table>
  {/if}

  <Legend {colorScale} type={colorScheme.type || 'continuous'} />
</div>
