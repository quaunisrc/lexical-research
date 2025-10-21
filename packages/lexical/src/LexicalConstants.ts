import {
  TextDetailType,
  TextFormatType,
  TextModeType,
} from './nodes/LexicalTextNode';

// Text node formatting
export const IS_BOLD = 1;
export const IS_ITALIC = 1 << 1;
export const IS_STRIKETHROUGH = 1 << 2;
export const IS_UNDERLINE = 1 << 3;
export const IS_CODE = 1 << 4;
export const IS_SUBSCRIPT = 1 << 5;
export const IS_SUPERSCRIPT = 1 << 6;
export const IS_HIGHLIGHT = 1 << 7;
export const IS_LOWERCASE = 1 << 8;
export const IS_UPPERCASE = 1 << 9;
export const IS_CAPITALIZE = 1 << 10;

export const TEXT_TYPE_TO_FORMAT: Record<TextFormatType | string, number> = {
  bold: IS_BOLD,
  capitalize: IS_CAPITALIZE,
  code: IS_CODE,
  highlight: IS_HIGHLIGHT,
  italic: IS_ITALIC,
  lowercase: IS_LOWERCASE,
  strikethrough: IS_STRIKETHROUGH,
  subscript: IS_SUBSCRIPT,
  superscript: IS_SUPERSCRIPT,
  underline: IS_UNDERLINE,
  uppercase: IS_UPPERCASE,
};

// Text node details
export const IS_DIRECTIONLESS = 1;
export const IS_UNMERGEABLE = 1 << 1;

export const DETAIL_TYPE_TO_DETAIL: Record<TextDetailType | string, number> = {
  directionless: IS_DIRECTIONLESS,
  unmergeable: IS_UNMERGEABLE,
};

// Text node modes
export const IS_NORMAL = 0;
export const IS_TOKEN = 1;
export const IS_SEGMENTED = 2;

export const TEXT_MODE_TO_TYPE: Record<TextModeType, 0 | 1 | 2> = {
  normal: IS_NORMAL,
  segmented: IS_SEGMENTED,
  token: IS_TOKEN,
};

// Reconciling
export const NO_DIRTY_NODES = 0;
export const HAS_DIRTY_NODES = 1;
export const FULL_RECONCILE = 2;

export const NODE_STATE_KEY = '$';
export const PROTOTYPE_CONFIG_METHOD = '$config';
