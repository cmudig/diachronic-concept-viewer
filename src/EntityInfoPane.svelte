<script>
  export let entityID = null;
</script>

<style>
  .info-pane-container {
    overflow-y: scroll;
    padding-top: 12px;
  }
</style>

<div class="info-pane-container">
  <h4>{!!entityID ? entityID : 'No concept selected'}</h4>
</div>
