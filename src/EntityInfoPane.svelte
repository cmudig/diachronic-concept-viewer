<script>
  import { createEventDispatcher } from "svelte";
  import * as d3 from "d3";
  import * as DataModel from "./datamodel";

  const dispatch = createEventDispatcher();

  export let entityID = null;
  export let frame = 0;
  export let previewFrame = -1;

  let neighborInfo = [];

  let isLoading = false;
  let info;

  let title;
  $: {
    if (!entityID) title = "No concept selected";
    else {
      if (!!info) {
        title = entityID + " <strong>" + info.name + "</strong>";
      } else {
        title = entityID;
      }
    }
  }

  let description;
  $: {
    if (!entityID || !info) description = "";
    else if (!!info.frameDescriptions[frame]) {
      description = "<p>" + info.frameDescriptions[frame] + "</p>";
    }
  }

  async function loadEntityInfo() {
    isLoading = true;
    info = await DataModel.getEntityInfo(entityID);
    isLoading = false;
  }

  $: if (!!info && !!info.neighbors) {
    if (
      previewFrame >= 0 &&
      previewFrame != frame &&
      !!info.neighbors[previewFrame] &&
      info.neighbors[previewFrame].length > 0
    ) {
      neighborInfo = computeNeighborInfoPreview(
        frame,
        previewFrame,
        info.neighbors
      );
    } else
      neighborInfo = computeNeighborInfo(frame, info.neighbors).map((el) => [
        el,
      ]);
  }

  function computeNeighborInfoPreview(current, preview, neighbors) {
    let previewNeighbors = new Set(neighbors[preview].map((n) => n.id));
    let currentNeighbors = new Set(neighbors[current].map((n) => n.id));
    let unpairedInfo = [
      computeNeighborInfo(
        current,
        neighbors,
        (n) => !previewNeighbors.has(n.id),
        "neighbor-deletion"
      ),
      computeNeighborInfo(
        preview,
        neighbors,
        (n) => !currentNeighbors.has(n.id),
        "neighbor-insertion"
      ),
    ];
    return d3
      .range(Math.max(unpairedInfo[0].length, unpairedInfo[1].length))
      .map((i) => [unpairedInfo[0][i], unpairedInfo[1][i]]);
  }

  function computeNeighborInfo(f, neighbors, diffFn = null, diffClass = "") {
    return neighbors[f].map((n) => ({
      id: n.id,
      name: n.name,
      class: !!diffFn && diffFn(n) ? diffClass : "neighbor-normal",
    }));
  }

  let oldEntityID = null;
  $: if (oldEntityID != entityID) {
    loadEntityInfo();
    oldEntityID = entityID;
  }

  function selectEntity(newID) {
    dispatch("select", newID);
  }

  let hoveringNeighborID = null;
</script>

<style>
  .message-container {
    display: flex;
    justify-items: center;
    align-items: center;
    height: 100%;
    width: 100%;
  }

  .no-selection-message {
    text-align: center;
    color: darkgray;
    font-size: 12pt;
    width: 100%;
  }

  .info-pane-container {
    height: 100%;
    width: 100%;
  }

  .selection-header {
    display: flex;
    align-items: flex-start;
  }

  .selection-info-container {
    padding: 12px;
    width: 100%;
  }

  tbody {
    font-size: small;
  }

  td:first-child,
  th:first-child {
    padding-left: 2px !important;
  }

  td:hover {
    background-color: #eee;
  }

  td {
    cursor: pointer;
    padding-top: 0.5rem !important;
    padding-bottom: 0.5rem !important;
  }

  .neighbor-container {
    display: flex;
    min-height: 22px;
    align-items: center;
  }

  .neighbor-normal {
    color: #333;
  }

  .neighbor-deletion {
    color: #b11576;
  }

  .neighbor-insertion {
    color: #34b740;
  }

  .spinner-border {
    margin-left: auto;
    margin-right: auto;
  }
</style>

<div class="info-pane-container">
  {#if entityID == null || isLoading}
    <div class="message-container">
      {#if !entityID}
        <p class="no-selection-message">
          Select a concept from the plot or search for one above.
        </p>
      {:else}
        <div class="spinner-border text-primary" role="status">
          <span class="sr-only">Loading...</span>
        </div>
      {/if}
    </div>
  {:else}
    <div class="selection-info-container">
      <div class="selection-header">
        <h4 style="flex-grow: 1; font-weight: 200;">
          {@html title}
        </h4>
        <button
          class="btn btn-dark btn-sm mr-1"
          on:click={() => dispatch('detail', entityID)}>Details</button>
        <button
          class="btn btn-dark btn-sm"
          on:click={() => dispatch('compare')}>Compare...</button>
      </div>
      {@html description}
      {#if !!info && !!info.neighbors[frame]}
        <table class="table">
          <thead>
            {#if neighborInfo.length > 0 && neighborInfo[0].length > 1}
              <th>Current</th>
              <th>Destination</th>
            {:else}
              <th>Neighbors</th>
            {/if}
          </thead>
          <tbody>
            {#each neighborInfo as neighborSet}
              <tr>
                {#if !!neighborSet[0]}
                  <td
                    on:click={() => selectEntity(neighborSet[0].id)}
                    on:mouseover={(e) => (hoveringNeighborID = neighborSet[0].id)}
                    on:mouseleave={(e) => (hoveringNeighborID = null)}>
                    <div class="neighbor-container">
                      <div style="flex-grow: 1;" class={neighborSet[0].class}>
                        <p class="m-0">
                          <strong>{neighborSet[0].name}</strong>
                        </p>
                        <p class="small m-0">{neighborSet[0].id}</p>
                      </div>
                      {#if hoveringNeighborID == neighborSet[0].id}
                        <p class="small mb-0 mr-2">Click to view</p>
                        <button
                          class="btn btn-dark btn-sm my-0 ml-2"
                          on:click|stopPropagation={(e) => dispatch('detail', neighborSet[0].id)}>Details</button>
                        <button
                          class="btn btn-dark btn-sm my-0 mx-2"
                          on:click|stopPropagation={(e) => dispatch('compare', neighborSet[0].id)}>Compare</button>
                      {/if}
                    </div>
                  </td>
                {:else}
                  <td>&mdash;</td>
                {/if}
                {#if !!neighborSet[1]}
                  <td>
                    <div class={neighborSet[1].class}>
                      <p class="m-0"><strong>{neighborSet[1].name}</strong></p>
                      <p class="small m-0">{neighborSet[1].id}</p>
                    </div>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>
