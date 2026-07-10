import { searchDocuments } from '../../utils/dms'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  try {
    const result = await searchDocuments({
      fulltext: (q.fulltext as string) || undefined,
      categoryId: (q.categoryId as string) || undefined,
      page: q.page ? parseInt(q.page as string, 10) : 1,
      pageSize: q.pageSize ? parseInt(q.pageSize as string, 10) : 25,
      properties: parseProps(q)
    })
    return { ok: true, ...result }
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

function parseProps(q: Record<string, any>): Record<string, string> | undefined {
  const props: Record<string, string> = {}
  for (const [key, value] of Object.entries(q)) {
    if (key.startsWith('prop.') && typeof value === 'string') {
      props[key.slice(5)] = value
    }
  }
  return Object.keys(props).length ? props : undefined
}
