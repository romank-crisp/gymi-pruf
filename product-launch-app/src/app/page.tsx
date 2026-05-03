import { KanbanApp } from '@/components/kanban-app'
import * as listsRepo from '@/lib/repositories/lists'
import * as tasksRepo from '@/lib/repositories/tasks'

// SQLite is local + fast; never cache.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const lists = await listsRepo.listAll()
  const selectedId = lists[0]?.id ?? null
  const tasks = selectedId
    ? await tasksRepo.listFiltered({ listId: selectedId })
    : []

  return (
    <KanbanApp
      initialLists={lists}
      initialTasks={tasks}
      initialSelectedListId={selectedId}
    />
  )
}
