import type { CSSProperties } from "react";
import type { TicketCardData } from "./ticket-card-types";
import { TicketCandidateLine } from "./ticket-candidate-line";
export function TicketCandidates({ ticket }: { ticket: TicketCardData }) {
  if (!ticket.candidates.length)
    return (
      <p className="py-2 text-sm italic text-[#8a877d]">
        {ticket.invalid_reason === "manual"
          ? "Phiếu bất hợp lệ"
          : "Phiếu trắng"}
      </p>
    );
  return (
    <ul
      aria-label="Ứng viên trong phiếu"
      style={
        {
          "--ticket-rows-two": Math.ceil(ticket.candidates.length / 2),
          "--ticket-rows-three": Math.ceil(ticket.candidates.length / 3),
        } as CSSProperties
      }
      className={`grid grid-flow-col grid-cols-2 grid-rows-[repeat(var(--ticket-rows-two),auto)] gap-x-4 gap-y-2 text-sm sm:grid-cols-3 sm:grid-rows-[repeat(var(--ticket-rows-three),auto)] md:grid-cols-2 md:grid-rows-[repeat(var(--ticket-rows-two),auto)] xl:grid-cols-3 xl:grid-rows-[repeat(var(--ticket-rows-three),auto)] ${ticket.status === "void" ? "text-[#8a877d] line-through" : "text-[#302f29]"}`}
    >
      {ticket.candidates.map((candidate, index) => (
        <TicketCandidateLine
          key={candidate.id ?? `${candidate.candidate_no}:${index}`}
          number={candidate.candidate_no}
          name={candidate.full_name}
        />
      ))}
    </ul>
  );
}
