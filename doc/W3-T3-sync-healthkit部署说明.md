# W3-T3.1 部署说明：HealthKit → Supabase 同步

## 1. 执行 SQL（必须先做）

打开 [Supabase SQL Editor](https://supabase.com/dashboard/project/zewznptbyhurxaqirzmb/sql)，粘贴并运行：

`supabase/migrations/20260806_w3_sync_healthkit.sql`

确认无报错。

## 2. 部署 Edge Function

在项目根目录 `C:\codes\HealthOnPalm` 执行：

```powershell
.\supabase.exe functions deploy sync-healthkit --project-ref zewznptbyhurxaqirzmb
```

若未登录：

```powershell
.\supabase.exe login
```

## 3. 真机验证

1. HBuilderX 重新运行到 iOS（Swift 改了运动读取则需 **重做自定义基座**，versionCode **121**）
2. 打开 HealthKit 授权页 → 授权或点「手动刷新」
3. 成功时 Toast「同步成功」
4. 在 Dashboard → Table Editor 查看：
   - `daily_summaries`：当天有 `source = healthkit`
   - 有睡眠时：`sleep_logs.source = healthkit_sync`
   - 有运动时：`workout_logs` 有记录
   - `sync_logs` 有一条成功记录

## 代码入口

| 文件 | 作用 |
|------|------|
| `supabase/functions/sync-healthkit/index.ts` | Edge Function |
| `uni-app/src/api/healthkit-sync.ts` | 前端调用 |
| `uni-app/src/lib/healthkit/index.ts` | `syncTodayDataWithUpload()` |
| `uni-app/src/pages/healthkit/authorize.vue` | 授权/刷新触发上传 |
