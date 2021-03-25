/**
 * A helper class that manages retrieving elements by color ID from a framebuffer.
 * This is the color-picking trick (see http://www.opengl-tutorial.org/miscellaneous/clicking-on-objects/picking-with-an-opengl-hack/)
 */

import * as PIXI from "pixi.js";
import { ColorIDMap } from "../utils/helpers";

const ComponentsPerPixel = 4;

export default class PixiColorIDMap {
  fbo;
  frame;
  binaryColor = null;
  colorIDs = null;

  /**
   * Builds the texture and prepares for queries.
   *
   * @param {PIXI.Renderer} renderer the renderer to use
   * @param {PIXI.RenderObject} element a drawable element to render
   * @param {PIXI.Rectangle} frame the rectangle in which to draw the element
   * @param {ColorIDMap | Array} colorID either a ColorIDMap defining values, or
   *  a single RGB (0-255) color array for a binary classification
   */
  constructor(renderer, element, frame, colorID) {
    let renderTexture = renderer.generateTexture(
      element,
      PIXI.SCALE_MODES.NEAREST,
      1,
      frame
    );
    this.fbo = renderer.extract.pixels(renderTexture);
    this.frame = frame;
    renderTexture.destroy();
    if (colorID instanceof Array) {
      this.binaryColor = colorID;
    } else {
      this.colorIDs = colorID;
    }
  }

  colorAt(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.frame.width || y < 0 || y >= this.frame.height)
      return [0, 0, 0];
    let startIndex =
      y * this.frame.width * ComponentsPerPixel + x * ComponentsPerPixel;
    return this.fbo.slice(startIndex, startIndex + 3);
  }

  // Only for binary classification maps - returns whether the region in the
  // map contains this point
  contains(x, y) {
    if (this.binaryColor == null) {
      console.warn("Attempting to use contains() on a non-binary color ID map");
      return false;
    }
    let color = this.colorAt(x, y);
    return (
      color[0] == this.binaryColor[0] &&
      color[1] == this.binaryColor[1] &&
      color[2] == this.binaryColor[2]
    );
  }

  // Only for non-binary classification maps - returns the object in the
  // ColorIDMap at the given point, or null
  obj(x, y) {
    if (this.colorIDs == null) {
      console.warn("Attempting to use obj() on a binary color ID map");
      return null;
    }
    let color = "rgb(" + this.colorAt(x, y).join(",") + ")";
    return this.colorIDs.obj(color);
  }
}
