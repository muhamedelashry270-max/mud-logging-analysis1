'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { calculateMudLogging, WORKBOOK_SAMPLE, type GasInputs, type Point } from '@/lib/calculations';
import { createClient } from '@/lib/supabase/client';

type SavedAnalysis = {
  id: string; well_name: string; formation: string; interval_label: string;
  background_values: number[]; measured_values: number[]; final_interpretation: string;
  updated_at: string;
};
const initialMeta = { well: '', formation: '', interval: '', conclusion: '' };
const fmt = (v: number) => Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 6 }) : String(v);
const show = (v: number) => Number.isFinite(v) ? fmt(v) : '#NUM! / #DIV/0!';

function Plot({ lines, points }: { lines: {slope:number;intercept:number}[]; points: Point[] }) {
  const W=720,H=330,L=54,R=20,T=18,B=42,pw=W-L-R,ph=H-T-B,xmin=-1,xmax=26,ymin=-1,ymax=10;
  const X=(x:number)=>L+(x-xmin)/(xmax-xmin)*pw, Y=(y:number)=>T+ph-(y-ymin)/(ymax-ymin)*ph;
  return <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Workbook triangulation chart">
    {Array.from({length:6},(_,i)=>i*5).map(x=><g key={`x${x}`}><line x1={X(x)} y1={T} x2={X(x)} y2={T+ph} stroke="#e7edf1"/><text x={X(x)} y={H-17} textAnchor="middle" fontSize="11" fill="#65798a">{x}</text></g>)}
    {Array.from({length:6},(_,i)=>i*2).map(y=><g key={`y${y}`}><line x1={L} y1={Y(y)} x2={L+pw} y2={Y(y)} stroke="#e7edf1"/><text x={L-12} y={Y(y)+4} textAnchor="end" fontSize="11" fill="#65798a">{y}</text></g>)}
    <line x1={L} y1={T+ph} x2={L+pw} y2={T+ph} stroke="#73899a"/><line x1={L} y1={T} x2={L} y2={T+ph} stroke="#73899a"/>
    <text x={L+pw/2} y={H-2} textAnchor="middle" fontSize="12" fill="#435b6c">X</text>
    <text x="14" y={T+ph/2} transform={`rotate(-90 14 ${T+ph/2})`} textAnchor="middle" fontSize="12" fill="#435b6c">Y</text>
    {lines.map((line,i)=><line key={i} x1={X(xmin)} y1={Y(line.slope*xmin+line.intercept)} x2={X(xmax)} y2={Y(line.slope*xmax+line.intercept)} stroke={['#1683a5','#c17a27','#6c7db5'][i]} strokeWidth="2.2"/>)}
    {points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))&&<>
      <polygon points={points.map(p=>`${X(p.x)},${Y(p.y)}`).join(' ')} fill="#78b9ce" fillOpacity=".18" stroke="#286c89" strokeWidth="1.6"/>
      {points.map((p,i)=><g key={i}><circle cx={X(p.x)} cy={Y(p.y)} r="4.5" fill="#163f5a"/><text x={X(p.x)+7} y={Y(p.y)-8} fontSize="11" fill="#163f5a">P{i+1}</text></g>)}
    </>}
  </svg>;
}

export default function Calculator() {
  const [meta,setMeta]=useState(initialMeta);
  const [background,setBackground]=useState<[number,number,number,number,number]>([...WORKBOOK_SAMPLE.background]);
  const [values,setValues]=useState<[number,number,number,number,number]>([...WORKBOOK_SAMPLE.values]);
  const [user,setUser]=useState<User|null>(null);
  const [email,setEmail]=useState('');
  const [status,setStatus]=useState('Guest mode: calculations are available without signing in.');
  const [saved,setSaved]=useState<SavedAnalysis[]>([]);
  const [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false);
  const supabase=useMemo(()=>{
    if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
    return createClient();
  },[]);
  const result=useMemo(()=>calculateMudLogging({background,values}),[background,values]);
  const inputs:GasInputs={background,values};

  const refreshSaved=useCallback(async()=>{
    if(!supabase||!user)return;
    const {data,error}=await supabase.from('analyses').select('id,well_name,formation,interval_label,background_values,measured_values,final_interpretation,updated_at').order('updated_at',{ascending:false}).limit(100);
    if(error){setStatus(`Could not load saved analyses: ${error.message}`);return;}
    setSaved((data??[]) as SavedAnalysis[]);
  },[supabase,user]);

  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getUser().then(({data})=>setUser(data.user));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));
    return ()=>subscription.unsubscribe();
  },[supabase]);
  useEffect(()=>{void refreshSaved();},[refreshSaved]);

  const updateArray=(kind:'background'|'values',index:number,raw:string)=>{
    const parsed=raw.trim()===''?0:Number(raw);
    if(!Number.isFinite(parsed))return;
    if(kind==='background')setBackground(old=>old.map((v,i)=>i===index?parsed:v) as typeof old);
    else setValues(old=>old.map((v,i)=>i===index?parsed:v) as typeof old);
  };
  const sendMagicLink=async()=>{
    if(!supabase){setStatus('Authentication is not configured yet. Add the Supabase environment variables to enable accounts.');return;}
    if(!email.trim()){setStatus('Enter your email address to receive a sign-in link.');return;}
    setBusy(true);const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:`${window.location.origin}/auth/callback`}});setBusy(false);
    setStatus(error?`Sign-in failed: ${error.message}`:'Check your email for the secure sign-in link.');
  };
  const signOut=async()=>{if(!supabase)return;await supabase.auth.signOut();setSaved([]);setStatus('Signed out. Guest calculations remain available.');};
  const saveAnalysis=async()=>{
    if(!supabase||!user){setStatus('Sign in to save private analyses. Guests can still print or export a local JSON copy.');return;}
    setBusy(true);
    const payload={well_name:meta.well,formation:meta.formation,interval_label:meta.interval,background_values:background,measured_values:values,final_interpretation:meta.conclusion};
    const {data,error}=await supabase.from('analyses').insert(payload).select('id').single();
    setBusy(false);
    if(error){setStatus(`Save failed: ${error.message}`);return;}
    setStatus('Analysis saved privately to your account.');await refreshSaved();if(data?.id)setSelected(data.id);
  };
  const loadAnalysis=()=>{
    const item=saved.find(x=>x.id===selected);if(!item)return;
    setMeta({well:item.well_name,formation:item.formation,interval:item.interval_label,conclusion:item.final_interpretation});
    setBackground(item.background_values as typeof background);setValues(item.measured_values as typeof values);
    setStatus('Saved analysis loaded.');
  };
  const deleteAnalysis=async()=>{
    if(!supabase||!user||!selected)return;
    const {error}=await supabase.from('analyses').delete().eq('id',selected);
    if(error){setStatus(`Delete failed: ${error.message}`);return;}
    setSelected('');await refreshSaved();setStatus('Saved analysis deleted.');
  };
  const exportJson=()=>{
    const payload={workbookReference:'Mud Logging Analysis workbook',exportedAt:new Date().toISOString(),metadata:meta,inputs,results:result};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='mud-logging-analysis.json';a.click();URL.revokeObjectURL(url);
  };
  const reset=()=>{setMeta(initialMeta);setBackground([2000,1000,2000,1000,500]);setValues([940000,53000,15000,12000,4500]);setStatus('New interval ready.');};
  const ratios=[['GWR',result.threeRatios.gwr],['LHR',result.threeRatios.lhr],['OCQ',result.threeRatios.ocq]] as const;
  const diagnostics:string[]=[];
  if(result.increments.some(v=>v===0))diagnostics.push('A zero increment may produce division-by-zero or logarithm errors in the workbook formulas.');
  if(result.increments.some(v=>v<0))diagnostics.push('Negative increments may produce logarithm or ratio errors; no alternative rule is substituted.');
  if(!Number.isFinite(result.triangulation.triangleSize))diagnostics.push('Triangulation includes an undefined numeric result. Check inputs and total gas.');

  return <>
    <header className="top"><div><h1>MUD LOGGING ANALYSIS</h1><p>Hydrocarbon Interpretation System · Workbook-based calculations</p></div><div>{user?`Signed in: ${user.email}`:'Guest calculation mode'}</div></header>
    <main className="wrap">
      <div className="intro"><div><h2>New interval analysis</h2><div className="muted">Enter well details and gas readings. All three methods recalculate automatically.</div></div>
        <div className="actions"><button className="btn" onClick={reset}>Reset</button><button className="btn" onClick={()=>window.print()}>Print / Save PDF</button><button className="btn" onClick={exportJson}>Export JSON</button><button className="btn primary" onClick={saveAnalysis} disabled={busy||!user}>Save to account</button></div>
      </div>
      <section className="card" style={{marginBottom:16}}><h3>Account and saved analyses</h3>
        {!user?<div className="auth"><input aria-label="Email address" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/><button className="btn primary" onClick={sendMagicLink} disabled={busy}>Email me a sign-in link</button><span className="hint">Guests can calculate without an account. Sign-in is only needed for private cloud storage.</span></div>
        :<div className="saved"><button className="btn" onClick={signOut}>Sign out</button><select aria-label="Saved analyses" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a saved analysis…</option>{saved.map(s=><option key={s.id} value={s.id}>{s.well_name||'Untitled well'} · {s.interval_label||'No interval'} · {new Date(s.updated_at).toLocaleDateString()}</option>)}</select><button className="btn" onClick={loadAnalysis} disabled={!selected}>Load</button><button className="btn" onClick={deleteAnalysis} disabled={!selected}>Delete</button><button className="btn" onClick={refreshSaved}>Refresh list</button></div>}
        <div className="status" role="status">{status}</div>
      </section>
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
        <section className="card"><h3>04 · Triangulation Technique</h3>
          <Result label="Zone" value={result.triangulation.zone}/><Result label="Classification" value={result.triangulation.classification}/><Result label="Triangle size (B61)" value={show(result.triangulation.triangleSize)}/><Result label="X difference (B59)" value={show(result.triangulation.xDifference)}/><Result label="Y difference (B60)" value={show(result.triangulation.yDifference)}/>
        </section>
        <section className="card"><h3>05 · Three Ratio Technique <span className="hint">(Optional results)</span></h3><div className="ratios">{ratios.map(([name,v])=><div className="ratio" key={name}><b>{name}</b><strong>{show(v.value)}</strong><small>{v.classification}</small></div>)}</div><div className="notice" style={{marginTop:12}}>The GWR IF order is preserved exactly: E2 &lt; 0.5 is tested before E2 &lt; 0.175, making the second branch unreachable for ordinary numeric inputs.</div></section>
        <section className="card"><h3>06 · Calculation checks</h3>{diagnostics.length?diagnostics.map((d,i)=><Result key={i} label="Check" value={d}/>):<Result label="Input checks" value="No basic numeric warnings detected"/>}<div className="status">Warnings do not modify the workbook's formulas or classifications.</div></section>
        <section className="card wide"><h3>07 · Triangulation chart</h3><Plot lines={[result.triangulation.line1,result.triangulation.line2,result.triangulation.line3]} points={result.triangulation.intersections}/><div className="status">Chart plots the workbook's construction lines and recalculated intersections.</div></section>
        <section className="card wide"><h3>08 · Final user interpretation / conclusion</h3><p className="hint">The three method results remain independent. Enter the final geological / mud logging conclusion here.</p><div className="field"><label htmlFor="conclusion">Final conclusion</label><textarea id="conclusion" value={meta.conclusion} onChange={e=>setMeta(old=>({...old,conclusion:e.target.value}))} placeholder="Enter the final interpretation…"/></div></section>
      </div>
      <div className="footer">Formula source: supplied Mud Logging Analysis workbook. Results are calculation aids and require qualified operational interpretation.</div>
    </main>
  </>;
}
function Result({label,value}:{label:string;value:string}){return <div className="result"><span>{label}</span><strong>{value}</strong></div>}
