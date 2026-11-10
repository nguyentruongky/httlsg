# Nhân sự Hội Thánh

The shared personnel catalog in `packages/core/src/personnel.ts` is authoritative for mission selectors. Ban ngành: Ban Âm Nhạc; Ban Âm Thanh - Ánh Sáng; Ban Biên Soạn Bài học KTHT; Ban Giữ xe; Ban Hậu Cần; Ban Khánh Tiết; Ban Phiên Dịch; Ban Thăm Viếng; Ban Truyền Giảng; Ban Truyền Thông; Ban Trường Chúa Nhật; Ban Tu bổ sửa chữa.

Ban hát: Lão niên; Trung niên; Tráng niên; Thanh tráng; Thanh niên; Thiếu niên; Thiếu nhi; Ấu nhi; Phụ nữ. Matching ignores capitalization, accents, punctuation, and an optional “Ban” prefix while retaining existing database IDs.

“Cập nhật thông tin” opens the member profile. “Thay đổi công tác” opens an editable list with one mission selector and delete action per row. Ban điều hành and Đặc trách require an additional Ban hát/Ban ngành selector. Trưởng ban ngành selects a Ban ngành. Ordinary choir membership is not a Công tác: it stays on the profile, is omitted from the mission popup, and is retained during mission saves. Ordinary ministry membership can be selected directly. Existing departments outside the catalog remain available for their current assignments.

The missions API replaces the submitted mission list atomically, rejects stale edits, retains historical board snapshots, and appends revisions for current-year board changes. Existing application roles remain subject to the same authorization and self-assignment restrictions. Đặc trách is stored as a church responsibility without a new application access role. Migration 023 seeds missing departments and stores these additional responsibilities.

OTP lists load on opening and through the explicit “Làm mới” action. There is no live stream, polling, window-focus refresh, or reconnect refresh. The retired `/api/leader/events` route returns 410 after authorization, and the compatibility live-sync hook opens no connections. On mobile, the hidden OTP panel does not mount or fetch until selected.

The “Thay đổi công tác” popup has its own smooth opening animation on desktop and mobile. Shared mobile select controls open a bottom sheet; desktop controls retain the native select. The All members table displays Liên hệ and Ban ngành/Ban hát lễ, revealing 20 more preloaded rows as its scroll sentinel becomes visible. Profile selection and row actions remain available inside these two columns.

Mobile selectors determine their layout synchronously and apply a selection only after their sheet has closed, avoiding a native-select-to-sheet swap and popup flashes. All members uses the same mobile card layout as Nhân sự. Search stretches beside one combined role/status filter; sorting is available through column titles rather than a separate sorting control. Specific offices (Trưởng ban, Phó ban, Thư ký, Thủ quỹ, Ủy viên) suppress the generic Ban điều hành title for the same department. Distinct specific offices and assignments in other departments remain visible.
