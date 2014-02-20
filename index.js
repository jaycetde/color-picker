
/**
 * Module dependencies.
 */

var events = require('event')
  , domify = require('domify')
  , Emitter = require('emitter')
  , autoscale = require('autoscale-canvas')
  , getOffset = require('offset') // timoxley/offset
  , prevent = require('prevent') // yield/prevent

  , templateEl = domify(require('./template'))

  , indicatorRadius = 3.5;
;

/**
 * Expose `ColorPicker`.
 */

module.exports = ColorPicker;

/**
 * RGB util.
 */

function rgb(r,g,b) {
  return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

/**
 * RGBA util.
 */

function rgba(r,g,b,a) {
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
}

/**
 * Mouse position util.
 */

function localPos(el, e) {
  var offset = getOffset(el);
  return {
    x: e.pageX - offset.left,
    y: e.pageY - offset.top
  };
}

function snap(val, low, high) {
    if (val < low) return low;
    if (val > high) return high;
    return val;
}

function toString(color) {
    color = color || this;
    return typeof color.a === 'undefined' ? rgb(color.r, color.g, color.b) : rgba(color.r, color.g, color.b, color.a);
}

/**
 * Initialize a new `ColorPicker`.
 *
 * Emits:
 *
 *    - `change` with the given color object
 *
 * @api public
 */

function ColorPicker() {
    
    this.el = templateEl.cloneNode(true);
    
    this.main = this.el.querySelector('.main canvas');
    this.spectrum = this.el.querySelector('.spectrum canvas');
    this.opacityRange = this.el.querySelector('.opacity canvas');
    
    this._mainIndicator = this.el.querySelector('.main .indicator');
    this._spectrumIndicator = this.el.querySelector('.spectrum .indicator');
    this._opacityIndicator = this.el.querySelector('.opacity .indicator');
    
    this._color = this._hue = rgb(255, 0, 0);
    this._width = 180;
    this._height = 180;
    this._colorPos = { x: this._width - 1, y: 0 };
    this._colorPicked = false;
    
    this.opacityEvents();
    this.spectrumEvents();
    this.mainEvents();

    this.render();
    
    this.setMainIndicator(this._width - 1, 0);
    
    this.setSpectrumIndicator(0);
    this.setOpacityIndicator(this._height - 1);
    
}

/**
 * Mixin Emitter.
 */

Emitter(ColorPicker.prototype);

ColorPicker.prototype.setMainIndicator = function (x, y) {
    this._mainIndicator.style.left = (x - indicatorRadius) + 'px';
    this._mainIndicator.style.top = (y - indicatorRadius) + 'px';
};

ColorPicker.prototype.setSpectrumIndicator = function (y) {
    this._spectrumIndicator.style.top = (y - 1) + 'px';
};

ColorPicker.prototype.setOpacityIndicator = function (y) {
    this._opacityIndicator.style.top = (y - 1) + 'px';
};

/**
 * Set width / height to `n`.
 *
 * @param {Number} n
 * @return {ColorPicker} for chaining
 * @api public
 */

ColorPicker.prototype.size = function (n) {
    return this
      .width(n, true)
      .height(n)
    ;
};

/**
 * Set width to `n`.
 *
 * @param {Number} n
 * @return {ColorPicker} for chaining
 * @api public
 */

ColorPicker.prototype.width = function (n, noRender) {
    this._width = n;
    // Set the color indicator to the top right
    if (!this._colorPicked) this.setMainIndicator(n - 1, 0);
    if (!noRender) this.render();
    return this;
};

/**
 * Set height to `n`.
 *
 * @param {Number} n
 * @return {ColorPicker} for chaining
 * @api public
 */

ColorPicker.prototype.height = function(n, noRender){
    this._height = n;
    if (!noRender) this.render();
    return this;
};

/**
 * Opacity related events.
 * 
 * @api private
 */

ColorPicker.prototype.opacityEvents = function(){
    var self = this
      , canvas = this.opacityRange
    ;
    
    function update(e) {
        var offsetY = snap(localPos(canvas, e).y, 0, canvas.clientHeight - 1);
        
        if (offsetY === self._opacityPos) return;
        
        self.opacity(self.opacityAt(offsetY));
        self._opacityPos = offsetY;
        self.setOpacityIndicator(offsetY);
    }
    
    events.bind(canvas, 'mousedown', function (e) {
        prevent(e);
        update(e);
        
        events.bind(document, 'mousemove', update);
        events.bind(document, 'mouseup', function mouseup(e) {
            events.unbind(document, 'mousemove', update);
            events.unbind(document, 'mouseup', mouseup);
        });
    });
};

/**
 * Spectrum related events.
 *
 * @api private
 */

ColorPicker.prototype.spectrumEvents = function(){
    var self = this
      , canvas = this.spectrum
    ;
    
    function update(e) {
        var offsetY = snap(localPos(canvas, e).y, 0, canvas.clientHeight - 1);
        
        if (offsetY === self._huePos) return;
        
        self.hue(toString(self.hueAt(offsetY)));
        self._huePos = offsetY;
        self.setSpectrumIndicator(offsetY);
    }
    
    events.bind(canvas, 'mousedown', function (e) {
        prevent(e);
        update(e);
        
        events.bind(document, 'mousemove', update);
        events.bind(document, 'mouseup', function mouseup(e) {
            events.unbind(document, 'mousemove', update);
            events.unbind(document, 'mouseup', mouseup);
        });
    });
};

/**
 * Hue / lightness events.
 *
 * @api private
 */

ColorPicker.prototype.mainEvents = function(){
    var self = this
      , canvas = this.main
    ;

    function update(e) {
        var color, pos = localPos(self.main, e);
        pos.x = snap(pos.x, 0, self.main.clientWidth - 1);
        pos.y = snap(pos.y, 0, self.main.clientHeight - 1);
        color = self.colorAt(pos.x, pos.y);
        color.a = this._opacity;
        self._colorPos = pos;
        self.color(toString(color));
        
        self.setMainIndicator(pos.x, pos.y);
    }
    
    events.bind(canvas, 'mousedown', function (e) {
        prevent(e);
        update(e);
        
        events.bind(document, 'mousemove', update);
        events.bind(document, 'mouseup', function mouseup(e) {
            events.unbind(document, 'mousemove', update);
            events.unbind(document, 'mouseup', mouseup);
        });
    });
};

/**
 * Get the RGB color at `(x, y)`.
 *
 * @param {Number} x
 * @param {Number} y
 * @return {Object}
 * @api private
 */

ColorPicker.prototype.colorAt = function(x, y){
    var data = this.main.getContext('2d').getImageData(x, y, 1, 1).data;
    return {
        r: data[0],
        g: data[1],
        b: data[2]
    };
};

/**
 * Get the Opacity value at `y`.
 */

ColorPicker.prototype.opacityAt = function(y) {
    var data = this.opacityRange.getContext('2d').getImageData(0, y, 1, 1).data
      , opacity = data[3]
    ;
    return Math.round((opacity / 255) * 100) / 100;
};

/**
 * Get the RGB value at `y`.
 *
 * @param {Type} name
 * @return {Type}
 * @api private
 */

ColorPicker.prototype.hueAt = function(y){
    var data = this.spectrum.getContext('2d').getImageData(0, y, 1, 1).data;
    return {
        r: data[0],
        g: data[1],
        b: data[2]
    };
};

/**
 * Get or set `color`.
 *
 * @param {String} color
 * @return {String|ColorPicker}
 * @api public
 */

ColorPicker.prototype.color = function(color){
    // TODO: update pos
    // TODO: should update .hue() automatically...
    if (0 == arguments.length) return this._color;
    this._color = color;
    this.emit('change', color);
    return this;
};

/**
 * Get or set hue `color`.
 *
 * @param {String} color
 * @return {String|ColorPicker}
 * @api public
 */

ColorPicker.prototype.hue = function(color){
    // TODO: update pos
    if (0 == arguments.length) return this._hue;
    this._hue = color;
    this.renderMain();
    this.updateColor();
    return this;
};

/**
 * Get or set the opacity
 */
ColorPicker.prototype.opacity = function(opacity) {
    if (0 == arguments.length) return this._opacity;
    if (opacity === 1) opacity = undefined;
    this._opacity = opacity;
    this.updateColor();
    return this;
};

ColorPicker.prototype.updateColor = function () {
    if (typeof this._colorPos.x === 'undefined') return;
    
    var color = this.colorAt(this._colorPos.x, this._colorPos.y);
    color.a = this._opacity;
    this.color(toString(color));
};

/**
 * Render with the given `options`.
 *
 * @param {Object} options
 * @api public
 */

ColorPicker.prototype.render = function(){
    this.renderMain();
    this.renderSpectrum();
    this.renderOpacity();
};

/**
 * Render opacity
 * 
 * @api private
 */

ColorPicker.prototype.renderOpacity = function (withoutPos) {
    var el = this.el
      , canvas = this.opacityRange
      , ctx = canvas.getContext('2d')
      , pos = this._opacityPos
      , w = this._width * .12
      , h = this._height
    ;
    
    canvas.width = w;
    canvas.height = h;
    autoscale(canvas);
    
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgba(0, 0, 0, 0));
    grad.addColorStop(1, rgba(0, 0, 0, 1));
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    
    return;
    
    if (withoutPos || !pos) return;
    ctx.fillStyle = rgba(0, 0, 0, .8);
    ctx.fillRect(0, pos, w, 1);
    ctx.fillStyle = rgba(255, 255, 255, .7);
    ctx.fillRect(0, pos + 1, w, 1);
};

/**
 * Render spectrum.
 *
 * @api private
 */

ColorPicker.prototype.renderSpectrum = function(withoutPos){
    var el = this.el
      , canvas = this.spectrum
      , ctx = canvas.getContext('2d')
      , pos = this._huePos
      , w = this._width * .12
      , h = this._height
    ;
    
    canvas.width = w;
    canvas.height = h;
    autoscale(canvas);
    
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgb(255, 0, 0));
    grad.addColorStop(.15, rgb(255, 0, 255));
    grad.addColorStop(.33, rgb(0, 0, 255));
    grad.addColorStop(.49, rgb(0, 255, 255));
    grad.addColorStop(.67, rgb(0, 255, 0));
    grad.addColorStop(.84, rgb(255, 255, 0));
    grad.addColorStop(1, rgb(255, 0, 0));
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
};

/**
 * Render hue/luminosity canvas.
 *
 * @api private
 */

ColorPicker.prototype.renderMain = function(){
    var el = this.el
      , canvas = this.main
      , ctx = canvas.getContext('2d')
      , w = this._width
      , h = this._height
      , x = this._colorPos.x + .5
      , y = this._colorPos.y + .5
    ;
    
    canvas.width = w;
    canvas.height = h;
    autoscale(canvas);
    
    var grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, rgb(255, 255, 255));
    grad.addColorStop(1, this._hue);
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    
    grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgba(255, 255, 255, 0));
    grad.addColorStop(1, rgba(0, 0, 0, 1));
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
};