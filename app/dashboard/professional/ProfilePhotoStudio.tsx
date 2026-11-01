'use client';
import {useCallback,useEffect,useRef,useState,useTransition,type ChangeEvent} from 'react';
import {uploadProfessionalPhotoAction} from './actions';

const W=400,H=500;
const COLORS=[{name:'Soft blue',hex:'#e6edf6'},{name:'Light gray',hex:'#f1f3f6'},{name:'White',hex:'#ffffff'}] as const;

/** Non-destructive browser-only crop. The photograph is sent only on Save. */
export default function ProfilePhotoStudio(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const image=useRef<HTMLImageElement|null>(null);
 const [file,setFile]=useState<File|null>(null);
 const [ready,setReady]=useState(false);
 const [crop,setCrop]=useState(true);
 const [zoom,setZoom]=useState(0);
 const [position,setPosition]=useState(50);
 const [background,setBackground]=useState<string>(COLORS[0].hex);
 const [error,setError]=useState('');
 const [pending,startTransition]=useTransition();
 const draw=useCallback(()=>{
  const ctx=canvas.current?.getContext('2d'),img=image.current;
  if(!ctx)return;
  ctx.fillStyle=background;ctx.fillRect(0,0,W,H);
  if(!img)return;
  const scale=Math.max(W/img.naturalWidth,H/img.naturalHeight)*(1+zoom/100);
  const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
  ctx.drawImage(img,(W-width)/2,(H-height)*position/100,width,height);
 },[background,zoom,position]);
 useEffect(()=>{if(ready)draw();},[ready,draw]);
 function selectFile(event:ChangeEvent<HTMLInputElement>){
  const chosen=event.currentTarget.files?.[0];
  if(!chosen)return;
  if(!['image/jpeg','image/png','image/webp'].includes(chosen.type)||chosen.size>5*1024*1024){
   setError('Choose a JPG, PNG or WebP photograph of 5 MB or less.');
   event.currentTarget.value='';return;
  }
  setError('');setReady(false);image.current=null;setFile(chosen);setZoom(0);setPosition(50);
  const url=URL.createObjectURL(chosen),img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);image.current=img;setReady(true);};
  img.onerror=()=>{URL.revokeObjectURL(url);setFile(null);setError('The selected image could not be opened.');};
  img.src=url;
 }
 async function save(){
  if(!file||!ready){setError('Choose a photograph first.');return;}
  let upload=file;
  if(crop){
   const output=canvas.current;if(!output)return;
   draw();
   const blob=await new Promise<Blob|null>(resolve=>output.toBlob(resolve,'image/jpeg',.9));
   if(!blob){setError('Could not prepare the photo. Turn off cropping to upload the original.');return;}
   upload=new File([blob],'vetconnect-portrait.jpg',{type:'image/jpeg'});
  }
  const data=new FormData();data.set('photo',upload);
  startTransition(async()=>{await uploadProfessionalPhotoAction(data);});
 }
 return <section className="photo-studio backend-form-card" aria-labelledby="photo-studio-heading">
  <div className="photo-studio-frame">{ready?<canvas ref={canvas} width={W} height={H} role="img" aria-label="Portrait crop preview"/>:<div className="photo-studio-placeholder"><span aria-hidden="true">+</span><strong>Portrait preview</strong><small>4:5 photo frame</small></div>}</div>
  <div className="photo-studio-controls">
   <span className="section-kicker">PROFILE PHOTOGRAPH</span>
   <h3 id="photo-studio-heading">One consistent professional photo</h3>
   <p>Choose a clear photograph. Standard framing helps your profile and CV appear consistent without altering your face or features.</p>
   <label htmlFor="studio-photo">Select JPG, PNG or WebP (max 5 MB)</label>
   <input id="studio-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile}/>
   <label className="photo-studio-check"><input type="checkbox" checked={crop} onChange={e=>setCrop(e.target.checked)}/> Apply standard portrait crop</label>
   {crop&&ready&&<div className="photo-studio-adjustments">
    <label htmlFor="studio-zoom">Zoom</label><input id="studio-zoom" type="range" min="0" max="70" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/>
    <label htmlFor="studio-position">Vertical position</label><input id="studio-position" type="range" min="0" max="100" value={position} onChange={e=>setPosition(Number(e.target.value))}/>
    <span className="photo-studio-label">Background for transparent areas</span>
    <div className="photo-studio-swatches">{COLORS.map(color=><button key={color.hex} type="button" title={color.name} aria-label={color.name} aria-pressed={background===color.hex} style={{background:color.hex}} onClick={()=>setBackground(color.hex)}/>)}</div>
   </div>}
   <p className="form-help">This does not erase an opaque photo background. Automatic background removal requires a separately reviewed image-segmentation feature. No image is uploaded until you save. Saved profile photographs may appear on public VetConnect pages, so upload only a photo you are comfortable sharing.</p>
   {error&&<p className="photo-studio-error" role="alert">{error}</p>}
   <button type="button" className="button button-primary" disabled={!ready||pending} onClick={save}>{pending?'Saving photo...':'Save profile photo'}</button>
  </div>
 </section>;
}