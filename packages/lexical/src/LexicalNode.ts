import { KlassConstructor } from './LexicalEditor';
import invariant from 'shared/invariant';

export type NodeKey = string;

export type NodeMap = Map<NodeKey, LexicalNode>;

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
  // TODO: Implement __state
  /** @internal */
  // __state?: NodeState<this>;

  $config(): BaseStaticNodeConfig {
    return {};
  }

  static getType(): string {
    // TODO: Continue here (2)
    const { ownNodeType } = getStaticNodeConfig(this);
    invariant(
      ownNodeType !== undefined,
      'LexicalNode: Node %s does not implement .getType().',
      this.name,
    );
    return ownNodeType;
  }

  constructor(key?: NodeKey) {
    this.__type = this.constructor.getType();
    this.__parent = null;
    this.__prev = null;
    this.__next = null;
  }
}
