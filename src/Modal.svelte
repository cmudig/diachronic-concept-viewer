<script>
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";

  const dispatch = createEventDispatcher();

  export let visible = false;
  export let width = null;
  export let title = "Modal";
  export let fullWidth = false;
  export let fullHeight = false;
</script>

<style>
  .dimmed-backdrop {
    background-color: rgba(0, 0, 0, 0.7);
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }

  .my-modal-background {
    border-radius: 4px;
    background-color: white;
    max-height: calc(100% - 80px);
    max-width: calc(100% - 80px);
    overflow: auto;
  }

  .my-modal-container {
    height: 100%;
  }

  .full-width-modal {
    width: calc(100% - 80px);
  }

  .full-height-modal {
    height: calc(100% - 80px);
  }
</style>

{#if visible}
  <div
    class="dimmed-backdrop"
    transition:fade={{ duration: 400 }}
    on:click={(e) => dispatch('dismiss')}>
    <div
      class="my-modal-background"
      class:full-width-modal={fullWidth}
      class:full-height-modal={fullHeight}
      style={!!width ? `width: ${width}px;` : ''}
      on:click|stopPropagation={(e) => false}
      transition:fade={{ duration: 200 }}>
      <div class="my-modal-container">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">{title}</h5>
          <button
            type="button"
            class="close"
            on:click={(e) => dispatch('dismiss')}
            aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="my-modal-contents">
          <div class="container-fluid">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
