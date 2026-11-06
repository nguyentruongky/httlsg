import { parseWorshipProgram } from "./parser";
import { getMissingWorshipProgramFields } from "./missing-fields";
import type { WorshipInformation } from "./types";
export function composeWorshipInformationRequest(
  eventText: string,
): WorshipInformation {
  const fields = parseWorshipProgram(eventText),
    missingFields = getMissingWorshipProgramFields(fields, eventText);
  if (!missingFields.length)
    return { fields, missingFields, message: eventText };
  const groupA = missingFields.some((field) => field.group === "A");
  const groupB = missingFields.some((field) => field.group === "B");
  const recipient =
    groupA && groupB
      ? "CS Sơn Hải và CS Thiệu Huy"
      : groupA
        ? "CS Thiệu Huy"
        : "CS Sơn Hải";
  const request = `Xin nhờ ${recipient} cung cấp thông tin giúp. Xin cám ơn.`;
  return {
    fields,
    missingFields,
    message:
      eventText.trimEnd() +
      "\n\nThông tin còn thiếu:\n" +
      missingFields.map((field) => "- " + field.label).join("\n") +
      "\n\n" +
      request,
  };
}
