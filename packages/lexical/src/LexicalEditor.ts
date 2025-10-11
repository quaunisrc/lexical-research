import type { EditorState } from './LexicalEditorState';
import { LexicalNode } from './LexicalNode';

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

// TODO: Continue here (3)
export type LexicalNodeConfig = Klass<LexicalNode> | LexicalNodeReplacement;

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

export class LexicalEditor {
  static version: string | undefined;
}

export function createEditor(editorConfig?: CreateEditorArgs): LexicalEditor {
  const editor = new LexicalEditor();

  return editor;
}
