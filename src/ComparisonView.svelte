<script>
  import { default as embed } from "vega-embed";
  import Autocomplete from "./Autocomplete.svelte";
  import * as DataModel from "./datamodel";

  export let firstID;
  export let comparisonIDs = [null];
  export let options = [];

  export let validIDs;
  $: validIDs = comparisonIDs.filter((id) => !!id);

  let chartContainer;

  let chartData = [];

  let oldChartData = null;
  let chartView = null;
  let chartFinalizer = null;
  $: if (oldChartData != chartData) {
    updateChart();
    oldChartData = chartData;
  }

  function updateChart() {
    if (!!chartView && !!chartFinalizer) {
      chartFinalizer();
    }
    console.log("Updating chart");
    if (chartData.length > 0) {
      embed(chartContainer, {
        $schema: "https://vega.github.io/schema/vega-lite/v4.json",
        description: "test plot",
        data: { values: chartData },
        width: "container",
        height: 300,
        layer: [
          {
            mark: {
              type: "line",
              point: true,
            },
            encoding: {
              x: {
                field: "Date",
                type: "temporal",
                timeUnit: "month",
                axis: {
                  tickCount: "month",
                },
              },
              y: {
                field: "Similarity",
                type: "quantitative",
                axis: { title: "Similarity" },
              },
              color: {
                field: "Compared Item",
                type: "nominal",
              },
            },
          },
          {
            mark: "errorbar",
            encoding: {
              y: {
                field: "SimilarityError1",
                type: "quantitative",
                axis: { title: "Similarity" },
              },
              y2: { field: "SimilarityError2" },
              color: { field: "Compared Item", type: "nominal" },
              x: {
                field: "Date",
                type: "temporal",
                timeUnit: "month",
              },
            },
          },
        ],
      }).then((result) => {
        chartFinalizer = result.finalize;
        chartView = result.view;
      });
    }
  }

  $: {
    let currentIDs = validIDs;
    console.log("Updating data:", currentIDs);
    Promise.all(
      currentIDs.map((secondID) =>
        DataModel.getPairwiseSimilarity(firstID, secondID)
      )
    )
      .then((results) => {
        if (currentIDs != validIDs) return;
        chartData = results
          .map((compResults, i) =>
            compResults.map((r) => ({
              Date: r.date,
              "Compared Item": currentIDs[i],
              Similarity: r.mean_similarity,
              SimilarityError1: r.mean_similarity - r.std_similarity * 1.96,
              SimilarityError2: r.mean_similarity + r.std_similarity * 1.96,
            }))
          )
          .flat();
      })
      .catch((error) => {
        console.log(error);
        chartData = [];
      });
  }
</script>

<style>
  .chart-container {
    width: 100%;
    /*background-color: #eee;
    border-radius: 8px;
    height: 320px;
    padding: 10px;*/
  }
  .comparison-container {
    padding: 32px;
    min-height: 300px;
    width: 70%;
    min-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
  .explanation {
    font-size: small;
    line-height: 1.1em;
    margin-bottom: 8px;
  }
</style>

<svelte:options accessors />
<div class="row comparison-container">
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
    <div class="mb-2">
      <button
        type="button"
        class="btn btn-dark"
        style="width: 100%;"
        disabled={comparisonIDs.length >= 5}
        on:click={(e) => (comparisonIDs = [...comparisonIDs, null])}>Compare
        another concept</button>
    </div>
    <div class="explanation">
      Similarity is measured by fraction of common nearest neighbors over time.
      Error bars indicate 95% prediction intervals.
    </div>
  </div>
  <div class="col-md-7">
    <div class="chart-container" bind:this={chartContainer} />
  </div>
</div>
