import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { Extension } from "@tiptap/core";
import {
  Bold, Italic, UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Pilcrow, Link2, Link2Off,
} from "lucide-react";

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{ types: ["textStyle"], attributes: { fontSize: { default: null, parseHTML: (el) => el.style.fontSize || null, renderHTML: (attrs) => attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {} } } }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) => chain().setMark("textStyle", { fontSize: null }).run(),
    } as any;
  },
});

const FONT_SIZES = [
  { label: "小", value: "13px" },
  { label: "正文", value: "16px" },
  { label: "大", value: "20px" },
  { label: "标题", value: "26px" },
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  showConsentLink?: boolean;
}

const ToolbarBtn = ({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`p-1.5 rounded transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground/70 hover:text-foreground"}`}
  >
    {children}
  </button>
);

const RichTextEditor = ({ value, onChange, placeholder, showConsentLink }: Props) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2 cursor-pointer" },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "outline-none min-h-[120px] px-4 py-3 text-sm text-foreground prose prose-sm max-w-none focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  const currentFontSize = editor.getAttributes("textStyle").fontSize ?? null;
  const isLink = editor.isActive("link");

  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-2 py-1.5">
        <select
          value={currentFontSize ?? ""}
          onChange={(e) => {
            if (e.target.value) (editor.chain().focus() as any).setFontSize(e.target.value).run();
            else (editor.chain().focus() as any).unsetFontSize().run();
          }}
          className="text-xs rounded border bg-background px-1.5 py-1 mr-1 cursor-pointer"
        >
          <option value="">字号</option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarBtn title="加粗" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="斜体" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="下划线" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarBtn title="左对齐" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="居中" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="右对齐" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="两端对齐" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarBtn title="无序列表" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="有序列表" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarBtn title="清除格式" active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <Pilcrow className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {showConsentLink && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            {isLink ? (
              <ToolbarBtn title="移除链接" active={true} onClick={() => editor.chain().focus().unsetLink().run()}>
                <Link2Off className="h-3.5 w-3.5" />
              </ToolbarBtn>
            ) : (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (editor.state.selection.empty) return;
                  editor.chain().focus().setLink({ href: "#consent-doc" }).run();
                }}
                title="将选中文字设为知情同意书链接"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                disabled={editor.state.selection.empty}
              >
                <Link2 className="h-3.5 w-3.5" />
                插入知情同意书链接
              </button>
            )}
          </>
        )}
      </div>

      <div className="relative">
        {editor.isEmpty && placeholder && (
          <p className="absolute top-3 left-4 text-sm text-muted-foreground pointer-events-none select-none">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;
