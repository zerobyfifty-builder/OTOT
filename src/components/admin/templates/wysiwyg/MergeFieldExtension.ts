import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Inline atom node that renders a merge field as a styled chip.
 * Saved in TipTap JSON as: { type: 'mergeField', attrs: { name: 'userName' } }
 */
export const MergeField = Node.create({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-name') || '',
        renderHTML: (attrs) => ({ 'data-name': attrs.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-merge-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const name = HTMLAttributes['data-name'] || '';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-merge-field': 'true',
        class:
          'inline-flex items-center rounded-md bg-emerald-100 text-emerald-900 px-1.5 py-0.5 mx-0.5 text-xs font-medium align-middle',
      }),
      `{{${name}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.name}}}`;
  },
});
