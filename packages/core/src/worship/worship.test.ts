import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseWorshipProgram,
  isWorshipProgramText,
  composeWorshipInformationRequest,
  getMissingWorshipProgramFields,
  hasWorshipValue,
  createWorshipViberDraftLink,
  createWorshipViberRecipientLink,
  getWorshipViberDiagnostics,
  WORSHIP_FIELD_LABELS,
} from "./index";
const complete = `LỊCH TRỰC NGÀY 08/11/2026 – LỄ 1
Chủ đề: VIỆC CHÚA LÀM
Diễn giả: MS Trần Thanh Dũng, QNHT
Kinh Thánh nền tảng: Thi Thiên 126:1–6
Câu gốc: Thi Thiên 126:3
HDCT: CS Lâm Hoàng Vũ
Kinh Thánh đầu giờ: Ê-sai 43:18–19
Hát dẫn:
1. TC 47 (1,2–3,4)
2. TC 674 (1,2–3)
KTĐĐ: Thi Thiên 126:1–6
Ban Hát Lễ: Ban Tráng Niên tôn vinh Chúa – TC 674
Dâng hiến: TC 805 (1,2…1)`;
test("worship recognizes legacy text and extracts every Vietnamese label without mutation", () => {
  const original = complete;
  assert.ok(isWorshipProgramText(complete));
  const parsed = parseWorshipProgram(complete);
  assert.equal(parsed.topic, "VIỆC CHÚA LÀM");
  assert.equal(parsed.speaker, "MS Trần Thanh Dũng, QNHT");
  assert.equal(parsed.songs, "1. TC 47 (1,2–3,4)\n2. TC 674 (1,2–3)");
  assert.equal(parsed.choir, "Ban Tráng Niên tôn vinh Chúa – TC 674");
  assert.deepEqual(getMissingWorshipProgramFields(parsed), []);
  assert.equal(composeWorshipInformationRequest(complete).message, complete);
  assert.equal(complete, original);
  assert.equal(isWorshipProgramText(""), false);
  assert.equal(isWorshipProgramText("Sinh hoạt\nChủ đề:"), false);
  assert.equal(
    isWorshipProgramText("LỊCH TRỰC NGÀY 08/11/2026 – LỄ ..."),
    false,
  );
});
test("parser supports CRLF, CR, indentation, whitespace, decomposed Unicode and multiline values", () => {
  const text =
    "Chủ đề:  Cầu nguyện  \r\n  Và học Kinh Thánh\r\n\r\nDiễn giả： Mục sư\r\nChủ đề: Bổ sung";
  const fields = parseWorshipProgram(text.normalize("NFD"));
  assert.equal(
    fields.topic.normalize("NFC"),
    "Cầu nguyện  \n  Và học Kinh Thánh\n\n Bổ sung",
  );
  assert.equal(fields.speaker.normalize("NFC"), "Mục sư");
  assert.equal(
    parseWorshipProgram("Chủ đề: Một\rDiễn giả: Hai").speaker,
    "Hai",
  );
});
for (const placeholder of [
  "",
  "  \t\r\n",
  "...",
  "…",
  "{{value}}",
  " {{field}} ... ",
  "1.\n2.",
  "1. ...\n2. {{song}}",
  "- _ .",
])
  test(`missing placeholder ${JSON.stringify(placeholder)}`, () =>
    assert.equal(hasWorshipValue(placeholder), false));
for (const value of [
  "TC 47",
  "1. TC 47\n2.",
  "{{placeholder}} TC 805",
  "1. 47",
  "Thờ phượng 🙏",
])
  test(`actual worship value ${value}`, () =>
    assert.equal(hasWorshipValue(value), true));
test("one actual song is sufficient while blank numbered entries are not songs", () => {
  const fields = parseWorshipProgram(complete);
  fields.songs = "1.\n2. ...";
  assert.ok(
    getMissingWorshipProgramFields(fields).some((f) => f.key === "songs"),
  );
  fields.songs = "1. TC 47\n2.";
  assert.deepEqual(getMissingWorshipProgramFields(fields), []);
});
test("request lists missing fields and appends one combined sentence", () => {
  const source =
    "LỊCH TRỰC NGÀY 08/11/2026 – LỄ ...\r\nChủ đề:\r\nHát dẫn:\r\n1.\r\n2.\r\n";
  const result = composeWorshipInformationRequest(source);
  assert.ok(
    result.message.startsWith(source.trimEnd() + "\nThông tin còn thiếu:"),
  );
  assert.deepEqual(
    result.missingFields.map((f) => f.label),
    Object.values(WORSHIP_FIELD_LABELS).filter((label) => label !== "Hát dẫn"),
  );
  assert.equal((result.message.match(/CS Thiệu Huy/g) ?? []).length, 1);
  assert.equal((result.message.match(/CS Sơn Hải/g) ?? []).length, 1);
  assert.equal(
    result.message,
    source.trimEnd() +
      "\nThông tin còn thiếu:\n" +
      result.missingFields.map((field) => "- " + field.label).join("\n") +
      "\n\nXin nhờ CS Sơn Hải và CS Thiệu Huy cung cấp thông tin giúp. Xin cám ơn.",
  );
});
test("only Group A missing yields only the Group A request", () => {
  const result = composeWorshipInformationRequest(
    complete.replace("Chủ đề: VIỆC CHÚA LÀM", "Chủ đề: {{value}}"),
  );
  assert.deepEqual(result.missingFields, [
    { key: "topic", label: "Chủ đề", group: "A" },
  ]);
  assert.ok(
    result.message.endsWith(
      "\n\nXin nhờ CS Thiệu Huy cung cấp thông tin giúp. Xin cám ơn.",
    ),
  );
  assert.equal(result.message.includes("CS Sơn Hải"), false);
});
test("only Group B missing yields only the Group B request", () => {
  const result = composeWorshipInformationRequest(
    complete.replace("Hát dẫn:\n1. TC 47 (1,2–3,4)\n2. TC 674 (1,2–3)\n", ""),
  );
  assert.deepEqual(result.missingFields, [
    { key: "songs", label: "Hát dẫn", group: "B" },
  ]);
  assert.equal(result.message.includes("CS Thiệu Huy"), false);
  assert.ok(
    result.message.endsWith(
      "\n\nXin nhờ CS Sơn Hải cung cấp thông tin giúp. Xin cám ơn.",
    ),
  );
});
test("request lists only the missing field while complete programs stay unchanged", () => {
  const text = complete.replace("Chủ đề: VIỆC CHÚA LÀM", "Chủ đề:");
  const result = composeWorshipInformationRequest(text);
  assert.equal(
    result.message,
    text +
      "\nThông tin còn thiếu:\n- Chủ đề\n\nXin nhờ CS Thiệu Huy cung cấp thông tin giúp. Xin cám ơn.",
  );
  assert.equal(composeWorshipInformationRequest(complete).message, complete);
});
test("empty input reports every field and Viber link preserves exact URI encoding", () => {
  const result = composeWorshipInformationRequest("");
  assert.equal(result.missingFields.length, 10);
  for (const message of ["", complete, "Tiếng Việt & ? # + = \n🙏"]) {
    const link = createWorshipViberDraftLink(message);
    assert.ok(link.startsWith("viber://chat?number=%2B84397092176&draft="));
    assert.equal(decodeURIComponent(link.split("&draft=")[1]), message);
  }
});

test("alternate worship labels satisfy the same fields and preserve source text", () => {
  const text = complete
    .replace("Hát dẫn:", "NKTP:")
    .replace("HDCT:", "Chấp sự HDCT:")
    .replace("KTĐĐ:", "KTĐĐ (Kinh Thánh Đối Đáp):");
  assert.deepEqual(parseWorshipProgram(text), parseWorshipProgram(complete));
  assert.deepEqual(composeWorshipInformationRequest(text).missingFields, []);
  assert.equal(composeWorshipInformationRequest(text).message, text);
  assert.ok(isWorshipProgramText(text));
});
test("blank aliases remain missing while either populated label satisfies the field", () => {
  for (const [canonical, alias, key] of [
    ["Hát dẫn", "NKTP", "songs"],
    ["HDCT", "Chấp sự HDCT", "host"],
    ["KTĐĐ", "KTĐĐ (Kinh Thánh Đối Đáp)", "responsiveReading"],
  ] as const) {
    const blank = parseWorshipProgram(alias + ": ...");
    assert.ok(
      getMissingWorshipProgramFields(blank).some((field) => field.key === key),
    );
    for (const text of [
      canonical + ":\n" + alias + ": Có thông tin",
      alias + ":\n" + canonical + ": Có thông tin",
    ]) {
      assert.ok(
        !getMissingWorshipProgramFields(parseWorshipProgram(text)).some(
          (field) => field.key === key,
        ),
      );
    }
    assert.equal(
      parseWorshipProgram((alias + ": Có thông tin").normalize("NFD"))[
        key
      ].normalize("NFC"),
      "Có thông tin",
    );
  }
});

test("either alias anywhere in source counts as supplied, even without a colon or value", () => {
  for (const [key, labels] of [
    ["songs", ["NKTP", "Hát dẫn"]],
    ["host", ["Chấp sự HDCT", "HDCT"]],
    ["responsiveReading", ["KTĐĐ", "Kinh Thánh Đối Đáp"]],
  ] as const) {
    for (const label of labels) {
      for (const text of [
        label,
        label + ":",
        "Phụ trách " + label.toLowerCase(),
        label.normalize("NFD"),
      ]) {
        assert.ok(
          !composeWorshipInformationRequest(text).missingFields.some(
            (field) => field.key === key,
          ),
          text,
        );
      }
    }
    assert.ok(
      composeWorshipInformationRequest("Không có thông tin").missingFields.some(
        (field) => field.key === key,
      ),
    );
  }
});

test("full worship program stays intact above the missing-information appendix", () => {
  const source = `LỊCH TRỰC NGÀY 08/11/2026 – LỄ 2 (CHIỀU)
Chủ đề: CỦA LỄ CẢM TẠ
Diễn giả: MS Nguyễn Xuân Vịnh, PTQN
Kinh Thánh nền tảng: Thi Thiên 103:1–5
Câu gốc: Hê-bơ-rơ 13:15
Chấp sự HDCT: CS Lê Minh Quân
Kinh Thánh đầu giờ: Thi Thiên 95:1–3, 6
Ban Hát Lễ: Ban Trung Niên – TC 258 “Ôi Chúa Đấng Tôi Cần Luôn”
Bố cục: Hát đúng bố cục Thánh Ca.
Dâng hiến: TC 236 – “Nguyện Đời Tôi Dâng Chúa”`;
  const result = composeWorshipInformationRequest(source);
  assert.equal(
    result.message,
    source.trimEnd() +
      "\nThông tin còn thiếu:\n- Hát dẫn\n- KTĐĐ\n\nXin nhờ CS Sơn Hải và CS Thiệu Huy cung cấp thông tin giúp. Xin cám ơn.",
  );
  assert.deepEqual(
    result.missingFields.map((field) => field.key),
    ["songs", "responsiveReading"],
  );
});

test("Viber query parameters survive one URL decode without corrupting content", () => {
  for (const message of [
    "Tiếng Việt: CỦA LỄ CẢM TẠ\n\nThông tin còn thiếu:\n- KTĐĐ",
    "A+B & C=D # ? % / ' \" (1,2–3) ! * 🙏",
    "Literal %20 and %2B must stay literal, not become spaces or plus signs",
    "Dòng một\r\nDòng hai\n".repeat(200),
    "",
  ]) {
    const link = createWorshipViberDraftLink(message);
    const parsed = new URL(link);
    assert.equal(parsed.searchParams.get("number"), "+84397092176");
    assert.equal(parsed.searchParams.get("draft"), message);
    assert.deepEqual([...parsed.searchParams.keys()], ["number", "draft"]);
    assert.ok(!/[\s'!()*]/u.test(link));
  }
});

test("Viber diagnostics measure Unicode characters, bytes and URI length separately without leaking text", () => {
  for (const message of [
    "short ASCII",
    "a".repeat(10000),
    complete.repeat(30),
    "Tiếng Việt 🙏 + % & # ?\n\n1. TC 258; (2) – — “Chúa”",
  ]) {
    const data = getWorshipViberDiagnostics(message);
    assert.equal(data.characterCount, Array.from(message).length);
    assert.equal(data.utf16Length, message.length);
    assert.equal(data.utf8Bytes, new TextEncoder().encode(message).length);
    assert.equal(data.urlLength, createWorshipViberDraftLink(message).length);
    assert.equal(
      data.encodedDraftLength,
      createWorshipViberDraftLink(message).split("&draft=")[1].length,
    );
    assert.equal(data.roundTripMatches, true);
    assert.equal(data.strategy, "direct-link");
    assert.equal("message" in data, false);
    assert.equal("url" in data, false);
  }
  const link = new URL(createWorshipViberRecipientLink());
  assert.equal(link.searchParams.get("number"), "+84397092176");
  assert.deepEqual([...link.searchParams.keys()], ["number"]);
});

test("reported Vietnamese program round-trips in full with its missing-information appendix", () => {
  const message = `LỊCH TRỰC NGÀY 08/11/2026 – LỄ 2 (CHIỀU)
Chủ đề: CỦA LỄ CẢM TẠ
Diễn giả: MS Nguyễn Xuân Vĩnh, PTQN
Kinh Thánh nền tảng: Thi Thiên 103:1–5
Câu gốc: Hê-bơ-rơ 13:15
Chấp sự HDCT: CS Lê Minh Quân
Kinh Thánh đầu giờ: Thi Thiên 95:1–3, 6
Ban Hát Lễ: Ban Trung Niên – TC 258 “Ôi Chúa Đấng Tôi Cần Luôn”
Bố cục: Hát đúng bố cục Thánh Ca.


Thông tin còn thiếu:
- Hát dẫn
- KTĐĐ
- Dâng hiến

Xin nhờ CS Sơn Hải và CS Thiệu Huy cung cấp thông tin giúp. Xin cám ơn.`;
  const link = createWorshipViberDraftLink(message);
  assert.equal(decodeURIComponent(link.split("&draft=")[1]), message);
  assert.equal(new URL(link).searchParams.get("draft"), message);
  assert.ok(
    getWorshipViberDiagnostics(message).encodedDraftLength > message.length,
  );
  assert.equal(getWorshipViberDiagnostics(message).roundTripMatches, true);
  assert.equal(
    new URL(createWorshipViberRecipientLink()).searchParams.has("draft"),
    false,
  );
});

test("missing-information heading has exactly one preceding newline regardless of trailing blank lines", () => {
  const source =
    "LỊCH TRỰC NGÀY 08/11/2026 – LỄ 2\nChủ đề: CẢM TẠ\n\nDiễn giả: Mục sư";
  const expected = composeWorshipInformationRequest(source).message;
  for (const ending of ["", "\n", "\n\n\n", "\r\n\r\n", "\r\r", "  \n \t\n"]) {
    const result = composeWorshipInformationRequest(source + ending);
    assert.equal(result.message, expected);
    assert.ok(result.message.startsWith(source + "\nThông tin còn thiếu:\n"));
    assert.ok(!result.message.includes("\n\nThông tin còn thiếu:"));
  }
});
