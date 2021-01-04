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
  $: if (
    completeOnSelect &&
    !!selectedValue &&
    selectedValue != oldSelectedValue
  ) {
    let selectedItem = options.find((val) => val.value == selectedValue);
    autocompleteText = `${selectedItem.value}: ${selectedItem.text}`;
    oldSelectedValue = selectedValue;
  }

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
    class="form-control mb-0"
    {placeholder}
    {disabled}
    bind:this={autocomplete}
    bind:value={autocompleteText}
    on:focus={() => (autocompleteDropdownVisible = true)}
    on:blur={() => {
      setTimeout(() => (autocompleteDropdownVisible = false), 100);
    }} />
  <ul
    class="dropdown-menu"
    class:dropdown-menu-right={right}
    bind:this={autocompleteDropdown}
    style={autocompleteDropdownVisible && visibleOptions.length > 0 ? 'visibility: visible; display: block;' : 'visibility: hidden; display: none;'}
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
