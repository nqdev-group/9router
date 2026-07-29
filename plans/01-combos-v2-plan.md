# Combos V2 — Pipeline Configuration Dashboard

## Mục tiêu

Tái thiết kế trang quản lý Combos (`/dashboard/combos`) với bố cục mới, rõ ràng hơn, giúp người dùng có thể quản lý models trong combo trực quan ngay tại trang danh sách mà không cần mở modal edit.

## Route mới

`/dashboard/combos-v2` — giữ nguyên `/dashboard/combos` (V1) để tương thích ngược.

## Thay đổi chính so với V1

| V1 | V2 |
|---|---|
| Models bị truncate, chỉ hiện tối đa 3 cái + `+N more` | Tất cả models hiển thị đầy đủ trong vertical stepper |
| D&D sắp xếp cần mở modal riêng | Nút ↑↓ hiển thị inline khi hover, không cần modal |
| Strategy chỉ là `<select>` dropdown | 3 toggle button color-coded (emerald/sky/amber) |
| Card nhỏ, models bị giấu | Panel mở rộng, có numbered step indicator |
| Model caps badges dễ bỏ sót | Badges hiển thị ngay cạnh model name |
| Fusion judge picker ở card chính | Inline picker + reset button, chỉ hiện khi fusion active |
| Không phân biệt prefix/name | Visual split: prefix (uppercase tag) + /model-name |
| Copy button trong card | Tooltip wrapper với feedback "Copied!" |
| Delete confirm dùng alert | ConfirmModal component |

## Bố cục mỗi Combo Card

```
┌─────────────────────────────────────────────────────────┐
│  [colored left border] combo-name          [strategy badge]  │
│  3 models in chain · Sequential — next model on failure     │
│                                        [copy] [edit] [del]     │
├─────────────────────────────────────────────────────────┤
│  Route: [Fallback] [Round Robin] [Fusion]                  │
│                                                             │
│  ①  prefix / model-name  ▲▼✕                                │
│  │                                                          │
│  ②  prefix / model-name  ▲▼✕                                │
│  │                                                          │
│  ③  prefix / model-name  ▲▼✕                                │
│                                                             │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                          │
│  │  + Add Model                  │                          │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                          │
│                                                             │
│  (nếu Fusion) Judge: [Auto — model-name] x  Judge model    │
└─────────────────────────────────────────────────────────┘
```

## Manual Changes to Sidebar

**User manually edited `src/shared/components/Sidebar.js`:**

1. **Moved "Combos Pipeline" to Compression Context section** (line 60):
   ```javascript
   const compressionContextItems = [
     { href: "/dashboard/combos-v2", label: "Combos Pipeline", icon: "account_tree", isNew: true },
     // ... other compression items
   ];
   ```

2. **Enabled `isNew: true` badge rendering** (lines 208-212):
   ```javascript
   <span className="text-[13px] font-medium flex-1">{item.label}</span>
   {item.isNew && (
     <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold whitespace-nowrap">
       New
     </span>
   )}
   ```

3. **Corrected label alignment** (line 207): Added `flex-1` to label for proper badge positioning.

4. **Moved from main nav** (line 24): 
   ```javascript
   { href: "/dashboard/combos", label: "Combos (Legacy)", icon: "layers" },
   { href: "/dashboard/combos-v2", label: "Combos Pipeline", icon: "account_tree", isNew: true },
   ```
   - Added "(Legacy)" suffix to original Combos to distinguish as V1
   - Organized Combos Pipeline under Compression Context (logical grouping with RTK/CMEM engines)

## File cần tạo/sửa

- **New:** `src/app/(dashboard)/dashboard/combos-v2/page.js`
- **Edit:** `src/shared/components/Sidebar.js` — thêm sidebar link
- **Manual edit:** `src/shared/components/Sidebar.js` — Compression Context section placement + `isNew` badge render

## Chiến lược màu sắc (color-coded)

- **Fallback** — Emerald (#10b981): sequential, safety, reliable
- **Round Robin** — Sky (#0ea5e9): balanced, distribution, rotation
- **Fusion** — Amber (#f59e0b): expensive, high-quality, complex

Mỗi strategy gồm: dot indicator, left-border card accent, badge, toggle button active state.

## Dữ liệu & API

Tận dụng hoàn toàn API có sẵn — không cần backend changes:
- `GET /api/combos` → list combos
- `PUT /api/combos/:id` → cập nhật models
- `PATCH /api/settings` → cập nhật comboStrategies
- `GET /api/models` → model caps
- `GET /api/models/alias` → alias map
- `GET /api/providers` → connections
- `GET /api/combos` → combos (ModelSelectModal)

## File cần tạo/sửa

- **New:** `src/app/(dashboard)/dashboard/combos-v2/page.js`
- **Edit:** `src/shared/components/Sidebar.js` — thêm sidebar link

## Implementation notes

- Single-page component, không cần layout mới
- Dùng `ComboFormModal` cho create/edit modals (tái sử dụng từ shared)
- Dùng `ModelSelectModal` cho model picker (tái sử dụng từ shared)
- Mỗi combo được refresh locally (optimistic) sau khi save models, tránh fetch lại toàn bộ
- Strategy update gọi `PATCH /api/settings` giống cơ chế V1
- Inline model rename không persist — dùng Edit modal để đổi model ID

## Task Checklist

### ✅ Đã hoàn thành

- [x] Tạo page mới `src/app/(dashboard)/dashboard/combos-v2/page.js`
- [x] Sidebar: thêm link `/dashboard/combos-v2` với icon `account_tree`
- [x] Hiển thị danh sách combos dạng Panel Card với viền màu theo strategy
- [x] Vertical step indicator cho model chain (numbered circles + connector line)
- [x] Hover reveal controls (↑↓✕) trên từng model row
- [x] 3 strategy toggle buttons (Fallback/Round Robin/Fusion) với color code
- [x] Badge strategy hiển thị trên header mỗi card
- [x] Model prefix (provider) visual split + caps badges inline
- [x] Nút Add Model dạng dashed button
- [x] Fusion judge inline picker (chỉ hiện khi strategy = Fusion)
- [x] Header description text thay đổi theo strategy
- [x] Sử dụng lại `ComboFormModal` cho create/edit
- [x] Sử dụng lại `ModelSelectModal` cho model picking
- [x] `ConfirmModal` cho delete
- [x] Copy button với `useCopyToClipboard` feedback
- [x] Trạng thái empty (no combos) với illustration + CTA
- [x] Loading skeleton
- [x] Xóa model khỏi combo (inline remove button)
- [x] Lưu file plan vào `plans/01-combos-v2-plan.md`

### 🔄 Cần hoàn thiện

- [x] **Optimistic update khi add model**: `saveModels` cập nhật state ngay, revert nếu API fail
- [x] **Loading state trên nút Add/Remove model**: spinner ở header, disabled buttons khi `pendingModels[combo.id]` đang true
- [x] **Xác nhận trước khi xóa model cuối cùng**: `ConfirmModal` với cảnh báo trước khi xóa model cuối
- [x] **Inline model edit persist**: click model name → input → Enter/Blur → gọi `onEdit` → `saveModels` PUT API
- [x] **Tooltip "New" badge trên sidebar**: render badge `isNew` trong Sidebar component

### 🚀 Cải tiến tiềm năng

- [x] **Search/filter trong danh sách combos**: ô search lọc combo theo name hoặc model name
- [x] **Bulk add models**: paste list model IDs từ clipboard (modal textarea)
- [x] **Combo capability summary badge**: hiển thị union caps (vision/search/reasoning) ở header mỗi combo
- [x] **Export combos config**: copy JSON config của 1 combo xuống clipboard
- [x] **Import combos config**: paste JSON (JSON paste modal) để tạo combo hàng loạt
- [x] **Duplicate combo**: clone combo nhanh với tên auto-increment (`name-copy`, `name-copy-2`, ...)

### 🐛 Bugfixes

- [x] **React Hooks violation — `useMemo` sau early return**: di chuyển `filteredCombos` (`useMemo`) lên trước `if (loading) return` để tuân thủ Rules of Hooks. Nguyên nhân: search feature thêm `useMemo` sau loading guard.
- [x] **Popup Add Model V2**: tạo ModelSelectModalV2 mới (để không sửa ModelSelectModal gốc) với vertical list layout — radio indicator, prefix/model name rõ ràng, modal rộng (`lg`), mỗi dòng full-width dễ click.

---
claude --resume cee5718d-4eb0-47f8-bef0-60c756ebf683