import { api } from './api.js';

// Google Sheets is the durable source of truth. Polling provides near-live updates
// until a dedicated realtime transport (e.g. Firebase/Supabase) is configured.
export function subscribeToForum(roomId, onData, intervalMs = 8000) {
  let active = true;
  let timer;
  const refresh = async () => {
    try { const result = await api('forumFeed', { room_id: roomId }); if (active) onData(result.data); }
    catch (error) { if (active) console.error('Forum refresh failed', error); }
    if (active) timer = window.setTimeout(refresh, intervalMs);
  };
  refresh();
  return () => { active = false; window.clearTimeout(timer); };
}
