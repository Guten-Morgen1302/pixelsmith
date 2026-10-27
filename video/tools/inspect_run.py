import json, glob, sys
bug = sys.argv[1] if len(sys.argv) > 1 else 'pico-474'
for f in sorted(glob.glob(f'results/real/vision/run*/{bug}.json')):
    r = json.load(open(f, encoding='utf8')); g = r['grade']
    print(f.replace(chr(92), '/'), 'attempts', g['attempts'], 'fixed', g['fixed'], 'px-from-upstream', g['pixelsDifferFromUpstreamFix'])
    print('  pick', json.dumps(r['pick'])[:300])
    for a in r['attempts']:
        print('  att', a['n'], 'why:', (a.get('why') or '')[:200], '| verify', json.dumps(a.get('selfVerify'))[:240], '| err', a.get('error'))
