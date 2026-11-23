/**
 * Formula transcription of the supplied workbook:
 * - Mod Logging Interpretation
 * - B.O.Pixler Ratio Technique (hidden sheet)
 * - Triangulation Technique (hidden sheet)
 * - Three Ratio Tequnique (hidden sheet)
 *
 * Do not "correct" threshold order or replace formulas without workbook-owner approval.
 */
export type GasInputs = {
  background: [number, number, number, number, number];
  values: [number, number, number, number, number];
};
export type Point = { x: number; y: number };
export type CalculationResult = {
  increments: [number, number, number, number, number];
  pixler: {
    ratios: [number, number, number, number];
    c4c1Slope: number;
    hydrocarbonType: string;
    productivity: string;
    trendCheck: string | number | boolean;
  };
  triangulation: {
    normalizedC4: number; normalizedC3: number; normalizedC2: number;
    line1: { slope: number; intercept: number };
    line2: { slope: number; intercept: number };
    line3: { slope: number; intercept: number };
    intersections: [Point, Point, Point];
    xDifference: number; yDifference: number; triangleSize: number;
    zone: string; classification: string;
  };
  threeRatios: {
    gwr: { value: number; classification: string };
    lhr: { value: number; classification: string };
    ocq: { value: number; classification: string };
  };
};

const log = (v: number) => Math.log10(v); // Excel LOG() defaults to base 10.
const div = (a: number, b: number) => a / b;

export function calculateMudLogging(input: GasInputs): CalculationResult {
  const d = input.values.map((v, i) => v - input.background[i]) as GasInputs['values'];
  const [c1, c2, c3, c4, c5] = d;
  const f2 = div(c1, c2), f3 = div(c1, c3), f4 = div(c1, c4), f5 = div(c1, c5);

  // Pixler: cells F2:F5, J12, K24, N24, K25.
  const c4c1Slope = div(log(f4) - log(f2), 2);
  const hydrocarbonType = !Number.isFinite(f2) ? '#ERROR' : f2 < 2 ? 'Non Productive Zone'
    : f2 < 3 ? 'Oil with Low GOR'
    : f2 < 10 ? 'Oil with moderate GOR'
    : f2 < 15 ? 'Oil with High GOR'
    : f2 < 30 ? 'Rich Gas'
    : f2 < 65 ? 'Dry Gas' : 'Non Productive';
  const productivity = !Number.isFinite(c4c1Slope) ? '#ERROR' : c4c1Slope < 0 ? 'Water Bearing Zone'
    : c4c1Slope < 0.3 ? 'Good Productivity Zone'
    : c4c1Slope < 0.5 ? 'Moderate Productivity Zone'
    : c4c1Slope < 0.84948500216801 ? 'Low Productivity Zone'
    : 'Tight Zone';
  // K25 = IF(OR(F3<F2,F4<F3,,F5<F4),"non productive or water bearing")
  // Excel returns FALSE when the IF has no value_if_false; cached workbook output is 0.
  const trendCheck = ![f2, f3, f4, f5].every(Number.isFinite) ? '#ERROR'
    : (f3 < f2 || f4 < f3 || f5 < f4) ? 'non productive or water bearing' : 0;

  // Triangulation: direct transcription of H38/H42/H47 through B61 and C66/G66.
  const sum = d.reduce((a, b) => a + b, 0);
  const normalizedC4 = div(c4, sum) * 100;
  const normalizedC3 = div(c3, sum) * 100;
  const normalizedC2 = div(c2, sum) * 100;
  const angle = 30 * 22 / 7 / 180;
  const cosine = Math.cos(angle), sine = Math.sin(angle), scale = 8 / 20;

  const i39 = 4.61936431972875 + normalizedC4 * cosine * scale;
  const k39 = 0.9 - normalizedC4 * sine * scale;
  const i40 = 6.92904647959312 + normalizedC4 * cosine * scale;
  const k40 = 4.9 - normalizedC4 * sine * scale;
  const n39 = div(k40 - k39, i40 - i39);
  const n40 = k40 - n39 * i40;

  const i43 = 11.5484107993219 - normalizedC3 * cosine * scale;
  const k43 = 0.9 - normalizedC3 * sine * scale;
  const i44 = 9.2387286393219 - normalizedC3 * cosine * scale;
  const k44 = 4.9 - normalizedC3 * sine * scale;
  const i45 = 6.92904647959312 - normalizedC3 * cosine * scale;
  const k45 = 8.9 - normalizedC3 * sine * scale;
  const n43 = div(k45 - k44, i45 - i44);
  const n44 = k44 - n43 * i44;

  const k49 = normalizedC2 * scale;
  const n49 = k49; // N48 = 0, so N49 = K49 - N48 * I49.
  const b53 = div(n49 - n40, n39), c53 = n49;
  const b54 = div(n49 - n44, n43), c54 = n49;
  const b55 = div(n44 - n40, n39 - n43), c55 = n39 * b55 + n40;
  const xDifference = Math.abs(b53 - b54);
  const yDifference = Math.abs(c55 - c53);
  const triangleSize = (xDifference + yDifference) / 2;
  const triangleValid = [sum, normalizedC4, normalizedC3, normalizedC2, n39, n40, n43, n44, n49, b53, c53, b54, c54, b55, c55, triangleSize].every(Number.isFinite);
  const zone = triangleValid ? (c55 > c53 ? 'Expected Gas Zone' : 'Expected Oil Zone') : '#ERROR';
  const classification = !triangleValid ? '#ERROR' : zone === 'Expected Gas Zone'
    ? triangleSize < 1.5 ? 'Very Rich Wet Gas'
      : triangleSize < 6 ? 'Moderate Rich Wet Gas'
      : triangleSize < 10 ? 'Gas with low CGR' : 'Dry Gas'
    : triangleSize < 1.25 ? 'High GOR Oil'
      : triangleSize < 4 ? 'Moderate to High GOR Oil'
      : triangleSize < 5.5 ? 'Moderate to Low GOR Oil' : 'Low GOR';

  // Three Ratio Technique: preserve exact IF ordering from G2:G4.
  const total = sum;
  const gwr = div(c2 + c3 + c4 + c5, total);
  const lhr = div(c1 + c2, c3 + c4 + c5);
  const ocq = div(c4 + c5, c3);
  const gwrClass = !Number.isFinite(gwr) ? '#ERROR' : gwr < 0.5 ? 'Light Dry Gas'
    : gwr < 1.75 ? 'Medium Density Gas'
    : gwr < 40 ? 'Medium Gravity Oil' : 'Residual Oil';
  const lhrClass = !Number.isFinite(lhr) ? '#ERROR' : lhr > 100 ? 'Light Dry Gas'
    : lhr > 17.5 ? 'Medium Density Gas'
    : lhr > 10 ? 'Light Oil & Gas'
    : lhr > 5 ? 'Medium Gravity Oil' : 'Residual Oil';
  const ocqClass = !Number.isFinite(ocq) ? '#ERROR' : ocq < 0.1 ? 'Light Dry Gas'
    : ocq < 0.5 ? 'Medium Density Gas'
    : ocq < 1 ? 'Light Oil & Gas'
    : ocq < 2 ? 'Medium Gravity Oil' : 'Residual Oil';

  return {
    increments: d,
    pixler: { ratios: [f2, f3, f4, f5], c4c1Slope, hydrocarbonType, productivity, trendCheck },
    triangulation: {
      normalizedC4, normalizedC3, normalizedC2,
      line1: { slope: n39, intercept: n40 },
      line2: { slope: n43, intercept: n44 },
      line3: { slope: 0, intercept: n49 },
      intersections: [{ x: b53, y: c53 }, { x: b54, y: c54 }, { x: b55, y: c55 }],
      xDifference, yDifference, triangleSize, zone, classification,
    },
    threeRatios: {
      gwr: { value: gwr, classification: gwrClass },
      lhr: { value: lhr, classification: lhrClass },
      ocq: { value: ocq, classification: ocqClass },
    },
  };
}

export const WORKBOOK_SAMPLE: GasInputs = {
  background: [2000, 1000, 2000, 1000, 500],
  values: [940000, 53000, 15000, 12000, 4500],
};
