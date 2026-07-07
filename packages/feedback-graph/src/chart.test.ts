import { describe, it, expect } from 'vitest';
import { pieChartUrl } from './chart.js';
import type { Theme } from './cluster.js';

const themes: Theme[] = [
  { label: 'Claim Flow', count: 4, share: 0.5, samples: [] },
  { label: 'Fees', count: 2, share: 0.25, samples: [] },
  { label: 'Wallet Setup', count: 2, share: 0.25, samples: [] },
];

describe('pieChartUrl', () => {
  it('builds a quickchart url with encoded config', () => {
    const url = pieChartUrl(themes);
    expect(url.startsWith('https://quickchart.io/chart?')).toBe(true);
    const encoded = url.split('c=')[1];
    const config = JSON.parse(decodeURIComponent(encoded));
    expect(config.type).toBe('pie');
    expect(config.data.labels).toEqual(['Claim Flow', 'Fees', 'Wallet Setup']);
    expect(config.data.datasets[0].data).toEqual([4, 2, 2]);
  });
});
