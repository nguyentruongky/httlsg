/** Read-only browser layout checks. All API calls use synthetic fixtures.
 * Start Next on :3000 and isolated headless Chrome with --remote-debugging-port=9222.
 * Run: node --import tsx scripts/check-responsive-ui.mts
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { todayInChurch } from "../packages/core/src/calendar";
import { demo, orgs } from "../packages/core/src/demo";
import { getMyProfile } from "../packages/core/src/directory";
const require = createRequire(import.meta.url);
const WebSocket = require("next/dist/compiled/ws");
const base = process.env.RESPONSIVE_BASE_URL ?? "http://127.0.0.1:3000";
assert.ok(
  ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
  "Use a local test server only",
);
const target = await (
  await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" })
).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise<void>((resolve) => socket.on("open", resolve));
let sequence = 0;
const pending = new Map<
  number,
  { resolve: (value: any) => void; reject: (error: unknown) => void }
>();
socket.on("message", (raw: Buffer) => {
  const message = JSON.parse(raw.toString());
  if (!message.id) return;
  const call = pending.get(message.id);
  if (!call) return;
  pending.delete(message.id);
  if (message.error) call.reject(new Error(JSON.stringify(message.error)));
  else call.resolve(message.result);
});
function cdp(method: string, params: unknown = {}) {
  const id = ++sequence;
  return new Promise<any>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression: string) {
  const result = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.text +
        ": " +
        result.exceptionDetails.exception?.description,
    );
  return result.result.value;
}
const snapshot = await demo.get(orgs[0].id);
const profile = await getMyProfile(orgs[0].id);
const longName = "Nguyễn Thị Thành Viên Kiểm Tra Giao Diện Trên Điện Thoại";
const longEmail =
  "very.long.synthetic.member.address.for.mobile.layout@example.test";
snapshot.members[0].user.name = longName;
snapshot.members[0].user.email = longEmail;
const member = snapshot.members[0];
const departments = [
  { id: "test-department", name: "Ban Truyền Giảng Và Sinh Hoạt Hội Thánh" },
];
const permissions = [
  "calendar.read",
  "calendar.write",
  "calendar.export",
  "calendar.groups",
  "calendar.notify",
  "members.read.all",
  "members.write.all",
  "access.manage",
  "leader.otps.read",
  "roles.manage",
];
const eventTitle =
  "Chương trình thờ phượng và sinh hoạt Hội Thánh với tiêu đề dài để kiểm tra trên điện thoại";
const fixture = {
  events: [
    {
      id: "fixture-event",
      eventDate: todayInChurch(),
      title: eventTitle,
      timeText: "08:00 - 10:00",
      startTime: "08:00",
      endTime: "10:00",
      details: "Nội dung thử nghiệm",
      originalText: eventTitle + "\n08:00 - 10:00\nNội dung thử nghiệm",
      groupIds: [],
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  snapshot,
  profile: {
    ...profile,
    user: { ...profile.user, name: longName, email: longEmail },
  },
  departments,
  user: {
    id: member.userId,
    name: "Quản trị thử nghiệm",
    role: "admin",
    roles: ["admin"],
    roleLabel: "Admin",
    permissions,
    requiresPasswordSetup: false,
    authVersion: 1,
  },
  assigned: {
    id: member.id,
    name: longName,
    email: longEmail,
    phone: "0900000000",
    role: "leader",
    hasAccount: true,
    departmentId: departments[0].id,
    departmentIds: [departments[0].id],
    departmentNames: [departments[0].name],
    departmental: true,
    allDepartments: [departments[0].name],
    roles: [{ roleId: "leader", departmentId: departments[0].id }],
  },
  otp: {
    id: "fixture-otp",
    user_id: member.id,
    full_name: longName,
    phone: "0900000000",
    email: longEmail,
    department_name: departments[0].name,
    type: "PHONE_LEADER",
    status: "pending",
    otp_code: "123456",
    code_state: "available",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  },
  group: {
    id: "fixture-group",
    name: "Chương trình thờ phượng",
    description:
      "Nhóm thử nghiệm với nội dung dài để kiểm tra xuống dòng trên điện thoại.",
    memberCount: 1,
    version: 0,
    members: [{ id: "fixture-email", email: longEmail }],
  },
};
await cdp("Page.enable");
await cdp("Page.addScriptToEvaluateOnNewDocument", {
  source: `(()=>{
 const f=${JSON.stringify(fixture)};
 const nativeFetch=window.fetch.bind(window);
 window.__unexpectedApis=[];window.__writes=[];
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.origin);
  if(!url.pathname.startsWith('/api/'))return nativeFetch(input,init);
  const path=url.pathname, method=init.method||'GET';
  const json=(data,status=200)=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}));
  if(path==='/api/auth/refresh')return location.pathname==='/login'?json({},401):json({accessToken:'fixture-token'});
  if(path==='/api/auth/me')return location.pathname==='/login'?json({},401):json({user:{...f.user,requiresPasswordSetup:location.pathname==='/set-password'}});
  if(method!=='GET'){window.__writes.push(path);return json({message:'Writes are blocked during responsive checks'},403);}
  if(path==='/api/catalog')return json({departments:f.departments});
  if(path==='/api/admin/workspace')return json(f.snapshot);
  if(path==='/api/admin/departments')return json({departments:f.departments,managers:[]});
  if(path==='/api/admin/roles/assigned')return json({items:[f.assigned],departments:f.departments});
  if(path==='/api/admin/roles/permissions')return json({roles:[{id:'leader',name:'Trưởng ban ngành',permissions:['members.write.all']}],permissions:[{id:'permission',code:'members.write.all',name:'Cập nhật thông tin thành viên trong Ban ngành'}],allowed:{leader:['members.write.all']}});
  if(path==='/api/admin/members/search')return json({items:[f.assigned],total:1});
  if(path==='/api/admin/otps'||path==='/api/leader/otps')return json({items:[f.otp],total:1,page:1});
  if(path==='/api/leader/events')return new Response('event: resync\\ndata: {}\\n\\n',{headers:{'Content-Type':'text/event-stream'}});
  if(path==='/api/notifications/failures')return json({items:[{id:'failure',title:'Sinh hoạt thử nghiệm có tên dài để kiểm tra giao diện',eventDate:'2026-11-08',createdAt:new Date().toISOString(),failed:1,retryable:1,uncertain:0}],total:1});
  if(path==='/api/events')return json({items:f.events});
  if(path==='/api/events/export')return json({text:'Lịch sinh hoạt thử nghiệm',from:'2026-11-01',to:'2026-11-07'});
  if(path==='/api/email-groups')return json({items:[f.group]});
  if(path==='/api/email-groups/fixture-group')return json(f.group);
  if(path==='/api/members/me'||path==='/api/members/'+f.profile.id)return json(f.profile);
  if(path==='/api/members')return json({items:[f.profile],total:1,page:1,pageSize:12,hasMore:false});
  if(path==='/api/members/options')return json([]);
  window.__unexpectedApis.push(path);return json({message:'Unmocked responsive fixture API'},404);
 };
})();`,
});
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression: string) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await delay(200);
  }
  throw new Error("Page did not become ready: " + expression);
}
let checks = 0;
async function check(label: string) {
  await delay(150);
  let result: any;
  let stable = 0;
  for (let attempt = 0; attempt < 25; attempt++) {
    await evaluate("document.fonts.ready.then(()=>true)");
    result = await evaluate(`(()=>{
    const width=document.documentElement.clientWidth;
    const overflow=[...document.querySelectorAll('main *,[role="dialog"] *')].filter(el=>{
      const r=el.getBoundingClientRect(),style=getComputedStyle(el);
      if(!r.width||!r.height||style.position==='absolute'||style.position==='fixed'||el.closest('thead'))return false;
      if(r.left>=-1&&r.right<=width+1)return false;
      // Horizontal scrolling is only intentional within named scroll regions.
      for(let p=el.parentElement;p;p=p.parentElement){if(getComputedStyle(p).overflowX==='auto'&&p.scrollWidth>p.clientWidth)return false;}
      return true;
    }).slice(0,5).map(el=>({tag:el.tagName,class:el.className}));
    const dialog=[...document.querySelectorAll('[role="dialog"]')].at(-1);
    const box=dialog?.getBoundingClientRect();
    return {width,scrollWidth:document.documentElement.scrollWidth,overflow,dialogFits:!box||(box.left>=-1&&box.right<=width+1&&box.top>=-1&&box.bottom<=innerHeight+1),unexpected:window.__unexpectedApis,writes:window.__writes};
  })()`);
    if (
      result.scrollWidth <= result.width + 1 &&
      !result.overflow.length &&
      result.dialogFits
    )
      stable++;
    else stable = 0;
    if (stable === 3) break;
    await delay(200);
  }
  assert.equal(
    result.scrollWidth <= result.width + 1,
    true,
    label + ": document overflow " + JSON.stringify(result),
  );
  assert.deepEqual(result.overflow, [], label + ": content outside viewport");
  assert.ok(result.dialogFits, label + ": dialog outside viewport");
  assert.deepEqual(result.unexpected, [], label + ": missing fixture");
  assert.deepEqual(result.writes, [], label + ": unintended mutation");
  checks++;
}
async function click(selector: string) {
  assert.ok(
    await evaluate(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.click();return true;})()`,
    ),
    "Missing control " + selector,
  );
  await delay(250);
}
async function clickText(text: string) {
  assert.ok(
    await evaluate(
      `(()=>{const el=[...document.querySelectorAll('button')].find(el=>el.textContent.includes(${JSON.stringify(text)}));if(!el)return false;el.click();return true;})()`,
    ),
    "Missing button " + text,
  );
  await delay(250);
}
try {
  const routes = [
    "/dashboard",
    "/dashboard/members",
    "/dashboard/admin/roles/members",
    "/dashboard/admin/roles/settings",
    "/dashboard/settings",
    "/dashboard/otps",
    "/dashboard/calendar",
    "/dashboard/calendar/email-groups",
    "/dashboard/activity",
    "/dashboard/leader-otp",
    "/client",
    "/login",
    "/set-password",
  ];
  const requestedWidths = process.env.RESPONSIVE_WIDTHS?.split(",").map(Number);
  for (const [width, height] of [
    [280, 653],
    [320, 568],
    [375, 667],
    [390, 844],
    [430, 932],
    [667, 375],
    [768, 1024],
    [1440, 900],
  ].filter(([width]) => !requestedWidths || requestedWidths.includes(width))) {
    await cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    for (const route of routes) {
      await cdp("Page.navigate", { url: base + route });
      await waitFor(
        "document.readyState==='complete' && (document.querySelector('main h1')||document.querySelector('#mobile-content')) && !document.body.textContent.includes('Loading your workspace') && !document.body.textContent.includes('Đang tải…')",
      );
      await delay(300);
      console.log(`Checking ${width}x${height} ${route}`);
      await check(`${width}x${height} ${route}`);
      if (route === "/dashboard") {
        if (width < 768) await click('button[aria-label="Search workspace"]');
        else await clickText("Search workspace");
        await check(`${width} command menu`);
        await click('[role="dialog"] button[aria-label="Close dialog"]');
        await click('button[aria-label^="Thông báo"]');
        await check(`${width} failure notifications`);
        await click('[role="dialog"] button[aria-label="Close dialog"]');
      }
      if (route === "/client") {
        await click('button[aria-label^="Bộ lọc"]');
        await check(`${width} member filters`);
        await click('button[aria-label="Đóng bộ lọc"]');
        await evaluate("location.hash='#/profile'");
        await waitFor(
          "document.querySelector('#mobile-content h2') || document.querySelector('#mobile-content dl')",
        );
        await check(`${width} client profile`);
      }
      if (route === "/dashboard/calendar/email-groups") {
        await clickText("Tạo nhóm");
        await check(`${width} new email group`);
        await click('[role="dialog"] button[aria-label="Đóng nhóm"]');
      }
      if (route === "/dashboard/members") {
        await clickText("Thêm tài khoản");
        await check(`${width} invite dialog`);
        await click('[role="dialog"] button[aria-label="Close dialog"]');
      }
      if (route === "/dashboard/calendar") {
        await clickText("Tuần");
        await check(`${width} calendar week`);
        await clickText("Ngày");
        await check(`${width} calendar day`);
        await clickText("Tháng");
        await clickText("Tạo sinh hoạt");
        await check(`${width} event editor`);
        await click('button[aria-labelledby][aria-haspopup="dialog"]');
        await check(`${width} presets`);
        await click('[role="dialog"] button[aria-label="Đóng danh sách mẫu"]');
        await click('[role="dialog"] button[aria-label="Đóng sinh hoạt"]');
        await clickText("Xuất Word");
        await check(`${width} Word export`);
        await click('[role="dialog"] button[aria-label="Đóng xuất lịch"]');
      }
      if (route === "/dashboard/admin/roles/members") {
        await clickText("Cập nhật");
        await check(`${width} role dialog`);
        await click('[role="dialog"] button[aria-label="Close dialog"]');
      }
      if (route === "/dashboard" && width < 1024) {
        await click('button[aria-label="Open navigation"]');
        await check(`${width} mobile navigation`);
        assert.ok(
          await evaluate(
            `[...document.querySelectorAll('[role="dialog"] nav a span')].every(el=>getComputedStyle(el).position!=='absolute')`,
          ),
          "Mobile navigation labels must be visible",
        );
        await click('[role="dialog"] button[aria-label="Close dialog"]');
      }
    }
  }
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp("Page.navigate", { url: base + "/dashboard" });
  await waitFor(
    "document.querySelector('button[aria-label=\"Collapse sidebar\"]')",
  );
  await click('button[aria-label="Collapse sidebar"]');
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 568,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await click('button[aria-label="Open navigation"]');
  await check("collapsed desktop to phone navigation");
  assert.ok(
    await evaluate(
      `[...document.querySelectorAll('[role="dialog"] nav a span')].every(el=>getComputedStyle(el).position!=='absolute')`,
    ),
  );
  await click('[role="dialog"] button[aria-label="Close dialog"]');
  if (process.env.RESPONSIVE_SCREENSHOT_DIR) {
    await mkdir(process.env.RESPONSIVE_SCREENSHOT_DIR, { recursive: true });
    await cdp("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    for (const [name, route] of [
      ["members", "/dashboard/members"],
      ["calendar", "/dashboard/calendar"],
      ["roles", "/dashboard/admin/roles/members"],
    ]) {
      await cdp("Page.navigate", { url: base + route });
      await waitFor(
        "document.readyState==='complete' && document.querySelector('main h1') && !document.body.textContent.includes('Loading your workspace')",
      );
      await delay(500);
      const capture = await cdp("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      await writeFile(
        join(process.env.RESPONSIVE_SCREENSHOT_DIR, `${name}.png`),
        Buffer.from(capture.data, "base64"),
      );
    }
  }
  console.log(
    `Responsive Chrome checks passed: ${checks} route/dialog layouts; ${requestedWidths ? `requested widths ${requestedWidths.join(", ")}px` : "280–1440px including phone landscape"}; synthetic API fixtures only.`,
  );
} finally {
  await cdp("Page.close").catch(() => {});
  socket.close();
}
