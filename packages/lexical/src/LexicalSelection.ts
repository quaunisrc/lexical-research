import { LexicalNode } from './LexicalNode';

export interface BaseSelection {
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;
}
