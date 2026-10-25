import { errorText } from "@/lib/api";
import { money } from "@/lib/format";
import { useAcceptOffer } from "@/lib/queries";
import type { AnyApplication, OfferTerms } from "@/lib/types";

function Terms({ terms }: { terms: OfferTerms }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <dt className="text-neutral-500">Сумма</dt>
      <dd className="font-medium">{money(terms.amount_rub)}</dd>
      <dt className="text-neutral-500">Срок</dt>
      <dd className="font-medium">{terms.term_months} мес.</dd>
      <dt className="text-neutral-500">Ставка</dt>
      <dd className="font-medium">{terms.annual_rate_percent}%</dd>
      <dt className="text-neutral-500">Платёж</dt>
      <dd className="font-medium">{money(terms.monthly_payment_rub)}</dd>
    </dl>
  );
}

export function OfferPanel({ application }: { application: AnyApplication }) {
  const accept = useAcceptOffer(application.id);
  const { offer, alternative_offer: alternative, accepted_offer: accepted } = application;
  if (!offer && !alternative && !accepted) return null;

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold">Предложение</h2>
      {accepted && (
        <div className="space-y-1">
          <Terms terms={accepted} />
        </div>
      )}
      {!accepted && offer && (
        <div className="space-y-3">
          <Terms terms={offer} />
          <button
            className="btn btn-primary"
            disabled={accept.isPending}
            onClick={() => accept.mutate("requested")}
          >
            Принять
          </button>
        </div>
      )}
      {!accepted && alternative && (
        <div className="space-y-3">
          <Terms terms={alternative} />
          <button
            className="btn btn-primary"
            disabled={accept.isPending}
            onClick={() => accept.mutate("alternative")}
          >
            Принять
          </button>
        </div>
      )}
      {accept.error && <div className="text-sm text-red-600">{errorText(accept.error)}</div>}
    </div>
  );
}
