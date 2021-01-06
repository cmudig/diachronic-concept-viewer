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

  export let selectedValue = null;

  export let completeOnSelect = false;

  export let disabled = false;

  let oldSelectedValue = null;
  $: if (completeOnSelect && selectedValue != oldSelectedValue) {
    if (!!selectedValue) {
      let selectedItem = options.find((val) => val.value == selectedValue);
      autocompleteText = `${selectedItem.value}: ${selectedItem.text}`;
    }
    oldSelectedValue = selectedValue;
  }

  let visibleOptions = [];

  $: {
    if (!!autocompleteText) {
      let searchTerm = autocompleteText.toLocaleLowerCase();
      visibleOptions = options.filter(
        (item) =>
          item.text.toLocaleLowerCase().includes(searchTerm) ||
          item.value.toLocaleLowerCase().includes(searchTerm)
      );
      if (visibleOptions.length > numResults)
        visibleOptions = visibleOptions.slice(0, numResults);
    } else {
      visibleOptions = [];
    }
    clearSelection();
  }

  function clearSelection() {
    selectedValue = null;
  }

  function onPointSelectorItemClick(itemID) {
    selectedValue = itemID;
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

  .dropdown-item {
    color: #111;
  }

  .dropdown-menu {
    font-size: 11pt;
    color: #333;
  }

  .autocomplete-container {
    position: relative;
  }

  input[type="search"]:disabled::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  input[type="search"] {
    -webkit-appearance: none;
  }

  input:disabled {
    color: #555;
  }
</style>

<div class="autocomplete-container">
  <input
    type="search"
    autocorrect="off"
    class="form-control mb-0 dropdown-toggle"
    {placeholder}
    {disabled}
    data-toggle="dropdown"
    bind:this={autocomplete}
    bind:value={autocompleteText} />
  <ul
    class="dropdown-menu"
    class:dropdown-menu-right={right}
    bind:this={autocompleteDropdown}
    style={visibleOptions.length > 0 ? 'visibility: visible;' : 'visibility: hidden;'}
    role="menu">
    {#each visibleOptions as option}
      <a
        href="#"
        class="dropdown-item"
        on:click|preventDefault={() => onPointSelectorItemClick(option.value)}>
        {@html styleText(option)}
      </a>
    {/each}
  </ul>
</div>
