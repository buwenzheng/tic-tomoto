import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { Plus, Edit2, Trash2, Play, CheckCircle2, Circle, Filter, GripVertical } from 'lucide-react'
import { TaskPriority } from '@/types'
import type { Task, TaskFormData } from '@/types'
import { useTaskStore, useFilteredTasks, useTaskStats } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'

// 任务项组件
interface TaskItemProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onToggleComplete: (id: string) => void
  onStartPomodoro: (id: string) => void
  isDragging?: boolean
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onStartPomodoro,
  isDragging
}) => {
  const dragControls = useDragControls()
  
  const priorityColors = {
    [TaskPriority.LOW]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    [TaskPriority.MEDIUM]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    [TaskPriority.HIGH]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    [TaskPriority.URGENT]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
  }

  return (
    <Reorder.Item
      value={task}
      className={clsx(
        'group flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors',
        isDragging ? 'shadow-lg' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      )}
      dragListener={false}
      dragControls={dragControls}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
        onPointerDown={(e) => {
          e.preventDefault()
          dragControls.start(e)
        }}
    >
        <GripVertical className="w-4 h-4" />
      </button>

        <button
          onClick={() => onToggleComplete(task.id)}
        className={clsx(
          'flex-shrink-0 w-6 h-6 rounded-full border-2 transition-colors',
          task.isCompleted
            ? 'border-green-500 bg-green-500 text-white hover:bg-green-600 hover:border-green-600'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
        )}
        >
          {task.isCompleted ? (
          <CheckCircle2 className="w-5 h-5" />
          ) : (
          <Circle className="w-5 h-5 opacity-0 group-hover:opacity-100" />
          )}
        </button>

        <div className="flex-1 min-w-0">
            <h3
          className={clsx('text-base font-medium truncate', {
            'text-gray-900 dark:text-gray-100': !task.isCompleted,
            'text-gray-500 dark:text-gray-400 line-through': task.isCompleted
          })}
            >
              {task.title}
            </h3>
        {task.description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
            <span
              className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                priorityColors[task.priority]
              )}
            >
            {task.priority}
          </span>
          {task.category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {task.category}
            </span>
          )}
          <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
            {task.completedPomodoros}/{task.estimatedPomodoros} 番茄钟
              </span>
            </div>
        </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onStartPomodoro(task.id)}
          className="p-2 text-green-600 hover:bg-green-100 rounded dark:text-green-400 dark:hover:bg-green-900/50"
              title="开始番茄钟"
          disabled={task.isCompleted}
            >
              <Play className="w-4 h-4" />
            </button>
          <button
            onClick={() => onEdit(task)}
          className="p-2 text-blue-600 hover:bg-blue-100 rounded dark:text-blue-400 dark:hover:bg-blue-900/50"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
          className="p-2 text-red-600 hover:bg-red-100 rounded dark:text-red-400 dark:hover:bg-red-900/50"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
    </Reorder.Item>
  )
}

// 任务表单组件
interface TaskFormProps {
  task?: Task
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TaskFormData) => void
}

const TaskForm: React.FC<TaskFormProps> = ({ task, isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    category: '',
    priority: TaskPriority.MEDIUM,
    estimatedPomodoros: 1,
    tags: []
  })

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        category: task.category || '',
        priority: task.priority,
        estimatedPomodoros: task.estimatedPomodoros,
        tags: task.tags || []
      })
    } else {
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: TaskPriority.MEDIUM,
        estimatedPomodoros: 1,
        tags: []
      })
    }
  }, [task])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (formData.title.trim()) {
      onSubmit(formData)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        className="card w-full max-w-md p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <h2 className="text-lg font-semibold mb-4">{task ? '编辑任务' : '新建任务'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">任务标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="输入任务标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">任务描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-20"
              placeholder="输入任务描述"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">优先级</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as TaskPriority })
                }
                className="input"
              >
                <option value={TaskPriority.LOW}>低优先级</option>
                <option value={TaskPriority.MEDIUM}>中优先级</option>
                <option value={TaskPriority.HIGH}>高优先级</option>
                <option value={TaskPriority.URGENT}>紧急</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">预估番茄数</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.estimatedPomodoros}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedPomodoros: parseInt(e.target.value) || 1 })
                }
                className="input"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost">
              取消
            </button>
            <button type="submit" className="btn-primary">
              {task ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// 主任务列表组件
const TaskList: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()

  const {
    loading,
    error,
    filter,
    setFilter,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    initialize,
    reorderTasks
  } = useTaskStore()

  const { setCurrentTask } = useTimerStore()
  const filteredTasks = useFilteredTasks()
  const stats = useTaskStats()
  const navigate = useNavigate()

  useEffect(() => {
    // 使用全局标记避免重复初始化
    if (!window.isTaskStoreInitialized) {
      initialize()
      window.isTaskStoreInitialized = true
    }
  }, [initialize])

  const handleCreateTask = async (data: TaskFormData): Promise<void> => {
    await createTask(data)
  }

  const handleUpdateTask = async (data: TaskFormData): Promise<void> => {
    if (editingTask) {
      await updateTask(editingTask.id, data)
      setEditingTask(undefined)
    }
  }

  const handleEdit = (task: Task): void => {
    setEditingTask(task)
    setIsFormOpen(true)
  }

  const handleStartPomodoro = (taskId: string): void => {
    setCurrentTask(taskId)
    navigate('timer')
  }

  const handleToggleComplete = async (taskId: string): Promise<void> => {
    await completeTask(taskId)
  }

  const handleDelete = async (taskId: string): Promise<void> => {
    if (confirm('确定要删除这个任务吗？')) {
      await deleteTask(taskId)
    }
  }

  const handleReorder = async (reorderedTasks: Task[]): Promise<void> => {
    await reorderTasks(reorderedTasks)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">任务列表</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">管理你的番茄钟任务</p>
        </div>

        <button onClick={() => setIsFormOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          新建任务
        </button>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">总任务</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.completed}</div>
          <div className="stat-label">已完成</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.inProgress}</div>
          <div className="stat-label">进行中</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalPomodoros}</div>
          <div className="stat-label">总番茄数</div>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex items-center space-x-2 mb-6">
        <Filter className="w-4 h-4 text-gray-500" />
        <div className="flex space-x-1">
          {(['all', 'pending', 'in-progress', 'completed'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                filter === filterType
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              {filterType === 'all'
                ? '全部'
                : filterType === 'pending'
                  ? '待开始'
                  : filterType === 'in-progress'
                    ? '进行中'
                    : '已完成'}
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="card">
        {loading && (
          <div className="p-8 text-center">
            <div className="shimmer w-full h-20 rounded"></div>
          </div>
        )}

        {error && <div className="p-4 text-red-600 dark:text-red-400 text-center">{error}</div>}

        {!loading && !error && filteredTasks.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {filter === 'all' ? '还没有任务，创建一个开始吧！' : '没有符合条件的任务'}
          </div>
        )}

        <Reorder.Group
          axis="y"
          values={filteredTasks}
          onReorder={handleReorder}
          className="divide-y divide-gray-200 dark:divide-gray-700"
        >
        <AnimatePresence>
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
              onStartPomodoro={handleStartPomodoro}
            />
          ))}
        </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* 任务表单 */}
      <AnimatePresence>
        <TaskForm
          task={editingTask}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setEditingTask(undefined)
          }}
          onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        />
      </AnimatePresence>
    </div>
  )
}

export default TaskList
