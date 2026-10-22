export type Feedback = {
  email_id: number;
  category: "Safe" | "Malicious";
  report_type: "false_positive" | "false_negative" | "confirmation";
  created_at: string;
};

export default function FeedbackButtons({
  emailId,
  feedback,
  disabled,
  analyzed,
  onReport,
}: {
  emailId: number;
  feedback?: Feedback;
  disabled: boolean;
  analyzed: boolean;
  onReport: (emailId: number, category: Feedback["category"]) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={`Corregir clasificación del correo ${emailId}`}
      >
        <button
          type="button"
          disabled={disabled || !analyzed}
          aria-pressed={feedback?.category === "Safe"}
          className="rounded-lg border border-emerald-600 px-3 py-2 text-sm text-emerald-800 disabled:opacity-50"
          onClick={() => onReport(emailId, "Safe")}
        >
          Marcar como seguro
        </button>
        <button
          type="button"
          disabled={disabled || !analyzed}
          aria-pressed={feedback?.category === "Malicious"}
          className="rounded-lg border border-red-600 px-3 py-2 text-sm text-red-800 disabled:opacity-50"
          onClick={() => onReport(emailId, "Malicious")}
        >
          Marcar como peligroso
        </button>
      </div>
      {!analyzed && (
        <p className="text-xs text-slate-500">
          Analiza este correo para reportar una clasificación incorrecta.
        </p>
      )}
      {feedback && (
        <p className="text-sm text-slate-700">
          Tu última valoración:{" "}
          <strong>
            {feedback.category === "Safe" ? "Seguro" : "Peligroso"}
          </strong>
          {" · "}
          {feedback.report_type === "false_positive"
            ? "Falso positivo"
            : feedback.report_type === "false_negative"
              ? "Falso negativo"
              : "Confirmación"}
          {" · "}
          {new Date(feedback.created_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
