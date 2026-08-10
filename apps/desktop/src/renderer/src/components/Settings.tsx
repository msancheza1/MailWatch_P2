import { useState } from 'react';
import { SENSITIVITY_PRESETS, type SensitivityPreset } from '@mailwatch/core';

export interface Notifications {
  malicious: boolean;
  suspicious: boolean;
  weekly: boolean;
}

const LEVELS: { id: SensitivityPreset; name: string; note: string }[] = [
  {
    id: 'low',
    name: 'Baja',
    note: 'Solo avisa ante evidencia contundente. Menos avisos, más riesgo de dejar pasar algo.',
  },
  { id: 'balanced', name: 'Media', note: 'El equilibrio recomendado entre avisos y falsas alarmas.' },
  {
    id: 'high',
    name: 'Alta',
    note: 'Marca cualquier indicio. Verás más avisos, incluidos algunos correos legítimos.',
  },
];

interface SettingsProps {
  notifications: Notifications;
  onNotifications: (next: Notifications) => void;
  preset: SensitivityPreset;
  onPreset: (preset: SensitivityPreset) => void;
  trusted: string[];
  blocked: string[];
  onDomains: (list: 'trusted' | 'blocked', domains: string[]) => void;
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} onClick={onToggle}>
      <span />
    </button>
  );
}

function DomainList({
  label,
  note,
  domains,
  placeholder,
  tone,
  onChange,
}: {
  label: string;
  note: string;
  domains: string[];
  placeholder: string;
  tone: { ink: string; soft: string };
  onChange: (domains: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!value || domains.includes(value)) return setDraft('');
    onChange([...domains, value]);
    setDraft('');
  };

  return (
    <div className="domains" style={{ '--domains-ink': tone.ink, '--domains-soft': tone.soft } as React.CSSProperties}>
      <span className="domains__label">{label}</span>
      <p className="domains__note">{note}</p>

      <div className="chips">
        {domains.length === 0 && <p className="card__sub">Todavía no has agregado ninguno.</p>}
        {domains.map((domain) => (
          <span key={domain} className="chip">
            {domain}
            <button
              type="button"
              aria-label={`Quitar ${domain}`}
              onClick={() => onChange(domains.filter((d) => d !== domain))}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <form
        className="domain-form"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">Agregar</button>
      </form>
    </div>
  );
}

export function Settings({
  notifications,
  onNotifications,
  preset,
  onPreset,
  trusted,
  blocked,
  onDomains,
}: SettingsProps) {
  const toggles: { key: keyof Notifications; name: string; note: string }[] = [
    {
      key: 'malicious',
      name: 'Notificarme sobre correos maliciosos',
      note: 'Alerta inmediata cuando se detecta una amenaza',
    },
    {
      key: 'suspicious',
      name: 'Notificarme sobre correos sospechosos',
      note: 'Aviso cuando un correo es clasificado como sospechoso',
    },
    {
      key: 'weekly',
      name: 'Resumen semanal por correo',
      note: 'Recibe un reporte cada lunes con el resumen de la semana',
    },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Personaliza cómo MailWatch protege tu correo</p>
        </div>
      </header>

      <div className="settings">
        <section className="card">
          <h2 className="card__title" style={{ marginBottom: 6 }}>
            Notificaciones
          </h2>
          {toggles.map((toggle) => (
            <div key={toggle.key} className="setting">
              <div>
                <div className="setting__name">{toggle.name}</div>
                <div className="setting__note">{toggle.note}</div>
              </div>
              <Switch
                on={notifications[toggle.key]}
                label={toggle.name}
                onToggle={() =>
                  onNotifications({ ...notifications, [toggle.key]: !notifications[toggle.key] })
                }
              />
            </div>
          ))}
        </section>

        <section className="card">
          <h2 className="card__title">Nivel de protección</h2>
          <p className="card__sub" style={{ marginBottom: 16 }}>
            Define qué tan estricto es el análisis. Umbrales actuales:{' '}
            {SENSITIVITY_PRESETS[preset].suspicious} para sospechoso,{' '}
            {SENSITIVITY_PRESETS[preset].malicious} para malicioso.
          </p>
          <div className="levels">
            {LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className="level-option"
                aria-pressed={preset === level.id}
                onClick={() => onPreset(level.id)}
              >
                <div className="level-option__name">{level.name}</div>
                <div className="level-option__note">{level.note}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Reglas avanzadas de cuarentena</h2>
          <p className="card__sub" style={{ marginBottom: 22 }}>
            Define dominios de confianza o siempre bloqueados. Tu decisión manda sobre el puntaje.
          </p>

          <div style={{ display: 'grid', gap: 28 }}>
            <DomainList
              label="Dominios de confianza"
              note="Estos dominios nunca serán marcados como riesgo"
              domains={trusted}
              placeholder="ej: empresa.com"
              tone={{ ink: '#16a34a', soft: '#dcfce7' }}
              onChange={(next) => onDomains('trusted', next)}
            />
            <DomainList
              label="Dominios bloqueados"
              note="Estos dominios van directo a cuarentena, sin analizarse"
              domains={blocked}
              placeholder="ej: dominio-falso.top"
              tone={{ ink: '#d64545', soft: '#fde8e8' }}
              onChange={(next) => onDomains('blocked', next)}
            />
          </div>
        </section>
      </div>
    </>
  );
}
