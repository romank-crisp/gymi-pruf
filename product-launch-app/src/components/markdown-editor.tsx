'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

/**
 * Markdown editor with Edit / Preview tabs.
 * Storage is the raw markdown string. Preview renders with GFM
 * (tables, task lists, fenced code).
 */
export function MarkdownEditor({ value, onChange, placeholder, rows = 10 }: Props) {
  return (
    <Tabs defaultValue="edit" className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Write a description in markdown…'}
          rows={rows}
          className="font-mono text-sm"
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="md-preview rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
          {value.trim() === '' ? (
            <p className="italic text-muted-foreground">Nothing to preview yet.</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
