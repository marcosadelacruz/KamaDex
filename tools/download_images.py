#!/usr/bin/env python3
"""Descarga local opcional de 514 ilustraciones, para uso autorizado."""
import json,urllib.request,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'assets/illustrations-manifest.json').read_text(encoding='utf8'))['items']
target=root/'public/images/positions'
target.mkdir(parents=True,exist_ok=True)
ok=0;failed=[]
for i,row in enumerate(data,1):
    output=target/row['filename']
    if output.is_file() and output.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n':
        ok+=1;continue
    try:
        req=urllib.request.Request(row['url'],headers={'User-Agent':'KamaDex-Local-Importer/1.0'})
        with urllib.request.urlopen(req,timeout=25) as resp: b=resp.read()
        if not b.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('PNG inválido')
        output.write_bytes(b);ok+=1
    except Exception as e:failed.append({'id':row['id'],'error':str(e)})
    if i%50==0:print('Procesadas:',i,'/',len(data))
print('Imágenes válidas:',ok,'Errores:',len(failed))
(root/'local_images_status.json').write_text(json.dumps({'valid':ok,'failed':failed},indent=2),encoding='utf8')
