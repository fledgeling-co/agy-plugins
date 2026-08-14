export const ESC = '\x1b[';

export class Ansi {
  // Cursor & Screen
  static clearScreen = `${ESC}2J${ESC}H`;
  static clearLine = `${ESC}2K\r`;
  static enterAltScreen = `${ESC}?1049h`;
  static exitAltScreen = `${ESC}?1049l`;
  static hideCursor = `${ESC}?25l`;
  static showCursor = `${ESC}?25h`;

  static moveTo(row, col) {
    return `${ESC}${row};${col}H`;
  }

  // Styles
  static reset = `${ESC}0m`;
  static bold = (s) => `${ESC}1m${s}${ESC}0m`;
  static dim = (s) => `${ESC}2m${s}${ESC}0m`;
  static italic = (s) => `${ESC}3m${s}${ESC}0m`;
  static underline = (s) => `${ESC}4m${s}${ESC}0m`;
  static inverse = (s) => `${ESC}7m${s}${ESC}0m`;

  // Basic Colors
  static black = (s) => `${ESC}30m${s}${ESC}0m`;
  static red = (s) => `${ESC}31m${s}${ESC}0m`;
  static green = (s) => `${ESC}32m${s}${ESC}0m`;
  static yellow = (s) => `${ESC}33m${s}${ESC}0m`;
  static blue = (s) => `${ESC}34m${s}${ESC}0m`;
  static magenta = (s) => `${ESC}35m${s}${ESC}0m`;
  static cyan = (s) => `${ESC}36m${s}${ESC}0m`;
  static white = (s) => `${ESC}37m${s}${ESC}0m`;

  // 24-bit TrueColor
  static rgb(r, g, b, s) {
    return `${ESC}38;2;${r};${g};${b}m${s}${ESC}0m`;
  }

  static bgRgb(r, g, b, s) {
    return `${ESC}48;2;${r};${g};${b}m${s}${ESC}0m`;
  }

  // Gemini Signature Palette
  static prism = {
    spark: (s) => Ansi.rgb(168, 85, 247, s),      // Purple
    blue: (s) => Ansi.rgb(66, 133, 244, s),       // Gemini Blue
    cyan: (s) => Ansi.rgb(6, 182, 212, s),        // Cyan
    emerald: (s) => Ansi.rgb(16, 185, 129, s),    // Emerald
    amber: (s) => Ansi.rgb(245, 158, 11, s),      // Amber
    rose: (s) => Ansi.rgb(244, 63, 94, s),        // Rose
    indigo: (s) => Ansi.rgb(129, 140, 248, s),    // Indigo
    cardBg: (s) => Ansi.bgRgb(21, 24, 36, s),
    cardHover: (s) => Ansi.bgRgb(32, 37, 59, s),
    textPrimary: (s) => Ansi.rgb(248, 250, 252, s),
    textSecondary: (s) => Ansi.rgb(148, 163, 184, s),
    textMuted: (s) => Ansi.rgb(100, 116, 139, s),
    textDim: (s) => Ansi.rgb(71, 85, 105, s),
  };

  // Box Drawing
  static box = {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    tDown: '┬',
    tUp: '┴',
    tRight: '├',
    tLeft: '┤',
    roundTopLeft: '╭',
    roundTopRight: '╮',
    roundBottomLeft: '╰',
    roundBottomRight: '╯',
  };

  static stripAnsi(str) {
    return String(str).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
  }

  static pad(str, length, char = ' ') {
    const visibleLength = this.stripAnsi(str).length;
    if (visibleLength >= length) return str;
    return str + char.repeat(length - visibleLength);
  }

  static truncate(str, maxLength, ellipsis = '…') {
    const visibleLength = this.stripAnsi(str).length;
    if (visibleLength <= maxLength) return str;
    return str.slice(0, maxLength - 1) + ellipsis;
  }
}
