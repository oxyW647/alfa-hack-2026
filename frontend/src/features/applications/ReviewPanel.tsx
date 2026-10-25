import { useState } from "react";

import { errorText } from "@/lib/api";
import { useManualReview } from "@/lib/queries";
import type { EmployeeApplication } from "@/lib/types";

export function ReviewPanel({ application }: { application: EmployeeApplication }) {
  const review = useManualReview(application.id);
  const [comment, setComment] = useState("");
  if (application.route !== "MANUAL_REVIEW" || application.accepted_at) return null;

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold">Ручное решение</h2>
      {application.manual_review && (
        <div className="text-sm">
          {application.manual_review.decision === "approve" ? "Одобрено" : "Отклонено"}
          {application.manual_review.comment ? `: ${application.manual_review.comment}` : ""}
        </div>
      )}
      <input
        className="input"
        placeholder="Комментарий"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="btn btn-primary"
          disabled={review.isPending}
          onClick={() => review.mutate({ decision: "approve", comment: comment || null })}
        >
          Одобрить
        </button>
        <button
          className="btn"
          disabled={review.isPending}
          onClick={() => review.mutate({ decision: "decline", comment: comment || null })}
        >
          Отклонить
        </button>
      </div>
      {review.error && <div className="text-sm text-red-600">{errorText(review.error)}</div>}
    </div>
  );
}
