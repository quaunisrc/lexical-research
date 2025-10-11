import type { EditorState } from './LexicalEditorState';
import {
  DOMConversionMap,
  DOMExportOutput,
  DOMExportOutputMap,
  LexicalNode,
  NodeKey,
} from './LexicalNode';
import { SharedNodeState } from './LexicalNodeState';

// https://github.com/microsoft/TypeScript/issues/3841
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KlassConstructor<Cls extends GenericConstructor<any>> =
  GenericConstructor<InstanceType<Cls>> & { [k in keyof Cls]: Cls[k] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericConstructor<T> = new (...args: any[]) => T;

export type Klass<T extends LexicalNode> =
  InstanceType<T['constructor']> extends T
    ? T['constructor']
    : GenericConstructor<T> & T['constructor'];

export type Transform<T extends LexicalNode> = (node: T) => void;

export type RegisteredNode = {
  klass: Klass<LexicalNode>;
  transforms: Set<Transform<LexicalNode>>;
  replace: null | ((node: LexicalNode) => LexicalNode);
  replaceWithKlass: null | Klass<LexicalNode>;
  exportDOM?: (
    editor: LexicalEditor,
    targetNode: LexicalNode,
  ) => DOMExportOutput;
  sharedNodeState: SharedNodeState;
};

export type RegisteredNodes = Map<string, RegisteredNode>;

export type LexicalNodeReplacement = {
  replace: Klass<LexicalNode>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  with: <T extends { new (...args: any): any }>(
    node: InstanceType<T>,
  ) => LexicalNode;
  withKlass?: Klass<LexicalNode>;
};

export type LexicalNodeConfig = Klass<LexicalNode> | LexicalNodeReplacement;

export type ErrorHandler = (error: Error) => void;

export type EditorThemeClassName = string;

export type TextNodeThemeClasses = {
  base?: EditorThemeClassName;
  bold?: EditorThemeClassName;
  code?: EditorThemeClassName;
  highlight?: EditorThemeClassName;
  italic?: EditorThemeClassName;
  lowercase?: EditorThemeClassName;
  uppercase?: EditorThemeClassName;
  capitalize?: EditorThemeClassName;
  strikethrough?: EditorThemeClassName;
  subscript?: EditorThemeClassName;
  superscript?: EditorThemeClassName;
  underline?: EditorThemeClassName;
  underlineStrikethrough?: EditorThemeClassName;
  [key: string]: EditorThemeClassName | undefined;
};

export type EditorThemeClasses = {
  blockCursor?: EditorThemeClassName;
  characterLimit?: EditorThemeClassName;
  code?: EditorThemeClassName;
  codeHighlight?: Record<string, EditorThemeClassName>;
  hashtag?: EditorThemeClassName;
  specialText?: EditorThemeClassName;
  heading?: {
    h1?: EditorThemeClassName;
    h2?: EditorThemeClassName;
    h3?: EditorThemeClassName;
    h4?: EditorThemeClassName;
    h5?: EditorThemeClassName;
    h6?: EditorThemeClassName;
  };
  hr?: EditorThemeClassName;
  hrSelected?: EditorThemeClassName;
  image?: EditorThemeClassName;
  link?: EditorThemeClassName;
  list?: {
    ul?: EditorThemeClassName;
    ulDepth?: Array<EditorThemeClassName>;
    ol?: EditorThemeClassName;
    olDepth?: Array<EditorThemeClassName>;
    checklist?: EditorThemeClassName;
    listitem?: EditorThemeClassName;
    listitemChecked?: EditorThemeClassName;
    listitemUnchecked?: EditorThemeClassName;
    nested?: {
      list?: EditorThemeClassName;
      listitem?: EditorThemeClassName;
    };
  };
  ltr?: EditorThemeClassName;
  mark?: EditorThemeClassName;
  markOverlap?: EditorThemeClassName;
  paragraph?: EditorThemeClassName;
  quote?: EditorThemeClassName;
  root?: EditorThemeClassName;
  rtl?: EditorThemeClassName;
  tab?: EditorThemeClassName;
  table?: EditorThemeClassName;
  tableAddColumns?: EditorThemeClassName;
  tableAddRows?: EditorThemeClassName;
  tableCellActionButton?: EditorThemeClassName;
  tableCellActionButtonContainer?: EditorThemeClassName;
  tableCellSelected?: EditorThemeClassName;
  tableCell?: EditorThemeClassName;
  tableCellHeader?: EditorThemeClassName;
  tableCellResizer?: EditorThemeClassName;
  tableRow?: EditorThemeClassName;
  tableScrollableWrapper?: EditorThemeClassName;
  tableSelected?: EditorThemeClassName;
  tableSelection?: EditorThemeClassName;
  text?: TextNodeThemeClasses;
  embedBlock?: {
    base?: EditorThemeClassName;
    focus?: EditorThemeClassName;
  };
  indent?: EditorThemeClassName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type HTMLConfig = {
  export?: DOMExportOutputMap;
  import?: DOMConversionMap;
};

export type CreateEditorArgs = {
  disableEvents?: boolean;
  editorState?: EditorState;
  namespace?: string;
  nodes?: ReadonlyArray<LexicalNodeConfig>;
  onError?: ErrorHandler;
  parentEditor?: LexicalEditor;
  editable?: boolean;
  theme?: EditorThemeClasses;
  html?: HTMLConfig;
};

type IntentionallyMarkedAsDirtyElement = boolean;

export class LexicalEditor {
  static version: string | undefined;

  /** @internal */
  _nodes: RegisteredNodes;
  /** @internal */
  _dirtyType: 0 | 1 | 2;
  /** @internal */
  _cloneNotNeeded: Set<NodeKey>;
  /** @internal */
  _dirtyLeaves: Set<NodeKey>;
  /** @internal */
  _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
}

export function createEditor(editorConfig?: CreateEditorArgs): LexicalEditor {
  const editor = new LexicalEditor();

  return editor;
}
