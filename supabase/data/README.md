# 动作库（Exercise Catalog）

自有表 `public.exercises`：从 [wger](https://wger.de/) **全量**同步已审核英文动作，并用 `is_featured` 标记约 150–200 条常用精选。

| 用途 | 范围 |
|------|------|
| Workout Agent / 今日计划 | 默认 `is_featured = true` |
| 搜索 / 浏览 / 点名动作 | 全库 |

## 许可与署名

- 上游动作内容多为 **CC BY-SA**（以每条 `license` / `license_url` 为准）。
- 展示动作详情时，必须显示 `attribution`（或等价署名）。
- 衍生作品需保持相同许可精神；勿删除 `source_url` / `license_author`。

## 表结构

- `supabase/migrations/20260819_exercise_catalog.sql`
- `supabase/migrations/20260819_exercises_is_featured.sql`（`is_featured`）

- 登录/匿名用户：**只读**活跃动作
- 写入：仅 Service Role（同步脚本）

`workout_logs.exercise_ids`：打卡时可关联动作 UUID。

## 同步步骤

```bash
# 全量 + 标记精选 160，并上传
npm run exercises:upload

# 仅生成本地 seed
npm run exercises:sync
```

等价命令：

```bash
node supabase/scripts/sync-exercises.mjs --all --featured=160 --upload
```

产物：`supabase/data/exercises.seed.json`。

## 客户端 / Edge

- `uni-app/src/lib/health/exercises.ts`
  - `listExercises({ featuredOnly, search })` — 浏览可全库
  - `pickPlanCandidates` — **默认精选**
- `supabase/functions/_shared/exercises.ts`
  - `fetchExerciseCandidates` — **默认精选**
  - `searchExercises` — 全库检索

页面与 Agent **不要**直连 wger。

## 中文覆盖

`supabase/scripts/exercise-i18n.mjs` 维护常用英文名 → 中文名。  
未命中时暂时保留英文名；精选子集中文覆盖率更高。
