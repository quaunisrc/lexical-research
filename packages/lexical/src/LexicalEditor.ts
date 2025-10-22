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
import { FULL_RECONCILE, NO_DIRTY_NODES } from './LexicalConstants';
import { UpdateTag } from './LexicalUpdateTags';

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

export type EditorUpdateOptions = {
  /**
   * A function to run once the update is complete. See also {@link $onUpdate}.
   */
  onUpdate?: () => void;
  /**
   * Setting this to true will suppress all node
   * transforms for this update cycle.
   * Useful for synchronizing updates in some cases.
   */
  skipTransforms?: true;
  /**
   * A tag to identify this update, in an update listener, for instance.
   * See also {@link $addUpdateTag}.
   */
  tag?: UpdateTag | UpdateTag[];
  /**
   * If true, prevents this update from being batched, forcing it to
   * run synchronously.
   */
  discrete?: true;
  /** @internal */
  event?: undefined | UIEvent | Event | null;
};

export type DecoratorListener<T = never> = (
  decorator: Record<NodeKey, T>,
) => void;

export type NodeMutation = 'created' | 'updated' | 'destroyed';

export type MutationListener = (
  nodes: Map<NodeKey, NodeMutation>,
  payload: {
    updateTags: Set<string>;
    dirtyLeaves: Set<string>;
    prevEditorState: EditorState;
  },
) => void;

export type MutationListeners = Map<MutationListener, Set<Klass<LexicalNode>>>;

export type EditableListener = (editable: boolean) => void;

export type RootListener = (
  rootElement: null | HTMLElement,
  prevRootElement: null | HTMLElement,
) => void;

export type TextContentListener = (text: string) => void;

export type MutatedNodes = Map<Klass<LexicalNode>, Map<NodeKey, NodeMutation>>;

/**
 * The payload passed to an UpdateListener
 */
export interface UpdateListenerPayload {
  /**
   * A Map of NodeKeys of ElementNodes to a boolean that is true
   * if the node was intentionally mutated ('unintentional' mutations
   * are triggered when an indirect descendant is marked dirty)
   */
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  /**
   * A Set of NodeKeys of all nodes that were marked dirty that
   * do not inherit from ElementNode.
   */
  dirtyLeaves: Set<NodeKey>;
  /**
   * The new EditorState after all updates have been processed,
   * equivalent to `editor.getEditorState()`
   */
  editorState: EditorState;
  /**
   * The Map of LexicalNode constructors to a `Map<NodeKey, NodeMutation>`,
   * this is useful when you have a mutation listener type use cases that
   * should apply to all or most nodes. Will be null if no DOM was mutated,
   * such as when only the selection changed. Note that this will be empty
   * unless at least one MutationListener is explicitly registered
   * (any MutationListener is sufficient to compute the mutatedNodes Map
   * for all nodes).
   *
   * Added in v0.28.0
   */
  mutatedNodes: null | MutatedNodes;
  /**
   * For advanced use cases only.
   *
   * Tracks the keys of TextNode descendants that have been merged
   * with their siblings by normalization. Note that these keys may
   * not exist in either editorState or prevEditorState and generally
   * this is only used for conflict resolution edge cases in collab.
   */
  normalizedNodes: Set<NodeKey>;
  /**
   * The previous EditorState that is being discarded
   */
  prevEditorState: EditorState;
  /**
   * The set of tags added with update options or {@link $addUpdateTag},
   * node that this includes all tags that were processed in this
   * reconciliation which may have been added by separate updates.
   */
  tags: Set<string>;
}

export type UpdateListener = (payload: UpdateListenerPayload) => void;

export interface Listeners {
  decorator: Set<DecoratorListener<any>>;
  mutation: MutationListeners;
  editable: Set<EditableListener>;
  root: Set<RootListener>;
  textcontent: Set<TextContentListener>;
  update: Set<UpdateListener>;
}

// TODO: Check why TPayload is unused
export type LexicalCommand<TPayload> = {
  type?: string;
};

export type CommandListener<P> = (payload: P, editor: LexicalEditor) => boolean;

type Commands = Map<
  LexicalCommand<unknown>,
  Array<Set<CommandListener<unknown>>>
>;

export class LexicalEditor {
  static version: string | undefined;

  /** @internal */
  _headless: boolean;
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
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  /** @internal */
  _updates: Array<[() => void, EditorUpdateOptions | undefined]>;
  /** @internal */
  _updating: boolean;
  /** @internal */
  _listeners: Listeners;
  /** @internal */
  _commands: Commands;
  /** @internal */
  _nodes: RegisteredNodes;
  /** @internal */
  _decorators: Record<NodeKey, unknown>;
  /** @internal */
  _pendingDecorators: null | Record<NodeKey, unknown>;
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
  _normalizedNodes: Set<NodeKey>;
  /** @internal */
  _updateTags: Set<UpdateTag>;
  /** @internal */
  _observer: null | MutationObserver;
  /** @internal */
  _key: string;
  /** @internal */
  _onError: ErrorHandler;
  /** @internal */
  _htmlConversions: DOMConversionCache;
  /** @internal */
  _window: null | Window;
  /** @internal */
  _editable: boolean;
  /** @internal */
  _blockCursorElement: null | HTMLDivElement;
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
    // Used during reconciliation
    this._keyToDOMMap = new Map();
    this._updates = [];
    this._updating = false;
    // Listeners
    this._listeners = {
      decorator: new Set(),
      editable: new Set(),
      mutation: new Map(),
      root: new Set(),
      textcontent: new Set(),
      update: new Set(),
    };
    // Commands
    this._commands = new Map();
    // Editor configuration for theme/context.
    this._config = config;
    // Mapping of types to their nodes
    this._nodes = nodes;
    // React node decorators for portals
    this._decorators = {};
    this._pendingDecorators = null;
    // Used to optimize reconciliation
    this._dirtyType = NO_DIRTY_NODES;
    this._cloneNotNeeded = new Set();
    this._dirtyLeaves = new Set();
    this._dirtyElements = new Map();
    this._normalizedNodes = new Set();
    this._updateTags = new Set();
    // Handling of DOM mutations
    this._observer = null;
    // Used for identifying owning editors
    this._key = createUID();

    this._onError = onError;
    this._htmlConversions = htmlConversions;
    this._editable = editable;
    this._headless = parentEditor !== null && parentEditor._headless;
    this._window = null;
    this._blockCursorElement = null;
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
