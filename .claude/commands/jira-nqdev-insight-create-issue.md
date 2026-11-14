---
description: Phân tích yêu cầu khách hàng bằng skill nqdev-client-requirement-insight rồi tạo issue trên Jira (QUYIT) qua tracker-jira-nqdev, tự điền Epic/Labels/Sprint/Fix version/Estimate mặc định cho quy trình 9router
argument-hint: "<mô tả yêu cầu khách hàng cần phân tích>" [--epic <KEY>] [--sprint-id <ID>] [--fix-version "<name>"] [--label <name>]
allowed-tools: Skill, Bash(curl:*), AskUserQuestion, Read
---

# Insight → Jira — $ARGUMENTS

## Bước 0 — Nếu $ARGUMENTS rỗng hoặc là `menu`

Hiển thị NGAY khối menu bên dưới rồi DỪNG — không gọi skill, không gọi API, không cần kiểm tra credentials.

```
🎯 /jira-nqdev-insight-create-issue — Insight → Jira (QUYIT, repo 9router)

  menu                                                Hiện menu này
  "<mô tả yêu cầu>"                                   Phân tích + tạo issue Jira với metadata mặc định
    [--epic <KEY>]                                    Override Epic Link (mặc định: QUYIT-563)
    [--sprint-id <ID>]                                Override Sprint (mặc định: sprint đang active)
    [--fix-version "<name>"]                          Override Fix version (mặc định: "Tháng <tháng hiện tại>")
    [--label <name>]                                   Thêm label (mặc định luôn có: NQDEV)

Nếu không truyền flag tương ứng, mặc định dùng:
  - EPIC: QUYIT-563
  - Labels: NQDEV
  - Sprint: sprint đang ở trạng thái active (vd hiện tại là "QUYIT Sprint 34" — resolve động
    qua Agile API mỗi lần chạy, KHÔNG hardcode tên/id, để không bị lỗi thời khi sang sprint khác)
  - Fix versions: "Tháng <tháng hiện tại>/<năm hiện tại>" (vd hiện tại là "Tháng 9/2026" — tính
    động theo ngày chạy lệnh, KHÔNG hardcode, để không bị lỗi thời khi sang tháng khác)
  - Original estimate: quy đổi từ ước tính person-days của skill insight (1d = 8h, lấy trung điểm range)

Ví dụ:
  /jira-nqdev-insight-create-issue "Combos Pipeline: khi model lỗi, skip model đó 5 phút rồi tự bỏ skip"
  /jira-nqdev-insight-create-issue "Thêm export CSV cho trang usage" --fix-version "Tháng 10/2026"
  /jira-nqdev-insight-create-issue "Sửa bug OAuth refresh token" --epic QUYIT-600 --label bug

Cần cấu hình trước: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN (xem mục "Cấu hình bắt buộc" bên dưới)
```

## Cấu hình bắt buộc (biến môi trường, KHÔNG hardcode, KHÔNG ghi vào file)

- `JIRA_BASE_URL` — mặc định `https://nhquydev.atlassian.net`
- `JIRA_EMAIL` — email tài khoản Atlassian gắn với token
- `JIRA_API_TOKEN` — tạo tại https://id.atlassian.com/manage-profile/security/api-tokens

Nếu thiếu biến nào: dừng lại, yêu cầu người dùng `export JIRA_EMAIL=... JIRA_API_TOKEN=... JIRA_BASE_URL=...` trước khi chạy tiếp (giống `/tracker-jira-nqdev`).
**Không bao giờ hỏi xin token qua chat, không echo/log/ghi giá trị token ra bất kỳ file nào.**

## Cấu hình mặc định (quy trình cố định của 9router — có thể override bằng flag)

| Field | Mặc định | Override flag |
|---|---|---|
| Project | `QUYIT` | — (cố định) |
| Issue type | `Task` (id `10008`) | — (cố định) |
| Epic Link | `QUYIT-563` ("9Router Proxy") — field `customfield_10014` | `--epic <KEY>` |
| Labels | `["NQDEV"]` — field `labels` | `--label <name>` (cộng dồn, không thay thế) |
| Board (để resolve sprint active) | id `10` ("QuyIT Platform Board") | — (cố định) |
| Sprint | sprint có `state=active` trên board `10` tại thời điểm chạy — field `customfield_10020` | `--sprint-id <ID>` |
| Fix version | version có tên đúng `"Tháng <M>/<YYYY>"` theo ngày hệ thống hiện tại, project `QUYIT` | `--fix-version "<name>"` |
| Original estimate | trung điểm range person-days do skill insight ước tính, quy đổi `1d = 8h` | — (luôn tính từ kết quả phân tích) |

## Quy trình thực hiện

### Bước 1 — Phân tích yêu cầu

Gọi `Skill` với `skill: "nqdev-client-requirement-insight"`, `args: "<phần mô tả yêu cầu trong $ARGUMENTS, đã bỏ hết flag>"`.

Từ kết quả phân tích, trích ra:
- **Tên tính năng/module** ngắn gọn → dùng làm `summary` (tiêu đề issue). Format: `9router: <tên tính năng>`.
- **Module breakdown** (danh sách hạng mục công việc chính) → bullet list trong description.
- **Estimate person-days** (dạng `~X-Y person-days` hoặc số cụ thể) → dùng cho Bước 3.
- **Risks / câu hỏi clarification** (nếu có) → đoạn cuối description, để người review issue biết còn gì chưa chốt.

Nếu skill insight trả về estimate dạng khoảng (`~4.5-5`), lấy **trung điểm** (`(4.5+5)/2 = 4.75`) cho Bước 3 — không tự làm tròn âm thầm, nêu rõ cách quy đổi khi báo cáo kết quả ở Bước 5.

### Bước 2 — Resolve metadata động (KHÔNG hardcode ngày/sprint id — luôn gọi API tại thời điểm chạy)

**2a. Sprint đang active:**
```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Accept: application/json" \
  "$JIRA_BASE_URL/rest/agile/1.0/board/10/sprint?state=active"
```
Nếu có `--sprint-id` → dùng thẳng ID đó, bỏ qua bước resolve. Nếu không:
- Lấy phần tử đầu tiên có `state=active`.
- Nếu response rỗng (không có sprint active) → dừng lại, báo lỗi rõ ràng, gợi ý dùng `--sprint-id` để chỉ định thủ công.
- Nếu tên sprint active khác kỳ vọng thông thường (vd không phải mẫu `"QUYIT Sprint <N>"`) → dùng `AskUserQuestion` hỏi người dùng có muốn dùng đúng sprint đang active đó không, hay dừng lại để họ tự truyền `--sprint-id`. Không tự ý fail cứng chỉ vì tên khác dự kiến.

**2b. Fix version theo tháng hiện tại:**
Tính chuỗi `"Tháng <M>/<YYYY>"` từ ngày hệ thống hiện tại (không phụ thuộc giá trị hardcode từ lần chạy trước). Nếu có `--fix-version` → dùng thẳng tên đó. Sau đó:
```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Accept: application/json" \
  "$JIRA_BASE_URL/rest/api/3/project/QUYIT/versions"
```
Tìm version có `name` khớp chính xác chuỗi đã tính/được chỉ định. Nếu không tìm thấy → dừng lại, báo lỗi rõ ràng kèm danh sách vài version gần nhất có sẵn, gợi ý dùng `--fix-version "<tên có sẵn>"`. **Không tự tạo version mới.**

### Bước 3 — Quy đổi Original Estimate

`midpoint_days = (low + high) / 2` (hoặc dùng thẳng nếu skill trả 1 số duy nhất). Quy đổi sang giờ: `hours = midpoint_days * 8`. Convert `hours` thành chuỗi duration Jira dạng `"<D>d <H>h"` (vd `4.75d` → `38h` → `"4d 6h"`). Nếu `hours` là số nguyên ngày chẵn, bỏ phần `h` (vd `"3d"`).

### Bước 4 — Tạo issue

**4a. Tạo issue với summary/description/epic/labels:**
```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Content-Type: application/json" \
  -X POST -d @<payload.json> \
  "$JIRA_BASE_URL/rest/api/3/issue"
```
`description` phải là Atlassian Document Format (ADF, `"type":"doc","version":1`) — không phải plain string. Cấu trúc gợi ý:
1. Paragraph: tóm tắt yêu cầu gốc (câu mô tả người dùng đã nhập)
2. Paragraph bold "Module breakdown:" + bulletList từ module breakdown của insight
3. Paragraph cuối: `"Estimate: ~<low>–<high> person-days. Risks: <tóm tắt risk chính, nếu có>."`

`fields.project.key = "QUYIT"`, `fields.issuetype.id = "10008"`, `fields.customfield_10014 = "<epic key resolved>"`, `fields.labels = [<labels resolved>]`.

Lấy `key` (vd `QUYIT-7xx`) từ response để dùng ở các bước sau.

**4b. Set Original Estimate:**
```bash
curl -s -o /dev/null -w "%{http_code}" -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X PUT -H "Content-Type: application/json" \
  -d "{\"fields\":{\"timetracking\":{\"originalEstimate\":\"<duration>\"}}}" \
  "$JIRA_BASE_URL/rest/api/3/issue/<KEY>"
```
Kỳ vọng `204`. Nếu `400` → project/issue type không bật Time Tracking, báo rõ lỗi này thay vì coi là thành công.

**4c. Set Fix version:**
```bash
curl -s -o /dev/null -w "%{http_code}" -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X PUT -H "Content-Type: application/json" \
  -d "{\"fields\":{\"fixVersions\":[{\"id\":\"<version id resolved>\"}]}}" \
  "$JIRA_BASE_URL/rest/api/3/issue/<KEY>"
```

**4d. Gán vào Sprint (Agile API — field sprint không set được qua issue PUT thường):**
```bash
curl -s -o /dev/null -w "%{http_code}" -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST -H "Content-Type: application/json" \
  -d "{\"issues\":[\"<KEY>\"]}" \
  "$JIRA_BASE_URL/rest/agile/1.0/sprint/<sprint id resolved>/issue"
```

Mỗi bước 4b–4d kỳ vọng HTTP `204`. Nếu bước nào lỗi, dừng và báo rõ bước nào thất bại kèm mã lỗi — không im lặng bỏ qua hay coi cả quy trình là thành công một phần.

### Bước 5 — Xác nhận kết quả

Gọi lại `GET /rest/api/3/issue/<KEY>?fields=summary,labels,fixVersions,customfield_10014,customfield_10020,timetracking` để verify toàn bộ field đã set đúng, thay vì chỉ tin vào mã `204`.

## Output

Trình bày bảng:

| Field | Giá trị |
|---|---|
| Key | `<KEY>` (kèm link `$JIRA_BASE_URL/browse/<KEY>`) |
| Summary | ... |
| Epic | ... |
| Labels | ... |
| Sprint | ... (tên + state) |
| Fix version | ... |
| Original Estimate | `<duration>` (nêu rõ cách quy đổi: trung điểm range person-days × 8h) |

Nếu có bước nào resolve khác mặc định kỳ vọng (sprint tên lạ, fix version phải hỏi lại người dùng, v.v.) → nêu rõ trong phần đầu output, không giấu trong log.

## Ví dụ thực tế

```
/jira-nqdev-insight-create-issue "Combos Pipeline: khi model lỗi, skip model đó 5 phút rồi tự bỏ skip"
/jira-nqdev-insight-create-issue "Thêm dashboard hiển thị chi phí theo provider" --fix-version "Tháng 10/2026"
/jira-nqdev-insight-create-issue "Fix OAuth token refresh race condition" --epic QUYIT-600 --label bug --label urgent
```
