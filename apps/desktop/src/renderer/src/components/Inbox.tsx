import { recommendedAction, type RiskLevel } from '@mailwatch/core';
import { decidedByPolicy, type Entry } from '../lib/entries.js';
import {
  CATEGORY_LABEL,
  LEVEL_COLOR,
  LEVEL_HEADLINE,
  LEVEL_LABEL,
  LEVEL_SOFT,
  relativeDay,
  shortDate,
} from '../lib/format.js';

interface InboxProps {
  entries: Entry[];
  selected: Entry | null;
  today: string;
  quarantined: boolean;
  feedback: RiskLevel | undefined;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
  onFeedback: (id: string, level: RiskLevel) => void;
}

export function Inbox({
  entries,
  selected,
  today,
  quarantined,
  feedback,
  onSelect,
  onRestore,
  onFeedback,
}: InboxProps) {
  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Bandeja de entrada</h1>
          <p className="page-sub">
            {entries.length} correos analizados · elige uno para ver por qué se clasificó así
          </p>
        </div>
      </header>

      <div className="inbox">
        <div className="mail-list">
          {entries.map(({ email, result }) => (
            <button
              key={email.id}
              type="button"
              className="mail-row"
              aria-selected={selected?.email.id === email.id}
              onClick={() => onSelect(email.id)}
              style={{ '--level': LEVEL_COLOR[result.level] } as React.CSSProperties}
            >
              <span className="mail-row__stripe" />
              <span className="mail-row__from">{email.from.displayName}</span>
              <span
                className="mail-row__score"
                title={
                  decidedByPolicy(result)
                    ? 'Clasificado por tus listas de dominios, no por el puntaje'
                    : `Riesgo ${result.score} de 100`
                }
              >
                {decidedByPolicy(result) ? '—' : result.score}
              </span>
              <span className="mail-row__subject">{email.subject}</span>
              <span className="mail-row__time">{shortDate(email.receivedAt, today)}</span>
            </button>
          ))}
        </div>

        {selected ? (
          <Detail
            entry={selected}
            today={today}
            quarantined={quarantined}
            feedback={feedback}
            onRestore={onRestore}
            onFeedback={onFeedback}
          />
        ) : (
          <div className="empty">
            <span className="empty__title">Selecciona un correo</span>
            <p>MailWatch te muestra cada señal que encontró y la evidencia exacta que la disparó.</p>
          </div>
        )}
      </div>
    </>
  );
}

function Detail({
  entry,
  today,
  quarantined,
  feedback,
  onRestore,
  onFeedback,
}: {
  entry: Entry;
  today: string;
  quarantined: boolean;
  feedback: RiskLevel | undefined;
  onRestore: (id: string) => void;
  onFeedback: (id: string, level: RiskLevel) => void;
}) {
  const { email, result } = entry;
  const risky = result.signals.filter((signal) => signal.weight > 0);
  const protective = result.signals.filter((signal) => signal.weight <= 0);

  const levelVars = {
    '--level': LEVEL_COLOR[result.level],
    '--level-soft': LEVEL_SOFT[result.level],
  } as React.CSSProperties;

  return (
    <div className="detail" style={levelVars}>
      <article className="verdict">
        <span
          className="tag"
          style={
            {
              '--tag-bg': 'rgba(255,255,255,0.72)',
              '--tag-ink': LEVEL_COLOR[result.level],
            } as React.CSSProperties
          }
        >
          <i />
          {LEVEL_LABEL[result.level]}
          {quarantined && ' · en cuarentena'}
        </span>

        <h2 className="verdict__title">{LEVEL_HEADLINE[result.level]}</h2>
        <p className="verdict__text">{result.summary}</p>

        {!decidedByPolicy(result) && (
          <div className="gauge">
            <span className="gauge__value">
              {result.score}
              <small>/100</small>
            </span>
            <span className="gauge__track">
              <span className="gauge__fill" style={{ width: `${result.score}%` }} />
            </span>
          </div>
        )}

        <div className="advice">
          <p>
            <strong>Qué hacer</strong>
            {recommendedAction(result.level)}
          </p>
        </div>

        <div className="cell-actions" style={{ justifyContent: 'flex-start', marginTop: 16 }}>
          {quarantined && (
            <button type="button" className="btn btn--mint" onClick={() => onRestore(email.id)}>
              Restaurar a la bandeja
            </button>
          )}
          <button
            type="button"
            className={feedback === 'safe' ? 'btn btn--mint' : 'btn btn--ghost'}
            onClick={() => onFeedback(email.id, 'safe')}
          >
            {feedback === 'safe' ? '✓ Marcado como legítimo' : 'Es legítimo'}
          </button>
          <button
            type="button"
            className={feedback === 'malicious' ? 'btn btn--danger' : 'btn btn--ghost'}
            onClick={() => onFeedback(email.id, 'malicious')}
          >
            {feedback === 'malicious' ? '✓ Reportado como fraude' : 'Es fraude'}
          </button>
        </div>
      </article>

      <section className="card">
        <header className="card__head">
          <div>
            <h2 className="card__title">Evidencia</h2>
            <p className="card__sub">
              {risky.length === 0 ? 'Ninguna regla se activó' : `${risky.length} señales encontradas`}
            </p>
          </div>
        </header>

        {risky.map((signal) => (
          <div
            key={signal.id}
            className="evidence"
            style={{ '--weight': LEVEL_COLOR[result.level] } as React.CSSProperties}
          >
            <span className="evidence__weight">+{signal.weight}</span>
            <div>
              <p className="evidence__text">{signal.explanation}</p>
              <p className="card__sub">{CATEGORY_LABEL[signal.category]}</p>
              {signal.evidence && <span className="evidence__proof">{signal.evidence}</span>}
            </div>
          </div>
        ))}

        {protective.map((signal) => (
          <div
            key={signal.id}
            className="evidence"
            style={{ '--weight': LEVEL_COLOR.safe } as React.CSSProperties}
          >
            <span className="evidence__weight">{signal.weight === 0 ? '—' : signal.weight}</span>
            <div>
              <p className="evidence__text">{signal.explanation}</p>
              <p className="card__sub">{CATEGORY_LABEL[signal.category]}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <header className="card__head">
          <div>
            <h2 className="card__title">Correo original</h2>
            <p className="card__sub">{relativeDay(email.receivedAt, today)}</p>
          </div>
        </header>

        <dl className="headers">
          <dt>De</dt>
          <dd>
            {email.from.displayName} &lt;{email.from.address}&gt;
          </dd>
          {email.replyTo && (
            <>
              <dt>Responder a</dt>
              <dd>{email.replyTo.address}</dd>
            </>
          )}
          <dt>Firmado por</dt>
          <dd>{email.authenticatedDomain ?? 'sin firma SPF/DKIM'}</dd>
          <dt>Asunto</dt>
          <dd>{email.subject}</dd>
          {email.links.length > 0 && (
            <>
              <dt>Enlaces</dt>
              <dd>
                {email.links.map((link) => (
                  <div key={link.href}>
                    {link.text} → {link.href}
                  </div>
                ))}
              </dd>
            </>
          )}
          {email.attachments.length > 0 && (
            <>
              <dt>Adjuntos</dt>
              <dd>
                {email.attachments.map((file) => (
                  <div key={file.filename}>
                    {file.filename} · {Math.round(file.sizeBytes / 1024)} KB
                  </div>
                ))}
              </dd>
            </>
          )}
        </dl>

        <div className="body-preview">{email.body}</div>
      </section>
    </div>
  );
}
