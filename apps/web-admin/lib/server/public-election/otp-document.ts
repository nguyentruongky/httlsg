import PDFDocument from "pdfkit";
import { join } from "node:path";
import {
  PUBLIC_OTP_CARD_HEADER,
  PUBLIC_OTP_CARD_INSTRUCTIONS,
} from "@org/core";

export function electionOtpDocument(
  title: string,
  items: Array<{ order: number; pin: string; usedAt: string | null }>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 32,
      autoFirstPage: false,
      info: { Title: `Danh sách mã - ${title}`, Author: "Hội Thánh" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      doc.font(
        process.env.ELECTION_PDF_FONT ??
          join(process.cwd(), "assets/NotoSans-Regular.ttf"),
      );
      for (let index = 0; index < items.length; index++) {
        if (index % 8 === 0) doc.addPage();
        const item = items[index];
        const used = Boolean(item.usedAt);
        const secondaryColor = used ? "#686a65" : "#5e5c55";
        const width = (doc.page.width - 76) / 2;
        const height = (doc.page.height - 100) / 4;
        const x = 32 + (index % 2) * (width + 12);
        const y = 32 + Math.floor((index % 8) / 2) * (height + 12);
        doc.save();
        doc
          .roundedRect(x, y, width, height, 10)
          .fillAndStroke(
            used ? "#f1f1ef" : "#ffffff",
            used ? "#d2d3d0" : "#cfdacf",
          );
        const headerHeight = doc
          .fontSize(8)
          .heightOfString(PUBLIC_OTP_CARD_HEADER, { width: width - 28 });
        doc
          .fillColor(secondaryColor)
          .text(PUBLIC_OTP_CARD_HEADER, x + 14, y + 12, {
            width: width - 28,
            align: "center",
          });
        const titleY = y + 12 + headerHeight + 4;
        const titleHeight = Math.min(
          43,
          doc.fontSize(11).heightOfString(title, { width: width - 28 }),
        );
        const dividerY = titleY + titleHeight + 2;
        doc
          .fontSize(11)
          .fillColor(used ? "#686a65" : "#215e3d")
          .text(title, x + 14, titleY, {
            width: width - 28,
            height: 43,
            align: "center",
            ellipsis: true,
          });
        doc
          .moveTo(x + 14, dividerY)
          .lineTo(x + width - 14, dividerY)
          .strokeColor(used ? "#d2d3d0" : "#e6e4dd")
          .stroke();
        doc
          .fontSize(40)
          .fillColor(used ? "#686a65" : "#1a1a17")
          .text(item.pin, x + 14, dividerY + 14, {
            width: width - 28,
            align: "center",
            characterSpacing: 4,
            lineBreak: false,
          });
        doc
          .fontSize(8.5)
          .fillColor(secondaryColor)
          .text(PUBLIC_OTP_CARD_INSTRUCTIONS, x + 16, dividerY + 68, {
            width: width - 32,
            height: 43,
            align: "center",
            lineGap: 2,
          });
        doc
          .fontSize(7.5)
          .fillColor(used ? "#686a65" : "#215e3d")
          .text(
            `${item.order} · ${item.usedAt ? "Đã sử dụng" : "Chưa sử dụng"}`,
            x + 14,
            y + height - 19,
            { width: width - 28, align: "center", lineBreak: false },
          );
        doc.restore();
      }
      if (!items.length) {
        doc.addPage();
        doc.fontSize(14).text("Chưa có mã OTP.");
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
