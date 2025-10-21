import { IS_UNMERGEABLE } from '../LexicalConstants';
import { DOMConversionMap, NodeKey } from '../LexicalNode';
import { $applyNodeReplacement } from '../LexicalUtils';
import { SerializedTextNode, TextNode } from './LexicalTextNode';

export type SerializedTabNode = SerializedTextNode;

/** @noInheritDoc */
export class TabNode extends TextNode {
  static getType(): string {
    return 'tab';
  }

  static clone(node: TabNode): TabNode {
    return new TabNode(node.__key);
  }

  static importJSON(serializedTabNode: SerializedTabNode): TabNode {
    return $createTabNode().updateFromJSON(serializedTabNode);
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  constructor(key?: NodeKey) {
    super('\t', key);
    this.__detail = IS_UNMERGEABLE;
  }
}

export function $createTabNode(): TabNode {
  return $applyNodeReplacement(new TabNode());
}
