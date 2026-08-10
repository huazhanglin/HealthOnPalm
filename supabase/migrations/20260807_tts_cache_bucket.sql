-- TTS 临时缓存桶：Edge Function 用 service role 上传，客户端通过签名 URL 下载播放
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tts-cache',
  'tts-cache',
  false,
  5242880,
  array['audio/mpeg', 'audio/mp3']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
