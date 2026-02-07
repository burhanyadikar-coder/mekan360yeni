import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import ilIlceData from '../data/turkiye_il_ilce.json';
import PanoramaViewer from '../components/PanoramaViewer';

export default function PropertyFormPage({ onSubmit, initial = {} }) {
  const [title, setTitle] = useState(initial.title || '');
  const [files, setFiles] = useState([]);
  const [compressedFiles, setCompressedFiles] = useState([]);
  const [isFirstPanorama, setIsFirstPanorama] = useState(false);
  const [province, setProvince] = useState(initial.il || '');
  const [district, setDistrict] = useState(initial.ilce || '');
  const [districts, setDistricts] = useState([]);
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

  useEffect(() => {
    if (province) {
      const p = ilIlceData.find(x => x.il === province);
      setDistricts(p ? p.ilceler : []);
      if (!p) setDistrict('');
    } else {
      setDistricts([]);
      setDistrict('');
    }
  }, [province]);

  async function compressFile(file) {
    const options = {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      initialQuality: 0.8
    };
    try {
      const compressed = await imageCompression(file, options);
      return compressed;
    } catch (err) {
      console.warn('Image compression failed, using original file', err);
      return file;
    }
  }

  async function handleFileChange(e) {
    const chosen = Array.from(e.target.files || []);
    const compressedList = [];
    for (const f of chosen) {
      const c = await compressFile(f);
      if (c.size > MAX_UPLOAD_BYTES) {
        alert(`${f.name} sıkıştırıldıktan sonra bile 10MB'dan büyük (${Math.round(c.size/1024/1024*100)/100} MB). Lütfen daha küçük bir dosya seçin.`);
        continue;
      }
      compressedList.push(new File([c], f.name, { type: c.type }));
    }
    setFiles(compressedList);
    setCompressedFiles(compressedList);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!province) return alert('Lütfen il seçin.');
    if (!district) return alert('Lütfen ilçe seçin.');

    // Prepare form data
    const fd = new FormData();
    fd.append('title', title);
    fd.append('il', province);
    fd.append('ilce', district);
    compressedFiles.forEach((f, idx) => fd.append('photos', f, f.name));

    // If caller provided onSubmit, use it; otherwise send to default endpoint
    if (onSubmit) return onSubmit(fd);

    try {
      const res = await fetch('/api/properties', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      alert('İlan kaydedildi.');
    } catch (err) {
      console.error(err);
      alert('İlan yüklenirken hata oluştu. Konsolu kontrol edin.');
    }
  }

  return (
    <div>
      <h2>İlan Oluştur</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Başlık</label>
          <input value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div>
          <label>İl</label>
          <select value={province} onChange={e => setProvince(e.target.value)}>
            <option value="">-- İL SEÇİN --</option>
            {ilIlceData.map(p => (
              <option key={p.il} value={p.il}>{p.il}</option>
            ))}
          </select>
        </div>

        <div>
          <label>İlçe</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} disabled={!province}>
            <option value="">-- İLÇE SEÇİN --</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Fotoğraflar (maks 10MB/sıkıştırılmış)</label>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} />
          <div>
            <label style={{display:'inline-block',marginTop:8}}>
              <input type="checkbox" checked={isFirstPanorama} onChange={e=>setIsFirstPanorama(e.target.checked)} /> İlk fotoğraf 360 olarak tanımlansın
            </label>
          </div>
          <div>
            Seçili: {compressedFiles.length} dosya
            <ul>
              {compressedFiles.map((f,i)=>(<li key={i}>{f.name} — {(f.size/1024/1024).toFixed(2)} MB</li>))}
            </ul>
          </div>
          {isFirstPanorama && compressedFiles[0] && (
            <div style={{marginTop:12}}>
              <h4>360° Önizleme</h4>
              <PanoramaViewer src={URL.createObjectURL(compressedFiles[0])} height={300} />
            </div>
          )}
        </div>

        <button type="submit">Kaydet</button>
      </form>
    </div>
  );
}
