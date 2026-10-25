import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Table as TableIcon,
  Trash2,
  Undo2,
  Unlink,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { richTextExtensions, isSafeUrl, isRichDocEmpty, renderRichTextHtml } from '@/lib/richtext';
import { cn } from '@/lib/cn';
import type { RichDoc } from '@/types';

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content…',
  className,
}: {
  value?: RichDoc | null;
  onChange: (doc: RichDoc) => void;
  placeholder?: string;
  className?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');

  const editor = useEditor({
    extensions: [
      ...richTextExtensions,
      Placeholder.configure({ placeholder }),
    ],
    content: (value as object) ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON() as RichDoc);
    },
    editorProps: {
      attributes: {
        class:
          'prose-monograph min-h-[140px] max-w-none px-3 py-3 text-[15px] leading-7 text-ink outline-none focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value);
    if (current !== next) {
      editor.commands.setContent(value as object);
    }
  }, [value, editor]);

  if (!editor) return null;

  function applyLink() {
    const url = linkUrl.trim();
    if (!url || !isSafeUrl(url)) {
      setLinkError('Enter a valid http(s), mailto, or blob URL.');
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setLinkOpen(false);
    setLinkUrl('');
    setLinkError('');
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-line bg-white', className)}>
      <div className="flex flex-wrap gap-1 border-b border-line bg-canvas p-2" role="toolbar" aria-label="Text formatting">
        <Tool active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
          <Bold size={15} />
        </Tool>
        <Tool active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
          <Italic size={15} />
        </Tool>
        <Tool active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading">
          <Heading2 size={15} />
        </Tool>
        <Tool active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Subheading">
          <Heading3 size={15} />
        </Tool>
        <Tool active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list">
          <List size={15} />
        </Tool>
        <Tool active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list">
          <ListOrdered size={15} />
        </Tool>
        <Tool
          active={editor.isActive('table')}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          label="Insert table"
        >
          <TableIcon size={15} />
        </Tool>
        {editor.isActive('table') && (
          <>
            <Tool onClick={() => editor.chain().focus().addRowAfter().run()} label="Add row">
              +R
            </Tool>
            <Tool onClick={() => editor.chain().focus().addColumnAfter().run()} label="Add column">
              +C
            </Tool>
            <Tool onClick={() => editor.chain().focus().deleteRow().run()} label="Delete row">
              −R
            </Tool>
            <Tool onClick={() => editor.chain().focus().deleteColumn().run()} label="Delete column">
              −C
            </Tool>
            <Tool onClick={() => editor.chain().focus().deleteTable().run()} label="Delete table">
              <Trash2 size={15} />
            </Tool>
          </>
        )}
        <Tool
          active={editor.isActive('link')}
          onClick={() => {
            const previous = editor.getAttributes('link').href as string | undefined;
            setLinkUrl(previous ?? '');
            setLinkOpen((open) => !open);
            setLinkError('');
          }}
          label="Link"
        >
          <Link2 size={15} />
        </Tool>
        <Tool onClick={() => editor.chain().focus().unsetLink().run()} label="Remove link">
          <Unlink size={15} />
        </Tool>
        <Tool onClick={() => editor.chain().focus().undo().run()} label="Undo">
          <Undo2 size={15} />
        </Tool>
        <Tool onClick={() => editor.chain().focus().redo().run()} label="Redo">
          <Redo2 size={15} />
        </Tool>
      </div>
      {linkOpen && (
        <div className="flex flex-wrap items-end gap-2 border-b border-line bg-white p-3">
          <label className="min-w-[220px] flex-1 text-xs font-medium text-navy">
            Link URL or document URL
            <input
              className="ui-input mt-1 py-2 text-sm"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://… or blob:…"
            />
          </label>
          <button type="button" className="btn-primary py-2" onClick={applyLink}>
            Apply link
          </button>
          <button type="button" className="btn-secondary py-2" onClick={() => setLinkOpen(false)}>
            Cancel
          </button>
          {linkError && <p className="w-full text-sm text-rose-700">{linkError}</p>}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function Tool({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold text-navy hover:bg-white',
        active && 'bg-white text-primary shadow-sm',
      )}
    >
      {children}
    </button>
  );
}

export function RichTextView({ value, className }: { value?: RichDoc | null; className?: string }) {
  if (isRichDocEmpty(value)) {
    return <p className={cn('italic text-muted', className)}>Pending clinical review</p>;
  }
  return (
    <div
      className={cn('prose-monograph max-w-none text-[15px] leading-7 text-ink', className)}
      // Sanitized TipTap HTML only
      dangerouslySetInnerHTML={{ __html: renderRichTextHtml(value) }}
    />
  );
}
