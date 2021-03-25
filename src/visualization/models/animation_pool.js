/**
 * A helper class that manages a pool of objects with animatable states, such as
 * decorations.
 */

/**
 * A pool of objects with animatable states.
 *
 * @param {Object} callbacks A set of callbacks defining how to create, show,
 *   update, and hide elements. Callbacks:
 *   - create(id, info): Create an element based on the given ID and info.
 *   - show(element): Show the given element and return a Promise that resolves
 *       after the animation would be completed.
 *   - hide(element): Hide the given element and return a Promise that resolves
 *       after the animation would be completed.
 *   - destroy(element): Destroy the element.
 */
export default function AnimationPool(callbacks) {
  this.callbacks = callbacks;
  if (
    !this.callbacks.create ||
    !this.callbacks.show ||
    !this.callbacks.hide ||
    !this.callbacks.destroy
  )
    console.error("Missing required callbacks for AnimationPool");

  this.pool = {};

  this.show = function (id, infoCB) {
    if (!this.pool[id]) {
      let info = infoCB != null ? infoCB(id) : null;
      this.pool[id] = {
        element: this.callbacks.create(id, info),
        info,
        state: "waiting",
      };
    }

    let item = this.pool[id];
    if (!item.element) return false;
    if (item.state == "entering" || item.state == "visible") return false;

    item.state = "entering";
    this.callbacks.show(item.element).then(
      () => {
        if (item.state == "entering") {
          item.state = "visible";
        }
      },
      () => {}
    );
    return true;
  };

  this.getInfo = function (id) {
    if (!this.pool[id]) return null;
    return this.pool[id].info;
  };

  this.getElement = function (id) {
    if (!this.pool[id]) return null;
    return this.pool[id].element;
  };

  this.getAll = function () {
    let result = {};
    Object.assign(result, this.pool);
    return result;
  };

  this.getAllVisible = function () {
    let result = {};
    Object.keys(this.pool).forEach((key) => {
      if (
        (this.pool[key].state == "visible" ||
          this.pool[key].state == "entering") &&
        !!this.pool[key].element
      )
        result[key] = this.pool[key];
    });
    return result;
  };

  this.hide = function (id) {
    if (!this.pool[id]) {
      return;
    }
    let item = this.pool[id];
    if (!item.element) return false;
    if (item.state == "exiting") return false;

    item.state = "exiting";
    this.callbacks.hide(item.element).then(
      () => {
        // Resolve if it's still gone, otherwise reject
        let item = this.pool[id];
        if (!!item && item.state == "exiting") {
          this.callbacks.destroy(item.element);
          delete this.pool[id];
        }
      },
      () => {}
    );
    return true;
  };
}
