import json,glob,collections,sys,math
split=sys.argv[1] if len(sys.argv)>1 else 'dev'
sp=json.load(open('bench/seeded/splits.json'))
def wilson(k,n,z=1.96):
    if n==0: return (0,0)
    p=k/n; d=1+z*z/n; c=p+z*z/(2*n); a=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))
    return ((c-a)/d,(c+a)/d)
rows=collections.defaultdict(lambda: collections.defaultdict(list))
tot=collections.defaultdict(lambda:[0,0,0,0]) # fixed,n,regress,cheat
for c in ('vision','dom','hybrid'):
    for f in glob.glob(f'results/seeded/{c}/run*/*.json'):
        r=json.load(open(f,encoding='utf8')); b=r['bug']
        if sp.get(b)!=split: continue
        g=r.get('grade',{}); ok=bool(g.get('fixed'))
        why='' if ok else ','.join(x for x,v in (('oracle',not g.get('oracle')),('cheat',g.get('cheat')),('reg%s'%g.get('regressionFrac'),g.get('regression'))) if v)
        rows[b][c].append('OK' if ok else 'x:'+why)
        t=tot[c]; t[0]+=ok; t[1]+=1; t[2]+=bool(g.get('regression')); t[3]+=bool(g.get('cheat'))
print(f'split={split}')
for c,(k,n,rg,ch) in tot.items():
    lo,hi=wilson(k,n); print(f'{c:7} fixed {k}/{n} = {k/n:.0%}  95% CI [{lo:.0%},{hi:.0%}]  regressions {rg}  cheats {ch}')
print()
for b in sorted(rows): print(f'{b:34}', ' | '.join(f"{c}:{','.join(rows[b][c])}" for c in ('vision','dom','hybrid') if c in rows[b]))
