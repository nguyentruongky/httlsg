import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";

test("Kết quả loads computed totals, percentages and tie indicators without paper controls", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return new Response(
      JSON.stringify({
        round: {
          id: 1,
          round_no: 1,
          status: "closed",
          election_name: "Fixture election",
        },
        summary: {
          received: 4,
          valid: 1,
          invalid: 2,
          blank: 1,
          void: 1,
          over_limit: 1,
          average: 2,
        },
        results: [
          {
            id: 1,
            candidate_no: 1,
            full_name: "Candidate A",
            votes: 1,
            percent: 100,
            tie: true,
          },
          {
            id: 2,
            candidate_no: 2,
            full_name: "Candidate B",
            votes: 1,
            percent: 100,
            tie: true,
          },
          {
            id: 3,
            candidate_no: 3,
            full_name: "Candidate C",
            votes: 0,
            percent: 0,
            tie: false,
          },
        ],
        progress: [],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  };
  const { createRoot } = await import("react-dom/client");
  const { ElectionResults } =
    await import("../src/elections/election-admin-page");
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        createElement(ElectionResults, {
          round: { id: 1 },
          electionName: "Fixture election",
          run: async (fn: () => Promise<unknown>) => {
            await fn();
          },
          refresh: async () => {},
          canManageRound: true,
          onSuccess: () => {},
          countdown: { open: false, action: "start-online", seconds: 3 },
          setCountdown: () => {},
          cancelCountdown: () => {},
          handleStartRound: () => {},
          handleManualChecking: () => {},
          setExecuteFunctions: () => {},
        }),
      );
    });
    assert.deepEqual(requests, ["/api/rounds/1/results"]);
    assert.equal(container.querySelectorAll("dl > div").length, 4);
    assert.deepEqual(
      [...container.querySelectorAll("dl dd")].map((e) => e.textContent),
      ["4", "1", "1", "1"],
    );
    assert.equal(
      container.querySelectorAll('[aria-label="Đồng phiếu"]').length,
      2,
    );
    assert.deepEqual(
      [...container.querySelectorAll('[role="progressbar"]')].map((e) =>
        e.getAttribute("aria-valuenow"),
      ),
      ["100", "100", "0"],
    );
    assert.ok(container.textContent?.includes("100.0%"));
    assert.ok(container.textContent?.includes("0.0%"));
    assert.equal(container.querySelector('input[type="number"]'), null);
    assert.ok(!container.textContent?.includes("phiếu giấy"));
    assert.ok(container.textContent?.includes("Xuất Excel"));
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
