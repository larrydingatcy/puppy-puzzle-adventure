import {readFile,writeFile} from 'node:fs/promises';
for (const file of ['missions','forest']) {
  const root = new URL('../',import.meta.url);
  const data = JSON.parse(await readFile(new URL('content/'+file+'.json',root),'utf8'));
  await writeFile(new URL('public/play/'+file+'.mjs',root),'export default '+JSON.stringify(data,null,2)+';\n');
}
