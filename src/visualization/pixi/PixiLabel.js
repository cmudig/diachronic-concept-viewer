import * as PIXI from "pixi.js";

const BaseFontSize = 10;

export class PixiTextLabel extends PIXI.Text {
  decoration;
  rFactor = 1;
  renderBox = null;
  zIndexBase = 0;

  constructor(decoration, rFactor = 1, zIndexBase = 0) {
    super(decoration.attr("text") || "", {
      fontFamily: "Arial",
      fontSize: BaseFontSize,
      stroke: "white",
      strokeThickness: 3.0,
    });
    this.resolution = window.devicePixelRatio;
    this.decoration = decoration;
    this.rFactor = rFactor;
    this.zIndexBase = zIndexBase;
    this.anchor.set(0.5, 1.0);
  }

  update() {
    let priority = this.decoration.attr("priority");
    let text = this.decoration.attr("text");
    if (priority == null || text == null || text.length == 0) {
      this.visible = false;
      return;
    }

    let x = this.decoration.attr("x");
    let y = this.decoration.attr("y");
    if (
      !!this.renderBox &&
      (x < this.renderBox[0] ||
        x > this.renderBox[1] ||
        y < this.renderBox[2] ||
        y > this.renderBox[3])
    ) {
      this.visible = false;
      return;
    }
    this.visible = true;

    this.visible = true;
    if (priority + this.zIndexBase != this.zIndex) {
      this.zIndex = priority + this.zIndexBase;
    }

    let r = this.decoration.marks[0].attr("r") * this.rFactor;
    this.position.set(x, y - r - 2);
    this.text = text;
    this.style.fill = this.decoration.attr("color") || "black";
    this.style.fontSize =
      BaseFontSize * (this.decoration.attr("textScale") || 1.0);
    this.alpha = this.decoration.attr("alpha") || 1.0;
    this.scale.set(this.decoration.attr("scale") || 1.0);
  }
}

export class PixiImageLabel extends PIXI.Sprite {
  decoration;
  renderBox = null;
  rFactor = 1;
  zIndexBase = 0;
  outline = null;
  lastColor = null;
  colorHex = null;
  scaleFactor = 0.0;

  constructor(decoration, texture, rFactor = 1, zIndexBase = 0) {
    super(texture);
    this.decoration = decoration;
    this.rFactor = rFactor;
    this.zIndexBase = zIndexBase;
    this.anchor.set(0.5, 1.0);

    let maxDim = this.decoration.attr("maxDim");
    if (
      !!maxDim &&
      (this.width > maxDim + 0.001 || this.height > maxDim + 0.001)
    ) {
      this.scaleFactor = Math.min(maxDim / this.width, maxDim / this.height);
      this.width *= this.scaleFactor;
      this.height *= this.scaleFactor;
    } else {
      this.scaleFactor = 1.0;
    }

    this.outline = new PIXI.Graphics();
    this.addChild(this.outline);
  }

  update() {
    let priority = this.decoration.attr("priority");
    if (priority == null) {
      this.visible = false;
      return;
    }

    let x = this.decoration.attr("x");
    let y = this.decoration.attr("y");
    if (
      !!this.renderBox &&
      (x < this.renderBox[0] ||
        x > this.renderBox[1] ||
        y < this.renderBox[2] ||
        y > this.renderBox[3])
    ) {
      this.visible = false;
      return;
    }
    this.visible = true;

    this.visible = true;
    if (priority + this.zIndexBase != this.zIndex) {
      this.zIndex = priority + this.zIndexBase;
    }

    let r = this.decoration.marks[0].attr("r") * this.rFactor;
    this.position.set(x, y - r - 4);
    this.alpha = this.decoration.attr("alpha") || 1.0;

    let color = this.decoration.attr("color") || "#FFFFFF";
    if (this.lastColor != color) {
      this.lastColor = color;
      this.colorHex = PIXI.utils.string2hex(color);

      this.outline.clear();
      this.outline.lineStyle(2, this.colorHex, 1.0);
      this.outline.drawRect(
        -this.width / 2.0 / this.scaleFactor,
        -this.height / this.scaleFactor,
        this.width / this.scaleFactor,
        this.height / this.scaleFactor
      );
    }
  }
}
