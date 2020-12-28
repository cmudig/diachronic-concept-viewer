<script>
  import { createEventDispatcher } from "svelte";

  import * as DataModel from "./datamodel";

  const dispatch = createEventDispatcher();

  export let entityID = null;
  export let frame = 0;
  export let previewFrame = 0;

  let info;

  let title;
  $: {
    if (!entityID) title = "No concept selected";
    else {
      title = entityID;
      if (!!info) {
        title += `: ${info.name}`;
      }
    }
  }

  let description;
  $: {
    if (!entityID || !info) description = "";
    else {
      description = "<p>" + info.description.replace("\n", "</p><p>") + "</p>";
      if (!!info.frameDescriptions[frame]) {
        description += "<p>" + info.frameDescriptions[frame] + "</p>";
      }
    }
  }

  async function loadEntityInfo() {
    info = await DataModel.getEntityInfo(entityID);
  }

  let oldEntityID = null;
  $: if (oldEntityID != entityID) {
    loadEntityInfo();
    oldEntityID = entityID;
  }

  function selectEntity(newID) {
    dispatch("select", newID);
  }
</script>

<style>
  .no-selection-container {
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

  .info-pane-container {
    height: 100%;
    width: 100%;
  }

  .selection-info-container {
    padding: 12px;
    width: 100%;
  }

  tbody {
    font-size: small;
  }

  td:first-child,
  th:first-child {
    padding-left: 2px !important;
  }

  td:hover {
    background-color: #eee;
  }

  td {
    cursor: pointer;
  }
</style>

<div class="info-pane-container">
  {#if entityID == null}
    <div class="no-selection-container">
      <p class="no-selection-message">
        Select a concept from the plot or search for one above.
      </p>
    </div>
  {:else}
    <div class="selection-info-container">
      <h4>{title}</h4>
      {@html description}
      {#if !!info && !!info.neighbors[frame]}
        <table class="table">
          <thead>
            <th>Neighbors</th>
          </thead>
          <tbody>
            {#each info.neighbors[frame] as neighbor}
              <tr>
                <td on:click={() => selectEntity(neighbor.id)}>
                  {neighbor.id}
                  <strong>{neighbor.name}</strong>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>
