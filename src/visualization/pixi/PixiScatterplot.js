/**
 * A scatterplot that renders in a Pixi container. This is not a Svelte component
 * because it is designed to be added to an existing Pixi container, rather than
 * creating its own HTML elements.
 */

import * as PIXI from "pixi.js";
import * as d3 from "d3";
import {
  PixiLineDecoration,
  PixiOutlineDecoration,
  PixiWideningLineDecoration,
} from "./PixiDecorations";
import { PixiTextLabel, PixiImageLabel } from "./PixiLabel";
import PixiMultiselect from "./PixiMultiselect";
import PixiPointSet from "./PixiPointSet";
import PixiColorIDMap from "./PixiColorIDMap";
import { approxEquals } from "../utils/helpers";

const TextLabelZIndex = 1000;
const HiddenRFactor = 1.0;

export default function PixiScatterplot(markSet, transformInfo, rFactor = 1.0) {
  this.marksContainer = new PIXI.Container();
  this.marksContainer.zIndex = 1;
  this.marksContainer.sortableChildren = true;

  this.multiselectContainer = new PIXI.Container();
  this.multiselectContainer.zIndex = 2;

  this.markSet = markSet;
  this.transformInfo = transformInfo;
  this.renderBox = null;
  this.ticker = null;
  this.currentTime = 0.0;

  this.pointSet = new PixiPointSet(this.markSet, transformInfo, rFactor);
  this.marksContainer.addChild(this.pointSet);

  // =============== Lifecycle

  this.getElements = function () {
    return [this.marksContainer];
  };

  // Creates the necessary drawing logic and adds this element to the container
  this.addTo = function (container, ticker) {
    container.addChild(this.marksContainer);
    container.addChild(this.multiselectContainer);
    ticker.add(this._tickerFn, this);
    this.ticker = ticker;
  };

  this._tickerFn = function () {
    let needsUpdate = this.markSet.marksChanged();
    this.markSet.advance(this.ticker.elapsedMS);
    this.currentTime += this.ticker.elapsedMS;
    if (this.markSet.marksAnimating()) {
      // Disable interaction during animation
      this._marksAnimating = true;
      this.interactionMap = null;
    } else {
      this._marksAnimating = false;
    }
    this.pointSet.update(this.currentTime, needsUpdate);
    this.updateDecorations();
    if (!!this.multiselect) {
      this.multiselect.update();
    }
  };

  this.destroy = function () {
    this.pointSet.destroy();
    this.pointSet = null;
    this.ticker.remove(this._tickerFn, this);
    this.ticker = null;
  };

  // Array: [left, right, top, bottom]
  this.setRenderBox = function (box) {
    this.renderBox = box;
  };

  // =============== Decorations

  this.decorations = new Map();

  // Called on ticker, updates the known map of decorations => decoration graphics
  this.updateDecorations = function () {
    let currentDecorations = new Set(this.markSet.decorations);
    currentDecorations.forEach((dec) => {
      if (!this.decorations.has(dec)) {
        let pixiDec;
        if (dec.type == "line") {
          pixiDec = new PixiLineDecoration(dec);
        } else if (dec.type == "wideningLine") {
          pixiDec = new PixiWideningLineDecoration(dec);
        } else if (dec.type == "outline") {
          pixiDec = new PixiOutlineDecoration(dec);
        } else if (dec.type == "text") {
          pixiDec = new PixiTextLabel(dec, rFactor, TextLabelZIndex);
        } else if (dec.type == "image" && !!this.textureLoader) {
          let info = dec.attr("labelInfo");
          let spritesheet = this.textureLoader.resources[info.sheet];
          if (!!spritesheet) {
            let tex = spritesheet.textures[info.texture];
            if (!!tex) {
              pixiDec = new PixiImageLabel(dec, tex, rFactor, TextLabelZIndex);
            }
          }
        }

        if (!!pixiDec) {
          this.marksContainer.addChild(pixiDec);
          this.decorations.set(dec, pixiDec);
        }
      }

      if (this.decorations.has(dec)) {
        this.decorations.get(dec).update();
      }
    });

    // Remove old decorations
    for (var dec of this.decorations.keys()) {
      if (!currentDecorations.has(dec)) {
        this.marksContainer.removeChild(this.decorations.get(dec));
        this.decorations.delete(dec);
      }
    }
  };

  // =============== Textures

  this.textureLoader = null;

  // This enables the scatterplot to retrieve textures for image-based labels.
  this.setTextureLoader = function (loader) {
    this.textureLoader = loader;
  };

  // =============== Interaction

  this.interactionEnabled = true;
  this._marksAnimating = false;
  this.interactionMap = null;

  // Set to false to increase performance
  this.setInteractionEnabled = function (flag) {
    this.interactionEnabled = flag;
  };

  this.updateTransform = function (transformInfo) {
    if (
      approxEquals(transformInfo.x.a, this.transformInfo.x.a) &&
      approxEquals(transformInfo.x.b, this.transformInfo.x.b) &&
      approxEquals(transformInfo.y.a, this.transformInfo.y.a) &&
      approxEquals(transformInfo.y.b, this.transformInfo.y.b)
    )
      return;
    this.transformInfo = transformInfo;
    this.pointSet.updateCoordinateTransform(transformInfo);
    this.clearInteractionMap();
  };

  // Generates a PixiColorIDMap that can be queried using obj() to see what
  // object from colorIDs is at the given point. Returns null if
  // interactionEnabled is false
  this.getInteractionMap = function (renderer, width, height, colorIDs) {
    if (!this.interactionEnabled || this._marksAnimating) return null;
    if (!this.interactionMap) {
      let hiddenPoints = new PixiPointSet(
        this.markSet,
        this.transformInfo,
        rFactor * HiddenRFactor,
        this.renderBox,
        true
      );
      this.interactionMap = new PixiColorIDMap(
        renderer,
        hiddenPoints,
        new PIXI.Rectangle(0, 0, width, height),
        colorIDs
      );
    }
    return this.interactionMap;
  };

  this.clearInteractionMap = function () {
    this.interactionMap = null;
  };

  // ================= Selection

  this.multiselect = null;

  // Creates a visible multiselect element
  this.startMultiselect = function (initialPoint) {
    if (!!this.multiselect) this.endMultiselect();
    this.multiselect = new PixiMultiselect(0x30cdfc, 0x30cdfc);
    this.multiselect.addPoint(initialPoint[0], initialPoint[1]);
    this.multiselectContainer.addChild(this.multiselect);
  };

  // Adds a new point to the multiselect
  this.updateMultiselect = function (newPoint) {
    this.multiselect.addPoint(newPoint[0], newPoint[1]);
    this._multiselectFBO = null;
  };

  // Removes and clears the multiselect
  this.endMultiselect = function () {
    if (!!this.multiselect) {
      this.multiselectContainer.removeChild(this.multiselect);
      this.multiselect = null;
    }
    this._multiselectFBO = null;
  };

  const HiddenMultiselectColor = 0x303030; // rgb(48, 48, 48)
  const HiddenMultiselectRGB = [48, 48, 48];

  // Returns a PixiColorIDMap that can be queried using contains() to see if
  // points are in the multiselect
  this.makeMultiselectMap = function (renderer, width, height) {
    let hiddenMultiselect = new PixiMultiselect(HiddenMultiselectColor);
    hiddenMultiselect.hidden = true;
    hiddenMultiselect.setPoints(this.multiselect.points);
    hiddenMultiselect.update();

    return new PixiColorIDMap(
      renderer,
      hiddenMultiselect,
      new PIXI.Rectangle(0, 0, width, height),
      HiddenMultiselectRGB
    );
  };
}
