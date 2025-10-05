declare module '@emoji-mart/react' {
  import { ComponentType } from 'react';

  type EmojiPickerProps = Record<string, unknown>;

  const Picker: ComponentType<EmojiPickerProps>;

  export default Picker;
}

declare module '@emoji-mart/data' {
  const data: unknown;
  export default data;
}
