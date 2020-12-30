<script>
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";

  const dispatch = createEventDispatcher();

  export let visible = false;
  export let maxWidth = 300;
  export let title = "Modal";
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
    overflow: auto;
  }

  .my-modal-container {
    height: 100%;
  }
</style>

{#if visible}
  <div
    class="dimmed-backdrop"
    transition:fade={{ duration: 400 }}
    on:click={(e) => dispatch('dismiss')}>
    <div
      class="my-modal-background"
      style="max-width: {maxWidth}px;"
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
