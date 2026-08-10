// src/stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/api/supabase'
import { userApi } from '@/api/user'
import type { User } from '@/types/database'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const isLoggedIn = computed(() => !!user.value)

  // 登录
  async function login(phone: string, otp: string): Promise<boolean> {
    isLoading.value = true
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      })

      if (error) {
        console.error('登录失败:', error)
        return false
      }

      // 获取用户档案
      const profile = await userApi.getProfile()
      user.value = profile

      return true
    } finally {
      isLoading.value = false
    }
  }

  // 发送验证码
  async function sendOtp(phone: string): Promise<boolean> {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms'
      }
    })

    if (error) {
      console.error('发送验证码失败:', error)
      return false
    }

    return true
  }

  // 登出
  async function logout() {
    await supabase.auth.signOut()
    user.value = null
  }

  // 更新档案
  async function updateProfile(profile: Partial<User>): Promise<boolean> {
    const success = await userApi.updateProfile(profile)
    if (success && user.value) {
      user.value = { ...user.value, ...profile }
    }
    return success
  }

  // 刷新用户数据
  async function refreshUser() {
    const profile = await userApi.getProfile()
    user.value = profile
  }

  return {
    user,
    isLoading,
    isLoggedIn,
    login,
    sendOtp,
    logout,
    updateProfile,
    refreshUser
  }
})
