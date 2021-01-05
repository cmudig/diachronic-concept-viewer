<script>
  import Autocomplete from "./Autocomplete.svelte";
  import EntityInfoPane from "./EntityInfoPane.svelte";
  import VisualizationPane from "./VisualizationPane.svelte";
  import * as DataModel from "./datamodel";
  import { fade } from "svelte/transition";
  import ComparisonView from "./ComparisonView.svelte";
  import Modal from "./Modal.svelte";
  import MainView from "./MainView.svelte";
  import DetailView from "./DetailView.svelte";

  let selectedID = null;

  let visibleView = "main";

  let searchItems;
  $: DataModel.getAllEntities().then(
    (result) =>
      (searchItems = result.map((item) => ({
        text: item.name,
        value: item.id,
      })))
  );

  let comparisonView;
  let comparisonIDs = [null];
  let firstComparisonID = null;

  function startComparison(firstID, secondIDs) {
    firstComparisonID = firstID;
    comparisonIDs = secondIDs;
    visibleView = "comparison";
  }

  function selectPoint(newID) {
    selectedID = newID;
    if (visibleView == "detail") detailID = newID;
    if (visibleView == "comparison") visibleView = "main";
  }

  let detailID = null;

  function showDetailsAboutPoint(pointID) {
    detailID = pointID;
    visibleView = "detail";
  }
</script>

<style>
  .navbar {
    z-index: 10;
    display: flex;
    justify-content: space-between;
  }

  .navbar-element {
    max-height: 48px;
  }

  .main-view-container {
    position: relative;
    width: 100%;
    height: 100%;
    margin: 0 !important;
    padding: 0 !important;
  }

  .page-container {
    width: 100%;
    height: 100%;
    margin: 0 !important;
    padding: 0 !important;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;

    transform: translate(0, 0);
    transition: transform 0.6s ease-in-out;
  }

  .invisible-left {
    transform: translate(-100%, 0);
    transition: transform 0.6s ease-in-out;
  }

  .invisible-right {
    transform: translate(100%, 0);
    transition: transform 0.6s ease-in-out;
  }

  .dropdown-container {
    position: relative;
  }
  .dropdown-item:hover {
    background-color: #eee;
    cursor: pointer;
  }
</style>

<nav class="navbar navbar-dark navbar-expand-lg bg-dark">
  <button
    class="navbar-toggler"
    type="button"
    data-toggle="collapse"
    data-target="#navbarNav"
    aria-controls="navbarNav"
    aria-expanded="false"
    aria-label="Toggle navigation">
    <span class="navbar-toggler-icon" />
  </button>
  <div id="navbar-header" class="navbar-element navbar-brand mr-4">
    <img
      id="navbar-logo"
      style="height: 38px; display: inline;"
      src="/static/images/text-essence-logo-white.svg"
      alt="Text Essence" />
    COVID Diachronic Concept Embeddings
  </div>
  <div class="collapse navbar-collapse" id="navbarNav">
    <ul class="navbar-nav">
      <li class="nav-item">
        <a
          class="nav-link"
          class:active={visibleView == 'main'}
          href="#"
          on:click|preventDefault={(e) => (visibleView = 'main')}>Browse</a>
      </li>
      <li class="nav-item">
        <a
          class="nav-link"
          class:active={visibleView == 'detail'}
          href="#"
          on:click|preventDefault={(e) => (visibleView = 'detail')}>Detail</a>
      </li>
      <li class="nav-item">
        <a
          class="nav-link"
          class:active={visibleView == 'comparison'}
          href="#"
          on:click|preventDefault={(e) => (visibleView = 'comparison')}>Compare</a>
      </li>
    </ul>
  </div>
  <Autocomplete
    options={searchItems}
    right
    on:change={(e) => selectPoint(e.detail)} />
</nav>
<main>
  <div class="main-view-container">
    <div class:invisible-left={visibleView != 'main'} class="page-container">
      <MainView
        {selectedID}
        on:detail={(e) => showDetailsAboutPoint(e.detail)}
        on:compare={(e) => startComparison(e.detail.firstID, e.detail.comparisonIDs)} />
    </div>
    <div
      class:invisible-left={visibleView == 'comparison'}
      class:invisible-right={visibleView == 'main'}
      class="page-container">
      <DetailView
        entityID={detailID}
        on:detail={(e) => showDetailsAboutPoint(e.detail)}
        on:compare={(e) => startComparison(e.detail.firstID, e.detail.comparisonIDs)} />
    </div>
    <div
      class:invisible-right={visibleView != 'comparison'}
      class="page-container">
      <ComparisonView
        bind:this={comparisonView}
        firstID={firstComparisonID}
        {comparisonIDs}
        options={searchItems}
        on:detail={(e) => showDetailsAboutPoint(e.detail)} />
    </div>
  </div>
</main>
