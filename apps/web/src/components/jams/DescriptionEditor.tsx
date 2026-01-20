import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "quill-emoji/dist/quill-emoji.css";
import "quill-emoji";
import { Label } from "@/components/ui/label";

const toolbarModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "emoji"],
      ["clean"],
    ],
  },
  "emoji-toolbar": true,
  "emoji-textarea": false,
  "emoji-shortname": true,
};

type DescriptionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const DescriptionEditor = ({ value, onChange, disabled }: DescriptionEditorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="jam-description">Descrizione</Label>
      <div className="description-editor-wrapper rounded-xl border border-input focus-within:ring-2 focus-within:ring-ring">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={toolbarModules}
          placeholder="Descrivi la tua jam, livello, cosa portare..."
          readOnly={disabled}
        />
      </div>
    </div>
  );
};

