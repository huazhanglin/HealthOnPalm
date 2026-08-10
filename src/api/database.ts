// src/types/database.ts

export interface User {
    id: string
    created_at: string
    updated_at: string
    deleted_at?: string
  
    nickname?: string
    avatar_url?: string
  
    age?: number
    gender?: 'male' | 'female' | 'other'
    height_cm?: number
    weight_kg?: number
    occupation?: string
    sleep_goal_hours?: number
  
    fitness_level?: 'beginner' | 'intermediate' | 'advanced'
    preferred_workout_time?: 'morning' | 'noon' | 'evening' | 'flexible'
    workout_duration_preference?: number
  
    subscription_tier: 'free' | 'pro' | 'premium'
    subscription_expires_at?: string
  
    onboarding_completed: boolean
    last_active_at: string
  }
  
  export interface DailySummary {
    id: string
    created_at: string
    updated_at: string
    deleted_at?: string
  
    user_id: string
    date: string
  
    steps?: number
    active_calories?: number
    stand_hours?: number
  
    ai_brief?: string
    ai_plan?: string
    ai_recovery_score?: number
    ai_workout_readiness?: 'train' | 'light' | 'rest'
  
    user_feedback?: 'adopted' | 'ignored' | 'modified'
    user_feedback_note?: string
  
    context_snapshot?: Record<string, any>
  }
  
  export interface WorkoutLog {
    id: string
    created_at: string
    deleted_at?: string
  
    user_id: string
    date: string
  
    workout_type?: string
    workout_name?: string
  
    duration_minutes?: number
    calories_burned?: number
  
    perceived_exertion?: number
    mood_after?: 'great' | 'good' | 'normal' | 'tired' | 'exhausted'
    notes?: string
  
    source?: 'user_logged' | 'ai_suggested' | 'healthkit_sync'
  }
  
  export interface SleepLog {
    id: string
    created_at: string
    deleted_at?: string
  
    user_id: string
    date: string
  
    total_sleep_hours?: number
    deep_sleep_hours?: number
    light_sleep_hours?: number
    rem_sleep_hours?: number
    wake_ups?: number
  
    sleep_quality_score?: number
    sleep_start_time?: string
    sleep_end_time?: string
  
    ai_sleep_insight?: string
  
    source?: 'healthkit_sync' | 'user_logged' | 'manual'
  }
  
  export interface HealthMemory {
    id: string
    created_at: string
    updated_at: string
    deleted_at?: string
  
    user_id: string
    memory_type: 'working' | 'episodic' | 'semantic' | 'procedural'
  
    content: string
    content_embedding?: number[]
  
    memory_source?: string
    source_id?: string
    extracted_entities?: Record<string, any>
    importance_score?: number
  
    expires_at?: string
    compressed?: boolean
  }
  
  export interface Conversation {
    id: string
    created_at: string
    deleted_at?: string
  
    user_id: string
    date: string
  
    messages: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp: string
    }>
    message_count: number
    tokens_used: number
  
    context_summary?: string
  }
  