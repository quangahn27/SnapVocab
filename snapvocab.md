# SnapVocab

Ứng dụng di động Expo/React Native giúp người Việt học ngoại ngữ từ chính những vật thể xung quanh: chụp (hoặc chọn) một tấm ảnh, Gemini AI sẽ nhận diện và trả về 3–5 từ vựng hữu ích xuất hiện trong ảnh.

## Ý tưởng chính

Không cần gõ, không cần tra từ điển — chỉ cần chụp ảnh vật thể trong đời sống hằng ngày (bàn, ly nước, con mèo, xe đạp,...) và ứng dụng sẽ tự động trả về danh sách từ vựng liên quan kèm cách đọc, nghĩa tiếng Việt, câu ví dụ song ngữ và bài đọc tổng hợp bằng giọng nói.

**Ngôn ngữ học được chọn trong app** (tiếng Anh, Nhật, Hàn, Trung), còn **phần giải thích luôn bằng tiếng Việt**. Nhờ vậy giao diện app không cần dịch sang nhiều thứ tiếng.

## Kiến trúc

```
                                         ┌──► Gemini  (chính)
App (Expo) ──ảnh base64 + ngôn ngữ──► Worker ─┤
           ◄──── { full_narrative, items } ───┴──► Groq    (dự phòng, chỉ en/zh)
```

App **không chứa API key**. Toàn bộ key, tên model và prompt nằm trong Cloudflare Worker (`worker/snapvocab-proxy.js`); app chỉ biết URL của Worker qua biến `EXPO_PUBLIC_API_URL`.

App cũng **không biết nhà cung cấp AI nào đã trả lời** — Worker luôn trả về cùng một định dạng. Hệ quả thực tế: đổi prompt, đổi model, đổi cả nhà cung cấp, thêm ngôn ngữ mới đều chỉ cần deploy lại Worker, **không phải phát hành bản app mới**.

### Dự phòng nhà cung cấp

Gemini hay trả 503 "quá tải" vào giờ cao điểm. Khi đó Worker tự chuyển sang Groq thay vì báo lỗi cho người dùng.

- Chỉ chuyển khi lỗi **tạm thời** (429, 5xx, lỗi mạng). Lỗi 400 hay sai tên model thì dừng luôn — chuyển nhà cung cấp cũng hỏng y hệt, mà còn che mất lỗi cấu hình thật.
- Groq chỉ được phép trả lời **tiếng Anh và tiếng Trung** (`GROQ_FALLBACK_LANGS`). Đo thực tế trên `qwen3.8-27b`: IPA tiếng Anh và Pinyin tiếng Trung đều đúng, nhưng tiếng Nhật sai — 飛行機 ra `fūkōki` thay vì `hikōki`. Người mới học không thể tự phát hiện cách đọc sai, nên với ngôn ngữ chưa tin được thì thà báo "quá tải" còn hơn dạy sai.
- Ngôn ngữ nào chỉ có một nhà cung cấp phục vụ (Nhật, Hàn) thì Worker thử lại chính nhà cung cấp đó 3 lần thay vì chuyển.
- Groq chạy ở chế độ `json_object`, **tuyệt đối không dùng `json_schema` + `strict`** — chế độ strict của Groq làm hỏng ký tự ngoài ASCII, trả IPA và Pinyin về thành ký tự điều khiển `\x00`.
- Response có header `x-provider: gemini|groq` để tra khi xem log.

## Luồng sử dụng (state machine)

Màn hình chính (`src/app/index.tsx`) chạy theo một state machine tuyến tính:

```
EMPTY → PREVIEW → ANALYZING → RESULT
          ↑                      ↓
          └──────── (chụp/chọn ảnh khác) ──┘
```

- **ERROR** có thể xảy ra ở bất kỳ bước nào (lỗi chọn ảnh, lỗi gọi Worker, lỗi mạng, hết lượt...).

Các bước cụ thể:
1. **EMPTY** — màn hình chào, chọn ngôn ngữ muốn học, rồi "Chụp ảnh" hoặc "Chọn ảnh từ thư viện".
2. **PREVIEW** — xem trước ảnh đã chọn, vẫn đổi được ngôn ngữ, có thể đổi ảnh khác hoặc bấm "✨ Phân tích ảnh".
3. **ANALYZING** — hiển thị trạng thái loading trong lúc gọi Worker.
4. **RESULT** — hiển thị:
   - Bài tường thuật tổng hợp (`full_narrative`) kèm nút "🔊 Nghe toàn bộ".
   - Danh sách từ vựng dạng thẻ (`VocabularyCard`), mỗi thẻ có thể phát âm từ và câu ví dụ riêng lẻ.
   - Số lượt còn lại trong ngày, nếu Worker có bật hạn mức.
   - Nút "Phân tích ảnh khác" để quay lại từ đầu.
5. **ERROR** — thông báo lỗi bằng tiếng Việt kèm nút thử lại; nếu bị giới hạn lượt thì nút bị khoá kèm đồng hồ đếm ngược.

## Chức năng chi tiết

- **Chọn ngôn ngữ muốn học**: tiếng Anh, Nhật, Hàn, Trung (`src/constants/languages.ts`). Lựa chọn được lưu lại trên máy cho lần mở app sau.
- **Chọn/chụp ảnh**: dùng `expo-image-picker`, hỗ trợ cả camera và thư viện ảnh.
- **Xử lý ảnh trước khi gửi AI**: resize + nén ảnh về base64 (cạnh dài tối đa 1280px, JPEG chất lượng 0.75) bằng `expo-image-manipulator`. Payload thực tế khoảng 350KB.
- **Phân tích ảnh**: gửi chuỗi base64 thô (`content-type: text/plain`) lên Worker. Gửi thô thay vì bọc JSON để Worker khỏi phải parse chuỗi lớn — gói Cloudflare free chỉ cho 10ms CPU mỗi request. Kết quả được ép theo `responseSchema` phía Gemini và validate lại bằng `zod` ở client cho chắc chắn.
- **Đọc từ vựng bằng giọng nói**: dùng `expo-speech` đọc lần lượt từ → nghĩa → câu ví dụ → bản dịch. Mỗi đoạn mang theo mã ngôn ngữ riêng, nên từ tiếng Nhật được đọc bằng giọng Nhật còn phần giải thích bằng giọng Việt. Có cơ chế "generation counter" để yêu cầu đọc mới hủy audio đang phát dở.
  - **Phần phiên âm (`reading`) không bao giờ được đọc** — nó chỉ để nhìn. Máy đọc nhận `shūbāo` hay `kasa` sẽ phát ra thứ vô nghĩa; thứ đưa cho máy đọc luôn là chữ gốc (`word`).
  - App kiểm tra `Speech.getAvailableVoicesAsync()` lúc đổi ngôn ngữ. Máy chưa cài giọng cho ngôn ngữ đó thì ẩn nút loa và báo cho người dùng, thay vì phát ra im lặng.
- **Ghi log lỗi cục bộ**: mọi lỗi bắt được đều đi qua `logError` — vừa `console.warn`, vừa ghi một dòng JSON vào file log cục bộ (`snapvocab-error-log.txt`, giới hạn 256KB) bằng `expo-file-system`, giúp lỗi còn tồn tại sau khi tắt app/Metro.

## Dữ liệu trả về cho mỗi từ vựng (`VocabularyItem`)

Tên trường được đặt trung tính để dùng chung cho mọi ngôn ngữ:

| Trường | Mô tả | Ví dụ (Trung) |
|---|---|---|
| `word` | Từ ở dạng chữ viết gốc | 书包 |
| `reading` | Cách đọc mà người Việt đọc được | shūbāo |
| `vietnamese` | Nghĩa tiếng Việt | cặp sách |
| `example` | Câu ví dụ bằng ngôn ngữ đích | 我的书包很重。 |
| `example_vi` | Bản dịch câu ví dụ | Cặp sách của tôi rất nặng. |

Với tiếng Anh, `reading` là phiên âm IPA; tiếng Nhật là romaji + kana; tiếng Hàn là Revised Romanization; tiếng Trung là Pinyin có dấu thanh.

Kết quả phân tích (`ImageAnalysisResult`) gồm `language`, `full_narrative` (bài tường thuật tiếng Việt), `items: VocabularyItem[]` và `quotaRemaining` (nếu Worker báo).

## Cấu trúc mã nguồn

- `src/app/index.tsx` — màn hình duy nhất của app, chứa toàn bộ state machine.
- `src/services/image.ts` — chọn ảnh + resize/nén ảnh.
- `src/services/gemini.ts` — gọi Worker, timeout 45s, đọc mã lỗi, validate kết quả bằng zod.
- `src/services/speech.ts` — phát giọng nói đa ngôn ngữ + kiểm tra giọng có sẵn.
- `src/services/preferences.ts` — lưu `deviceId` (để đếm hạn mức) và ngôn ngữ đã chọn.
- `src/services/logger.ts` — ghi/đọc/xóa log lỗi cục bộ.
- `src/constants/languages.ts` — danh sách ngôn ngữ học được.
- `src/types/vocabulary.ts` — kiểu dữ liệu dùng chung.
- `src/components/` — `ImagePickerCard`, `ImagePreview`, `LanguagePicker`, `AnalysisLoading`, `VocabularyCard`, `ErrorState`, `PrimaryButton`.
- `worker/snapvocab-proxy.js` — mã nguồn Cloudflare Worker (xem phần triển khai bên dưới).

## Cấu hình & triển khai

**App** — `.env`:

```
EXPO_PUBLIC_API_URL=https://<tên-worker>.<subdomain>.workers.dev
```

Khi build bằng EAS, biến này phải được khai trong `eas.json` (mục `build.<profile>.env`) hoặc EAS environment variables, vì `.env` bị gitignore.

**Worker** — dán `worker/snapvocab-proxy.js` vào trình soạn thảo của Cloudflare dashboard rồi Deploy. Biến cần khai ở **Settings → Variables and Secrets**:

| Tên | Loại | Giá trị |
|---|---|---|
| `GEMINI_API_KEY` | Secret | API key Google AI Studio |
| `GEMINI_MODEL` | Text | ví dụ `gemini-3.6-flash` |
| `GROQ_API_KEY` | Secret | (tuỳ chọn) API key Groq — không có thì chỉ chạy Gemini |
| `GROQ_MODEL` | Text | (tuỳ chọn) mặc định `qwen/qwen3.8-27b` — model Groq duy nhất nhận ảnh |
| `GROQ_FALLBACK_LANGS` | Text | (tuỳ chọn) mặc định `en,zh` |
| `PROVIDER_ORDER` | Text | (tuỳ chọn) mặc định `gemini,groq`; đảo thành `groq,gemini` nếu ưu tiên tốc độ |
| `DAILY_QUOTA` | Text | (tuỳ chọn) số lượt/ngày mỗi thiết bị, mặc định 50 |
| `QUOTA` | KV binding | (tuỳ chọn) namespace để đếm hạn mức; chưa tạo thì Worker vẫn chạy, chỉ là không giới hạn |

Kiểm tra nhanh sau khi deploy:

```bash
sips -Z 1280 anh.jpg --out /tmp/small.jpg
base64 -i /tmp/small.jpg | tr -d '\n' > /tmp/test.b64
curl -X POST "https://<worker>/analyze?lang=en" \
  -H "content-type: text/plain" --data-binary @/tmp/test.b64
```

## Giới hạn hiện tại (đã biết)

- **URL Worker nằm trong bundle app** và trích xuất được. Đây là đánh đổi không tránh khỏi: khác với API key, kẻ xấu chỉ dùng được đúng chức năng phân tích ảnh, bị chặn theo hạn mức, và bạn khoá được phía server mà người dùng thật không phải cập nhật app. Hạn mức theo thiết bị chỉ có tác dụng khi đã tạo KV binding `QUOTA`.
- **Gemini trả 503 "high demand" khá thường xuyên** với các model flash. Worker chuyển sang Groq (tiếng Anh/Trung) hoặc thử lại 3 lần (tiếng Nhật/Hàn); vẫn hỏng thì app báo "Hệ thống đang quá tải".
- **Gói free của Groq cũng chật**: 8.000 token/phút và 1.000 request/ngày. Một ảnh 1280px tốn ~2.200–2.600 token, tức khoảng **3 lượt/phút**. Groq là lưới đỡ lúc Gemini sập, không phải nguồn thay thế vô hạn.
- **Chất lượng Groq thấp hơn Gemini**: bám prompt kém hơn, thỉnh thoảng bịa vật thể không có trong ảnh. Đổi lại nhanh gấp 4–5 lần (2,5–5s so với 3–13s).
- **Giọng đọc phụ thuộc thiết bị.** `expo-speech` không đảm bảo máy nào cũng có giọng Nhật/Hàn/Trung — nhiều máy Android phải tải thêm. App phát hiện và ẩn nút nghe, nhưng không tự cài hộ được.
- **Chưa lưu lịch sử từ vựng.** Không có dữ liệu người dùng nào được lưu trên server.
- Chất lượng nội dung các ngôn ngữ ngoài tiếng Anh chưa được kiểm chứng kỹ bằng người bản xứ.

## Bundle ID

`com.quangahn.x27.SnapVocab` (cả iOS và Android).
