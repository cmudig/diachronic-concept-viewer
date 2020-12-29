<script>
  import Autocomplete from "./Autocomplete.svelte";
  import EntityInfoPane from "./EntityInfoPane.svelte";
  import VisualizationPane from "./VisualizationPane.svelte";
  import * as DataModel from "./datamodel";

  let selectedID = null;
  let selectedFrame = -1;

  let searchItems;
  $: DataModel.getAllEntities().then(
    (result) =>
      (searchItems = result.map((item) => ({
        text: item.name,
        value: item.id,
      })))
  );
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
</style>

<nav class="navbar navbar-dark bg-dark">
  <a href="#" class="navbar-brand">COVID Diachronic Concept Embeddings</a>
  <div>
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
        on:select={(e) => (selectedID = e.detail)}
        on:changeframe={(e) => (selectedFrame = e.detail)} />
    </div>
    <div class="col-md-4 info-pane full-height">
      <EntityInfoPane
        entityID={selectedID}
        frame={selectedFrame}
        on:select={(e) => (selectedID = e.detail)} />
    </div>
  </div>
</main>
