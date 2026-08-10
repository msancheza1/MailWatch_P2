import { useEffect, useMemo, useState } from 'react';
import {
  SENSITIVITY_PRESETS,
  evaluate,
  folderFor,
  type DomainPolicy,
  type RiskLevel,
  type SensitivityPreset,
} from '@mailwatch/core';
import { Dashboard } from './components/Dashboard.js';
import { Inbox } from './components/Inbox.js';
import { Quarantine } from './components/Quarantine.js';
import { Settings, type Notifications } from './components/Settings.js';
import { Sidebar } from './components/Sidebar.js';
import { todayOf, volumeByDay, type Entry } from './lib/entries.js';
import { loadInbox } from './lib/inbox.js';
import type { InboxSnapshot } from './env.js';

export type View = 'dashboard' | 'inbox' | 'quarantine' | 'settings';

export function App() {
  const [snapshot, setSnapshot] = useState<InboxSnapshot | null>(null);
  const [preset, setPreset] = useState<SensitivityPreset>('balanced');
  const [policy, setPolicy] = useState<DomainPolicy>({ trusted: [], blocked: [] });
  const [view, setView] = useState<View>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restored, setRestored] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, RiskLevel>>({});
  const [notifications, setNotifications] = useState<Notifications>({
    malicious: true,
    suspicious: true,
    weekly: false,
  });

  useEffect(() => {
    document.body.dataset['platform'] = window.mailwatch?.platform ?? 'browser';
  }, []);

  useEffect(() => {
    let active = true;
    void loadInbox(SENSITIVITY_PRESETS[preset], policy).then((next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
    };
  }, [preset, policy]);

  const entries = useMemo<Entry[]>(() => {
    if (!snapshot) return [];
    const byId = new Map(snapshot.emails.map((email) => [email.id, email]));
    return snapshot.results.flatMap((result) => {
      const email = byId.get(result.emailId);
      return email && !deleted.has(email.id) ? [{ email, result }] : [];
    });
  }, [snapshot, deleted]);

  const today = useMemo(() => todayOf(snapshot?.emails ?? []), [snapshot]);

  const isQuarantined = (entry: Entry) =>
    folderFor(entry.result.level) === 'quarantine' && !restored.has(entry.email.id);

  const inbox = entries.filter((entry) => !isQuarantined(entry));
  const quarantine = entries.filter(isQuarantined);
  const selected = entries.find((entry) => entry.email.id === selectedId) ?? null;

  /**
   * El «nivel de protección» del panel muestra la precisión real del detector
   * sobre el dataset etiquetado, no un número decorativo.
   */
  const precision = useMemo(() => {
    if (!snapshot) return 1;
    return evaluate(snapshot.emails, snapshot.results, 'malicioso').metrics.precision;
  }, [snapshot]);

  const volume = useMemo(() => volumeByDay(entries, today), [entries, today]);
  const user = snapshot?.emails[0]?.to[0] ?? { displayName: 'Usuario', address: '' };

  const open = (id: string) => {
    setSelectedId(id);
    setView('inbox');
  };

  const restore = (id: string) => setRestored((current) => new Set(current).add(id));

  const remove = (id: string) => {
    setDeleted((current) => new Set(current).add(id));
    if (selectedId === id) setSelectedId(null);
  };

  const emptyQuarantine = () =>
    setDeleted((current) => {
      const next = new Set(current);
      for (const entry of quarantine) next.add(entry.email.id);
      return next;
    });

  const setDomains = (list: 'trusted' | 'blocked', domains: string[]) =>
    setPolicy((current: DomainPolicy) => ({ ...current, [list]: domains }));

  return (
    <div className="app">
      <div className="window-drag" />
      <Sidebar
        view={view}
        onView={setView}
        counts={{ inbox: inbox.length, quarantine: quarantine.length }}
        user={{ name: user.displayName, address: user.address }}
      />

      <main className="canvas">
        <div className="canvas__inner">
          {view === 'dashboard' && (
            <Dashboard
              entries={entries}
              quarantined={quarantine}
              today={today}
              userName={user.displayName}
              preset={preset}
              precision={precision}
              volume={volume}
              onOpen={open}
              onSeeAll={() => setView('inbox')}
            />
          )}

          {view === 'inbox' && (
            <Inbox
              entries={inbox}
              selected={selected}
              today={today}
              quarantined={selected ? isQuarantined(selected) : false}
              feedback={selected ? feedback[selected.email.id] : undefined}
              onSelect={setSelectedId}
              onRestore={restore}
              onFeedback={(id, level) => setFeedback((current) => ({ ...current, [id]: level }))}
            />
          )}

          {view === 'quarantine' && (
            <Quarantine
              entries={quarantine}
              today={today}
              onRestore={restore}
              onDelete={remove}
              onEmpty={emptyQuarantine}
              onOpen={open}
            />
          )}

          {view === 'settings' && (
            <Settings
              notifications={notifications}
              onNotifications={setNotifications}
              preset={preset}
              onPreset={setPreset}
              trusted={[...policy.trusted]}
              blocked={[...policy.blocked]}
              onDomains={setDomains}
            />
          )}
        </div>
      </main>
    </div>
  );
}
