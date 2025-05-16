// pages/index.js
import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const [file, setFile] = useState(null);
  const [type, setType] = useState('Booking Confirmation');
  const [result, setResult] = useState('');

  // 上传并模拟处理
  const upload = async () => {
    if (!file) return alert('请先选择文件');
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert('上传失败：' + (err.error || res.status));
    }
    const { url } = await res.json();
    setResult(url);
  };

  // 未登录时显示登录按钮
  if (!session) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <button onClick={() => signIn('google')}>Sign in with Google</button>
      </div>
    );
  }

  // 登录后显示上传表单
  return (
    <div style={{ background: '#a9a9a9', minHeight: '100vh', padding: 20 }}>
      <div
        style={{
          maxWidth: 600,
          margin: 'auto',
          background: '#fff',
          padding: 20,
          borderRadius: 8,
          boxShadow: '0 0 10px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <button onClick={() => signOut()}>Sign out</button>
        </div>
        <h1 style={{ textAlign: 'center' }}>Mypellet Uploader</h1>
        <label>选择文件 (PDF / Excel)</label>
        <input type="file" onChange={e => setFile(e.target.files[0])} />
        <label>文件类型</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option>Booking Confirmation</option>
          <option>Packing List</option>
        </select>
        <button onClick={upload} style={{ marginTop: 10 }}>
          Upload & Process
        </button>
        {result && (
          <p style={{ marginTop: 20 }}>
            ✔️ 成功！Google Sheet：<br />
            <a href={result} target="_blank" rel="noreferrer">
              {result}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
