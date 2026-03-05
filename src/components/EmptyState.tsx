import { Inbox } from "lucide-react";

export default function EmptyState({ message = "No data found" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#9898ac] animate-in">
      <Inbox size={40} className="mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
