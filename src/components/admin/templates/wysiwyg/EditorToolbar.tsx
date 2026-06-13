import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, List, ListOrdered, Undo2, Redo2, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface Props {
  editor: Editor | null;
  mergeFields: string[];
}

export default function EditorToolbar({ editor, mergeFields }: Props) {
  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <Button
      type="button"
      size="icon"
      variant={active ? 'default' : 'ghost'}
      className="h-8 w-8"
      onClick={onClick}
      title={title}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex items-center gap-1 flex-wrap p-2 border-b bg-muted/30">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold className="h-4 w-4" />, 'Bold')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-4 w-4" />, 'Italic')}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-4 w-4" />, 'Underline')}
      <Separator orientation="vertical" className="h-6 mx-1" />
      {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="h-4 w-4" />, 'Heading 1')}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-4 w-4" />, 'Heading 2')}
      <Separator orientation="vertical" className="h-6 mx-1" />
      {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), <AlignLeft className="h-4 w-4" />, 'Align left')}
      {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), <AlignCenter className="h-4 w-4" />, 'Align center')}
      {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), <AlignRight className="h-4 w-4" />, 'Align right')}
      <Separator orientation="vertical" className="h-6 mx-1" />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List className="h-4 w-4" />, 'Bullet list')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-4 w-4" />, 'Numbered list')}
      <Separator orientation="vertical" className="h-6 mx-1" />
      <input
        type="color"
        title="Text color"
        className="h-8 w-8 rounded cursor-pointer border bg-transparent"
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
      />
      <Separator orientation="vertical" className="h-6 mx-1" />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1">
            <Tag className="h-3.5 w-3.5" /> Merge field
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="text-xs text-muted-foreground mb-2">Insert a dynamic field</div>
          <div className="flex flex-wrap gap-1 max-h-56 overflow-y-auto">
            {mergeFields.map((f) => (
              <button
                key={f}
                type="button"
                className="text-xs rounded bg-emerald-100 text-emerald-900 px-2 py-1 hover:bg-emerald-200"
                onClick={() => editor.chain().focus().insertContent({ type: 'mergeField', attrs: { name: f } }).run()}
              >
                {`{{${f}}}`}
              </button>
            ))}
            {mergeFields.length === 0 && <div className="text-xs text-muted-foreground">No fields defined.</div>}
          </div>
        </PopoverContent>
      </Popover>
      <div className="ml-auto flex items-center gap-1">
        {btn(false, () => editor.chain().focus().undo().run(), <Undo2 className="h-4 w-4" />, 'Undo')}
        {btn(false, () => editor.chain().focus().redo().run(), <Redo2 className="h-4 w-4" />, 'Redo')}
      </div>
    </div>
  );
}
