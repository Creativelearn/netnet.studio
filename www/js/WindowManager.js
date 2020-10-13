/* global Maths, Color, NNM, NNE, STORE, Widget, WIDGETS */
/*
  -----------
     info
  -----------

  This class handles netnet's layout (ie. relationship between netnet's editor
  window && the rendered output)

  NOTE: This class is only meant to be instantiated once... so why not just make it
  a global object? ...b/c i like JS's class syntax better than that of global
  objects. It's also dependent on a lot of outside variables && elements, see
  globals in the comment on the fist line for global JS variables it references,
  && refer to the first few lines of the constructor for elements it assumes are
  in the index.html page.

  -----------
     usage
  -----------

  const NNW = new WindowManager()

  NNW.layout = 'dock-left' // adjusts layout
  NNW.opacity = 0.5 // adjusts the opacity of the netnet window
  NNW.updateTheme('light') // updates the theme
  NNW.updatePosition(x, y) // moves window to particular spot
  NNW.expandShortURL(shortCode) // takes a shortened url code &&
                                // sends a fetch request for hash

*/
class WindowManager {
  constructor (opts) {
    this.rndr = document.querySelector('#nn-output')
    this.win = document.querySelector('#nn-window')
    this.edtr = document.querySelector('#nn-editor')
    this.menu = document.querySelector('#nn-menu')
    this.canv = document.querySelector('#nn-bg-canvas')

    this.layouts = [
      'welcome', 'separate-window', 'dock-left', 'dock-bottom', 'full-screen'
    ]
    this.layout = this._layout = 'welcome'
    this.opacity = this._opacity = 1

    // ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ .  event listeners
    NNE.on('render-update', () => this._bubbleUpiFrameEvents())
    window.addEventListener('mousemove', (e) => this._mouseMove(e), true)
    window.addEventListener('mouseup', (e) => this._mouseUp(e), true)
    window.addEventListener('mousedown', (e) => this._mouseDown(e), true)
    window.addEventListener('resize', (e) => this._canvasResize(e))
    window.addEventListener('DOMContentLoaded', (e) => {
      this._calcCanvasColors()
      this._canvasResize(e)
      this._canvasUpdate(0, 0)
      this._canvasMouseMove({ clientX: 0, clientY: 0 })
      this.updateTheme()
      if (this.layout === 'welcome') this._showEditor(false)
      this._loadWidgets()
    })
  }

  err (m) {
    if (m.type === 'invalid-prop-value') {
      console.error('WindowManager:', `invalid ${m.prop} value, must be: ${m.opts}`)
    } else {
      console.error('WindowManager:', m)
    }
  }

  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*
  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸ properties
  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*

  get layout () { return this._layout }
  set layout (v) {
    if (!this.layouts.includes(v)) {
      const options = this.layouts.join(', ')
      return this.err({
        type: 'invalid-prop-value', prop: 'layout', opts: options
      })
    } else this._adjustLayout(v)
  }

  get opacity () { return this._opacity }
  set opacity (v) {
    if (typeof v !== 'number') {
      return this.err({
        type: 'invalid-prop-value', prop: 'opacity', opts: 'a number'
      })
    } else this._adjustOpacity(v)
  }

  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*
  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.••.¸¸¸.•*•. public methods
  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*

  updateTheme (theme, background) {
    NNE.theme = theme || 'dark'
    NNE.background = background || false
    if (!background) {
      if (theme === 'light' || theme === 'monokai') NNE.background = true
      else NNE.background = false
    }
    const de = document.documentElement
    const fg = window.getComputedStyle(de).getPropertyValue('--netizen-tag')
    document.documentElement.style.setProperty('--fg-color', fg)
    const bg = window.getComputedStyle(de).getPropertyValue('--netizen-background')
    document.documentElement.style.setProperty('--bg-color', bg.substr(0, 7))
    this._calcCanvasColors()
    this._canvasResize()
    this._canvasUpdate(0, 0)
  }

  updatePosition (x, y, ignoreFrame) {
    this.win.style.transition = 'all .5s cubic-bezier(0.165, 0.84, 0.44, 1)'
    setTimeout(() => {
      if (x) this.win.style.left = `${x}px`
      if (y) this.win.style.top = `${y}px`
      if (!x && !y) {
        this.win.style.left = 'calc(-170px + 50vw)'
        this.win.style.top = 'calc(-135px + 50vh)'
      }
      setTimeout(() => {
        this.win.style.transition = 'none'
        if (!ignoreFrame) this._stayInFrame()
      }, 500)
    }, 10)
  }

  expandShortURL (shortCode, cb) {
    function exErr (err) {
      let m = 'Oh dang! looks like something went wrong trying to expand'
      m += ' the short code in this URL.'
      if (err) m += ` It seems that ${err}`
      STORE.dispatch('SHOW_EDU_TEXT', {
        content: m, options: { ok: () => { STORE.dispatch('HIDE_EDU_TEXT') } }
      })
    }

    window.fetch('./api/expand-url', {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key: shortCode })
    }).then(res => res.json())
      .then(json => {
        if (json.error) exErr(json.error)
        else {
          window.location.hash = json.hash
          // const opa = new URL(window.location).searchParams.get('opacity')
          // if (opa) STORE.dispatch('CHANGE_OPACITY', opa)
          // else STORE.dispatch('CHANGE_LAYOUT', 'dock-left')
          if (cb) cb()
        }
      })
      .catch(() => { exErr() })
  }

  loadWidget (widget, key) {
    key = key || widget.key
    if (typeof key !== 'string') {
      console.warn('WindowManager: a widget\'s key value should be a string')
    } else if (!key) {
      console.warn('WindowManager: failed to load a widget without a key value')
    } else if (WIDGETS[key]) {
      console.warn(`WindowManager: WIDGETS.${key} already exists`)
    } else if (!(widget instanceof Widget)) {
      console.warn(`WindowManager: failed to load ${key}, it's not a Widget`)
    } else {
      if (widget.key !== key) widget.key = key
      WIDGETS[key] = widget
    }
    this._widgetUpdate()
  }

  loadWidgets (data) {
    for (const key in data) this.loadWidget(data[key], key)
  }

  removeWidget (widget) {
    if (typeof widget === 'string') {
      if (WIDGETS[widget].opened) WIDGETS[widget].close()
      delete WIDGETS[widget]
    } else if (widget instanceof Widget) {
      if (WIDGETS[widget.key].opened) WIDGETS[widget.key].close()
      delete WIDGETS[widget.key]
    } else {
      console.warn(`WindowManager: failed to remove ${widget}`)
    }
    this._widgetUpdate()
  }

  removeWidgets (data) {
    if (data instanceof Array) {
      data.forEach(key => this.removeWidget(key))
    } else {
      for (const key in data) this.removeWidget(key)
    }
  }

  onWidgetLoaded (callback) {
    if (!this.wigListeners) this.wigListeners = []
    if (!this.wigListeners.includes(callback)) this.wigListeners.push(callback)
  }

  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*
  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.••.¸¸¸.•* private methods
  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*

  _loadWidgets () {
    const self = this
    // create initial global WIDGETS dictionary object
    window.WIDGETS = {}
    // load all extended widget classes
    function loadWidget (filename) {
      const s = document.createElement('script')
      s.setAttribute('src', `widgets/${filename}`)
      s.onload = () => self._initWidgets(filename)
      document.body.appendChild(s)
    }

    window.fetch('api/widgets', { method: 'GET' })
      .then(res => res.json())
      .then(json => {
        this._numberOfWidgetsToLoad = json.length
        this._widgetsLoaded = []
        json.forEach(loadWidget)
      })
  }

  _initWidgets (filename) {
    const className = filename.split('.')[0]
    this._widgetsLoaded.push(className)
    // instantiate listed widgets
    if (this._widgetsLoaded.length === this._numberOfWidgetsToLoad) {
      const data = {}
      this._widgetsLoaded.forEach(cname => {
        if (window[cname].skipAutoInstantiation !== true) {
          const widget = new window[cname]()
          if (widget.key) data[widget.key] = widget
        }
      })
      this.loadWidgets(data)
    }
  }

  _widgetUpdate () {
    // alert widget listeners that a widgets have been loaded/removed
    this.wigListeners.forEach(cb => cb(Object.keys(WIDGETS)))
    // check if any widgets have been opened or closed
    const opened = Object.keys(WIDGETS)
      .map(w => WIDGETS[w])
      .filter(w => w.opened)
      .map(w => w.key)
    if (JSON.stringify(STORE.state.widgets) !== JSON.stringify(opened)) {
      STORE.dispatch('UPDATED_WIDGETS', opened)
    }
  }

  _adjustOpacity (v) {
    this._opacity = v
    if (STORE.state.layout === 'welcome') {
      this.win.style.opacity = this._opacity
      this.canv.style.opacity = 1
      const clr = 'var(--netizen-background)'
      this.edtr.querySelector('.cm-s-netizen').style.backgroundColor = clr
      this.edtr.querySelector('.CodeMirror-gutters').style.backgroundColor = clr
    } else {
      this.win.style.opacity = 1
      this.canv.style.opacity = this._opacity
      const bg = window.getComputedStyle(document.documentElement)
        .getPropertyValue('--netizen-background').substr(0, 7)
      const c = Color.hex2rgb(bg)
      const c2 = `rgba(${c.r}, ${c.g}, ${c.b}, 0)`
      this.edtr.querySelector('.cm-s-netizen').style.backgroundColor = c2
      this.edtr.querySelector('.CodeMirror-gutters').style.backgroundColor = c2
    }
  }

  _bubbleUpiFrameEvents () {
    // see: https://stackoverflow.com/a/38442439/1104148
    const callback = (event, type) => {
      const boundingClientRect = NNE.iframe.getBoundingClientRect()
      const o = { bubbles: true, cancelable: false }
      const e = new window.CustomEvent(type, o)
      e.clientX = event.clientX + boundingClientRect.left
      e.clientY = event.clientY + boundingClientRect.top
      e.keyCode = event.keyCode
      e.ctrlKey = event.ctrlKey
      e.metaKey = event.metaKey
      NNE.iframe.dispatchEvent(e)
    }
    NNE.iframe.contentWindow
      .addEventListener('mousemove', (e) => callback(e, 'mousemove'))
    NNE.iframe.contentWindow
      .addEventListener('mouseup', (e) => callback(e, 'mouseup'))
    NNE.iframe.contentWindow
      .addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) e.preventDefault()
        callback(e, 'keydown')
      })
    // match the page's background color to that of the iframe's backgroundColor
    // w/out it the netnet's rounded border's create a white space
    const iframeBody = NNE.iframe.contentDocument.body
    if (iframeBody) {
      const bg = window.getComputedStyle(iframeBody).backgroundColor
      document.body.style.backgroundColor = bg
    }
  }

  _runBlink () {
    setTimeout(() => {
      const f = NNM.getFace()
      if (f[0] === '◕' && f[1] === '◞' && f[2] === '◕') {
        NNM.setFace('-', f[1], '-', false)
        setTimeout(() => NNM.setFace(...f), 200)
      }
    }, Math.random() * 2000)
  }

  _stayInFrame () { // ensure that the textBubble is always readable in frame
    setTimeout(() => {
      // 30 is the "bottom =" offset +a little extra, see NNM.updatePosition()
      const offset = this.win.offsetTop - NNM.tis.offsetHeight - 30
      if (offset < 0) {
        this.win.style.transition = 'top .5s cubic-bezier(0.165, 0.84, 0.44, 1)'
        setTimeout(() => {
          const t = this.win.offsetTop + Math.abs(offset)
          this.win.style.top = `${t + 10}px` // +10 for a little space
          setTimeout(() => { this.win.style.transition = 'none' }, 500)
        }, 10)
      }
      // check if text-bubbles are going off-frame left
      if (this.layout === 'welcome' || this.layout === 'separate-window') {
        const winRight = this.win.offsetLeft + this.win.offsetWidth
        let tbWidth = 0
        NNM.ele.querySelectorAll('.text-bubble-options > button')
          .forEach(b => { tbWidth += b.offsetWidth + 5 }) // +5 button margin
        // 0.8 b/c .text-bubble-options width:80%;
        // divided by 2, b/c .text-bubble-options translateX(-50%)
        const nudge = (NNM.tis.offsetWidth - (NNM.tis.offsetWidth * 0.8)) / 2
        if (tbWidth + nudge > winRight) {
          this.win.style.transition = 'top .5s cubic-bezier(0.165, 0.84, 0.44, 1)'
          setTimeout(() => {
            let l = this.win.offsetLeft
            l += tbWidth + nudge - winRight
            this.win.style.left = `${l + 20}px` // +20 for a little space
            setTimeout(() => { this.win.style.transition = 'none' }, 500)
          }, 10)
        }
      }
    }, STORE.getTransitionTime())
  }

  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸ window drag/move via mouse

  _mouseMove (e) {
    // e.preventDefault()
    this._canvasMouseMove(e)
    this._updateCursor(e)
    if (this.mousedown) this._resizeWindow(e)
    if (this.cursor === 'move') this._moveWindow(e)
  }

  _mouseUp () {
    this.mousedown = false
    this.cursor = 'auto'
    document.body.style.userSelect = 'auto'
    document.body.style.webkitUserSelect = 'auto'
    this.winOff = null
  }

  _mouseDown (e) {
    const mw = (this.layout === 'separate-window' || this.layout === 'welcome')
    if (e.target.id === 'nn-window') this.mousedown = true
    else if (e.target.id === 'nn-menu' && mw) {
      this.mousedown = true
      this.cursor = 'move'
      this.win.style.cursor = this.cursor
    }
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
  }

  _updateCursor (e) {
    if (this.layout === 'dock-bottom') this.cursor = 'row-resize'
    else if (this.layout === 'dock-left') this.cursor = 'col-resize'
    else if (this.layout === 'separate-window') {
      const offX = this.win.offsetWidth + this.win.offsetLeft - 45
      const offY = this.win.offsetHeight + this.win.offsetTop - 45
      if (e.clientX > offX && e.clientY > offY) this.cursor = 'se-resize'
      if (e.target.id === 'nn-menu') {
        if (this.mousedown) this.cursor = 'move'
        else this.cursor = 'grab'
      }
    }

    const mv = this.cursor === 'move' || this.cursor === 'grab'
    if (e.target.id !== 'nn-window' && !mv) this.cursor = 'auto'

    this.win.style.cursor = this.cursor
  }

  _resizeWindow (e) {
    if (this.layout === 'dock-bottom') {
      this.win.style.height = window.innerHeight - e.clientY + 'px'
      this.rndr.style.height = e.clientY + 'px'
    } else if (this.layout === 'dock-left') {
      this.win.style.width = e.clientX + 'px'
      const w = window.innerWidth - e.clientX
      this.rndr.style.width = w + 'px'
      this.rndr.style.left = e.clientX + 'px'
      NNM.updatePosition()
    } else if (this.layout === 'separate-window' && this.cursor !== 'move') {
      this.win.style.width = e.clientX - parseInt(this.win.style.left) + 'px'
      this.win.style.height = e.clientY - parseInt(this.win.style.top) + 'px'
      NNM.updatePosition()
    }
    // NNE.code = NNE.cm.getValue()
    this._canvasResize(e)
  }

  _moveWindow (e) {
    if (!this.winOff || typeof this.winOff === 'undefined') {
      this.winOff = {
        x: e.clientX - this.win.offsetLeft,
        y: e.clientY - this.win.offsetTop
      }
    }
    this.win.style.left = e.clientX - this.winOff.x + 'px'
    this.win.style.top = e.clientY - this.winOff.y + 'px'
  }

  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸ adjusting layout/orientation

  _adjustLayout (v) {
    this._toggleTransition(true)
    this._layout = v
    this.opacity = STORE.state.opacity

    clearInterval(this._blinking)
    if (v === 'welcome') {
      this._blinking = setInterval(() => this._runBlink(), 7500)
    } else this._blinking = null

    if (v === 'welcome') {
      this.rndr.style.width = '100%'
      this.rndr.style.height = '100%'
      this.rndr.style.left = '0px'
      this.rndr.style.top = '0px'
      this.win.style.width = '430px'
      this.win.style.height = '295px'
      this.win.style.left = 'calc(-170px + 50vw)'
      this.win.style.top = 'calc(-135px + 50vh)'
      this.win.style.bottom = null
      this.win.style.borderRadius = '25px 25px 1px 1px'
      this.canv.style.borderRadius = '15px 15px 1px 1px'
      this._showEditor(false)
      this._whenCSSTransitionFinished(() => this._canvasResize())
    } else if (v === 'dock-bottom') {
      this.rndr.style.width = '100%'
      this.rndr.style.height = window.innerHeight / 2 + 'px'
      this.rndr.style.left = '0px'
      this.rndr.style.top = '0px'
      this.win.style.width = '100%'
      this.win.style.height = window.innerHeight / 2 + 'px'
      this.win.style.left = '0px'
      this.win.style.top = null
      this.win.style.bottom = '0px'
      this.win.style.borderRadius = '25px 25px 1px 1px'
      this.canv.style.borderRadius = '15px 15px 1px 1px'
      this._showEditor(true)
      this._whenCSSTransitionFinished(() => {
        // NNE.code = NNE.cm.getValue()
        this._canvasResize()
      })
    } else if (v === 'dock-left') {
      this.rndr.style.width = window.innerWidth / 2 + 'px'
      this.rndr.style.height = '100%'
      this.rndr.style.left = window.innerWidth / 2 + 'px'
      this.rndr.style.top = '0px'
      this.win.style.width = window.innerWidth / 2 + 'px'
      this.win.style.height = '100%'
      this.win.style.left = '0px'
      this.win.style.top = '0px'
      this.win.style.bottom = null
      this.win.style.borderRadius = '1px 25px 25px 1px'
      this.canv.style.borderRadius = '1px 15px 15px 1px'
      this._showEditor(true)
      this._whenCSSTransitionFinished(() => {
        // NNE.code = NNE.cm.getValue()
        this._canvasResize()
      })
    } else if (v === 'full-screen') {
      this.rndr.style.width = '100%'
      this.rndr.style.height = '100%'
      this.rndr.style.left = '0px'
      this.rndr.style.top = '0px'
      this.win.style.width = '100%'
      this.win.style.height = '100%'
      this.win.style.left = '0px'
      this.win.style.top = '0px'
      this.win.style.bottom = null
      this.win.style.borderRadius = '1px 1px 1px 1px'
      this.canv.style.borderRadius = '1px 1px 1px 1px'
      this._showEditor(true)
      this._whenCSSTransitionFinished(() => {
        // NNE.code = NNE.cm.getValue()
        this._canvasResize()
      })
    } else if (v === 'separate-window') {
      this._showEditor(true)
      this.rndr.style.width = '100%'
      this.rndr.style.height = '100%'
      this.rndr.style.left = '0px'
      this.rndr.style.top = '0px'
      const wf = window.innerWidth / 2
      const eh = NNE.code.split('\n').length * 25
      const hf = window.innerHeight / 2 < eh + 75
        ? window.innerHeight / 2 : eh + 75
      this.win.style.width = wf + 'px'
      this.win.style.height = hf + 'px'
      this.win.style.left = window.innerWidth / 2 - wf / 2 + 'px'
      this.win.style.top = window.innerHeight / 2 - hf / 2 + 'px'
      this.win.style.bottom = null
      this.win.style.borderRadius = '25px 25px 1px 1px'
      this.canv.style.borderRadius = '15px 15px 1px 1px'
      this._whenCSSTransitionFinished(() => {
        // NNE.code = NNE.cm.getValue()
        this._canvasResize()
      })
    }
  }

  _whenCSSTransitionFinished (callback) {
    const de = document.documentElement
    let t = window.getComputedStyle(de).getPropertyValue('--layout-transition-time')
    const unit = t.includes('ms') ? 'ms' : 's'
    t = Number(t.substr(0, t.indexOf(unit)))
    if (unit === 's') t *= 1000
    setTimeout(() => {
      this._toggleTransition(false)
      callback()
    }, t)
  }

  _showEditor (show) {
    const face = document.querySelector('#face')
    if (show) {
      this.edtr.style.display = 'block'
      if (face) face.style.fontSize = 'inherit'
      if (face) face.style.margin = '0'
      this.menu.style.alignItems = 'flex-end'
      // this.menu.style.width = 'auto'
      this.menu.style.margin = 'auto'
      this.menu.style.height = 'auto'
      // this.menu.style.cursor = 'auto'
    } else {
      this.edtr.style.display = 'none'
      if (face) face.style.fontSize = '44px'
      if (face) face.style.margin = '95px auto'
      this.menu.style.alignItems = 'center'
      // this.menu.style.width = '60%'
      this.menu.style.margin = 'none'
      this.menu.style.height = '100%'
      // this.menu.style.cursor = 'grab'
    }
  }

  _toggleTransition (bool) {
    if (bool) {
      this.win.style.transition = 'all var(--layout-transition-time)'
      this.menu.style.transition = 'all var(--layout-transition-time)'
      this.rndr.style.transition = 'all var(--layout-transition-time)'
    } else {
      this.win.style.transition = 'none'
      this.menu.style.transition = 'none'
      this.rndr.style.transition = 'none'
    }
  }

  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.• canvas gradient && window shadow

  _calcCanvasColors () {
    const bg = window.getComputedStyle(document.documentElement)
      .getPropertyValue('--netizen-background').substr(0, 7)
    const c = Color.hex2hsv(bg)
    const v0 = c.v + 10 <= 100 ? c.v + 10 : 100
    const v1 = c.v - 10 >= 0 ? c.v - 10 : 0
    this.grad0 = Color.hsv2hex(c.h, c.s, v0)
    this.grad1 = Color.hsv2hex(c.h, c.s, v1)
  }

  _canvasUpdate (x, y) {
    const ctx = this.canv.getContext('2d')
    if (NNE.background) {
      // if background is present, just match the color, avoid the maths below
      const bg = window.getComputedStyle(document.documentElement)
        .getPropertyValue('--netizen-background').substr(0, 7)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, this.canv.width, this.canv.height)
      return
    }
    const rad = (this.canv.width > this.canv.height)
      ? this.canv.width : this.canv.height
    const g = ctx.createRadialGradient(x, y, 1, x, y, rad)
    ctx.clearRect(0, 0, this.canv.width, this.canv.height)
    g.addColorStop(0, this.grad0)
    g.addColorStop(1, this.grad1)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, this.canv.width, this.canv.height)
  }

  _canvasResize (e) {
    e = e || {}
    const x = (e.clientX || 0) - this.win.offsetLeft
    const y = (e.clientY || 0) - this.win.offsetTop
    this.canv.width = this.win.offsetWidth
    this.canv.height = this.win.offsetHeight
    this._canvasUpdate(x, y)
  }

  _canvasMouseMove (e) {
    const ex = e.clientX
    const ey = e.clientY
    let x = ex - this.win.offsetLeft
    let y = ey - this.win.offsetTop
    if (ex < this.win.offsetLeft) x = 0
    else if (ex > this.win.offsetLeft + this.win.offsetWidth) x = this.canv.width
    if (ey < this.win.offsetTop) y = 0
    else if (ey > this.win.offsetTop + this.win.offsetHeight) y = this.canv.height
    this._canvasUpdate(x, y)
    if (STORE.state.theme === 'light') {
      this.win.style.boxShadow = 'none'
      return
    } // no shadows for light theme
    x = Maths.map(ex, 0, window.innerWidth, 33, -33)
    y = Maths.map(ey, 0, window.innerHeight, 33, -33)
    const opac = this.layout === 'welcome' ? 0.5 : 0.75
    this.win.style.boxShadow = `${x}px ${y}px 33px -9px rgba(0, 0, 0, ${opac})`
  }
}

window.WindowManager = WindowManager
