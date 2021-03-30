<script>
  import EntityInfoPane from "./EntityInfoPane.svelte";
  import VisualizationPane from "./VisualizationPane.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let selectedID = null;
  export let selectedFrame = -1;
  export let previewFrame = -1;

  let clickedIDs = [];

  function updateThumbnailID(ids) {
    if (ids.length == 1) selectedID = ids[0];
    else selectedID = null;
  }

  let oldSelectedID = null;
  $: if (oldSelectedID != selectedID) {
    if (
      selectedID != null &&
      (clickedIDs.length < 1 || selectedID != clickedIDs[0])
    )
      clickedIDs = [selectedID];
    oldSelectedID = selectedID;
  }

  $: console.log("Selected ID:", selectedID);
</script>

<div class="row full-height">
  <div class="full-height col-md-8">
    <VisualizationPane
      bind:currentFrame={selectedFrame}
      bind:clickedIDs
      bind:previewFrame
      on:select={(e) => updateThumbnailID(e.detail)}
    />
  </div>
  <div class="col-md-4 info-pane full-height">
    <EntityInfoPane
      entityID={selectedID}
      frame={selectedFrame}
      {previewFrame}
      on:select={(e) => (selectedID = e.detail)}
      on:detail
      on:compare={(e) =>
        dispatch("compare", {
          firstID: selectedID,
          comparisonIDs: [e.detail],
        })}
    />
  </div>
</div>

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
