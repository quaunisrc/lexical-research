import { KlassConstructor, Spread } from '../LexicalEditor';
import { $applyNodeReplacement } from '../LexicalUtils';
import { ElementNode, SerializedElementNode } from './LexicalElementNode';

export type SerializedParagraphNode = Spread<
  {
    textFormat: number;
    textStyle: string;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
export class ParagraphNode extends ElementNode {
  /** @internal */
  declare ['constructor']: KlassConstructor<typeof ParagraphNode>;

  static getType(): string {
    return 'paragraph';
  }

  static clone(node: ParagraphNode): ParagraphNode {
    return new ParagraphNode(node.__key);
  }

  static importJSON(serializedNode: SerializedParagraphNode): ParagraphNode {
    return $createParagraphNode().updateFromJSON(serializedNode);
  }

  // TODO: static importDom is missing
}

export function $createParagraphNode(): ParagraphNode {
  return $applyNodeReplacement(new ParagraphNode());
}
