<script>
  import { createEventDispatcher } from "svelte";
  import * as DataModel from "./datamodel";
  import Icon from "fa-svelte";
  import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
  import FrameComparisonPlot from "./FrameComparisonPlot.svelte";

  const dispatch = createEventDispatcher();

  export let entityID;

  let isLoading = false;
  let info = null;
  let frameLabels = [];
  let tables = [];
  let numNeighbors = 10;

  let confidenceData = [];

  $: if (!!entityID) {
    isLoading = true;
    Promise.all([
      DataModel.getEntityInfo(entityID, { numNeighbors }),
      DataModel.getFrameLabels(),
    ]).then((results) => {
      isLoading = false;
      info = results[0];
      frameLabels = results[1];
      console.log(results);
      updateTables();
      updateConfidencePlot();
    });
  }

  function updateTables() {
    tables = frameLabels.map((label, i) => ({
      title: label,
      confidence: info.confidences[i] || 0.0,
      isLowConfidence: info.confidences[i] < 0.5,
      neighbors: info.neighbors[i] || [],
    }));
  }

  function updateConfidencePlot() {
    confidenceData = frameLabels.map((label, i) => ({
      Date: label,
      Confidence: info.confidences[i],
    }));
    console.log(confidenceData);
  }

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

  export let numTablesPerRow = 4;
  let neighborColClass;
  $: {
    if (numTablesPerRow == 3) {
      neighborColClass = "col-sm-4";
    } else if (numTablesPerRow == 4) {
      neighborColClass = "col-sm-3";
    } else if (numTablesPerRow == 6) {
      neighborColClass = "col-sm-2";
    } else if (numTablesPerRow == 2) {
      neighborColClass = "col-sm-6";
    } else {
      neighborColClass = "col-sm-4";
    }
  }

  let hoveringCell = null;
  let contextMenuCell = null;
</script>

<style>
  .entity-title {
    font-weight: 200;
  }

  #info_panel {
    padding: 32px;
    width: 100%;
    height: 100%;
    overflow: scroll;
  }

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

  tbody {
    font-size: small;
  }

  td:first-child,
  th:first-child {
    padding-left: 8px !important;
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

  .spinner-border {
    margin-left: auto;
    margin-right: auto;
  }
</style>

<div id="info_panel" class="container">
  {#if isLoading || !entityID}
    <div class="message-container">
      {#if !entityID}
        <div class="no-selection-message">
          Search for a concept above or select one in the Browse view.
        </div>
      {:else}
        <div class="spinner-border text-primary" role="status">
          <span class="sr-only">Loading...</span>
        </div>
      {/if}
    </div>
  {:else if !!info}
    <h2 class="entity-title">
      {@html title}
    </h2>
    <div class="row pb-4">
      <div class="col-md-5" id="termListPanel">
        <h5>Concept Info</h5>
        Other terms:
        <ul>
          {#each info.otherTerms as term}
            <li>{term}</li>
          {/each}
        </ul>
      </div>
      <div class="col-md-7" id="confidencePanel">
        <h5>Embedding Confidence</h5>
        <FrameComparisonPlot
          height={280}
          data={confidenceData}
          frameField="Date"
          yField="Confidence"
          {frameLabels} />
      </div>
    </div>

    <div class="tables_panel row">
      {#each tables as table}
        <div class="{neighborColClass} nn_table">
          <h4>{table.title}</h4>
          <h5>Confidence: {table.confidence.toFixed(3)}</h5>
          <table
            class="table table-hover"
            class:table-warning={table.isLowConfidence}>
            {#if table.neighbors.length == 0}
              <tbody>
                <tr>
                  <td class="no_data_cell" colspan="2" rowspan={numNeighbors}>
                    No data
                  </td>
                </tr>
              </tbody>
            {:else}
              <tbody>
                {#each table.neighbors as neighbor}
                  <tr>
                    <td
                      on:mouseover={(e) => (hoveringCell = neighbor.id + ',' + table.title)}
                      on:mouseleave={(e) => (hoveringCell = null)}>
                      <div class="neighbor-container">
                        <div
                          style="flex-grow: 1;"
                          on:click={() => dispatch('detail', neighbor.id)}>
                          <p class="m-0"><strong>{neighbor.name}</strong></p>
                          <p class="small m-0">{neighbor.id}</p>
                        </div>
                        <p
                          class="small mb-0 mr-2"
                          style="visibility: {hoveringCell == neighbor.id + ',' + table.title ? 'visible' : 'hidden'}">
                          {neighbor.distance != null ? neighbor.distance.toFixed(3) : '--'}
                        </p>
                        <div
                          style="visibility: {hoveringCell == neighbor.id + ',' + table.title || contextMenuCell == neighbor.id + ',' + table.title ? 'visible' : 'hidden'}; position: relative;">
                          <button
                            class="btn btn-link m-0 p-1"
                            on:click={() => (contextMenuCell = neighbor.id + ',' + table.title)}
                            on:blur={() => (contextMenuCell = null)}
                            data-toggle="dropdown"><Icon
                              icon={faEllipsisV} /></button>
                          <ul class="dropdown-menu" role="menu">
                            <a
                              class="dropdown-item"
                              href="#"
                              on:click|preventDefault={() => dispatch('detail', neighbor.id)}>Details</a>
                            <a
                              class="dropdown-item"
                              href="#"
                              on:click|preventDefault={() => dispatch(
                                  'compare',
                                  {
                                    firstID: entityID,
                                    comparisonIDs: [neighbor.id],
                                  }
                                )}>Compare with "{info.name}"</a>
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            {/if}
          </table>
        </div>
      {/each}
    </div>
  {/if}
</div>
