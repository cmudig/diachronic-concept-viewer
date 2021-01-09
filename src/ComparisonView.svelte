<script>
  import Autocomplete from "./Autocomplete.svelte";
  import * as DataModel from "./datamodel";
  import FrameComparisonPlot from "./FrameComparisonPlot.svelte";
  import Icon from "fa-svelte";
  import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
  import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let firstID;
  export let comparisonIDs = [null];
  export let options = [];

  let firstName = "";

  export let validIDs;
  $: validIDs = comparisonIDs.filter((id) => !!id);

  let frameLabels = [];
  let errorMessage = null;
  let isLoading = false;

  let chartData = [];

  let neighborTables = [];

  function compare() {
    let currentIDs = validIDs;
    console.log("Updating data:", currentIDs);
    loadSimilarityData(currentIDs)
      .then((results) => {
        if (currentIDs != validIDs) return;
        chartData = results;
      })
      .catch((error) => {
        console.log(error);
        chartData = [];
        neighborTables = [];
      });
  }

  async function loadSimilarityData(ids) {
    isLoading = true;
    try {
      frameLabels = await DataModel.getFrameLabels();
      let resultsPerID = await Promise.all(
        ids.map((secondID) =>
          DataModel.getPairwiseSimilarity(firstID, secondID)
        )
      );
      errorMessage = null;
      let similarities = resultsPerID.map(
        (compResults) => compResults.similarities
      );
      let results = similarities
        .map((compResults, i) =>
          Object.keys(compResults).map((frameIdx) => {
            let r = compResults[frameIdx];
            return {
              Date: r.label,
              "Compared Item": resultsPerID[i].secondName,
              Similarity: r.meanSimilarity,
              SimilarityError: r.stdSimilarity * 1.96,
            };
          })
        )
        .flat();
      firstName = resultsPerID[0].firstName;
      updateTables(resultsPerID);
      isLoading = false;
      return results;
    } catch (error) {
      errorMessage = "Comparison not available for these concepts.";
      isLoading = false;
      neighborTables = [];
      return [];
    }
  }

  function makeNeighborColumn(
    similarityItem,
    neighborField,
    confidenceField,
    title
  ) {
    return {
      title,
      confidence: similarityItem[confidenceField],
      isLowConfidence: similarityItem[confidenceField] < 0.5,
      neighbors: similarityItem[neighborField],
    };
  }

  function updateTables(pairwiseData) {
    neighborTables = frameLabels.map((label, i) => {
      let columns = [
        makeNeighborColumn(
          pairwiseData[0].similarities[i],
          "firstNeighbors",
          "firstConfidence",
          pairwiseData[0].firstName
        ),
        ...pairwiseData.map((item) =>
          makeNeighborColumn(
            item.similarities[i],
            "secondNeighbors",
            "secondConfidence",
            item.secondName
          )
        ),
      ];
      // Add a unique ID to each neighbor cell
      columns.forEach((column, j) => {
        column.neighbors.forEach((n) => {
          n.uniqueID = n.id + "," + i + "," + j;
        });
      });
      return {
        title: label,
        columns,
      };
    });
  }

  function addToComparison(newID) {
    comparisonIDs = [...comparisonIDs, newID];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  export let numTablesPerRow = 2;
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
</script>

<style>
  .comparison-container {
    padding: 32px;
    min-height: 300px;
    margin-left: auto;
    margin-right: auto;
  }
  .explanation {
    font-size: small;
    line-height: 1.1em;
    margin-bottom: 8px;
  }

  .nn_table {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .low-confidence {
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
</style>

<svelte:options accessors />
<div class="comparison-container container">
  <h2 class="pb-4">Entity Comparison</h2>
  <div class="row pb-2">
    <div class="col-md-5">
      <div class="mb-4">
        <Autocomplete
          {options}
          placeholder="Reference item"
          selectedValue={firstID}
          completeOnSelect
          on:change={(e) => {
            firstID = e.detail;
          }} />
      </div>
      {#each comparisonIDs as secondID, i}
        <div class="mb-2">
          <Autocomplete
            placeholder="Comparison item"
            selectedValue={secondID}
            {options}
            numResults={5}
            completeOnSelect
            on:change={(e) => {
              comparisonIDs[i] = e.detail;
              comparisonIDs = comparisonIDs;
            }} />
        </div>
      {/each}
      <div class="mb-2" style="display: flex;">
        <button
          type="button"
          class="btn btn-dark mr-2"
          style="flex: 0 1 auto;"
          disabled={comparisonIDs.length >= 5}
          on:click={(e) => (comparisonIDs = [...comparisonIDs, null])}>Add
          another concept</button>
        <button
          type="button"
          class="btn btn-primary"
          style="flex: 1 0 auto;"
          on:click={compare}>Compare</button>
      </div>
      <div class="explanation">
        The plot shows the cosine similarity between the embeddings for the
        reference item and each comparison item over time. Error bars show 95%
        prediction intervals for the mean cosine similarity over 10 embedding
        replicates.
      </div>
    </div>
    <div class="col-md-7">
      <FrameComparisonPlot
        {isLoading}
        {errorMessage}
        data={chartData}
        height={360}
        title="Similarity to {firstName}"
        frameField="Date"
        {frameLabels}
        yField="Similarity"
        yErrorField="SimilarityError"
        colorField="Compared Item" />
    </div>
  </div>

  {#if neighborTables.length > 0}
    <h4 class="pb-2">Nearest Neighbors</h4>
    <div class="tables_panel row">
      {#each neighborTables as table}
        <div class="{neighborColClass} nn_table">
          <h5>{table.title}</h5>
          <table class="table" width="100%">
            <thead>
              {#each table.columns as column}
                <th>
                  {column.title}<br />
                  <small>
                    Confidence:
                    {column.confidence.toFixed(3)}
                    {#if column.isLowConfidence}
                      <span class="warning-label"><Icon
                          icon={faExclamationTriangle} />
                        Low</span>
                    {/if}
                  </small>
                </th>
              {/each}
            </thead>
            <tbody>
              {#each table.columns[0].neighbors as _, i}
                <tr>
                  {#each table.columns as column}
                    <td
                      width="{100 / table.columns.length}%"
                      class:sympathetic-highlight={hoveringID == column.neighbors[i].id && hoveringCell != column.neighbors[i].uniqueID}
                      class:low-confidence={column.isLowConfidence}
                      on:mouseover={() => {
                        hoveringCell = column.neighbors[i].uniqueID;
                        hoveringID = column.neighbors[i].id;
                      }}
                      on:mouseleave={() => {
                        hoveringCell = null;
                        hoveringID = null;
                      }}>
                      <div class="neighbor-container">
                        <div
                          style="flex-grow: 1;"
                          on:click={() => dispatch('detail', column.neighbors[i].id)}>
                          <p class="m-0">
                            <strong>{column.neighbors[i].name}</strong>
                          </p>
                          <p class="small m-0">{column.neighbors[i].id}</p>
                        </div>
                        <p
                          class="small mb-0 mr-2"
                          style="visibility: {hoveringID == column.neighbors[i].id ? 'visible' : 'hidden'}">
                          {column.neighbors[i].distance != null ? column.neighbors[i].distance.toFixed(3) : '--'}
                        </p>
                        <div
                          style="visibility: {hoveringCell == column.neighbors[i].uniqueID || contextMenuCell == column.neighbors[i].uniqueID ? 'visible' : 'hidden'}; position: relative;">
                          <button
                            class="btn btn-link m-0 p-1"
                            on:click={() => (contextMenuCell = column.neighbors[i].uniqueID)}
                            on:blur={() => (contextMenuCell = null)}
                            data-toggle="dropdown"><Icon
                              icon={faEllipsisV} /></button>
                          <ul class="dropdown-menu" role="menu">
                            <a
                              class="dropdown-item"
                              href="#"
                              on:click|preventDefault={() => dispatch('detail', column.neighbors[i].id)}>Details</a>
                            <a
                              class="dropdown-item"
                              href="#"
                              on:click|preventDefault={() => addToComparison(column.neighbors[i].id)}>Add
                              to comparison</a>
                          </ul>
                        </div>
                      </div>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/each}
    </div>
  {/if}
</div>
