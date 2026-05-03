import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Product Launch</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kanban + roadmap for the Gymi-Vorbereitung product. UI lands in Phase 4.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Phase 1 — Scaffold <Badge variant="outline">complete</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Next.js 16 · Tailwind v4 · shadcn/ui (neutral palette) · running on port 3001.</p>
            <p>Ready for Phase 2: database schema and repositories.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
