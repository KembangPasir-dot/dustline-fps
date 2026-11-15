export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, buttons: { left: false, right: false } };
    this.pointerLocked = false;
    this.listeners = {};

    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (this.listeners['keydown']) this.listeners['keydown'](e.code, e);
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (this.listeners['keyup']) this.listeners['keyup'](e.code, e);
    });

    this.domElement.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.mouse.dx += e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        this.mouse.dy += e.movementY || e.mozMovementY || e.webkitMovementY || 0;
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.buttons.left = true;
      if (e.button === 2) this.mouse.buttons.right = true;
      if (this.listeners['mousedown']) this.listeners['mousedown'](e.button);
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.buttons.left = false;
      if (e.button === 2) this.mouse.buttons.right = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.domElement;
      if (this.listeners['pointerlock']) this.listeners['pointerlock'](this.pointerLocked);
    });

    this.domElement.addEventListener('click', () => {
      if (!this.pointerLocked && !window.__shotMode) {
        this.domElement.requestPointerLock();
      }
    });
  }

  on(event, cb) {
    this.listeners[event] = cb;
  }

  clearDelta() {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }
}
