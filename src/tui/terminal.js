import { Ansi } from './ansi.js';

export class Terminal {
  static isRaw = false;
  static keyHandlers = [];

  static get width() {
    return process.stdout.columns || 100;
  }

  static get height() {
    return process.stdout.rows || 30;
  }

  static start() {
    if (this.isRaw) return;

    process.stdout.write(Ansi.enterAltScreen + Ansi.hideCursor + Ansi.clearScreen);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', this.handleInput.bind(this));
    }

    this.isRaw = true;

    process.on('SIGINT', () => this.stopAndExit(0));
    process.on('SIGTERM', () => this.stopAndExit(0));
  }

  static stop() {
    if (!this.isRaw) return;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('data');
    }

    process.stdout.write(Ansi.showCursor + Ansi.exitAltScreen);
    this.isRaw = false;
  }

  static stopAndExit(code = 0) {
    this.stop();
    process.exit(code);
  }

  static onKey(handler) {
    this.keyHandlers.push(handler);
    return () => {
      this.keyHandlers = this.keyHandlers.filter(h => h !== handler);
    };
  }

  static handleInput(chunk) {
    const key = this.parseKeySequence(chunk);

    if (key.ctrl && key.name === 'c') {
      this.stopAndExit(0);
      return;
    }

    for (const handler of this.keyHandlers) {
      handler(key);
    }
  }

  static parseKeySequence(str) {
    const key = {
      name: '',
      ctrl: false,
      meta: false,
      shift: false,
      char: str,
      sequence: str,
    };

    if (str === '\r' || str === '\n') {
      key.name = 'enter';
    } else if (str === '\t') {
      key.name = 'tab';
    } else if (str === '\x7f' || str === '\x08') {
      key.name = 'backspace';
    } else if (str === '\x1b') {
      key.name = 'escape';
    } else if (str === ' ') {
      key.name = 'space';
    } else if (str.startsWith('\x1b[')) {
      const code = str.slice(2);
      if (code === 'A') key.name = 'up';
      else if (code === 'B') key.name = 'down';
      else if (code === 'C') key.name = 'right';
      else if (code === 'D') key.name = 'left';
      else if (code === 'H' || code === '1~') key.name = 'home';
      else if (code === 'F' || code === '4~') key.name = 'end';
      else if (code === '5~') key.name = 'pageup';
      else if (code === '6~') key.name = 'pagedown';
      else if (code === '3~') key.name = 'delete';
      else if (code === 'Z') {
        key.name = 'tab';
        key.shift = true;
      }
    } else if (str.length === 1 && str.charCodeAt(0) <= 26) {
      key.ctrl = true;
      key.name = String.fromCharCode(str.charCodeAt(0) + 96);
    } else if (str.length === 1) {
      key.name = str;
      key.char = str;
    }

    return key;
  }
}
