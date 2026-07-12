
---

**User**

so the client wants the add tool feature to wave a part were you can add 2 tools for windows (win tool) or mac tool,
and they also want to be able to edit the featured tools and change prices etc 

---

**Cursor**

Exploring how tools and featured tools are modeled in the admin and storefront so we can plan Windows/Mac variants and featured-tool editing.


---

**User**

proceed

---

**Cursor**

Implementing Windows/Mac download links on the add-tool form and admin-managed featured tools with price editing.


---

**User**

proceed

---

**Cursor**

Continuing implementation: checking what's done and finishing the remaining storefront and admin pieces.


Finishing the remaining integrations: updating catalog, homepage, storefront downloads, and fixing incomplete files.


Here's what was implemented:

### 1. Windows + Mac downloads (Add/Edit Tool)
When adding or editing a **tool** (category) in Admin → Catalog → Add tool / Edit tool:
- **Windows download link** — stored in `download_url`
- **Mac download link** — stored in `download_url_mac`

Customers see **Windows** and **Mac** download buttons when browsing a tool on `/tools?category=...` and on device pages (falls back to the parent tool links if the device has no own link).

### 2. Featured tools (homepage)
- **Feature on homepage** checkbox + **featured order** on the tool form
- **Featured on homepage** panel at the top of Admin → Catalog — add/remove featured tools, preview homepage
- Homepage shows up to **4 featured tools** (categories) with “from K…” pricing
- If none are featured, it falls back to the old behavior (first 4 devices)

### 3. Quick price editing
In the catalog device table, **click any price** to edit inline — no need to open the full device edit page.

---

### Run this migration in Supabase
```sql
-- File: supabase/migrations/026_category_platform_downloads_and_featured.sql
```

This adds `download_url_mac`, `is_featured`, and `featured_sort_order` to `tool_categories`.

---

### How your client uses it
1. **Admin → Catalog → Add tool** — name, Windows link, Mac link, check **Feature on homepage**
2. **Add devices** under each tool with prices (iPhone 13, etc.)
3. **Click prices** in the catalog table to update them quickly
4. **Featured panel** — toggle which tools appear on the homepage

Build passes locally. Say if you want this committed and pushed.

---

**User**

remove the resend test email feature and then commit and push , and i have noticed why are cursor IDE free account hiting limit quickly they are not lasting someties just in one prompt

---

**Cursor**

Removing the Resend test email feature, then committing and pushing. Searching the codebase for related code.


---

**User**

proceed 

