import DOMPurify from 'isomorphic-dompurify';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import type { JSONContent } from '@tiptap/core';
import type { RichDoc } from '@/types';

export const richTextExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: {
      class: 'text-primary underline underline-offset-2 hover:text-navy',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
  }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
];

export function isRichDocEmpty(doc?: RichDoc | null): boolean {
  if (!doc?.content?.length) return true;
  const html = renderRichTextHtml(doc);
  const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  return !text;
}

export function renderRichTextHtml(doc?: RichDoc | null): string {
  if (!doc || doc.type !== 'doc') return '';
  try {
    const html = generateHTML(doc as JSONContent, richTextExtensions);
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel'],
    });
  } catch {
    return '';
  }
}

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:', 'mailto:', 'blob:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
