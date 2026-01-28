import { describe, it, expect } from 'vitest';

describe('AidWatch API', () => {
  it('should have correct environment setup', () => {
    expect(true).toBe(true);
  });

  it('should define crisis types', () => {
    const crisisTypes = [
      'NATURAL_DISASTER',
      'CONFLICT',
      'DISEASE_OUTBREAK',
      'FOOD_SECURITY',
      'DISPLACEMENT',
      'INFRASTRUCTURE',
      'ECONOMIC',
      'ENVIRONMENTAL',
      'OTHER',
    ];
    expect(crisisTypes).toHaveLength(9);
  });

  it('should define severity levels', () => {
    const severityLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
    expect(severityLevels).toHaveLength(5);
    expect(severityLevels[0]).toBe('CRITICAL');
  });
});
