<script>
  import { createEventDispatcher } from "svelte";
  import * as DataModel from "./datamodel";
  import Icon from "fa-svelte";
  import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
  import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
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
    // Add a unique ID to each neighbor cell
    tables.forEach((table, i) => {
      table.neighbors.forEach((n) => {
        n.uniqueID = n.id + "," + i;
      });
    });
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
      neighborColClass = "col-lg-4 col-md-6";
    } else if (numTablesPerRow == 4) {
      neighborColClass = "col-lg-3 col-md-4";
    } else if (numTablesPerRow == 6) {
      neighborColClass = "col-lg-2 col-md-4";
    } else if (numTablesPerRow == 2) {
      neighborColClass = "col-lg-6 col-md-12";
    } else {
      neighborColClass = "col-lg-4 col-md-6";
    }
  }

  let hoveringCell = null;
  let hoveringID = null;
  let contextMenuCell = null;

  const MaxDefinitionLength = 250;
  let definitionsExpanded = false;
  let definitionPreview = "";
  let showDefinitionExpandButton = false;
  $: if (!!info && !!info.definitions && info.definitions.length > 0) {
    showDefinitionExpandButton =
      info.definitions.length > 1 ||
      info.definitions[0].length > MaxDefinitionLength;
    definitionPreview = info.definitions[0];
    if (definitionPreview.length > MaxDefinitionLength) {
      let wordBoundary =
        definitionPreview.substring(MaxDefinitionLength).search(/\W/) +
        MaxDefinitionLength;
      definitionPreview = definitionPreview.substring(0, wordBoundary) + "...";
    }
  } else {
    showDefinitionExpandButton = false;
    definitionPreview = "";
  }
</script>

<style>
  .entity-title {
    font-weight: 200;
  }

  #info_panel {
    padding: 32px;
    width: 100%;
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

  .nn_table {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .low-confidence-table {
    border-radius: 4px;
    background-color: rgba(218, 165, 32, 0.2);
  }

  tbody {
    font-size: small;
  }

  td:first-child,
  th:first-child {
    padding-left: 8px !important;
  }

  td:hover {
    background-color: rgba(225, 225, 225, 0.5);
  }

  .sympathetic-highlight {
    background-color: #007bff30;
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

  .warning-label {
    border-radius: 4px;
    padding: 4px 6px;
    margin-left: 4px;
    background-color: goldenrod;
    color: white;
    font-size: small;
  }

  .definition-container {
    max-height: 240px;
    margin-bottom: 16px;
    overflow-y: scroll;
  }

  .definition {
    border-radius: 4px;
    padding: 8px;
    background-color: #eee;
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
    <h2 class="entity-title pb-4">
      {@html title}
    </h2>
    <div class="row pb-4">
      <div class="col-md-5" id="termListPanel">
        <h4>Concept Info</h4>
        {#if !!info.definitions && info.definitions.length > 0}
          <p class="mb-1"><em>Definitions:</em></p>
          {#if showDefinitionExpandButton && definitionsExpanded}
            <div class="definition-container">
              {#each info.definitions as definition}
                <p class="definition">
                  {@html definition}
                </p>
              {/each}
              <a
                href="#"
                on:click|preventDefault={() => (definitionsExpanded = false)}>Show
                less</a>
            </div>
          {:else}
            <p class="definition">
              {@html definitionPreview}
              {#if showDefinitionExpandButton}
                <a
                  href="#"
                  on:click|preventDefault={() => (definitionsExpanded = true)}>Show
                  more</a>
              {/if}
            </p>
          {/if}
        {/if}
        <p class="mb-1"><em>Other terms:</em></p>
        <ul>
          {#each info.otherTerms as term}
            <li>{term}</li>
          {/each}
        </ul>
      </div>
      <div class="col-md-7" id="confidencePanel">
        <h4>Embedding Confidence</h4>
        <FrameComparisonPlot
          height={280}
          data={confidenceData}
          frameField="Date"
          yField="Confidence"
          {frameLabels} />
      </div>
    </div>

    <h4 class="pb-2">Nearest Neighbors</h4>
    <div class="tables_panel row">
      {#each tables as table}
        <div
          class="{neighborColClass} nn_table"
          class:low-confidence-table={table.isLowConfidence}>
          <h5>{table.title}</h5>
          <p>
            Confidence:
            {table.confidence.toFixed(3)}
            {#if table.isLowConfidence}
              <span class="warning-label"><Icon icon={faExclamationTriangle} />
                Low</span>
            {/if}
          </p>
          <table class="table table-hover">
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
                      class:sympathetic-highlight={hoveringID == neighbor.id && hoveringCell != neighbor.uniqueID}
                      on:mouseover={() => {
                        hoveringCell = neighbor.uniqueID;
                        hoveringID = neighbor.id;
                      }}
                      on:mouseleave={() => {
                        hoveringCell = null;
                        hoveringID = null;
                      }}>
                      <div class="neighbor-container">
                        <div
                          style="flex-grow: 1;"
                          on:click={() => dispatch('detail', neighbor.id)}>
                          <p class="m-0"><strong>{neighbor.name}</strong></p>
                          <p class="small m-0">{neighbor.id}</p>
                        </div>
                        <p
                          class="small mb-0 mr-2"
                          style="visibility: {hoveringID == neighbor.id ? 'visible' : 'hidden'}">
                          {neighbor.distance != null ? neighbor.distance.toFixed(3) : '--'}
                        </p>
                        <div
                          style="visibility: {hoveringCell == neighbor.uniqueID || contextMenuCell == neighbor.uniqueID ? 'visible' : 'hidden'}; position: relative;">
                          <button
                            class="btn btn-link m-0 p-1"
                            on:click={() => (contextMenuCell = neighbor.uniqueID)}
                            on:blur={() => (contextMenuCell = null)}
                            data-toggle="dropdown"><Icon
                              icon={faEllipsisV} /></button>
                          <ul class="dropdown-menu" role="menu">
                            <a
                              class="dropdown-item"
                              href="#"
                              on:click|preventDefault={() => dispatch('detail', neighbor.id)}>Inspect</a>
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
