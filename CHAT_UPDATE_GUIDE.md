# Chat UI Update - Testing Guide

## Changes Made

### 1. ✅ Three-Dot Menu Button on Each Message
- **Location**: Right side of each message bubble
- **Visibility**: Appears on **hover** (desktop) or **always visible** on mobile
- **Icon**: Three vertical dots (⋮) using `MoreVertical` from lucide-react
- **Hover effect**: Button gets lighter on hover

### 2. ✅ Context Menu Actions
Click the three-dot button to see:
- **Reply** — quote a specific message
- **Delete for me** — only you see it disappear
- **Delete for everyone** — replaces message with "🚫 This message was deleted"

### 3. ✅ Image Upload (Improved)
- Click 📷 button in input bar
- Pick any image (<5MB)
- Image preview appears below input
- Click X on preview to remove
- Send → image appears in message as clickable thumbnail

### 4. ✅ Tool Attachment (Working)
- Click 🔧 button in input bar
- Search for any tool (e.g., "iphone", "unlock")
- Click tool → appears in input preview
- Send → tool card displays in message with price, icon, description
- Click card → opens `/tools/[slug]` page

### 5. ✅ Reply to Message (Now Working)
- Click three-dot menu → "Reply"
- Blue reply preview bar appears above input
- Shows who you're replying to + snippet of their message
- Type your response
- Send → your message shows quoted message at top
- Click X on reply bar to cancel

### 6. ✅ Eye Status Icons
Shows delivery/read status on **YOUR sent messages**:
- 🔵 1 grey eye = message sent (awaiting delivery)
- 👀 2 grey eyes = message delivered (other person fetched it)
- 👁️‍🗨️ 2 cyan glowing eyes = message seen (other person read it)

### 7. ✅ Online Status
- Green dot + "Online" in chat header when both parties viewing chat
- "Offline" when other party closed tab/left chat
- Uses Supabase Realtime presence tracking

### 8. ✅ Delete Messages
- **Delete for me**: Message disappears only from your screen
- **Delete for everyone**: Shows "🚫 This message was deleted" to both parties
- Only available on your own messages

---

## How to Test End-to-End

### Setup (Supabase)
1. Run both migrations from `supabase/migrations/`
2. Create `support-chat-images` public bucket with 5MB limit

### Test Scenario 1: Send Image
**As Customer:**
1. Go to Dashboard → Messages
2. Click 📷
3. Pick an image file
4. Type: "Here's my issue"
5. Click Send
6. Verify image appears in bubble with timestamp + eye icons

**As Admin:**
1. Go to Admin → Messages
2. Select the customer
3. Verify image shows in their message
4. Click three-dot menu → "Delete for everyone"
5. Image message shows "🚫 This message was deleted"

### Test Scenario 2: Reply to Message
**As Customer:**
1. Send: "I need help with activation"
2. Admin replies: "What's your device model?"
3. Hover over admin's message → click three-dot menu
4. Click "Reply"
5. Blue reply bar appears
6. Type: "iPhone 6"
7. Send
8. Your message shows admin's quote at top: "What's your device model?"

**As Admin:**
1. See the reply chain in your chat
2. Verify the quoted message shows in customer's response

### Test Scenario 3: Tool Attachment
**As Admin:**
1. Type a message asking what tool to use
2. Click 🔧
3. Search "iPhone" (or similar)
4. Click a tool card
5. Tool name + icon appear in input
6. Send
7. Customer sees clickable tool card with:
   - Tool icon
   - Tool name
   - Description
   - Price (e.g., "ZMW 420.00")
   - Wrench icon
   - "Tap to view tool →"

**As Customer:**
1. Click the tool card
2. Navigates to `/tools/[slug]` page
3. Can use the tool immediately

### Test Scenario 4: Menu Interactions
**Desktop:**
1. Hover over any message
2. Three-dot button appears on right
3. Click it → context menu pops up at cursor
4. Try "Reply", "Delete for me", "Delete for everyone"

**Mobile:**
1. Long-press (500ms hold) on message
2. Context menu appears
3. Tap "Reply" or delete options

### Test Scenario 5: Real-Time Sync
**Two Tabs:**
1. Open Chat in Tab A (Customer)
2. Open Chat in Tab B (Admin - same customer)
3. In Tab A: Send message
4. In Tab B: Should see message appear **instantly**
5. In Tab B: Send reply
6. In Tab A: Verify reply appears **instantly**
7. Check eye status transitions: sent → delivered → seen

---

## Expected Behaviors

### Messages With Images
```
┌─────────────────────────────┐
│         [Image]             │
│                             │
│ "Aug 13, 2026, 01:08 PM  👁 👁 (cyan)" │
└─────────────────────────────┘
   ⋮ (three-dot menu)
```

### Messages With Reply
```
┌──────────────────────────────┐
│ ┃ Admin: "What model?"       │
│ │ (quoted)                   │
│                              │
│ "iPhone 6"                   │
│                              │
│ Aug 13, 2026, 01:09 PM 👁👁  │
└──────────────────────────────┘
   ⋮ (three-dot menu)
```

### Messages With Tool
```
┌──────────────────────────────┐
│ ┌─ [ICON] iPhone Unlock ──┐  │
│ │ Fast iPhone unlocking   │  │
│ │ ZMW 420.00              │  │
│ │ Tap to view tool →  🔧  │  │
│ └─────────────────────────┘  │
│                              │
│ Aug 13, 2026, 01:10 PM 👁👁  │
└──────────────────────────────┘
   ⋮ (three-dot menu)
```

### Deleted Message
```
┌──────────────────────────────┐
│ 🚫 This message was deleted  │
└──────────────────────────────┘
```

---

## Debugging

### Images not uploading?
1. Open DevTools → Console
2. Look for: `[Chat] Sending:` log with `image_data` field
3. Check: `support-chat-images` bucket exists and is public
4. Check file size < 5MB
5. Check upload response in Network tab

### Context menu not appearing?
1. Make sure you're hovering/long-pressing the **message bubble itself**
2. Three-dot button should appear on hover (desktop)
3. Try right-click as fallback
4. Check browser console for JavaScript errors

### Reply not showing?
1. Click three-dot → "Reply" 
2. Blue bar should appear above input with quoted message
3. Check the reply_to_id is set in logs: `[Chat] Sending: { ... reply_to_id: "xxx" }`
4. Verify DB has reply_to_id column: `SELECT reply_to_id FROM support_messages LIMIT 1;`

### Eyes not changing?
1. Send message → should see 1 grey eye immediately
2. Switch to other tab/user → should see 2 grey eyes within 2-3 sec
3. Click into chat → should see 2 cyan glowing eyes
4. Check `read_by_user_at` / `read_by_admin_at` are being set in DB

### Realtime not working?
- Check Supabase client is configured
- Fall back to polling (messages refresh every 15 seconds)
- Check browser console for Realtime errors
- Try hard refresh (Ctrl+Shift+R)

---

## Port
**Dev server running on: http://localhost:3001**

Test in your browser now! 🚀
