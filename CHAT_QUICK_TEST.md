# Quick Chat Test Checklist

## What Changed
✅ **Three-dot menu button** added to each message (visible on hover)
✅ **Comprehensive logging** added for debugging image uploads
✅ **Context menu** now properly positions and dismisses
✅ **Reply functionality** fully working
✅ **Tool attachments** confirmed working

## What to Test Now

### 1. Three-Dot Menu (Most Important!)
```
Hover over any message bubble
→ Three vertical dots (⋮) appear on the right
→ Click them
→ See: Reply | Delete for me | Delete for everyone
```

### 2. Send Image
**As Customer:**
1. Go to Dashboard → Messages
2. Click 📷 button
3. Pick any image file
4. **WATCH BROWSER CONSOLE** (F12 → Console tab)
   - Should see: `[Chat] Sending: { image_data: "data:image/jpeg;base64,..." }`
5. Click Send
   - Should see: `[Chat] Response: 200 { message: {...} }`
6. Image should appear in bubble

**As Admin:**
1. Go to Admin → Messages → Select customer
2. Image should be visible in customer's message
3. Can click three-dot menu → "Delete for everyone"

### 3. Check Logs in Console
After sending image, you should see:

```
[Chat] Sending: { image_data: "data:image/jpeg;base64,...", ... }
[API] Image data received, size: 245822
[API] Regex matched, uploading... { contentType: "image/jpeg", base64Size: 184364 }
[Upload] Starting... { userId: "...", filePath: "chat/.../1692432000123.jpg", size: 138273, contentType: "image/jpeg" }
[Upload] Success: { path: "chat/.../1692432000123.jpg", id: "..." }
[Upload] Public URL: "https://...supabase.co/storage/v1/object/public/support-chat-images/chat/.../1692432000123.jpg"
[API] Image uploaded: "https://...supabase.co/storage/v1/object/public/support-chat-images/chat/.../1692432000123.jpg"
[Chat] Response: 200 { message: { ... image_url: "https://..." } }
[Chat] Added message: { ..., image_url: "https://..." }
```

If you see errors like:
- `[Upload] Failed: ...` → Storage bucket issue
- `[API] Image data received, size: 0` → Image compression failed
- Missing logs → Network request failed

### 4. Test All Three Interactions

#### Test A: Message + Reply
1. **Customer** sends: "I need help"
2. **Admin** replies: "Sure, what's the issue?"
3. **Customer** hover admin's message → three-dot → Reply
4. **Customer** types: "iPhone activation"
5. **Customer** sends
6. Customer's message should show quoted text at top

#### Test B: Message + Image
1. **Customer** sends image
2. **Admin** sees image
3. **Admin** three-dot → Delete for everyone
4. Both see "🚫 This message was deleted"

#### Test C: Message + Tool
1. **Admin** three-dot (on their own message) → (no tool field yet, but should work)
2. **Admin** uses 🔧 tool picker
3. Attach "iPhone Unlock" tool
4. Send
5. **Customer** sees tool card with icon, name, price, description

### 5. Eye Status Icons
- Send message → see 1 grey eye (sent)
- Wait 2 sec → see 2 grey eyes (delivered)
- Other person views chat → see 2 cyan glowing eyes (seen)

### 6. Context Menu
Three-dot button should show:
- ✅ Reply (all messages)
- ✅ Delete for me (your messages only)
- ✅ Delete for everyone (your messages only)

---

## URLs
- **Customer**: http://localhost:3001/dashboard?tab=messages
- **Admin**: http://localhost:3001/admin/messages

## Open DevTools
```
F12 → Console tab
Filter by: "[Chat]", "[API]", "[Upload]"
```

## If Image Still Not Showing on Other Side

1. **Check bucket exists**: Supabase Dashboard → Storage → `support-chat-images`
2. **Check bucket is public**: Toggle switch should be ON
3. **Check Supabase client configured**: Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Check logs on other side**: 
   - Admin sends image? Check customer's console for `[Chat] Added message: { ..., image_url: "..." }`
   - If missing: Realtime sync not working, try manual refresh F5

## Report Format
When testing, note:
- [ ] Three-dot menu appears on hover
- [ ] Context menu shows Reply/Delete options
- [ ] Reply bar appears and quote shows
- [ ] Images upload successfully (check console logs)
- [ ] Images appear on other person's side
- [ ] Eye status changes (sent → delivered → seen)
- [ ] Delete options work ("Delete for everyone" shows 🚫)

---

Test now and let me know what you see! 🚀
