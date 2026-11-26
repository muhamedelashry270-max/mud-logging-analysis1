'use client';
import PixlerPlot from './pixler-plot';
import { useMemo, useState } from 'react';
import { calculateMudLogging, WORKBOOK_SAMPLE, type GasInputs, type Point } from '@/lib/calculations';



const initialMeta = { well: '', formation: '', interval: '', conclusion: '' };
const fmt = (v: number) => Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 6 }) : String(v);
const show = (v: number) => Number.isFinite(v) ? fmt(v) : '#NUM! / #DIV/0!';

function Plot({ lines, points }: { lines: {slope:number;intercept:number}[]; points: Point[] }) {
  const W=720,H=330,L=54,R=20,T=18,B=42,pw=W-L-R,ph=H-T-B,xmin=-1,xmax=26,ymin=-1,ymax=10;
  const X=(x:number)=>L+(x-xmin)/(xmax-xmin)*pw, Y=(y:number)=>T+ph-(y-ymin)/(ymax-ymin)*ph;

  const validPoints = points.length === 3 && points.every(
    p => Number.isFinite(p.x) && Number.isFinite(p.y)
  );

  const segments = validPoints
    ? [
        [points[0], points[1]],
        [points[1], points[2]],
        [points[2], points[0]]
      ]
    : [];

  return <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Workbook triangulation chart">
    {Array.from({length:6},(_,i)=>i*5).map(x=><g key={`x${x}`}>
      <line x1={X(x)} y1={T} x2={X(x)} y2={T+ph} stroke="#e7edf1"/>
      <text x={X(x)} y={H-17} textAnchor="middle" fontSize="11" fill="#65798a">{x}</text>
    </g>)}

   {Array.from({length:6},(_,i)=>i*2).map(y=><g key={`y${y}`}>
      <line x1={L} y1={Y(y)} x2={L+pw} y2={Y(y)} stroke="#e7edf1"/>
      <text x={L-12} y={Y(y)+4} textAnchor="end" fontSize="11" fill="#65798a">{y}</text>
    </g>)}

    <line x1={L} y1={T+ph} x2={L+pw} y2={T+ph} stroke="#73899a"/>
    <line x1={L} y1={T} x2={L} y2={T+ph} stroke="#73899a"/>

    <text x={L+pw/2} y={H-2} textAnchor="middle" fontSize="12" fill="#435b6c">X</text>
    <text x="14" y={T+ph/2} transform={`rotate(-90 14 ${T+ph/2})`} textAnchor="middle" fontSize="12" fill="#435b6c">Y</text>

    {validPoints && <>
      <polygon
        points={points.map(p=>`${X(p.x)},${Y(p.y)}`).join(' ')}
        fill="#78b9ce"
        fillOpacity=".18"
        stroke="none"
      />

      {segments.map(([a,b],i)=><line
        key={i}
        x1={X(a.x)}
        y1={Y(a.y)}
        x2={X(b.x)}
        y2={Y(b.y)}
        stroke={['#1683a5','#c17a27','#6c7db5'][i]}
        strokeWidth="2.5"
        strokeLinecap="round"
      />)}

      {points.map((p,i)=><g key={i}>
        <circle cx={X(p.x)} cy={Y(p.y)} r="4.5" fill="#163f5a"/>
        <text x={X(p.x)+7} y={Y(p.y)-8} fontSize="11" fill="#163f5a">P{i+1}</text>
      </g>)}
    </>}
  </svg>;
}

export default function Calculator() {
  const [meta,setMeta]=useState(initialMeta);
  const [background,setBackground]=useState<[number,number,number,number,number]>([...WORKBOOK_SAMPLE.background]);
  const [values,setValues]=useState<[number,number,number,number,number]>([...WORKBOOK_SAMPLE.values]);
  

  const result=useMemo(()=>calculateMudLogging({background,values}),[background,values]);
  const inputs:GasInputs={background,values};

  const updateArray=(kind:'background'|'values',index:number,raw:string)=>{
    const parsed=raw.trim()===''?0:Number(raw);
    if(!Number.isFinite(parsed))return;
    if(kind==='background')setBackground(old=>old.map((v,i)=>i===index?parsed:v) as typeof old);
    else setValues(old=>old.map((v,i)=>i===index?parsed:v) as typeof old);
  };

  const exportJson=()=>{
    const payload={
      workbookReference:'Mud Logging Analysis workbook',
      exportedAt:new Date().toISOString(),
      metadata:meta,
      inputs,
      results:result
    };
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a=document.createElement('a');
    a.href=url;
    a.download='mud-logging-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset=()=>{
    setMeta(initialMeta);
    setBackground([2000,1000,2000,1000,500]);
    setValues([940000,53000,15000,12000,4500]);
  };

  const ratios=[['GWR',result.threeRatios.gwr],['LHR',result.threeRatios.lhr],['OCQ',result.threeRatios.ocq]] as const;
  const diagnostics:string[]=[];
  if(result.increments.some(v=>v===0))diagnostics.push('A zero increment may produce division-by-zero or logarithm errors in the workbook formulas.');
  if(result.increments.some(v=>v<0))diagnostics.push('Negative increments may produce logarithm or ratio errors; no alternative rule is substituted.');
  if(!Number.isFinite(result.triangulation.triangleSize))diagnostics.push('Triangulation includes an undefined numeric result. Check inputs and total gas.');

  return <>
    <header className="top">
    <div>
    <h1>MUD LOGGING ANALYSIS</h1>
    <p>Hydrocarbon Interpretation System · Workbook-based calculations</p>
    </div>
    <div>Public calculator · No account required</div>
    </header>
    <main className="wrap">
      <div className="intro"><div><h2>New interval analysis</h2><div className="muted">Enter well details and gas readings. All three methods recalculate automatically.</div></div>
      <div className="actions">
        <button className="btn" onClick={reset}>Reset</button>
        <button className="btn" onClick={()=>window.print()}>Print / Save PDF</button>
        <button className="btn" onClick={exportJson}>Export JSON</button>
      </div>
      </div>
     
      <div className="grid">
        <section className="card"><h3>01 · Well information</h3><div className="fields">
          {([['well','Well'],['formation','Formation'],['interval','Interval']] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={key}>{label}</label><input id={key} value={meta[key]} onChange={e=>setMeta(old=>({...old,[key]:e.target.value}))} placeholder={label==='Interval'?'e.g. 2500–2520 m':label}/></div>)}
        </div></section>
        <section className="card"><h3>02 · Gas readings <span className="hint">(instrument units)</span></h3><table className="gas"><thead><tr><th>Component</th><th>Background</th><th>Value</th><th>Increment</th></tr></thead><tbody>
          {(['C1','C2','C3','C4','C5'] as const).map((label,i)=><tr key={label}><td><b>{label}</b></td><td><input aria-label={`${label} background`} type="number" step="any" value={background[i]} onChange={e=>updateArray('background',i,e.target.value)}/></td><td><input aria-label={`${label} value`} type="number" step="any" value={values[i]} onChange={e=>updateArray('values',i,e.target.value)}/></td><td>{show(result.increments[i])}</td></tr>)}
        </tbody></table><div className="status">Increment = Value − Background, as in the workbook.</div></section>
        <section className="card"><h3>03 · B.O. Pixler Ratio Technique</h3>
          <Result label="Hydrocarbon type" value={result.pixler.hydrocarbonType}/><Result label="Productivity" value={result.pixler.productivity}/><Result label="Trend check (K25)" value={String(result.pixler.trendCheck)}/>
          {result.pixler.ratios.map((v,i)=><Result key={i} label={`C1/C${i+2}`} value={show(v)}/>)}<Result label="C4/C1 slope (J12)" value={show(result.pixler.c4c1Slope)}/>
        </section>
        <section className="card wide">
  <h3>04 · B.O. Pixler Ratio Plot</h3>
  <PixlerPlot ratios={result.pixler.ratios} />
  <div className="status">
    Reference values are taken from the original workbook.
    The chart updates automatically with the gas readings.
  </div>
</section>
        <section className="card"><h3>05 · Triangulation Technique</h3>
          <Result label="Zone" value={result.triangulation.zone}/><Result label="Classification" value={result.triangulation.classification}/><Result label="Triangle size (B61)" value={show(result.triangulation.triangleSize)}/><Result label="X difference (B59)" value={show(result.triangulation.xDifference)}/><Result label="Y difference (B60)" value={show(result.triangulation.yDifference)}/>
        </section>
        <section className="card"><h3>06 · Three Ratio Technique <span className="hint">(Optional results)</span></h3><div className="ratios">{ratios.map(([name,v])=><div className="ratio" key={name}><b>{name}</b><strong>{show(v.value)}</strong><small>{v.classification}</small></div>)}</div></section>
        <section className="card"><h3>07 · Calculation checks</h3>{diagnostics.length?diagnostics.map((d,i)=><Result key={i} label="Check" value={d}/>):<Result label="Input checks" value="No basic numeric warnings detected"/>}<div className="status">Warnings do not modify the workbook&apos;s formulas or classifications.</div></section>
        <section className="card wide"><h3>08 · Triangulation chart</h3><Plot lines={[result.triangulation.line1,result.triangulation.line2,result.triangulation.line3]} points={result.triangulation.intersections}/><div className="status">Chart plots the workbook&apos;s construction lines and recalculated intersections.</div></section>
        <section className="card wide"><h3>09 · Final user interpretation / conclusion</h3><p className="hint">The three method results remain independent. Enter the final geological / mud logging conclusion here.</p><div className="field"><label htmlFor="conclusion">Final conclusion</label><textarea id="conclusion" value={meta.conclusion} onChange={e=>setMeta(old=>({...old,conclusion:e.target.value}))} placeholder="Enter the final interpretation…"/></div></section>
      </div>
      <div className="footer">Formula source: supplied Mud Logging Analysis workbook. Results are calculation aids and require qualified operational interpretation.</div>
    </main>
  </>;
}
function Result({label,value}:{label:string;value:string}){return <div className="result"><span>{label}</span><strong>{value}</strong></div>}
