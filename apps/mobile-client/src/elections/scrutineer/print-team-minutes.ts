/** Print an isolated document without replacing or restyling the election screen. */
export function printTeamMinutes(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "In biên bản kiểm phiếu";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
    const cleanup = () => {
      window.removeEventListener("pagehide", cleanup);
      frame.remove();
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Không thể mở biên bản để in. Vui lòng thử lại."));
    }, 20000);
    frame.onload = () => {
      clearTimeout(timeout);
      void (async () => {
        try {
          const target = frame.contentWindow;
          if (!target) throw new Error("Không thể mở cửa sổ in.");
          await target.document.fonts?.ready;
          target.addEventListener("afterprint", cleanup, { once: true });
          window.addEventListener("pagehide", cleanup, { once: true });
          target.focus();
          target.print();
          resolve();
        } catch (error) {
          cleanup();
          reject(error);
        }
      })();
    };
    frame.srcdoc = html;
    document.body.append(frame);
  });
}
