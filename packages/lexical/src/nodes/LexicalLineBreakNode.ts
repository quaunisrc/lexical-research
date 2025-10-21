import { KlassConstructor } from '../LexicalEditor';
import { LexicalNode, NodeKey, SerializedLexicalNode } from '../LexicalNode';
import { $applyNodeReplacement } from '../LexicalUtils';

export type SerializedLineBreakNode = SerializedLexicalNode;

/** @noInheritDoc */
export class LineBreakNode extends LexicalNode {
  /** @internal */
  declare ['constructor']: KlassConstructor<typeof LineBreakNode>;
  static getType(): string {
    return 'linebreak';
  }

  static clone(node: LineBreakNode): LineBreakNode {
    return new LineBreakNode(node.__key);
  }

  static importJSON(
    serializedLineBreakNode: SerializedLineBreakNode,
  ): LineBreakNode {
    return $createLineBreakNode().updateFromJSON(serializedLineBreakNode);
  }

  // TODO: static importDom is missing

  constructor(key?: NodeKey) {
    super(key);
  }
}

export function $createLineBreakNode(): LineBreakNode {
  return $applyNodeReplacement(new LineBreakNode());
}
