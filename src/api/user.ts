// src/api/user.ts
import { supabase } from './supabase'
import type { User } from '@/types/database'

export const userApi = {
  // 获取当前用户档案
  async getProfile(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('获取用户档案失败:', error)
      return null
    }

    return data
  },

  // 更新用户档案
  async updateProfile(profile: Partial<User>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('users')
      .update({
        ...profile,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      console.error('更新用户档案失败:', error)
      return false
    }

    return true
  },

  // 检查是否需要新手引导
  async needsOnboarding(): Promise<boolean> {
    const profile = await this.getProfile()
    return !profile?.onboarding_completed
  }
}
