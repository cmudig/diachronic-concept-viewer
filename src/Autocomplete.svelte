<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  let autocomplete;
  let autocompleteDropdownVisible = false;
  let autocompleteDropdown;
  let autocompleteText;

  // Should contain a value attribute and a text attribute
  export let options = [];

  export let placeholder = "Search";

  export let numResults = 10;

  export let right = false;

  let visibleOptions = [];

  $: {
    if (!!autocompleteText) {
      let searchTerm = autocompleteText.toLocaleLowerCase();
      visibleOptions = options.filter((item) =>
        item.text.toLocaleLowerCase().includes(searchTerm)
      );
      if (visibleOptions.length > numResults)
        visibleOptions = visibleOptions.slice(0, numResults);
    } else {
      visibleOptions = [];
    }
  }

  function onPointSelectorItemClick(itemID) {
    dispatch("change", itemID);
  }

  const maxLength = 25;

  function styleText(option) {
    let text = option.text;
    if (text.length > maxLength) text = text.substr(0, maxLength) + "...";
    return `${option.value} <strong>${text}</strong>`;
  }
</script>

<style>
  .dropdown-item:hover {
    background-color: #eee;
    cursor: pointer;
  }

  .dropdown-menu {
    font-size: 11pt;
    color: #333;
  }

  .autocomplete-container {
    position: relative;
  }
</style>

<div class="autocomplete-container">
  <input
    type="text"
    class="form-control mb-0"
    {placeholder}
    bind:this={autocomplete}
    bind:value={autocompleteText}
    data-toggle="dropdown"
    on:focus={() => (autocompleteDropdownVisible = true)}
    on:blur={() => {
      setTimeout(() => (autocompleteDropdownVisible = false), 100);
    }} />
  <ul
    class="dropdown-menu"
    class:dropdown-menu-right={right}
    bind:this={autocompleteDropdown}
    style="visibility: {autocompleteDropdownVisible && visibleOptions.length > 0 ? 'visible' : 'hidden'}"
    role="menu">
    {#each visibleOptions as option}
      <div
        class="dropdown-item"
        on:click={() => onPointSelectorItemClick(option.value)}>
        {@html styleText(option)}
      </div>
    {/each}
  </ul>
</div>
