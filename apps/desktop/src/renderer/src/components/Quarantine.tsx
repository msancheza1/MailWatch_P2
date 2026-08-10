import { mainReason, type Entry } from '../lib/entries.js';
import { LEVEL_COLOR, LEVEL_LABEL, LEVEL_SOFT, relativeDay } from '../lib/format.js';
import { IconTrash } from './Icons.js';

interface QuarantineProps {
  entries: Entry[];
  today: string;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onEmpty: () => void;
  onOpen: (id: string) => void;
}

export function Quarantine({ entries, today, onRestore, onDelete, onEmpty, onOpen }: QuarantineProps) {
  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Cuarentena</h1>
          <p className="page-sub">
            {entries.length === 0
              ? 'No hay correos retenidos'
              : `${entries.length} ${entries.length === 1 ? 'correo retenido' : 'correos retenidos'} por alto riesgo`}
          </p>
        </div>
        {entries.length > 0 && (
          <button type="button" className="btn btn--danger btn--icon" onClick={onEmpty}>
            <IconTrash />
            Vaciar cuarentena
          </button>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="empty">
          <span className="empty__title">Todo limpio</span>
          <p>Ningún correo del lote actual alcanzó el nivel de riesgo necesario para retenerlo.</p>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Remitente</th>
                  <th>Asunto</th>
                  <th>Motivo</th>
                  <th>Retenido</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map(({ email, result }) => (
                  <tr key={email.id}>
                    <td>
                      <button type="button" className="cell-from" onClick={() => onOpen(email.id)}>
                        {email.from.address}
                      </button>
                    </td>
                    <td>
                      <div className="cell-subject">{email.subject}</div>
                    </td>
                    <td>
                      <div className="cell-reason">{mainReason(result)}</div>
                      <span
                        className="tag"
                        style={
                          {
                            '--tag-bg': LEVEL_SOFT[result.level],
                            '--tag-ink': LEVEL_COLOR[result.level],
                          } as React.CSSProperties
                        }
                      >
                        <i />
                        {LEVEL_LABEL[result.level]}
                      </span>
                    </td>
                    <td>
                      <div className="cell-when">{relativeDay(email.receivedAt, today)}</div>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button type="button" className="btn btn--soft" onClick={() => onRestore(email.id)}>
                          Restaurar
                        </button>
                        <button type="button" className="btn btn--danger" onClick={() => onDelete(email.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
