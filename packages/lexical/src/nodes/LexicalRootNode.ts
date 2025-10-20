import { SerializedLexicalNode } from '../LexicalNode';
import { $getRoot } from '../LexicalUtils';
import { ElementNode, SerializedElementNode } from './LexicalElementNode';

export type SerializedRootNode<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> = SerializedElementNode<T>;

/** @noInheritDoc */
export class RootNode extends ElementNode {
  /** @internal */
  __cachedText: null | string;

  static getType(): string {
    return 'root';
  }

  static clone(): RootNode {
    return new RootNode();
  }

  static importJSON(serializedNode: SerializedRootNode): RootNode {
    // We don't create a root, and instead use the existing root.
    return $getRoot().updateFromJSON(serializedNode);
  }

  constructor() {
    super('root');
    this.__cachedText = null;
  }
}

export function $createRootNode(): RootNode {
  return new RootNode();
}
