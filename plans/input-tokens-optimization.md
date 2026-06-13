# Kế Hoạch Tối Ưu Input Tokens — 9Router

**Ngày:** 2026-06-10
**Mục tiêu:** Giảm 40-60% input tokens tiêu thụ qua tối ưu RTK, cache, chunking, preprocessing, và fallback strategy.

---

## 1. Phân Tích Hiện Trạng

### 1.1 RTK Engine — Đã Có, Cần Tinh Chỉnh

| Thành phần | Trạng thái | File chính |
|---|---|---|
| Core compression engine | ✅ Hoàn chỉnh | `open-sse/rtk/index.js` |
| 21 bộ lọc (git, shell, build, log, generic) | ✅ Đầy đủ | `open-sse/rtk/filters/*.js` |
| Auto-detect filter | ✅ Hoạt động | `open-sse/rtk/autodetect.js` |
| Config resolver + intensity presets | ✅ Hoàn chỉnh | `open-sse/rtk/configResolver.js` |
| Dashboard UI (RTK Engine page) | ✅ Đầy đủ | `src/app/(dashboard)/dashboard/settings/rtk-engine/page.js` |
| Dashboard toggle (Endpoint page) | ✅ Có sẵn | `EndpointPageClient.js` lines 1057-1085 |
| API endpoints (config, filters, test, stats) | ✅ Đầy đủ | `src/app/api/settings/rtk/*` |
| Caveman mode (giảm output tokens) | ✅ Có sẵn | `open-sse/rtk/caveman.js` |

**Vấn đề phát hiện:**
- RTK mới nén `tool_result` content, chưa xử lý `system` messages, `user` messages content
- Không có preprocessing cho text đầu vào (trim whitespace, xóa comment, xóa code block không cần)
- Auto-detect window chỉ 1KB — có thể bỏ sót content type với header dài
- `minCompressSize` mặc định 500 bytes — quá cao cho các tool_result nhỏ
- Chưa có cơ chế batch compress nhiều messages cùng lúc

### 1.2 Response Cache — Chưa Có

| Loại cache | Trạng thái |
|---|---|
| LRU cache cho LLM responses | ❌ Không tồn tại |
| Semantic cache (cùng intent → cached response) | ❌ Không tồn tại |
| Request-level dedup | ❌ Không tồn tại |

**Các cache hiện có** chỉ là ad-hoc từng module riêng lẻ (pricing cache 5s, model catalog cache 5ph, OAuth token cache), không liên quan tới LLM response caching.

### 1.3 Combo/Fallback System — Đã Có, Cần Optimization

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| Multi-model combo | ✅ Hoàn chỉnh | `open-sse/services/combo.js` |
| Account fallback + backoff | ✅ Hoàn chỉnh | `open-sse/services/accountFallback.js` |
| Error rules config | ✅ Hoàn chỉnh | `open-sse/config/errorConfig.js` |
| Rotation strategies (fallback/round-robin) | ✅ Có sẵn | `combo.js` lines 37-65 |

### 1.4 Input Chunking — Chưa Có

| Kỹ thuật | Trạng thái |
|---|---|
| Tự động chunk input quá dài | ❌ Không tồn tại |
| Parallel processing chunks | ❌ Không tồn tại |
| Kết hợp kết quả từ nhiều chunks | ❌ Không tồn tại |

### 1.5 Token Tracking & Cost Calculation — Đã Có

| Thành phần | Trạng thái |
|---|---|
| Per-request token counting | ✅ Hoàn chỉnh | `usageTracking.js` |
| RTK savings tracking (per-filter) | ✅ Hoàn chỉnh | `usageRepo.js` lines 700-898 |
| Pricing constants (3-layer fallback) | ✅ Hoàn chỉnh | `src/shared/constants/pricing.js` |
| Cost calculation by model | ✅ Hoàn chỉnh | `usageRepo.js` calculateCost() |

---

## 2. Kế Hoạch Cải Thiện

### Phase 1: Tối Ưu RTK Engine (Tuần 1-2)

#### 1.1 Mở rộng RTK compression lên system/user messages

- **Hiện tại:** RTK chỉ compress `tool_result` và `function_call_output`
- **Cần thêm:** Compress `system` message content (giảm prompt dài), compress `user` message content (code blocks, long text)
- **File ảnh hưởng:** `open-sse/rtk/index.js` (mở rộng `compressMessages()`), bổ sung filter mới `compress-system`, `compress-user`
- **Tác động:** +10-15% token savings bổ sung

#### 1.2 Tối ưu auto-detect threshold

- `minCompressSize`: 500 → 200 bytes (bắt cả tool_result nhỏ)
- `maxCompressSize`: 10MB → giữ nguyên (context window lớn nhất hiện tại ~2M tokens)
- Auto-detect window: 1KB → 4KB (bắt chính xác hơn content type)
- **File ảnh hưởng:** `settingsRepo.js` (defaults), `autodetect.js` (DETECT_WINDOW)

#### 1.3 Thêm intelligent batching cho RTK

- Gom nhiều messages nhỏ vào 1 lần compress → giảm overhead function calls
- **File mới:** `open-sse/rtk/batchCompress.js`
- **Tác động:** Giảm latency của RTK pipeline 15-20%

#### 1.4 Cải thiện caveman integration

- Hiện tại caveman inject sau RTK — nên inject trước để RTK có thể nén thêm
- Cho phép caveman level tự động scaling dựa trên độ dài input
- **File ảnh hưởng:** `chatCore.js` (reorder steps)

### Phase 2: Response Cache Layer (Tuần 3-4)

#### 2.1 LRU Cache cho identical requests

- Cache key: hash của `(model, messages_hash, temperature, max_tokens)`
- TTL: 5 phút (cấu hình được)
- Dung lượng: 100 entries (cấu hình được)
- Lưu cả response text lẫn usage data
- **File mới:** `open-sse/services/responseCache.js`
- **Tác động:** Giảm 10-20% requests trùng lặp (tool retry, user repeat)

```js
// Proposed API
class ResponseCache {
  constructor(maxSize = 100, ttlMs = 300000)
  get(model, messages) → { content, usage } | null
  set(model, messages, response)
  invalidate(pattern?)
}
```

#### 2.2 Embedding-based semantic cache

- Với các câu hỏi cùng intent nhưng khác wording → trả cached response
- Dùng embedding từ model rẻ (gemini-flash, deepseek) để tính similarity
- Threshold: cosine similarity > 0.95
- **File mới:** `open-sse/services/semanticCache.js`
- **Cân nhắc:** Có thể tốn thêm latency và cost cho embedding — nên là opt-in feature

#### 2.3 Prompt caching header optimization

- Anthropic prompt caching (`cache_control`) đã được hỗ trợ (claudeHelper.js)
- Cần config UI để user biết và bật/tắt
- Thêm OpenAI prompt caching (`cached_tokens` trong `prompt_tokens_details`)
- **File ảnh hưởng:** `claudeHelper.js`, thêm dashboard toggle

### Phase 3: Input Preprocessing Pipeline (Tuần 5-6)

#### 3.1 Content cleaning filters

- Trim whitespace, normalize newlines, remove BOM
- Strip redundant code comments
- Collapse consecutive blank lines
- **File mới:** `open-sse/rtk/preprocessors/contentCleaner.js`
- **Tác động:** 2-5% token savings (nhẹ nhưng zero-risk)

#### 3.2 Smart context pruning

- Phát hiện và loại bỏ code blocks hoàn toàn giống nhau trong conversation history
- Dedup file paths, error messages lặp lại
- **File mới:** `open-sse/rtk/preprocessors/contextPruner.js`
- **Tác động:** 5-15% tùy vào conversation pattern

#### 3.3 Auto-summarize long tool results

- Với tool_result > 200 dòng, tự động summarize trước khi compress
- Dùng model rẻ (gemini-flash, deepseek-chat) để tóm tắt
- **Cân nhắc:** Trade-off giữa tokens tiết kiệm vs cost gọi thêm model
- **Nên là opt-in feature** với daily budget limit
- **File mới:** `open-sse/rtk/summarizer.js`

### Phase 4: Chunking Strategy (Tuần 7-8)

#### 4.1 Automatic input chunking

- Phát hiện input vượt quá context window của target model
- Chia thành chunks overlapping (10% overlap để giữ context)
- Gửi từng chunk riêng lẻ, collect responses
- **File mới:** `open-sse/handlers/chatCore/chunkedHandler.js`
- **Tích hợp:** Vào `chatCore.js` trước translate step

#### 4.2 Smart chunk boundary detection

- Chunk tại natural boundaries (function boundaries, file boundaries, paragraph breaks)
- Không cắt giữa code block, tool result, hay conversation turn
- **File mới:** `open-sse/utils/chunkBoundaryDetector.js`

#### 4.3 Result merging strategies

- **replace:** Chỉ giữ response từ chunk cuối (cho codegen tasks)
- **merge:** Gom tất cả responses (cho analysis tasks)
- **summary:** Tóm tắt từng chunk response (cho large document tasks)
- **File mới:** `open-sse/handlers/chatCore/chunkMerger.js`

### Phase 5: Cost-Optimized Fallback (Tuần 9-10)

#### 5.1 Token-cost priority sorting

- Khi tạo combo, tự động sắp xếp model theo cost/token (rẻ → đắt)
- Cho phép user đặt budget cap per request / per day
- **File ảnh hưởng:** `open-sse/services/combo.js`, thêm `getCheapestFirst()` strategy

#### 5.2 Free tier auto-routing

- Tự động detect và route non-critical requests sang free tiers
- Critical requests (code execution, tool calls) → paid tiers
- **File mới:** `open-sse/services/tierRouter.js`

#### 5.3 Model capability-aware routing

- Chọn model phù hợp nhất dựa trên task type
- Code generation → model mạnh (opus, gpt-5)
- Code review → model rẻ (haiku, flash)
- Text analysis → model budget (glm, minimax)
- **File mới:** `open-sse/services/taskClassifier.js`

### Phase 6: Monitoring & Dashboard (Tuần 11-12)

#### 6.1 Token saver detail report nâng cấp

- Thêm filter theo time range, model, filter type
- Export CSV/JSON
- So sánh before/after token usage chart
- **File ảnh hưởng:** `packages/components/token-saver/*`, `usageRepo.js`

#### 6.2 Real-time token saving dashboard

- WebSocket push real-time savings
- Per-request breakdown trong dashboard live log
- **File mới:** `src/app/api/settings/token-saver/realtime/route.js`

#### 6.3 Cost avoidance calculator

- Tính toán "số tiền đã tiết kiệm được" dựa trên pricing constants
- So sánh với cost nếu không dùng RTK + cache
- **Tích hợp:** Vào TokenSaverReport component

---

## 3. Ước Lượng Impact

| Optimization | Token Savings | Implementation Effort | Risk |
|---|---|---|---|
| RTK mở rộng sang system/user messages | 10-15% | Medium (3-5 days) | Low |
| RTK threshold optimization | 3-5% | Low (1 day) | Very Low |
| LRU response cache | 10-20% (requests) | Medium (4-6 days) | Low |
| Semantic cache | 5-10% (requests) | High (8-10 days) | Medium |
| Content cleaning | 2-5% | Low (2 days) | Very Low |
| Smart context pruning | 5-15% | Medium (5-7 days) | Medium |
| Auto-summarize tool results | 15-25% | High (8-10 days) | High |
| Input chunking | 10-20% (trên long context) | High (10-14 days) | Medium |
| Cost-optimized fallback | 20-50% (cost) | Medium (5-7 days) | Low |
| Free tier auto-routing | 30-70% (cost) | High (7-10 days) | Medium |

## 4. Khuyến Nghị Ngay Lập Tức (Quick Wins)

1. **Giảm `minCompressSize` từ 500 → 200 bytes** — 1 line change, low risk
2. **Tăng auto-detect window từ 1KB → 4KB** — 1 line change, low risk
3. **Cấu hình combo mặc định với cost-ordered priority** — no code change
4. **Bật RTK aggressive mode làm mặc định** — thay đổi config default
5. **Enable Anthropic prompt caching trong claudeHelper.js** — đã support, cần toggle UI

## 5. Architecture Diagram (Đề Xuất)

```
┌──────────────┐
│  Client Request│
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  1. Response Cache   │ ← LRU + Semantic (Phase 2)
│  (check cache first) │
└──────┬──────┬───────┘
       │miss  │hit ──→ Return cached
       ▼
┌──────────────────────┐
│  2. Input Chunking   │ ← Nếu input > context window (Phase 4)
│  (smart split)       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  3. Preprocessing    │ ← Clean + prune (Phase 3)
│  (content cleaning)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  4. Format Translate │ ← (existing)
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  5. RTK Compression  │ ← Enhanced (Phase 1)
│  (all messages type) │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  6. Caveman Injection│ ← Reordered before executor
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  7. Tier Router      │ ← (Phase 5)
│  (cost-optimized)    │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────┐
│  8. Executor Dispatch  │ ← (existing)
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  9. Response → Cache   │ ← Save to cache (Phase 2)
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  10. Usage Tracking    │ ← Enhanced RTK stats
└────────────────────────┘
```

---

## 6. Kết Luận

9Router đã có nền tảng RTK rất mạnh với 21 filters, auto-detect, caveman mode. Các cải thiện chính cần tập trung:

1. **Ngay lập tức:** Tinh chỉnh RTK threshold + config defaults (0 code, chỉ config)
2. **Ngắn hạn (Phase 1+2):** Mở rộng RTK coverage + LRU response cache
3. **Trung hạn (Phase 3+4):** Input preprocessing pipeline + chunking
4. **Dài hạn (Phase 5+6):** Cost-optimized routing + monitoring dashboard

Tổng effort ước lượng: **8-12 weeks** cho full implementation, **4-6 tuần** cho core features (Phase 1+2+quick wins).
