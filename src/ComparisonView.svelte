<script>
  import Autocomplete from "./Autocomplete.svelte";
  import * as DataModel from "./datamodel";
  import FrameComparisonPlot from "./FrameComparisonPlot.svelte";

  export let firstID;
  export let comparisonIDs = [null];
  export let options = [];

  export let validIDs;
  $: validIDs = comparisonIDs.filter((id) => !!id);

  let frameLabels = [];
  let errorMessage = null;
  let isLoading = false;

  let chartData = [];

  $: {
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
      isLoading = false;
      return results;
    } catch (error) {
      errorMessage = "Comparison not available for these concepts.";
      isLoading = false;
      return [];
    }
  }
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
</style>

<svelte:options accessors />
<div class="row comparison-container container">
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
    <FrameComparisonPlot
      {isLoading}
      {errorMessage}
      data={chartData}
      height={360}
      frameField="Date"
      {frameLabels}
      yField="Similarity"
      yErrorField="SimilarityError"
      colorField="Compared Item" />
  </div>
</div>
