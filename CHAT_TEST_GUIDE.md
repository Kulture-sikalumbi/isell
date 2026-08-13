# WhatsApp-Style Chat - End-to-End Test Guide

## Setup
1. **Run migrations** in Supabase dashboard:
   - Copy SQL from `supabase/migrations/20240813_support_chat_v2.sql`
   - Copy SQL from `supabase/migrations/20240813_admin_settings.sql`
   - Paste & execute in Supabase SQL Editor

2. **Create Storage Bucket**:
   - Supabase Dashboard → Storage
   - Create bucket: `support-chat-images`
   - Make it public (toggle on)
   - Set max file size: 5 MB

3. **Enable pg_cron** (for scheduled cleanup):
   - Supabase Dashboard → SQL Editor
   - Run: `CREATE EXTENSION IF NOT EXISTS pg_cron;`
   - Then: `SELECT cron.schedule('cleanup-old-chats', '0 2 * * *', 'SELECT cleanup_old_support_messages()');`

4. **Run dev server**:
   ```bash
   npm run dev
   ```
   Visit: http://localhost:3000

---

## Test as Customer (User)

### 1. Login
- Go to http://localhost:3000
- Login as a customer account

### 2. Open Support Chat
- Dashboard → Messages tab
- You should see: "Talk to admin" section with modern chat UI

### 3. Test Text Message
- Type: "Hi, I need help with my order"
- Press Enter or click Send button
- Message should appear on right side (cyan bubble)
- Should show 1 grey eye icon (sent status)
- Wait ~2 seconds → should show 2 grey eyes (delivered)

### 4. Test Image Upload
- Click 📷 image button
- Pick any image file (<5MB)
- Image should preview in input area
- Type text: "Here's a screenshot"
- Send
- Image should display in bubble with clickable link

### 5. Test Tool Attachment
- Click 🔧 wrench button
- Search for a tool (e.g., "iphone", "unlock")
- Click a tool card
- Tool should show in input area
- Send
- Message should display tool card with name, icon, price, description

### 6. Test Reply
- Right-click (or long-press 500ms) on an existing message
- Select "Reply"
- Reply preview bar should appear above input
- Type: "Yes, this is important"
- Send
- Your message should show the replied-to message as a quote at the top

### 7. Test Online Status
- Look at chat header → should see customer avatar + name
- Next to name → green dot "Online" (both parties viewing chat in real-time)
- Close browser tab → after ~5 sec should show "Offline"

---

## Test as Admin

### 1. Login
- Logout and re-login as admin account
- Or go directly to http://localhost:3000/admin

### 2. Open Messages
- Admin → Messages (or left sidebar → Messages)
- Conversation list showing all customer chats
- Unread badge showing unread message count

### 3. Select a Customer
- Click on customer in left sidebar
- Chat loads with that customer's message history
- You should see all customer's messages on LEFT (white bubbles)
- Your (admin) messages on RIGHT (cyan bubbles)

### 4. Test Admin Reply
- Type: "Hi, we can help with that!"
- Send
- Message appears on right with eye icons
- Customer should see 2 grey eyes almost immediately (delivered)
- When customer views chat, admin sees 2 cyan eyes (seen)

### 5. Test Admin Context Menu
- Right-click on one of your messages
- Options: Reply, Delete for me, Delete for everyone
- Click "Delete for everyone"
- Message should show "🚫 This message was deleted"
- Both parties see deleted status

### 6. Test Clear Chat
- Look at chat header (top right)
- Red "Clear chat" button should be visible
- Click it → confirm dialog
- All messages replace with deleted bubbles
- Empty chat

### 7. Go to Chat Settings
- Admin → Settings (top right menu or sidebar)
- Scroll down → "Chat Storage Management" section
- Toggle "Auto-clear old conversations"
- Set days: 30
- Click "Save Settings"
- Should show: "Chats older than 30 days will be deleted daily"

### 8. Test Auto-Clear (manual trigger)
- Open Supabase SQL Editor
- Run: `SELECT cleanup_old_support_messages();`
- Then: `SELECT * FROM admin_settings WHERE key = 'auto_clear_chat_days';`
- Should see value: "30"
- Check old messages (created_at < now - 30 days) are marked deleted_for_all

---

## Test Real-Time Sync

### Multi-Tab Test
1. Open http://localhost:3000 (customer) in Tab A
2. Open http://localhost:3000/admin (admin) in Tab B
3. In Tab A (customer): Send message
4. In Tab B (admin): Should see message appear instantly (no refresh needed)
5. In Tab B (admin): Send reply
6. In Tab A (customer): Should see reply appear instantly

### Real-Time Status
- Send message in Tab A
- Should see: 1 grey eye (sent)
- Click into Tab B → opens chat
- Back in Tab A: Should see 2 cyan eyes (seen) within 1 sec

---

## Troubleshooting

### Images not uploading
- Check `support-chat-images` bucket exists in Supabase Storage
- Check bucket is public
- Check file size < 5 MB
- Check browser console for errors

### Realtime not working
- Check Supabase client is configured in `.env.local`
- Try refreshing page (falls back to 15s polling)
- Check browser console for Realtime errors

### Auto-clear not working
- Check migrations ran successfully
- Check `admin_settings` table exists: `SELECT * FROM admin_settings;`
- For testing: Run cleanup function manually: `SELECT cleanup_old_support_messages();`
- Check `pg_cron` enabled: `SELECT cron.schedule_name FROM cron.job;`

### Chat not loading
- Check TypeScript: `npx tsc --noEmit`
- Check network tab in DevTools for API errors
- Check Supabase logs for permission errors

---

## Key Endpoints to Test via DevTools Console

```javascript
// Get settings
await fetch('/api/admin/settings').then(r => r.json()).then(d => console.log(d));

// Update auto-clear days
await fetch('/api/admin/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'auto_clear_chat_days', value: '7' })
}).then(r => r.json()).then(d => console.log(d));

// Get messages
await fetch('/api/support/messages').then(r => r.json()).then(d => console.log(d));

// Get admin messages
await fetch('/api/admin/support/[userId]/messages').then(r => r.json()).then(d => console.log(d));

// Search tools
await fetch('/api/support/tools?q=iphone').then(r => r.json()).then(d => console.log(d));
```

---

## Visual Indicators Checklist

- [ ] Message bubbles: mine (cyan right), theirs (white left)
- [ ] Eye icons: 1 eye sent, 2 eyes grey delivered, 2 eyes cyan seen
- [ ] Online status: green dot + "Online" in header
- [ ] Reply bar: blue-bordered preview above input
- [ ] Tool card: shows icon, name, description, price, wrench icon
- [ ] Image: clickable thumbnail with overlay link
- [ ] Context menu: appears on right-click, positioned at cursor
- [ ] Delete indication: "🚫 This message was deleted" bubble
- [ ] Chat settings: toggle + days slider in admin settings

---

## Notes
- **Eye icons** use grey (#71717a) for sent/delivered, cyan (#06b6d4) with glow for seen
- **Delivery tracking** happens when other party fetches messages
- **Seen status** is updated when other party marks as read (fetches chat)
- **Storage**: chat images stored in `support-chat-images` bucket, organized by user
- **Auto-clear**: runs daily at 2 AM UTC, marks messages deleted_for_all (not hard-delete)
