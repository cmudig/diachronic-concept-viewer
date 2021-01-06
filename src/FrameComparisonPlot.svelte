<script>
  import { default as embed } from "vega-embed";
  let chartContainer;

  export let data = [];
  export let height = 300;

  export let yErrorField = null;
  export let yField = null;
  export let frameField = "Date";
  export let frameLabels = [];

  export let colorField = null;

  export let isLoading = false;
  export let errorMessage = null;

  let oldChartData = null;
  let chartView = null;
  let chartFinalizer = null;
  $: if (!!chartContainer && oldChartData != data) {
    updateChart();
    oldChartData = data;
  }

  function updateChart() {
    if (!!chartView && !!chartFinalizer) {
      chartFinalizer();
    }
    if (data.length > 0 && !!frameField && !!yField) {
      let transforms = [];
      let layers = [];
      layers.push({
        mark: {
          type: "line",
          point: true,
        },
        encoding: {
          x: {
            field: frameField,
            type: "ordinal",
            sort: frameLabels,
            axis: { labelAngle: -45 },
          },
          y: {
            field: yField,
            type: "quantitative",
            axis: { title: yField },
          },
        },
      });
      if (!!colorField) {
        layers[0].encoding.color = {
          field: "Compared Item",
          type: "nominal",
        };
      }

      if (!!yErrorField) {
        transforms.push({
          calculate: `datum.${yField} - datum.${yErrorField}`,
          as: "Error1",
        });
        transforms.push({
          calculate: `datum.${yField} + datum.${yErrorField}`,
          as: "Error2",
        });
        layers.push({
          mark: "errorbar",
          encoding: {
            y: {
              field: "Error1",
              type: "quantitative",
              axis: { title: yField },
            },
            y2: { field: "Error2" },
            x: {
              field: frameField,
              type: "ordinal",
              sort: frameLabels,
            },
          },
        });
        if (!!colorField) {
          layers[1].encoding.color = {
            field: "Compared Item",
            type: "nominal",
          };
        }
      }
      embed(chartContainer, {
        $schema: "https://vega.github.io/schema/vega-lite/v4.json",
        description: "test plot",
        data: { values: data },
        background: "transparent",
        width: "container",
        height: "container",
        transform: transforms,
        layer: layers,
      }).then((result) => {
        chartFinalizer = result.finalize;
        chartView = result.view;
      });
    }
  }
</script>

<style>
  .chart-container {
    width: 100%;
    background-color: #fafafa;
    border-radius: 8px;
    display: flex;
    align-items: center;
    padding: 24px;
  }

  .empty-message {
    text-align: center;
    color: darkgray;
    font-size: 12pt;
    width: 100%;
  }
</style>

<div
  class="chart-container"
  style="height: {height}px;"
  bind:this={chartContainer}>
  {#if data.length == 0 || !!errorMessage}
    <div class="empty-message">
      {#if isLoading}
        <div class="spinner-border text-primary" role="status">
          <span class="sr-only">Loading...</span>
        </div>
      {:else if !!errorMessage}{errorMessage}{:else}No data{/if}
    </div>
  {/if}
</div>
