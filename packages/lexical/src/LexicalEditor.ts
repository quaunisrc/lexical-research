import invariant from 'shared/invariant';
import { createEmptyEditorState, type EditorState } from './LexicalEditorState';
import {
  DOMConversion,
  DOMConversionMap,
  DOMExportOutput,
  DOMExportOutputMap,
  LexicalNode,
  NodeKey,
} from './LexicalNode';
import { createSharedNodeState, SharedNodeState } from './LexicalNodeState';
import { internalGetActiveEditor } from './LexicalUpdates';
import {
  createUID,
  getStaticNodeConfig,
  hasOwnExportDOM,
  hasOwnStaticMethod,
} from './LexicalUtils';
import { ArtificialNode__DO_NOT_USE } from './nodes/ArtificialNode';
import { LineBreakNode } from './nodes/LexicalLineBreakNode';
import { ParagraphNode } from './nodes/LexicalParagraphNode';
import { RootNode } from './nodes/LexicalRootNode';
import { TabNode } from './nodes/LexicalTabNode';
import { TextNode } from './nodes/LexicalTextNode';
import { FULL_RECONCILE } from './LexicalConstants';

export type Spread<T1, T2> = Omit<T2, keyof T1> & T1;

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

export type EditorConfig = {
  disableEvents?: boolean;
  namespace: string;
  theme: EditorThemeClasses;
};

export class LexicalEditor {
  static version: string | undefined;

  /** @internal */
  _parentEditor: null | LexicalEditor;
  /** @internal */
  _rootElement: null | HTMLElement;
  /** @internal */
  _editorState: EditorState;
  /** @internal */
  _pendingEditorState: null | EditorState;
  /** @internal */
  _compositionKey: null | NodeKey;
  /** @internal */
  _deferred: Array<() => void>;
  /** @internal */
  _nodes: RegisteredNodes;
  /** @internal */
  _config: EditorConfig;
  /** @internal */
  _dirtyType: 0 | 1 | 2;
  /** @internal */
  _cloneNotNeeded: Set<NodeKey>;
  /** @internal */
  _dirtyLeaves: Set<NodeKey>;
  /** @internal */
  _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  /** @internal */
  _createEditorArgs?: undefined | CreateEditorArgs;

  /** @internal */
  constructor(
    editorState: EditorState,
    parentEditor: null | LexicalEditor,
    nodes: RegisteredNodes,
    config: EditorConfig,
    onError: ErrorHandler,
    htmlConversions: DOMConversionCache,
    editable: boolean,
    createEditorArgs?: CreateEditorArgs,
  ) {
    this._createEditorArgs = createEditorArgs;
    this._parentEditor = parentEditor;
    // The root element associated with this editor
    this._rootElement = null;
    // The current editor state
    this._editorState = editorState;
    // Handling of drafts and updates
    this._pendingEditorState = null;
    // Used to help co-ordinate selection and events
    this._compositionKey = null;
    this._deferred = [];
    // TODO: Continue here
  }
}

type DOMConversionCache = Map<
  string,
  Array<(node: Node) => DOMConversion | null>
>;

function initializeConversionCache(
  nodes: RegisteredNodes,
  additionalConversions?: DOMConversionMap,
): DOMConversionCache {
  const conversionCache = new Map();
  const handledConversions = new Set();
  const addConversionsToCache = (map: DOMConversionMap) => {
    Object.keys(map).forEach((key) => {
      let currentCache = conversionCache.get(key);

      if (currentCache === undefined) {
        currentCache = [];
        conversionCache.set(key, currentCache);
      }

      currentCache.push(map[key]);
    });
  };
  nodes.forEach((node) => {
    const importDOM = node.klass.importDOM;

    if (importDOM == null || handledConversions.has(importDOM)) {
      return;
    }

    handledConversions.add(importDOM);
    const map = importDOM.call(node.klass);

    if (map !== null) {
      addConversionsToCache(map);
    }
  });
  if (additionalConversions) {
    addConversionsToCache(additionalConversions);
  }
  return conversionCache;
}

export function createEditor(editorConfig?: CreateEditorArgs): LexicalEditor {
  const config = editorConfig || {};
  const activeEditor = internalGetActiveEditor();
  const theme = config.theme || {};
  const parentEditor =
    editorConfig === undefined ? activeEditor : config.parentEditor || null;
  const disableEvents = config.disableEvents || false;
  const editorState = createEmptyEditorState();
  const namespace =
    config.namespace ||
    (parentEditor !== null ? parentEditor._config.namespace : createUID());
  const initialEditorState = config.editorState;
  const nodes = [
    RootNode,
    TextNode,
    LineBreakNode,
    TabNode,
    ParagraphNode,
    ArtificialNode__DO_NOT_USE,
    ...(config.nodes || []),
  ];

  const { onError, html } = config;
  const isEditable = config.editable !== undefined ? config.editable : true;
  let registeredNodes: RegisteredNodes;

  if (editorConfig === undefined && activeEditor !== null) {
    registeredNodes = activeEditor._nodes;
  } else {
    registeredNodes = new Map();
    for (let i = 0; i < nodes.length; i++) {
      let klass = nodes[i];
      let replace: RegisteredNode['replace'] = null;
      let replaceWithKlass: RegisteredNode['replaceWithKlass'] = null;

      if (typeof klass !== 'function') {
        const options = klass;
        klass = options.replace;
        replace = options.with;
        replaceWithKlass = options.withKlass || null;
      }
      const { ownNodeConfig } = getStaticNodeConfig(klass);
      // Ensure custom nodes implement required methods and replaceWithKlass is instance of base klass.
      if (__DEV__) {
        // ArtificialNode__DO_NOT_USE can get renamed, so we use the type
        const name = klass.name;
        const nodeType =
          hasOwnStaticMethod(klass, 'getType') && klass.getType();

        if (replaceWithKlass) {
          invariant(
            replaceWithKlass.prototype instanceof klass,
            "%s doesn't extend the %s",
            replaceWithKlass.name,
            name,
          );
        } else if (replace) {
          console.warn(
            `Override for ${name} specifies 'replace' without 'withKlass'. 'withKlass' will be required in a future version.`,
          );
        }
        if (
          name !== 'RootNode' &&
          nodeType !== 'root' &&
          nodeType !== 'artificial' &&
          // This is mostly for the unit test suite which
          // uses LexicalNode in an otherwise incorrect way
          // by mocking its static getType
          klass !== LexicalNode
        ) {
          (['getType', 'clone'] as const).forEach((method) => {
            if (!hasOwnStaticMethod(klass, method)) {
              console.warn(`${name} must implement static "${method}" method`);
            }
          });
          if (
            !hasOwnStaticMethod(klass, 'importDOM') &&
            hasOwnExportDOM(klass)
          ) {
            console.warn(
              `${name} should implement "importDOM" if using a custom "exportDOM" method to ensure HTML serialization (important for copy & paste) works as expected`,
            );
          }
          if (!hasOwnStaticMethod(klass, 'importJSON')) {
            console.warn(
              `${name} should implement "importJSON" method to ensure JSON and default HTML serialization works as expected`,
            );
          }
        }
      }
      const type = klass.getType();
      const transform = klass.transform();
      const transforms = new Set<Transform<LexicalNode>>();
      if (ownNodeConfig && ownNodeConfig.$transform) {
        transforms.add(ownNodeConfig.$transform);
      }
      if (transform !== null) {
        transforms.add(transform);
      }
      registeredNodes.set(type, {
        exportDOM: html && html.export ? html.export.get(klass) : undefined,
        klass,
        replace,
        replaceWithKlass,
        sharedNodeState: createSharedNodeState(nodes[i]),
        transforms,
      });
    }
  }

  const editor = new LexicalEditor(
    editorState,
    parentEditor,
    registeredNodes,
    {
      disableEvents,
      namespace,
      theme,
    },
    onError ? onError : console.error,
    initializeConversionCache(registeredNodes, html ? html.import : undefined),
    isEditable,
    editorConfig,
  );

  if (initialEditorState !== undefined) {
    editor._pendingEditorState = initialEditorState;
    editor._dirtyType = FULL_RECONCILE;
  }

  return editor;
}
