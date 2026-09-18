---
description: Lấy GitHub Code Scanning alerts (CodeQL) của repo nqdev-group/9router qua REST API, phân tích và tạo plan fix lưu vào plans/
argument-hint: menu | list [--state open|closed|dismissed|fixed] [--severity critical|high|medium|low] | show --number <N> | plan [--state open] [--severity ...]
allowed-tools: Bash(curl:*), Read, Write, Glob, Grep
---

# GitHub Code Scanning — $ARGUMENTS

## Bước 0 — Nếu $ARGUMENTS rỗng hoặc là `menu`

Hiển thị NGAY khối menu bên dưới rồi DỪNG — không gọi API, không cần kiểm tra credentials.

```
🔎 /gh-code-scan-fix — GitHub Code Scanning (nqdev-group/9router)

  menu                                                     Hiện menu này
  list [--state open|closed|dismissed|fixed]               Liệt kê alert (mặc định --state open)
       [--severity critical|high|medium|low]
  show --number <N>                                        Xem chi tiết 1 alert
  plan [--state open] [--severity ...]                      Phân tích + ghi plan fix vào plans/

Ví dụ:
  /gh-code-scan-fix list
  /gh-code-scan-fix list --severity high
  /gh-code-scan-fix show --number 12
  /gh-code-scan-fix plan --state open

Cần cấu hình trước: GITHUB_TOKEN hoặc GH_TOKEN (xem mục "Cấu hình bắt buộc" bên dưới)
```

## Cấu hình bắt buộc (biến môi trường, KHÔNG hardcode, KHÔNG ghi vào file)

- `GITHUB_TOKEN` (hoặc `GH_TOKEN`) — Personal Access Token có quyền đọc code scanning alerts:
  - Fine-grained token: repo `nqdev-group/9router` → permission "Code scanning alerts: Read-only"
  - Hoặc classic token: scope `security_events` (repo private) / `public_repo` không đủ — vẫn cần `security_events` vì code-scanning alerts luôn yêu cầu auth kể cả trên repo public.

Nếu thiếu biến: dừng lại, yêu cầu người dùng `export GITHUB_TOKEN=...` trước khi chạy tiếp.
**Không bao giờ hỏi xin token qua chat, không echo/log/ghi giá trị token ra bất kỳ file nào.**

## Cấu hình mặc định

- Repo: `nqdev-group/9router` (owner/repo cố định cho command này — đây là command project-scoped)
- API base: `https://api.github.com`
- Header bắt buộc mọi request:
  ```bash
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28"
  ```

## Parse hành động từ $ARGUMENTS

(Trường hợp `menu`/rỗng đã xử lý ở Bước 0 — các action dưới đây đều cần `GITHUB_TOKEN`.)

### `list [--state <state>] [--severity <severity>]`
```bash
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/nqdev-group/9router/code-scanning/alerts?state=<state|open>&per_page=100"
```
Nếu response có `Link` header chứa `rel="next"`, gọi tiếp trang kế (phân trang) cho đến hết. Nếu có `--severity`, lọc client-side theo `rule.security_severity_level` (fallback `rule.severity` nếu field trên rỗng).

Trình bày bảng: `Number | Rule ID | Severity | State | File:Line | Created`. Nếu rỗng, báo rõ "Không có alert nào khớp điều kiện" — không im lặng bỏ qua.

### `show --number <N>`
```bash
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/nqdev-group/9router/code-scanning/alerts/<N>"
```
Hiển thị: rule id/description, severity, state (+ `dismissed_reason`/`dismissed_comment` nếu có), `most_recent_instance.location` (path + line), và `rule.help` (hướng dẫn remediation gốc từ CodeQL).

### `plan [--state open] [--severity ...]`
1. Gọi API như `list` để lấy toàn bộ alert khớp điều kiện (mặc định `state=open`).
2. Với mỗi alert: đọc thật sự file + dòng code được trỏ tới (`Read` tool tại `most_recent_instance.location.path` quanh `start_line`/`end_line`) để hiểu context thật — không suy đoán fix chỉ từ mô tả rule.
3. Gom nhóm theo rule/CWE và mức độ nghiêm trọng (critical > high > medium > low), sắp xếp file bị ảnh hưởng nhiều nhất lên trước.
4. Với mỗi nhóm: nêu root cause cụ thể trong codebase này, hướng fix đề xuất (kèm file:line), và bước verify sau khi fix (test liên quan, hoặc cách tái hiện thủ công).
5. Ghi kết quả vào `plans/<YYYY-MM-DD>-code-scanning-fix-plan.md` (theo đúng convention đặt tên file đang dùng trong `plans/` của repo này) — chỉ lên plan, KHÔNG tự sửa code trừ khi người dùng yêu cầu rõ sau khi đã xem plan.

## Output

Luôn trình bày dạng bảng cho `list`, dạng chi tiết có cấu trúc cho `show`. Với `plan`, sau khi ghi file, tóm tắt ngắn gọn trong chat: tổng số alert, phân bố theo severity, đường dẫn file plan vừa tạo.

## Ví dụ thực tế

```
/gh-code-scan-fix list --severity high
/gh-code-scan-fix show --number 12
/gh-code-scan-fix plan --state open --severity critical
```
