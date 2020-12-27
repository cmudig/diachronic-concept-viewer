<script>
  import EntityInfoPane from "./EntityInfoPane.svelte";
  import VisualizationPane from "./VisualizationPane.svelte";

  let selectedID = null;
</script>

<style>
  .navbar {
    z-index: 10;
  }

  .full-height {
    height: 100%;
    margin: 0 !important;
    padding: 0 !important;
  }

  .info-pane {
    border-left: 1px solid #bbb;
    padding-left: 12px;
  }
</style>

<nav class="navbar navbar-dark bg-dark">
  <a href="#" class="navbar-brand">COVID Diachronic Concept Embeddings</a>
</nav>
<main>
  <div class="row full-height">
    <div class="full-height col-md-8">
      <VisualizationPane
        thumbnailID={selectedID}
        on:select={(e) => (selectedID = e.detail)} />
    </div>
    <div class="col-md-4 info-pane">
      <EntityInfoPane entityID={selectedID} />
    </div>
  </div>
</main>
