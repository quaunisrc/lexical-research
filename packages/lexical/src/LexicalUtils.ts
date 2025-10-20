import type { Klass, RegisteredNode } from './LexicalEditor';
import {
  $isEphemeral,
  LexicalNode,
  NodeKey,
  NodeMap,
  StaticNodeConfigValue,
} from './LexicalNode';
import { HAS_DIRTY_NODES, PROTOTYPE_CONFIG_METHOD } from './LexicalConstants';
import { LexicalEditor } from './LexicalEditor';
import invariant from 'shared/invariant';
import { DecoratorNode } from './nodes/LexicalDecoratorNode';
import { $isElementNode, ElementNode } from './nodes/LexicalElementNode';
import { TextNode } from './nodes/LexicalTextNode';
import { EditorState } from './LexicalEditorState';
import {
  errorOnInfiniteTransforms,
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  internalGetActiveEditorState,
} from './LexicalUpdates';
import { RootNode } from './nodes/LexicalRootNode';

let pendingNodeToClone: null | LexicalNode = null;
export function setPendingNodeToClone(pendingNode: null | LexicalNode): void {
  pendingNodeToClone = pendingNode;
}
export function getPendingNodeToClone(): null | LexicalNode {
  const node = pendingNodeToClone;
  pendingNodeToClone = null;
  return node;
}

let keyCounter = 1;

export function generateRandomKey(): string {
  return '' + keyCounter++;
}

/** @internal */
export function getEditorPropertyFromDOMNode(node: Node | null): unknown {
  // @ts-expect-error: internal field
  return node ? node.__lexicalEditor : null;
}

/**
 * @returns true if the given argument is a LexicalEditor instance from this build of Lexical
 */
export function isLexicalEditor(editor: unknown): editor is LexicalEditor {
  // Check instanceof to prevent issues with multiple embedded Lexical installations
  return editor instanceof LexicalEditor;
}

/** @internal */
function isAbstractNodeClass(klass: Klass<LexicalNode>): boolean {
  if (!(klass === LexicalNode || klass.prototype instanceof LexicalNode)) {
    let ownNodeType = '<unknown>';
    let version = '<unknown>';
    try {
      ownNodeType = klass.getType();
    } catch (_err) {
      // ignore
    }
    try {
      if (LexicalEditor.version) {
        version = JSON.parse(LexicalEditor.version);
      }
    } catch (_err) {
      // ignore
    }
    invariant(
      false,
      '%s (type %s) does not subclass LexicalNode from the lexical package used by this editor (version %s). All lexical and @lexical/* packages used by an editor must have identical versions. If you suspect the version does match, then the problem may be caused by multiple copies of the same lexical module (e.g. both esm and cjs, or included directly in multiple entrypoints).',
      klass.name,
      ownNodeType,
      version,
    );
  }
  return (
    klass === DecoratorNode || klass === ElementNode || klass === LexicalNode
  );
}

/**
 * @internal
 *
 * Object.hasOwn ponyfill
 */
function hasOwn(o: object, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

/**
 * @internal
 */
export function hasOwnStaticMethod(
  klass: Klass<LexicalNode>,
  k: keyof Klass<LexicalNode>,
): boolean {
  return hasOwn(klass, k) && klass[k] !== LexicalNode[k];
}

export function getStaticNodeConfig(klass: Klass<LexicalNode>): {
  ownNodeType: undefined | string;
  ownNodeConfig: undefined | StaticNodeConfigValue<LexicalNode, string>;
} {
  const nodeConfigRecord =
    PROTOTYPE_CONFIG_METHOD in klass.prototype
      ? klass.prototype[PROTOTYPE_CONFIG_METHOD]()
      : undefined;
  const isAbstract = isAbstractNodeClass(klass);
  const nodeType =
    !isAbstract && hasOwnStaticMethod(klass, 'getType')
      ? klass.getType()
      : undefined;
  let ownNodeConfig: undefined | StaticNodeConfigValue<LexicalNode, string>;
  let ownNodeType = nodeType;
  if (nodeConfigRecord) {
    if (nodeType) {
      ownNodeConfig = nodeConfigRecord[nodeType];
    } else {
      for (const [k, v] of Object.entries(nodeConfigRecord)) {
        ownNodeType = k;
        ownNodeConfig = v;
      }
    }
  }

  if (!isAbstract && ownNodeType) {
    if (!hasOwnStaticMethod(klass, 'getType')) {
      klass.getType = () => ownNodeType;
    }
    if (!hasOwnStaticMethod(klass, 'clone')) {
      // TextNode.length > 0 will only be true if the compiler output
      // is not ES6 compliant, in which case we can not provide this
      // warning
      if (__DEV__ && TextNode.length === 0) {
        invariant(
          klass.length === 0,
          '%s (type %s) must implement a static clone method since its constructor has %s required arguments (expecting 0). Use an explicit default in the first argument of your constructor(prop: T=X, nodeKey?: NodeKey).',
          klass.name,
          ownNodeType,
          String(klass.length),
        );
      }
      klass.clone = (prevNode: LexicalNode) => {
        setPendingNodeToClone(prevNode);
        return new klass();
      };
    }
    if (!hasOwnStaticMethod(klass, 'importJSON')) {
      if (__DEV__ && TextNode.length === 0) {
        invariant(
          klass.length === 0,
          '%s (type %s) must implement a static importJSON method since its constructor has %s required arguments (expecting 0). Use an explicit default in the first argument of your constructor(prop: T=X, nodeKey?: NodeKey).',
          klass.name,
          ownNodeType,
          String(klass.length),
        );
      }
      klass.importJSON =
        (ownNodeConfig && ownNodeConfig.$importJSON) ||
        ((serializedNode) => new klass().updateFromJSON(serializedNode));
    }
    if (!hasOwnStaticMethod(klass, 'importDOM') && ownNodeConfig) {
      const { importDOM } = ownNodeConfig;
      if (importDOM) {
        klass.importDOM = () => importDOM;
      }
    }
  }
  return { ownNodeConfig, ownNodeType };
}

export function $getNodeByKey<T extends LexicalNode>(
  key: NodeKey,
  _editorState?: EditorState,
): T | null {
  const editorState = _editorState || getActiveEditorState();
  const node = editorState._nodeMap.get(key) as T;
  if (node === undefined) {
    return null;
  }
  return node;
}

type IntentionallyMarkedAsDirtyElement = boolean;

function internalMarkParentElementsAsDirty(
  parentKey: NodeKey,
  nodeMap: NodeMap,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): void {
  let nextParentKey: string | null = parentKey;
  while (nextParentKey !== null) {
    if (dirtyElements.has(nextParentKey)) {
      return;
    }
    const node = nodeMap.get(nextParentKey);
    if (node === undefined) {
      break;
    }
    dirtyElements.set(nextParentKey, false);
    nextParentKey = node.__parent;
  }
}

// Never use this function directly! It will break
// the cloning heuristic. Instead use node.getWritable().
export function internalMarkNodeAsDirty(node: LexicalNode): void {
  errorOnInfiniteTransforms();
  invariant(
    !$isEphemeral(node),
    'internalMarkNodeAsDirty: Ephemeral nodes must not be marked as dirty (key %s type %s)',
    node.__key,
    node.__type,
  );
  const latest = node.getLatest();
  const parent = latest.__parent;
  const editorState = getActiveEditorState();
  const editor = getActiveEditor();
  const nodeMap = editorState._nodeMap;
  const dirtyElements = editor._dirtyElements;
  if (parent !== null) {
    internalMarkParentElementsAsDirty(parent, nodeMap, dirtyElements);
  }
  const key = latest.__key;
  editor._dirtyType = HAS_DIRTY_NODES;
  if ($isElementNode(node)) {
    dirtyElements.set(key, true);
  } else {
    editor._dirtyLeaves.add(key);
  }
}

/**
 * Returns a clone of a node using `node.constructor.clone()` followed by
 * `clone.afterCloneFrom(node)`. The resulting clone must have the same key,
 * parent/next/prev pointers, and other properties that are not set by
 * `node.constructor.clone` (format, style, etc.). This is primarily used by
 * {@link LexicalNode.getWritable} to create a writable version of an
 * existing node. The clone is the same logical node as the original node,
 * do not try and use this function to duplicate or copy an existing node.
 *
 * Does not mutate the EditorState.
 * @param latestNode - The node to be cloned.
 * @returns The clone of the node.
 */
export function $cloneWithProperties<T extends LexicalNode>(latestNode: T): T {
  const constructor = latestNode.constructor;
  const mutableNode = constructor.clone(latestNode) as T;
  mutableNode.afterCloneFrom(latestNode);
  if (__DEV__) {
    invariant(
      mutableNode.__key === latestNode.__key,
      "$cloneWithProperties: %s.clone(node) (with type '%s') did not return a node with the same key, make sure to specify node.__key as the last argument to the constructor",
      constructor.name,
      constructor.getType(),
    );
    invariant(
      mutableNode.__parent === latestNode.__parent &&
        mutableNode.__next === latestNode.__next &&
        mutableNode.__prev === latestNode.__prev,
      "$cloneWithProperties: %s.clone(node) (with type '%s') overrode afterCloneFrom but did not call super.afterCloneFrom(prevNode)",
      constructor.name,
      constructor.getType(),
    );
  }
  return mutableNode;
}

/**
 * Utility function for accessing current active editor instance.
 * @returns Current active editor
 */
export function $getEditor(): LexicalEditor {
  return getActiveEditor();
}

/**
 * @internal
 */
export function getRegisteredNode(
  editor: LexicalEditor,
  nodeType: string,
): undefined | RegisteredNode {
  return editor._nodes.get(nodeType);
}

/**
 * @internal
 */
export function getRegisteredNodeOrThrow(
  editor: LexicalEditor,
  nodeType: string,
): RegisteredNode {
  const registeredNode = getRegisteredNode(editor, nodeType);
  if (registeredNode === undefined) {
    invariant(false, 'registeredNode: Type %s not found', nodeType);
  }
  return registeredNode;
}

function errorOnNodeKeyConstructorMismatch(
  node: LexicalNode,
  existingKey: NodeKey,
  pendingNode: null | LexicalNode,
) {
  const editorState = internalGetActiveEditorState();
  if (!editorState) {
    // tests expect to be able to do this kind of clone without an active editor state
    return;
  }
  const existingNode = editorState._nodeMap.get(existingKey);
  if (pendingNode) {
    invariant(
      existingKey === pendingNode.__key,
      'Lexical node with constructor %s (type %s) has an incorrect clone implementation, got %s for nodeKey when expecting %s',
      node.constructor.name,
      node.getType(),
      String(existingKey),
      pendingNode.__key,
    );
  }
  if (existingNode && existingNode.constructor !== node.constructor) {
    // Lifted condition to if statement because the inverted logic is a bit confusing
    if (node.constructor.name !== existingNode.constructor.name) {
      invariant(
        false,
        'Lexical node with constructor %s attempted to re-use key from node in active editor state with constructor %s. Keys must not be re-used when the type is changed.',
        node.constructor.name,
        existingNode.constructor.name,
      );
    } else {
      invariant(
        false,
        'Lexical node with constructor %s attempted to re-use key from node in active editor state with different constructor with the same name (possibly due to invalid Hot Module Replacement). Keys must not be re-used when the type is changed.',
        node.constructor.name,
      );
    }
  }
}

export function $setNodeKey(
  node: LexicalNode,
  existingKey: NodeKey | null | undefined,
): void {
  const pendingNode = getPendingNodeToClone();
  existingKey = existingKey || (pendingNode && pendingNode.__key);
  if (existingKey != null) {
    if (__DEV__) {
      errorOnNodeKeyConstructorMismatch(node, existingKey, pendingNode);
    }
    node.__key = existingKey;
    return;
  }
  errorOnReadOnly();
  errorOnInfiniteTransforms();
  const editor = getActiveEditor();
  const editorState = getActiveEditorState();
  const key = generateRandomKey();
  editorState._nodeMap.set(key, node);
  // TODO Split this function into leaf/element
  if ($isElementNode(node)) {
    editor._dirtyElements.set(key, true);
  } else {
    editor._dirtyLeaves.add(key);
  }
  editor._cloneNotNeeded.add(key);
  editor._dirtyType = HAS_DIRTY_NODES;
  node.__key = key;
}

export function internalGetRoot(editorState: EditorState): RootNode {
  return editorState._nodeMap.get('root') as RootNode;
}

export function $getRoot(): RootNode {
  return internalGetRoot(getActiveEditorState());
}

export function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substring(0, 5);
}
