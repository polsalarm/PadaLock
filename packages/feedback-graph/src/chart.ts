import type { Theme } from './cluster';

const PALETTE = [
  '#4f46e5',
  '#06b6d4',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#a855f7',
  '#ec4899',
  '#64748b',
];

/**
 * Build a QuickChart pie-chart image URL from clustered themes.
 * Discord renders it via an embed's image.url — no local canvas/native deps.
 */
export function pieChartUrl(themes: Theme[]): string {
  const labels = themes.map((t) => t.label);
  const data = themes.map((t) => t.count);
  const colors = themes.map((_, i) => PALETTE[i % PALETTE.length]);

  const config = {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors }],
    },
    options: {
      plugins: {
        legend: { position: 'right', labels: { fontColor: '#e5e7eb' } },
        title: { display: true, text: 'Feedback themes', fontColor: '#e5e7eb' },
        datalabels: {
          color: '#fff',
          formatter: (v: number) => v,
        },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?bkg=%23111827&w=500&h=320&c=${encoded}`;
}
