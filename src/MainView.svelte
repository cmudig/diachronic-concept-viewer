<script>
  import Autocomplete from "./Autocomplete.svelte";
  import EntityInfoPane from "./EntityInfoPane.svelte";
  import VisualizationPane from "./VisualizationPane.svelte";
  import * as DataModel from "./datamodel";
  import Modal from "./Modal.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let selectedID = null;
  export let selectedFrame = -1;
  export let previewFrame = -1;

  $: console.log("Selected ID:", selectedID);
</script>

<style>
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
      on:detail
      on:compare={(e) => dispatch('compare', {
          firstID: selectedID,
          comparisonIDs: [e.detail],
        })} />
  </div>
</div>
