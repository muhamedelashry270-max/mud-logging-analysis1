'use client';

const formatRatio = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 6 });

export default function PixlerPlot({ ratios }: { ratios: readonly number[] }) {
  // Source: supplied workbook, hidden sheet "B.O.Pixler Ratio Technique",
  // reference columns C:E and rows 2:5.
  const labels = ['C1/C2', 'C1/C3', 'C1/C4', 'C1/C5'];
  const reference = [
    { name: 'Non-productive', values: [2, null, null, 2], color: '#7b8794' },
    { name: 'Gas line', values: [65, 100, null, 250], color: '#1683a5' },
    { name: 'Oil line', values: [15, null, null, 30], color: '#c17a27' },
  ] as const;
  const W = 760, H = 370, L = 82, R = 24, T = 24, B = 76;
  const pw = W - L - R, ph = H - T - B, ymin = 1, ymax = 300;
  const X = (i: number) => L + i / (labels.length - 1) * pw;
  const Y = (v: number) => T + ph - (Math.log10(v) - Math.log10(ymin)) / (Math.log10(ymax) - Math.log10(ymin)) * ph;
  const ticks = [1, 2, 5, 10, 20, 50, 100, 200, 300];
  const valid = (v: number) => Number.isFinite(v) && v > 0;
  const segments = (values: readonly (number | null)[]) => {
  const points = values
    .map((value, index) =>
      value !== null && valid(value)
        ? `${X(index)},${Y(value)}`
        : null
    )
    .filter((point): point is string => point !== null);

  return points.length > 1 ? [points.join(' ')] : [];
};

  return <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="B.O. Pixler ratio plot with workbook reference values and calculated ratios">
    {ticks.map(value => <g key={value}>
      <line x1={L} y1={Y(value)} x2={L + pw} y2={Y(value)} stroke="#e7edf1" />
      <text x={L - 12} y={Y(value) + 4} textAnchor="end" fontSize="11" fill="#65798a">{value}</text>
    </g>)}
    {labels.map((label, index) => <g key={label}>
      <line x1={X(index)} y1={T} x2={X(index)} y2={T + ph} stroke="#edf1f4" />
      <text x={X(index)} y={H - 43} textAnchor="middle" fontSize="11" fill="#435b6c">{label}</text>
    </g>)}
    <line x1={L} y1={T + ph} x2={L + pw} y2={T + ph} stroke="#73899a" />
    <line x1={L} y1={T} x2={L} y2={T + ph} stroke="#73899a" />
    <text x="18" y={T + ph / 2} transform={`rotate(-90 18 ${T + ph / 2})`} textAnchor="middle" fontSize="12" fill="#435b6c">Ratio (log scale)</text>
    {reference.map(series => <g key={series.name}>
      {segments(series.values).map((points, index) => <polyline key={index} points={points} fill="none" stroke={series.color} strokeWidth="2.2" strokeDasharray="6 4" />)}
      {series.values.map((value, index) => value !== null && valid(value)
        ? <circle key={index} cx={X(index)} cy={Y(value)} r="4" fill={series.color} /> : null)}
    </g>)}
    {ratios.map((value, index) => valid(value) ? <g key={index}>
      <circle cx={X(index)} cy={Y(value)} r="6" fill="#163f5a" stroke="white" strokeWidth="2" />
      <text x={X(index) + 8} y={Y(value) - 9} fontSize="11" fill="#163f5a">{formatRatio(value)}</text>
    </g> : null)}
    <g fontSize="11" fill="#435b6c">
      <line x1={L + 4} y1={H - 17} x2={L + 25} y2={H - 17} stroke="#7b8794" strokeWidth="2" strokeDasharray="6 4" />
      <text x={L + 31} y={H - 13}>Non-productive</text>
      <line x1={L + 165} y1={H - 17} x2={L + 186} y2={H - 17} stroke="#1683a5" strokeWidth="2" strokeDasharray="6 4" />
      <text x={L + 192} y={H - 13}>Gas line</text>
      <line x1={L + 280} y1={H - 17} x2={L + 301} y2={H - 17} stroke="#c17a27" strokeWidth="2" strokeDasharray="6 4" />
      <text x={L + 307} y={H - 13}>Oil line</text>
      <circle cx={L + 390} cy={H - 17} r="5" fill="#163f5a" />
      <text x={L + 401} y={H - 13}>Calculated ratio</text>
    </g>
  </svg>;
}
