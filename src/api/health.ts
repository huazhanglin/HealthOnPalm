// src/api/health.ts
import { supabase } from './supabase'
import type { DailySummary, WorkoutLog, SleepLog } from '@/types/database'

export const healthApi = {
  // 获取今日摘要
  async getTodaySummary(): Promise<DailySummary | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = 未找到
      console.error('获取今日摘要失败:', error)
    }

    return data
  },

  // 创建今日摘要
  async createTodaySummary(summary: Partial<DailySummary>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('daily_summaries')
      .insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        ...summary
      })

    return !error
  },

  // 获取最近7天运动记录
  async getRecentWorkouts(days: number = 7): Promise<WorkoutLog[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(days)

    if (error) {
      console.error('获取运动记录失败:', error)
      return []
    }

    return data || []
  }
}
