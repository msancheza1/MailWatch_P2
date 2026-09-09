import { vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AnalysisService } from './analysis.service.js';
import { DatabaseService } from '../database/database.service.js';
import { QuarantineService } from '../quarantine/quarantine.service.js';

describe('US-05 automatic quarantine', () => {
  const query = vi.fn();
  const recordAnalysis = vi.fn();
  const service = new AnalysisService(
    { query } as unknown as DatabaseService,
    { recordAnalysis } as unknown as QuarantineService,
  );

  beforeEach(() => vi.resetAllMocks());

  it('isolates a malicious email and preserves its reasons', async () => {
    query.mockResolvedValue({
      rows: [
        {
          sender: 'security@fakebank.com',
          subject: 'Verify account',
          content: 'Click here to verify your account',
        },
      ],
    });
    recordAnalysis.mockResolvedValue('quarantined');
    const result = await service.analyzeEmail(1);
    expect(result).toMatchObject({
      category: 'Malicious',
      risk: 'HIGH',
      status: 'quarantined',
    });
    expect(result.indicators.length).toBeGreaterThanOrEqual(3);
    expect(recordAnalysis).toHaveBeenCalledWith(1, 'HIGH', result.indicators);
  });

  it.each([
    ['Meeting tomorrow', 'Safe', 'LOW'],
    ['Urgent meeting', 'Suspicious', 'MEDIUM'],
  ])('keeps %s available', async (subject, category, risk) => {
    query.mockResolvedValue({
      rows: [
        {
          sender: 'admin@gmail.com',
          subject,
          content: 'See attached document',
        },
      ],
    });
    recordAnalysis.mockResolvedValue('available');
    expect(await service.analyzeEmail(2)).toMatchObject({
      category,
      risk,
      status: 'available',
    });
    expect(recordAnalysis).toHaveBeenCalledWith(2, risk, expect.any(Array));
  });

  it('does not save an analysis for a missing email', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(service.analyzeEmail(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(recordAnalysis).not.toHaveBeenCalled();
  });

  it('does not report success when isolation fails', async () => {
    query.mockResolvedValue({
      rows: [
        {
          sender: 'security@fakebank.com',
          subject: 'Verify account',
          content: 'password reset',
        },
      ],
    });
    recordAnalysis.mockRejectedValue(new Error('database unavailable'));
    await expect(service.analyzeEmail(1)).rejects.toThrow(
      'database unavailable',
    );
  });
});
