import { NODE_STATE_KEY } from './LexicalConstants';
import { Klass, KlassConstructor, LexicalEditor } from './LexicalEditor';
import invariant from 'shared/invariant';
import {
  $updateStateFromJSON,
  NodeState,
  RequiredNodeStateConfig,
} from './LexicalNodeState';
import {
  $cloneWithProperties,
  $getNodeByKey,
  $setNodeKey,
  getRegisteredNode,
  getStaticNodeConfig,
  internalMarkNodeAsDirty,
} from './LexicalUtils';
import {
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
} from './LexicalUpdates';
import { $getSelection } from './LexicalSelection';

export type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null | undefined;

export type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
  forChild?: DOMChildConversion;
  node: null | LexicalNode | Array<LexicalNode>;
};

export type DOMConversionFn<T extends HTMLElement = HTMLElement> = (
  element: T,
) => DOMConversionOutput | null;

export type DOMConversion<T extends HTMLElement = HTMLElement> = {
  conversion: DOMConversionFn<T>;
  priority?: 0 | 1 | 2 | 3 | 4;
};

export type DOMConversionProp<T extends HTMLElement> = (
  node: T,
) => DOMConversion<T> | null;

type NodeName = string;

export type DOMConversionMap<T extends HTMLElement = HTMLElement> = Record<
  NodeName,
  DOMConversionProp<T>
>;

export type DOMExportOutput = {
  after?: (
    generatedElement: HTMLElement | DocumentFragment | Text | null | undefined,
  ) => HTMLElement | DocumentFragment | Text | null | undefined;
  element: HTMLElement | DocumentFragment | Text | null;
};

export type DOMExportOutputMap = Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>;

export type NodeKey = string;

export type NodeMap = Map<NodeKey, LexicalNode>;

/**
 * The base type for all serialized nodes
 */
export type SerializedLexicalNode = {
  /** The type string used by the Node class */
  type: string;
  /** A numeric version for this schema, defaulting to 1, but not generally recommended for use */
  version: number;
  /**
   * Any state persisted with the NodeState API that is not
   * configured for flat storage
   */
  [NODE_STATE_KEY]?: Record<string, unknown>;
};

/**
 * EXPERIMENTAL
 * The configuration of a node returned by LexicalNode.$config()
 *
 * @example
 * ```ts
 * class CustomText extends TextNode {
 *   $config() {
 *     return this.config('custom-text', {extends: TextNode}};
 *   }
 * }
 * ```
 */
export interface StaticNodeConfigValue<
  T extends LexicalNode,
  Type extends string,
> {
  /**
   * The exact type of T.getType(), e.g. 'text' - the method itself must
   * have a more generic 'string' type to be compatible wtih subclassing.
   */
  readonly type?: Type;
  /**
   * An alternative to the internal static transform() method
   * that provides better type inference.
   */
  readonly $transform?: (node: T) => void;
  /**
   * An alternative to the static importJSON() method
   * that provides better type inference.
   */
  readonly $importJSON?: (serializedNode: SerializedLexicalNode) => T;
  /**
   * An alternative to the static importDOM() method
   */
  readonly importDOM?: DOMConversionMap;
  /**
   * EXPERIMENTAL
   *
   * An array of RequiredNodeStateConfig to initialize your node with
   * its state requirements. This may be used to configure serialization of
   * that state.
   *
   * This function will be called (at most) once per editor initialization,
   * directly on your node's prototype. It must not depend on any state
   * initialized in the constructor.
   *
   * @example
   * ```ts
   * const flatState = createState("flat", {parse: parseNumber});
   * const nestedState = createState("nested", {parse: parseNumber});
   * class MyNode extends TextNode {
   *   $config() {
   *     return this.config(
   *       'my-node',
   *       {
   *         extends: TextNode,
   *         stateConfigs: [
   *           { stateConfig: flatState, flat: true},
   *           nestedState,
   *         ]
   *       },
   *     );
   *   }
   * }
   * ```
   */
  readonly stateConfigs?: readonly RequiredNodeStateConfig[];
  /**
   * If specified, this must be the exact superclass of the node. It is not
   * checked at compile time and it is provided automatically at runtime.
   *
   * You would want to specify this when you are extending a node that
   * has non-trivial configuration in its $config such
   * as required state. If you do not specify this, the inferred
   * types for your node class might be missing some of that.
   */
  readonly extends?: Klass<LexicalNode>;
}

/**
 * This is the type of LexicalNode.$config() that can be
 * overridden by subclasses.
 */
export type BaseStaticNodeConfig = {
  readonly [K in string]?: StaticNodeConfigValue<LexicalNode, string>;
};

/**
 * Any StaticNodeConfigValue (for generics and collections)
 */
export type AnyStaticNodeConfigValue = StaticNodeConfigValue<any, any>;

/**
 * @internal
 *
 * This is the more specific type than BaseStaticNodeConfig that a subclass
 * should return from $config()
 */
export type StaticNodeConfigRecord<
  Type extends string,
  Config extends AnyStaticNodeConfigValue,
> = BaseStaticNodeConfig & {
  readonly [K in Type]?: Config;
};

/**
 * Omit the children, type, and version properties from the given SerializedLexicalNode definition.
 */
export type LexicalUpdateJSON<T extends SerializedLexicalNode> = Omit<
  T,
  'children' | 'type' | 'version'
>;

const EPHEMERAL = Symbol.for('ephemeral');

/**
 * @internal
 * @param node any LexicalNode
 * @returns true if the node was created with {@link $cloneWithPropertiesEphemeral}
 */
export function $isEphemeral(
  node: LexicalNode & { readonly [EPHEMERAL]?: boolean },
): boolean {
  return node[EPHEMERAL] || false;
}

function errorOnTypeKlassMismatch(
  type: string,
  klass: Klass<LexicalNode>,
): void {
  const registeredNode = getRegisteredNode(getActiveEditor(), type);
  // Common error - split in its own invariant
  if (registeredNode === undefined) {
    invariant(
      false,
      'Create node: Attempted to create node %s that was not configured to be used on the editor.',
      klass.name,
    );
  }
  const editorKlass = registeredNode.klass;
  if (editorKlass !== klass) {
    invariant(
      false,
      'Create node: Type %s in node %s does not match registered node %s with the same type',
      type,
      klass.name,
      editorKlass.name,
    );
  }
}

// This is an abstract class
export class LexicalNode {
  /** @internal Allow us to look up the type including static props */
  declare ['constructor']: KlassConstructor<typeof LexicalNode>;
  /** @internal */
  __type: string;
  /** @internal */
  //@ts-ignore We set the key in the constructor.
  __key: string;
  /** @internal */
  __parent: null | NodeKey;
  /** @internal */
  __prev: null | NodeKey;
  /** @internal */
  __next: null | NodeKey;
  /** @internal */
  __state?: NodeState<this>;

  constructor(key?: NodeKey) {
    this.__type = this.constructor.getType();
    this.__parent = null;
    this.__prev = null;
    this.__next = null;
    Object.defineProperty(this, '__state', {
      configurable: true,
      enumerable: false,
      value: undefined,
      writable: true,
    });

    $setNodeKey(this, key);

    if (__DEV__) {
      if (this.__type !== 'root') {
        errorOnTypeKlassMismatch(this.__type, this.constructor);
      }
    }
  }

  /**
   * Override this to implement the new static node configuration protocol,
   * this method is called directly on the prototype and must not depend
   * on anything initialized in the constructor. Generally it should be
   * a trivial implementation.
   *
   * @example
   * ```ts
   * class MyNode extends TextNode {
   *   $config() {
   *     return this.config('my-node', {extends: TextNode});
   *   }
   * }
   * ```
   */
  $config(): BaseStaticNodeConfig {
    return {};
  }

  /**
   * This is a convenience method for $config that
   * aids in type inference. See {@link LexicalNode.$config}
   * for example usage.
   */
  config<Type extends string, Config extends StaticNodeConfigValue<this, Type>>(
    type: Type,
    config: Config,
  ): StaticNodeConfigRecord<Type, Config> {
    const parentKlass =
      config.extends || Object.getPrototypeOf(this.constructor);
    Object.assign(config, { extends: parentKlass, type });
    return { [type]: config } as StaticNodeConfigRecord<Type, Config>;
  }

  static getType(): string {
    const { ownNodeType } = getStaticNodeConfig(this);
    invariant(
      ownNodeType !== undefined,
      'LexicalNode: Node %s does not implement .getType().',
      this.name,
    );
    return ownNodeType;
  }

  /**
   * Clones this node, creating a new node with a different key
   * and adding it to the EditorState (but not attaching it anywhere!). All nodes must
   * implement this method.
   *
   */
  static clone(_data: unknown): LexicalNode {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .clone().',
      this.name,
    );
  }

  /**
   * Controls how the this node is deserialized from JSON. This is usually boilerplate,
   * but provides an abstraction between the node implementation and serialized interface that can
   * be important if you ever make breaking changes to a node schema (by adding or removing properties).
   * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
   *
   * */
  static importJSON(_serializedNode: SerializedLexicalNode): LexicalNode {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .importJSON().',
      this.name,
    );
  }

  static importDOM?: () => DOMConversionMap<any> | null;

  /**
   * Returns the string type of this node.
   */
  getType(): string {
    return this.__type;
  }

  /**
   * Update this LexicalNode instance from serialized JSON. It's recommended
   * to implement as much logic as possible in this method instead of the
   * static importJSON method, so that the functionality can be inherited in subclasses.
   *
   * The LexicalUpdateJSON utility type should be used to ignore any type, version,
   * or children properties in the JSON so that the extended JSON from subclasses
   * are acceptable parameters for the super call.
   *
   * If overridden, this method must call super.
   *
   * @example
   * ```ts
   * class MyTextNode extends TextNode {
   *   // ...
   *   static importJSON(serializedNode: SerializedMyTextNode): MyTextNode {
   *     return $createMyTextNode()
   *       .updateFromJSON(serializedNode);
   *   }
   *   updateFromJSON(
   *     serializedNode: LexicalUpdateJSON<SerializedMyTextNode>,
   *   ): this {
   *     return super.updateFromJSON(serializedNode)
   *       .setMyProperty(serializedNode.myProperty);
   *   }
   * }
   * ```
   **/
  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedLexicalNode>,
  ): this {
    return $updateStateFromJSON(this, serializedNode);
  }

  /**
   * Returns the latest version of the node from the active EditorState.
   * This is used to avoid getting values from stale node references.
   *
   */
  getLatest(): this {
    if ($isEphemeral(this)) {
      return this;
    }
    const latest = $getNodeByKey<this>(this.__key);
    if (latest === null) {
      invariant(
        false,
        'Lexical node does not exist in active editor state. Avoid using the same node references between nested closures from editorState.read/editor.update.',
      );
    }
    return latest;
  }

  /**
   * Perform any state updates on the clone of prevNode that are not already
   * handled by the constructor call in the static clone method. If you have
   * state to update in your clone that is not handled directly by the
   * constructor, it is advisable to override this method but it is required
   * to include a call to `super.afterCloneFrom(prevNode)` in your
   * implementation. This is only intended to be called by
   * {@link $cloneWithProperties} function or via a super call.
   *
   * @example
   * ```ts
   * class ClassesTextNode extends TextNode {
   *   // Not shown: static getType, static importJSON, exportJSON, createDOM, updateDOM
   *   __classes = new Set<string>();
   *   static clone(node: ClassesTextNode): ClassesTextNode {
   *     // The inherited TextNode constructor is used here, so
   *     // classes is not set by this method.
   *     return new ClassesTextNode(node.__text, node.__key);
   *   }
   *   afterCloneFrom(node: this): void {
   *     // This calls TextNode.afterCloneFrom and LexicalNode.afterCloneFrom
   *     // for necessary state updates
   *     super.afterCloneFrom(node);
   *     this.__addClasses(node.__classes);
   *   }
   *   // This method is a private implementation detail, it is not
   *   // suitable for the public API because it does not call getWritable
   *   __addClasses(classNames: Iterable<string>): this {
   *     for (const className of classNames) {
   *       this.__classes.add(className);
   *     }
   *     return this;
   *   }
   *   addClass(...classNames: string[]): this {
   *     return this.getWritable().__addClasses(classNames);
   *   }
   *   removeClass(...classNames: string[]): this {
   *     const node = this.getWritable();
   *     for (const className of classNames) {
   *       this.__classes.delete(className);
   *     }
   *     return this;
   *   }
   *   getClasses(): Set<string> {
   *     return this.getLatest().__classes;
   *   }
   * }
   * ```
   *
   */
  afterCloneFrom(prevNode: this): void {
    if (this.__key === prevNode.__key) {
      this.__parent = prevNode.__parent;
      this.__next = prevNode.__next;
      this.__prev = prevNode.__prev;
      this.__state = prevNode.__state;
    } else if (prevNode.__state) {
      this.__state = prevNode.__state.getWritable(this);
    }
  }

  /**
   * Returns a mutable version of the node using {@link $cloneWithProperties}
   * if necessary. Will throw an error if called outside of a Lexical Editor
   * {@link LexicalEditor.update} callback.
   *
   */
  getWritable(): this {
    if ($isEphemeral(this)) {
      return this;
    }
    errorOnReadOnly();
    const editorState = getActiveEditorState();
    const editor = getActiveEditor();
    const nodeMap = editorState._nodeMap;
    const key = this.__key;
    // Ensure we get the latest node from pending state
    const latestNode = this.getLatest();
    const cloneNotNeeded = editor._cloneNotNeeded;
    const selection = $getSelection();
    if (selection !== null) {
      selection.setCachedNodes(null);
    }
    if (cloneNotNeeded.has(key)) {
      // Transforms clear the dirty node set on each iteration to keep track on newly dirty nodes
      internalMarkNodeAsDirty(latestNode);
      return latestNode;
    }
    const mutableNode = $cloneWithProperties(latestNode);
    cloneNotNeeded.add(key);
    internalMarkNodeAsDirty(mutableNode);
    // Update reference in node map
    nodeMap.set(key, mutableNode);

    return mutableNode;
  }
}
