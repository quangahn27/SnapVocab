# SnapVocab

Ứng dụng di động Expo/React Native giúp người Việt học tiếng Anh từ chính những vật thể xung quanh: chụp (hoặc chọn) một tấm ảnh, Gemini AI sẽ nhận diện và trả về 3–5 từ vựng tiếng Anh hữu ích xuất hiện trong ảnh.

## Ý tưởng chính

Không cần gõ, không cần tra từ điển — chỉ cần chụp ảnh vật thể trong đời sống hằng ngày (bàn, ly nước, con mèo, xe đạp,...) và ứng dụng sẽ tự động trả về danh sách từ vựng liên quan kèm cách phát âm, nghĩa tiếng Việt, câu ví dụ song ngữ và bài đọc tổng hợp bằng giọng nói.

Toàn bộ xử lý diễn ra **client-side**, không có backend/server riêng — app gọi thẳng tới Gemini REST API.

## Luồng sử dụng (state machine)

Màn hình chính (`src/app/index.tsx`) chạy theo một state machine tuyến tính:

```
EMPTY → PREVIEW → ANALYZING → RESULT
          ↑                      ↓
          └──────── (chụp/chọn ảnh khác) ──┘
```

- **ERROR** có thể xảy ra ở bất kỳ bước nào (lỗi chọn ảnh, lỗi gọi Gemini, lỗi mạng...).

Các bước cụ thể:
1. **EMPTY** — màn hình chào, người dùng chọn "Chụp ảnh" hoặc "Chọn ảnh từ thư viện".
2. **PREVIEW** — xem trước ảnh đã chọn, có thể đổi ảnh khác hoặc bấm "✨ Phân tích ảnh".
3. **ANALYZING** — hiển thị trạng thái loading trong lúc gọi Gemini.
4. **RESULT** — hiển thị:
   - Bài tường thuật tổng hợp (`full_narrative`) kèm nút "🔊 Nghe toàn bộ".
   - Danh sách từ vựng dạng thẻ (`VocabularyCard`), mỗi thẻ có thể phát âm từ và câu ví dụ riêng lẻ.
   - Nút "Phân tích ảnh khác" để quay lại từ đầu.
5. **ERROR** — hiển thị thông báo lỗi bằng tiếng Việt kèm nút thử lại.

## Chức năng chi tiết

- **Chọn/chụp ảnh**: dùng `expo-image-picker`, hỗ trợ cả camera và thư viện ảnh.
- **Xử lý ảnh trước khi gửi AI**: resize + nén ảnh về base64 (cạnh dài tối đa 1280px, JPEG chất lượng 0.75) bằng `expo-image-manipulator` để giảm dung lượng gửi lên Gemini.
- **Phân tích ảnh bằng Gemini**: gọi trực tiếp Gemini REST API (`generativelanguage.googleapis.com`) từ client, dùng API key và tên model cấu hình qua biến môi trường (`EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_GEMINI_MODEL`). Kết quả trả về được ép theo `responseSchema` phía Gemini và được validate lại bằng `zod` ở phía client cho chắc chắn.
- **Đọc từ vựng bằng giọng nói**: dùng `expo-speech` để đọc lần lượt từ → nghĩa → câu ví dụ → bản dịch, cho từng từ riêng lẻ hoặc đọc toàn bộ ("Nghe toàn bộ"). Có cơ chế "generation counter" để yêu cầu đọc mới sẽ hủy audio đang phát dở, tránh chồng tiếng.
- **Ghi log lỗi cục bộ**: mọi lỗi bắt được đều đi qua `logError` — vừa `console.error`, vừa ghi thêm một dòng JSON (`{time, scope, message, ...}`) vào file log cục bộ (`snapvocab-error-log.txt`, giới hạn 256KB) bằng `expo-file-system`, giúp lỗi còn tồn tại sau khi tắt app/Metro. Đã có sẵn hàm đọc/xóa log để dùng cho màn hình debug trong tương lai (hiện chưa có UI nào đọc log này).

## Dữ liệu trả về cho mỗi từ vựng (`VocabularyItem`)

| Trường | Mô tả |
|---|---|
| `english` | Từ tiếng Anh |
| `phonetic` | Phiên âm IPA |
| `vietnamese` | Nghĩa tiếng Việt |
| `example_en` | Câu ví dụ tiếng Anh |
| `example_vi` | Bản dịch câu ví dụ |

Kết quả phân tích ảnh (`ImageAnalysisResult`) gồm `full_narrative` (bài tường thuật tổng hợp bằng tiếng Việt để đọc toàn bộ) và mảng `items: VocabularyItem[]`.

## Cấu trúc mã nguồn

- `src/app/index.tsx` — màn hình duy nhất của app, chứa toàn bộ state machine.
- `src/services/image.ts` — chọn ảnh + resize/nén ảnh.
- `src/services/gemini.ts` — gọi Gemini API, validate kết quả bằng zod.
- `src/services/speech.ts` — phát giọng nói.
- `src/services/logger.ts` — ghi/đọc/xóa log lỗi cục bộ.
- `src/constants/analysisPrompt.ts` — prompt gửi cho Gemini + schema kỳ vọng.
- `src/types/vocabulary.ts` — kiểu dữ liệu dùng chung.
- `src/components/` — các thành phần UI: `ImagePickerCard`, `ImagePreview`, `AnalysisLoading`, `VocabularyCard`, `ErrorState`, `PrimaryButton`.

## Giới hạn hiện tại (đã biết, chấp nhận ở giai đoạn MVP)

- Biến `EXPO_PUBLIC_*` (bao gồm API key Gemini) bị đóng gói vào bản build và có thể trích xuất được từ production build. Đây là đánh đổi chấp nhận được cho giai đoạn MVP/prototype — khi phát hành chính thức cần có backend proxy để không lộ key ra thiết bị người dùng.
- Không có backend, không lưu trữ dữ liệu người dùng trên server — mọi thứ chạy và lưu cục bộ trên máy.

## Bundle ID

`com.quangahn.x27.SnapVocab` (cả iOS và Android).
