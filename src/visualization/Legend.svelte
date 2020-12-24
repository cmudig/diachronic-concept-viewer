<script>
  import * as d3 from "d3";
  import * as d3legend from "d3-svg-legend";
  import { onMount } from "svelte";
  import { watchResize } from "svelte-watch-resize";

  export let width = null;
  export let height = null;
  let actualWidth;
  let actualHeight;
  $: if (!!width) actualWidth = width;
  else if (!!container) actualWidth = container.clientWidth;
  $: if (!!height) actualHeight = height;
  else if (!!container) actualHeight = container.clientHeight;

  export let colorScale = null;
  export let numCells = 10; // for continuous
  export let type = "categorical";

  let container;
  let svg;

  let oldColorScale = null;
  $: if (oldColorScale != colorScale && !!container) {
    update();
    oldColorScale = colorScale;
  }

  function update() {
    if (!!svg) svg.remove();

    if (!colorScale) return;

    svg = d3
      .select(container)
      .append("svg")
      .style("width", actualWidth)
      .style("height", actualHeight)
      .style("font-family", "sans-serif");

    if (type == "categorical") {
      //let domainLabels = colorScale.domain();
      svg
        .append("g")
        .attr("class", "legendOrdinal")
        .attr("transform", "translate(20, 20)");

      let legendOrdinal = d3legend
        .legendColor()
        .shape("circle")
        .shapePadding(10)
        .shapeRadius(10)
        .orient("vertical")
        .scale(colorScale);

      svg.select(".legendOrdinal").call(legendOrdinal);
    } else if (type == "continuous") {
      let totalWidth = 30 * numCells + 1 * (numCells - 1);
      svg
        .append("g")
        .attr("class", "legendLinear")
        .attr(
          "transform",
          "translate(" + (actualWidth / 2 - totalWidth / 2).toFixed(1) + ",20)"
        );

      let legendLinear = d3legend
        .legendColor()
        .shapeWidth(30)
        .shapePadding(1)
        .cells(numCells)
        .orient("horizontal")
        .scale(colorScale);

      svg.select(".legendLinear").call(legendLinear);
    }
  }

  function handleResize(node) {
    actualWidth = node.clientWidth;
    actualHeight = node.clientHeight;
    update();
  }

  onMount(() => {
    console.log("updating mount");
    update();
  });
</script>

<div
  bind:this={container}
  style="width: {width != null ? `${width}px` : '100%'}; height: {height != null ? `${height}px` : '100%'};"
  use:watchResize={handleResize} />
