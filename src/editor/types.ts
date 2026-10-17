export interface PreviewTextEdit {
  shape: string[];
  textNodes: Array<{ index: number; text: string }>;
}

export interface PreviewTextEditMessage {
  type: 'public-preview-text-edits';
  edits: Array<{
    id: string;
    shape: string[];
    textNodes: Array<{ index: number; text: string }>;
  }>;
}

export interface PreviewEditableMessage {
  type: 'public-preview-editable';
  enabled: boolean;
}

export interface PreviewTextSelectionMessage {
  type: 'public-preview-text-selection';
  id: string;
}

export interface PreviewFocusTextMessage {
  type: 'public-preview-focus-text';
  id: string;
}

export type EditorDownloadSource =
  | { kind: 'original' }
  | { kind: 'edited'; html: string }
  | { kind: 'error' };