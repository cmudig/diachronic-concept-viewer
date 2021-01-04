<script>
  import Autocomplete from "./Autocomplete.svelte";
  import EntityInfoPane from "./EntityInfoPane.svelte";
  import VisualizationPane from "./VisualizationPane.svelte";
  import * as DataModel from "./datamodel";
  import { fade } from "svelte/transition";
  import ComparisonView from "./ComparisonView.svelte";
  import Modal from "./Modal.svelte";

  let selectedID = null;
  let selectedFrame = -1;
  let previewFrame = -1;

  let searchItems;
  $: DataModel.getAllEntities().then(
    (result) =>
      (searchItems = result.map((item) => ({
        text: item.name,
        value: item.id,
      })))
  );

  function getItemForID(id) {
    return searchItems.find((elem) => elem.value == id);
  }

  function getNameForID(id) {
    return getItemForID(id).text;
  }

  let comparisonView;
  let comparisonHistory = [];
  let showingComparisonView = false;
  let comparisonIDs = [null];
  let firstComparisonID = null;

  let firstComparisonName = "";
  $: if (!!searchItems && !!firstComparisonID) {
    firstComparisonName = getNameForID(firstComparisonID);
  } else {
    firstComparisonName = "";
  }

  function startComparison(firstID, secondIDs) {
    firstComparisonID = firstID;
    comparisonIDs = secondIDs;
    showingComparisonView = true;
  }

  function dismissComparisonView() {
    if (comparisonView.validIDs.length > 0) {
      let newElement = {
        firstItem: getItemForID(comparisonView.firstID),
        comparisonItems: comparisonView.validIDs.map((id) => getItemForID(id)),
      };

      let index = comparisonHistory.findIndex((el) => {
        if (el.firstItem.value != newElement.firstItem.value) return false;
        if (el.comparisonItems.length != newElement.comparisonItems.length)
          return false;
        return (
          el.comparisonItems.filter(
            (item, i) => newElement.comparisonItems[i].value != item.value
          ).length == 0
        );
      });
      if (index >= 0) comparisonHistory.splice(index, 1);

      comparisonHistory = [newElement, ...comparisonHistory];
      if (comparisonHistory.length > 10) {
        comparisonHistory = comparisonHistory.slice(0, 10);
      }
    }
    showingComparisonView = false;
  }
</script>

<style>
  .navbar {
    z-index: 10;
    display: flex;
    justify-content: space-between;
  }

  .full-height {
    height: 100%;
    margin: 0 !important;
    padding: 0 !important;
  }

  .info-pane {
    border-left: 1px solid #bbb;
    padding-left: 12px;
    overflow-y: scroll;
  }

  .dropdown-container {
    position: relative;
  }
  .dropdown-item:hover {
    background-color: #eee;
    cursor: pointer;
  }
</style>

<nav class="navbar navbar-dark bg-dark">
    <div id="navbar-logo" class="navbar-element">
        <img src="/static/images/text-essence-logo-white.svg" />
    </div>
    <div id="navbar-header" class="navbar-element navbar-brand">
        COVID Diachronic Concept Embeddings
        <a href="/">
            <img src="/static/images/home.svg" />
            <span class="sr-only">Home</span>
        </a>
    </div>
    <div id="search_panel" class="container">
  <div style="display: flex;">
    <div class="dropdown-container">
      <button
        type="button"
        disabled={!selectedID}
        class="btn btn-dark mb-0"
        on:click={(e) => startComparison(selectedID, [null])}>Compare</button>
      <button
        type="button"
        class="btn btn-dark dropdown-toggle dropdown-toggle-split mr-2 mb-0"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false">
        <span class="sr-only">Toggle Dropdown</span>
      </button>
      <div class="dropdown-menu" role="menu">
        {#each comparisonHistory as c}
          <div
            class="dropdown-item"
            on:click={(e) => startComparison( c.firstItem.value, c.comparisonItems.map((item) => item.value) )}>
            {c.firstItem.text},
            {c.comparisonItems.map((item) => item.text).join(', ')}
          </div>
        {/each}
      </div>
    </div>

    <Autocomplete
      options={searchItems}
      right
      on:change={(e) => (selectedID = e.detail)} />
  </div>
</nav>
<main>
  <div class="row full-height">
    <div class="full-height col-md-8">
      <VisualizationPane
        thumbnailID={selectedID}
        currentFrame={selectedFrame}
        bind:previewFrame
        on:select={(e) => (selectedID = e.detail)}
        on:changeframe={(e) => (selectedFrame = e.detail)} />
    </div>
    <div class="col-md-4 info-pane full-height">
      <EntityInfoPane
        entityID={selectedID}
        frame={selectedFrame}
        {previewFrame}
        on:select={(e) => (selectedID = e.detail)}
        on:compare={(e) => startComparison(selectedID, [e.detail])} />
    </div>
  </div>
  <Modal
    visible={showingComparisonView}
    width={800}
    title={`Compare with "${firstComparisonName}"`}
    on:dismiss={dismissComparisonView}>
    <ComparisonView
      bind:this={comparisonView}
      firstID={firstComparisonID}
      {comparisonIDs}
      options={searchItems} />
  </Modal>
</main>
