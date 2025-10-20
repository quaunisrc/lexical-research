import {
  DETAIL_TYPE_TO_DETAIL,
  TEXT_MODE_TO_TYPE,
  TEXT_TYPE_TO_FORMAT,
} from '../LexicalConstants';
import { KlassConstructor, Spread } from '../LexicalEditor';
import {
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
} from '../LexicalNode';
import { $applyNodeReplacement } from '../LexicalUtils';

export type SerializedTextNode = Spread<
  {
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
  },
  SerializedLexicalNode
>;

export type TextModeType = 'normal' | 'token' | 'segmented';

export type TextFormatType =
  | 'bold'
  | 'underline'
  | 'strikethrough'
  | 'italic'
  | 'highlight'
  | 'code'
  | 'subscript'
  | 'superscript'
  | 'lowercase'
  | 'uppercase'
  | 'capitalize';

export type TextDetailType = 'directionless' | 'unmergable';

/** @noInheritDoc */
export class TextNode extends LexicalNode {
  /** @internal */
  declare ['constructor']: KlassConstructor<typeof TextNode>;
  __text: string;
  /** @internal */
  __format: number;
  /** @internal */
  __style: string;
  /** @internal */
  __mode: 0 | 1 | 2 | 3;
  /** @internal */
  __detail: number;

  static getType(): string {
    return 'text';
  }

  static clone(node: TextNode): TextNode {
    return new TextNode(node.__text, node.__key);
  }

  static importJSON(serializedNode: SerializedTextNode): TextNode {
    return $createTextNode().updateFromJSON(serializedNode);
  }

  constructor(text: string = '', key?: NodeKey) {
    super(key);
    this.__text = text;
    this.__format = 0;
    this.__style = '';
    this.__mode = 0;
    this.__detail = 0;
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedTextNode>): this {
    return super
      .updateFromJSON(serializedNode)
      .setTextContent(serializedNode.text)
      .setFormat(serializedNode.format)
      .setDetail(serializedNode.detail)
      .setMode(serializedNode.mode)
      .setStyle(serializedNode.style);
  }

  setTextContent(text: string): this {
    if (this.__text === text) {
      return this;
    }
    const self = this.getWritable();
    self.__text = text;
    return self;
  }

  setFormat(format: TextFormatType | number): this {
    const self = this.getWritable();
    self.__format =
      typeof format === 'string' ? TEXT_TYPE_TO_FORMAT[format] : format;
    return self;
  }

  setDetail(detail: TextDetailType | number): this {
    const self = this.getWritable();
    self.__detail =
      typeof detail === 'string' ? DETAIL_TYPE_TO_DETAIL[detail] : detail;
    return self;
  }

  setMode(type: TextModeType): this {
    const mode = TEXT_MODE_TO_TYPE[type];
    if (this.__mode === mode) {
      return this;
    }
    const self = this.getWritable();
    self.__mode = mode;
    return self;
  }

  setStyle(style: string): this {
    const self = this.getWritable();
    self.__style = style;
    return self;
  }
}

export function $createTextNode(text = ''): TextNode {
  return $applyNodeReplacement(new TextNode(text));
}
