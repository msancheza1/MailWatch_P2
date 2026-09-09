import { vi } from 'vitest';
import { QuarantineService } from './quarantine.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('Quarantine persistence', () => {
  const query = vi.fn();
  const database = {
    transaction: async (work: (client: unknown) => Promise<unknown>) =>
      work({ query }),
    query,
  };
  const service = new QuarantineService(database as unknown as DatabaseService);
  beforeEach(() => {
    vi.resetAllMocks();
    query.mockResolvedValue({ rowCount: 1, rows: [] });
  });

  it('saves reasons and upserts the email instead of duplicating it', async () => {
    expect(await service.recordAnalysis(7, 'HIGH', ['Suspicious URL'])).toBe(
      'quarantined',
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (email_id)'),
      [7, expect.any(String), '["Suspicious URL"]'],
    );
  });

  it.each(['LOW', 'MEDIUM'])('does not quarantine %s results', async (risk) => {
    expect(await service.recordAnalysis(7, risk, [])).toBe('available');
    expect(query).toHaveBeenCalledWith(
      'DELETE FROM quarantine WHERE email_id = $1',
      [7],
    );
    expect(
      query.mock.calls.some(([sql]) => sql.includes('INSERT INTO quarantine')),
    ).toBe(false);
  });

  it('rejects an email deleted before persistence', async () => {
    query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(service.recordAnalysis(7, 'HIGH', [])).rejects.toThrow(
      'Email not found',
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
});
