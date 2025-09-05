import { useCallback, useEffect, useState } from 'react'
import { Schema } from '@shared/schema'
import { storage, DEFAULT_DATA } from '../services/storage'

export function useStorage() {
  const [data, setData] = useState<Schema>(DEFAULT_DATA)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const loadedData = await storage.read()
      setData(loadedData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 保存数据
  const saveData = useCallback(async (newData: Schema) => {
    try {
      setIsLoading(true)
      await storage.write(newData)
      setData(newData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save data'))
      throw err // 重新抛出错误以便调用者处理
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 更新部分数据
  const updateData = useCallback(
    async (partialData: Partial<Schema>) => {
      const newData = { ...data, ...partialData }
      await saveData(newData)
    },
    [data, saveData]
  )

  // 重置数据
  const resetData = useCallback(async () => {
    await saveData(DEFAULT_DATA)
  }, [saveData])

  // 初始加载
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    error,
    isLoading,
    saveData,
    updateData,
    resetData,
    reloadData: loadData
  }
}
