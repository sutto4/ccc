import 'emoji-mart/css/emoji-mart.css';
const Picker = require('emoji-mart').Picker;

export default function EmojiPicker({ onEmojiSelect }: { onEmojiSelect: (emoji: any) => void }) {
  return (
    <Picker
      onSelect={onEmojiSelect}
      showPreview={false}
      showSkinTones={false}
      style={{ zIndex: 1000 }}
    />
  );
}
