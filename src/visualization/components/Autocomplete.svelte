<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  let autocomplete;
  let autocompleteDropdownVisible = false;
  let autocompleteDropdown;
  let autocompleteText;

  // Should contain a value attribute and a text attribute
  export let options = [];

  let visibleOptions = [];

  $: {
    if (!!autocompleteText) {
      let searchTerm = autocompleteText.toLocaleLowerCase();
      visibleOptions = options.filter((item) =>
        item.text.toLocaleLowerCase().includes(searchTerm)
      );
    } else {
      visibleOptions = [];
    }
  }

  function onPointSelectorItemClick(itemID) {
    autocompleteText = itemID;
    dispatch("change", autocompleteText);
  }
</script>

<style>
  .dropdown-item:hover {
    background-color: #ddd;
    cursor: pointer;
  }
</style>

<div>
  <input
    type="text"
    bind:this={autocomplete}
    bind:value={autocompleteText}
    data-toggle="dropdown"
    on:focus={() => (autocompleteDropdownVisible = true)}
    on:blur={() => {
      setTimeout(() => (autocompleteDropdownVisible = false), 100);
    }} />
  <ul
    class="dropdown-menu"
    bind:this={autocompleteDropdown}
    style="visibility: {autocompleteDropdownVisible ? 'visible' : 'hidden'}"
    role="menu">
    {#each visibleOptions as option}
      <div
        class="dropdown-item"
        on:click={() => onPointSelectorItemClick(option.value)}>
        {option.text}
      </div>
    {/each}
  </ul>
</div>
