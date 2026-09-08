"""Descarga todas las imágenes originales del sitio antiguo a storage/legacy-images/<basename>.
Primero productos con stock, luego agotados. Reanudable: salta archivos ya descargados."""
import json, os, sys, time, urllib.request, concurrent.futures as cf
from urllib.parse import urlparse
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'storage','legacy-images'); os.makedirs(OUT,exist_ok=True)
pv=json.load(open(os.path.join(ROOT,'data/legacy/products_v3.json')))
pv.sort(key=lambda p: 0 if (p['stock_quantity'] or 0)>0 else 1)
urls=[]; seen=set()
for p in pv:
    for i in p['images']:
        u=i['src']
        if u not in seen: seen.add(u); urls.append(u)
def fetch(u):
    name=os.path.basename(urlparse(u).path)
    dest=os.path.join(OUT,name)
    if os.path.exists(dest) and os.path.getsize(dest)>0: return 'skip'
    for attempt in range(3):
        try:
            req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=60) as r, open(dest+'.part','wb') as f: f.write(r.read())
            os.replace(dest+'.part',dest); return 'ok'
        except Exception as e:
            err=e; time.sleep(2*(attempt+1))
    return f'fail {u} {err}'
done=0; fails=[]; t0=time.time()
with cf.ThreadPoolExecutor(max_workers=8) as ex:
    for res in ex.map(fetch,urls):
        done+=1
        if res.startswith('fail'): fails.append(res)
        if done%250==0: print(f'{done}/{len(urls)} {time.time()-t0:.0f}s fails={len(fails)}',flush=True)
print('DONE',done,'fails',len(fails)); open(os.path.join(OUT,'_fails.txt'),'w').write('\n'.join(fails))
