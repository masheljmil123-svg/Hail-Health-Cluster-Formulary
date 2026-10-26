import type { RichDoc } from '@/types';

type Node = Record<string, unknown>;

export function richDoc(...nodes: Node[]): RichDoc {
  return { type: 'doc', content: nodes.length ? nodes : [{ type: 'paragraph' }] };
}

export function paragraph(text: string): Node {
  if (!text.trim()) return { type: 'paragraph' };
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

export function heading(level: 2 | 3 | 4, text: string): Node {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}

export function bullets(items: string[]): Node {
  return {
    type: 'bulletList',
    content: items.map((text) => ({
      type: 'listItem',
      content: [paragraph(text)],
    })),
  };
}

export function ordered(items: string[]): Node {
  return {
    type: 'orderedList',
    content: items.map((text) => ({
      type: 'listItem',
      content: [paragraph(text)],
    })),
  };
}

export function linkParagraph(label: string, href: string, suffix = ''): Node {
  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        marks: [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } }],
        text: label,
      },
      ...(suffix ? [{ type: 'text', text: suffix }] : []),
    ],
  };
}

export function table(headers: string[], rows: string[][]): Node {
  return {
    type: 'table',
    content: [
      {
        type: 'tableRow',
        content: headers.map((cell) => ({
          type: 'tableHeader',
          content: [paragraph(cell)],
        })),
      },
      ...rows.map((row) => ({
        type: 'tableRow',
        content: row.map((cell) => ({
          type: 'tableCell',
          content: [paragraph(cell)],
        })),
      })),
    ],
  };
}
