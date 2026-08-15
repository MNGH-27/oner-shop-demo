import JoditEditor from 'jodit-react'
import 'jodit/es2021/jodit.min.css'
import { useMemo, useRef } from 'react'

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useRef(null)
  const config = useMemo(() => ({
    direction: 'rtl' as const,
    language: 'fa',
    readonly: false,
    minHeight: 360,
    placeholder: 'توضیحات کامل محصول را بنویسید...',
    toolbarAdaptive: false,
    buttons: ['source', '|', 'bold', 'italic', 'underline', 'strikethrough', '|', 'ul', 'ol', '|', 'paragraph', 'fontsize', '|', 'left', 'center', 'right', 'justify', '|', 'link', 'blockquote', 'hr', '|', 'undo', 'redo', 'eraser'],
    cleanHTML: { fillEmptyParagraph: false },
  }), [])
  return (
    <div className="rich-editor" dir="rtl">
      <JoditEditor
        ref={editor}
        value={value}
        config={config}
        onBlur={onChange}
        onChange={() => undefined}
      />
    </div>
  )
}
