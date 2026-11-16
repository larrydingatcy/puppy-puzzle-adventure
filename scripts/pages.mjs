import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const out=new URL('out/',root);
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await cp(new URL('public/play/',root),out,{recursive:true});
await writeFile(new URL('mode.mjs',out),'export default true;\n');
await writeFile(new URL('.nojekyll',out),'');
