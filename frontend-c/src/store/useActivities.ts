import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { api, Activity } from '../api/client'

export function useActivities(initialStatus?: string) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (reset = false) => {
    if (loading) return
    const currentPage = reset ? 1 : page
    setLoading(true)
    try {
      const res = await api.getActivities({
        status: initialStatus,
        page: currentPage,
        page_size: 10,
      })
      const items = res.items || []
      setActivities(prev => (reset ? items : [...prev, ...items]))
      setHasMore(items.length === 10)
      setPage(currentPage + 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [loading, page, initialStatus])

  const reset = useCallback(() => {
    setActivities([])
    setPage(1)
    setHasMore(true)
    load(true)
  }, [load])

  useEffect(() => { load(true) }, [])

  return { activities, loading, hasMore, load, reset }
}

export function useActivity(id: number) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getActivity(id)
      setActivity(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  return { activity, loading, reload }
}