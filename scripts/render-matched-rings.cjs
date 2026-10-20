// Requires playwright and esbuild; renders the same scene used by the hero.
const { chromium } = require('playwright');
const { build } = require('esbuild');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
(async () => {
 const root = path.resolve(__dirname, '..');
 const bundle = await build({entryPoints:[path.join(root,'src/components/products/dailysupply/luminous-scene.js')],bundle:true,write:false,format:'iife',globalName:'Rings'});
 const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 // Match the live canvas's 2:1 aspect ratio; pad to UHD only during encoding.
 // The stage must be INSIDE the section because the renderer queries its descendants.
 const page = await browser.newPage({viewport:{width:3840,height:1920},deviceScaleFactor:1});
 await page.setContent('<style>*{margin:0}section,#stage,#host{position:absolute;inset:0}#target{position:absolute;left:50%;top:50%}</style><section><div id="stage" data-ring-stage="true"><div id="host"></div><div id="target" data-ring-target="true"></div></div></section>');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>{window.scene=Rings.createLuminousScene(document.querySelector('#host'),{capture:true,onFailure(){},onConverged(){}})});
 const output=path.join(root,'public/videos/dailysupply-rings-clean-4k.mp4');
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-i','-','-an','-vf','pad=3840:2160:0:120:black','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',output]);
 ff.stderr.pipe(process.stderr);
 for(let n=0;n<180;n++){
   const data=await page.evaluate(t=>window.scene.renderAt(t),3.3+n/30);
   const png=Buffer.from(data.split(',')[1],'base64');
   if(!ff.stdin.write(png)) await new Promise(r=>ff.stdin.once('drain',r));
   if(n%30===0) console.log(`Rendered ${n}/180 frames`);
 }
 ff.stdin.end();
 await new Promise((resolve,reject)=>ff.on('close',code=>code?reject(Error(`ffmpeg ${code}`)):resolve()));
 execFileSync('ffmpeg',['-y','-loglevel','error','-i',output,'-frames:v','1',path.join(root,'public/videos/dailysupply-rings-clean-poster.png')]);
 await browser.close();
 console.log(output);
})().catch(e=>{console.error(e);process.exit(1)});
