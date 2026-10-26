import { useEffect, useMemo, useRef, useState } from 'react';
import { fileUrl } from './api';

export const MAX_FILES = 5;
export const MAX_MB = 50;
const OK = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
const size = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

// Choose (or drag in) images / videos before submitting. `files` is an array of File objects owned by the parent.
export function FilePicker({ files, setFiles, toast, max = MAX_FILES }) {
  const input = useRef();
  const [over, setOver] = useState(false);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const add = (list) => {
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!OK.includes(f.type)) { toast(`${f.name}: only JPG, PNG, GIF, WebP images and MP4, WebM, MOV videos are allowed.`); continue; }
      if (f.size > MAX_MB * 1048576) { toast(`${f.name} is larger than ${MAX_MB} MB.`); continue; }
      if (next.length >= max) { toast(`You can attach at most ${max} files.`); break; }
      next.push(f);
    }
    setFiles(next);
    if (input.current) input.current.value = '';
  };

  return (
    <div>
      <div
        className={'dropzone clickable' + (over ? ' over' : '')}
        onClick={() => input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
      >
        <strong>Click to add photos or videos</strong>, or drag them here
        <div style={{ marginTop: 3, fontSize: 11.5 }}>JPG, PNG, GIF, WebP, MP4, WebM, MOV · up to {max} files · {MAX_MB} MB each</div>
        <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime" onChange={(e) => add(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="thumbs">
          {files.map((f, i) => (
            <div className="thumb" key={f.name + i}>
              {f.type.startsWith('video') ? <video src={previews[i]} muted preload="metadata" /> : <img src={previews[i]} alt={f.name} />}
              {f.type.startsWith('video') && <span className="tag">VIDEO</span>}
              <button type="button" title="Remove" onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
              <div className="cap" title={f.name}>{f.name}<br />{size(f.size)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Shows a complaint's saved attachments. Images open full-size in a new tab; videos play inline.
export function Gallery({ items }) {
  if (!items?.length) return null;
  return (
    <div className="thumbs big">
      {items.map((a) => (
        <div className="thumb" key={a.id}>
          {a.kind === 'video'
            ? <video src={fileUrl(a.id)} controls preload="metadata" />
            : <a href={fileUrl(a.id)} target="_blank" rel="noreferrer"><img src={fileUrl(a.id)} alt={a.name} loading="lazy" /></a>}
          <div className="cap" title={a.name}>{a.name}</div>
        </div>
      ))}
    </div>
  );
}
