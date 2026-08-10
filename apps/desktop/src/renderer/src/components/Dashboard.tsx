import type { SensitivityPreset } from '@mailwatch/core';
import type { Entry } from '../lib/entries.js';
import { LEVEL_COLOR, LEVEL_LABEL, LEVEL_SOFT, longDate, timeOf } from '../lib/format.js';
import { IconAlert, IconLock, IconMail, IconQuarantine, ShieldMascot } from './Icons.js';
import { VolumeChart, type DayVolume } from './VolumeChart.js';

const PROTECTION: Record<SensitivityPreset, string> = {
  low: 'Bajo',
  balanced: 'Medio',
  high: 'Alto',
};

interface DashboardProps {
  entries: Entry[];
  quarantined: Entry[];
  today: string;
  userName: string;
  preset: SensitivityPreset;
  precision: number;
  volume: DayVolume[];
  onOpen: (id: string) => void;
  onSeeAll: () => void;
}

export function Dashboard({
  entries,
  quarantined,
  today,
  userName,
  preset,
  precision,
  volume,
  onOpen,
  onSeeAll,
}: DashboardProps) {
  const firstName = userName.split(' ')[0] ?? userName;
  const threats = entries.filter((e) => e.result.level !== 'safe');
  const recent = [...threats].slice(0, 4);
  const allClear = quarantined.length === 0;

  const stats = [
    {
      label: 'Correos analizados',
      value: entries.length,
      foot: 'en el lote actual',
      bg: 'var(--indigo)',
      icon: <IconMail />,
    },
    {
      label: 'Amenazas detectadas',
      value: threats.length,
      foot: 'sospechosos y maliciosos',
      bg: 'var(--red)',
      icon: <IconAlert />,
    },
    {
      label: 'En cuarentena',
      value: quarantined.length,
      foot: 'pendientes de revisar',
      bg: 'var(--amber)',
      icon: <IconQuarantine />,
    },
    {
      label: 'Nivel de protección',
      value: PROTECTION[preset],
      foot: `${(precision * 100).toFixed(1)} % de aciertos al marcar`,
      bg: 'var(--green)',
      icon: <IconLock />,
      word: true,
    },
  ];

  return (
    <>
      <section className="hero">
        <div className="hero__date">{longDate(today)}</div>
        <h1 className="hero__title">Hola, {firstName} 👋</h1>
        <p className="hero__status">
          <span className="hero__dot" />
          {allClear
            ? 'Tu correo está protegido — todo se ve bien'
            : `${quarantined.length} ${quarantined.length === 1 ? 'correo retenido' : 'correos retenidos'} en cuarentena`}
        </p>
        <div className="hero__shield">
          <ShieldMascot />
        </div>
      </section>

      <section className="stats">
        {stats.map((stat) => (
          <div key={stat.label} className="stat" style={{ '--stat-bg': stat.bg } as React.CSSProperties}>
            <div className="stat__top">
              <span className="stat__label">{stat.label}</span>
              <span className="stat__icon">{stat.icon}</span>
            </div>
            <div>
              <div className={`stat__value${stat.word ? ' stat__value--word' : ''}`}>{stat.value}</div>
              <div className="stat__foot">{stat.foot}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="columns">
        <div className="card">
          <header className="card__head">
            <div>
              <h2 className="card__title">Volumen de correos</h2>
              <p className="card__sub">Últimos {volume.length} días por categoría</p>
            </div>
            <div className="legend">
              <span style={{ color: LEVEL_COLOR.safe }}>
                <i />
                Seguro
              </span>
              <span style={{ color: LEVEL_COLOR.suspicious }}>
                <i />
                Sospechoso
              </span>
              <span style={{ color: LEVEL_COLOR.malicious }}>
                <i />
                Malicioso
              </span>
            </div>
          </header>
          <VolumeChart data={volume} />
        </div>

        <div className="card">
          <header className="card__head">
            <div>
              <h2 className="card__title">Actividad reciente</h2>
              <p className="card__sub">Correos marcados</p>
            </div>
            <button type="button" className="btn btn--soft" onClick={onSeeAll}>
              Ver todo
            </button>
          </header>

          <div className="activity">
            {recent.length === 0 && <p className="card__sub">No hay correos marcados en este lote.</p>}
            {recent.map(({ email, result }) => (
              <button
                key={email.id}
                type="button"
                className="activity__row"
                onClick={() => onOpen(email.id)}
              >
                <span className="activity__from">{email.from.address}</span>
                <span className="activity__time">{timeOf(email.receivedAt)}</span>
                <span className="activity__subject">{email.subject}</span>
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
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
