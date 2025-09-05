import { useCallback, useEffect, useState, useRef } from 'react'
import { Schema } from '@shared/schema'
import { storage, DEFAULT_DATA } from '../services/storage'

export function useStorage() {
  const [data, setData] = useState<Schema>(DEFAULT_DATA)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  // 确保组件卸载时停止状态更新
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 加载数据（修复内存泄漏）
  const loadData = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      if (mountedRef.current) setIsLoading(true)
      const loadedData = await storage.read()
      if (mountedRef.current) {
        setData(loadedData)
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load data'))
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // 保存数据（修复内存泄漏）
  const saveData = useCallback(async (newData: Schema) => {
    if (!mountedRef.current) return

    try {
      if (mountedRef.current) setIsLoading(true)
      await storage.write(newData)
      if (mountedRef.current) {
        setData(newData)
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to save data'))
      }
      throw err // 重新抛出错误以便调用者处理
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
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
    if (!mountedRef.current) return
    await saveData(DEFAULT_DATA)
  }, [saveData])

  // 错误恢复机制
  const retryLoad = useCallback(async () => {
    if (!mountedRef.current) return
    if (mountedRef.current) setError(null)
    await loadData()
  }, [loadData])

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
    reloadData: loadData,
    retryLoad
  }
}
