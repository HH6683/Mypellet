// pages/index.js
import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const [file, setFile]     = useState(null);
  const [type, setType]     = useState('Booking Confirmation');
  const [result, setResult] = useState('');

  if (!session) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
        <button onClick={() => signIn('google')}>Sign in with Google</button>
      </div>
    );
  }

  const upload = async () => {
    if (!file) {
      alert('请先选择文件');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);

    // 发起请求
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: form
    });
    console.log('🖥 /api/upload status =', res.status);

    // 打印返回的 JSON body
    let json;
    try {
      json = await res.json();
    } catch (e) {
      console.error('🖥 Failed to parse JSON:', e);
      alert('服务端返回了非 JSON 响应');
      return;
    }
    console.log('🖥 /api/upload response JSON =', json);

    if (!res.ok || !json.url) {
      alert('上传失败或未获取到链接: ' + JSON.stringify(json));
      return;
    }
    setResult(json.url);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
      <button onClick={() => signOut()} style={{ marginBottom: '1rem' }}>
        Sign out
      </button>
      <h1>Mypellet Uploader</h1>

      <label style={{ display: 'block', marginTop: '.5rem' }}>
        选择文件 (PDF / Excel)
        <input
          type="file"
          accept=".pdf,.xlsx"
          onChange={e => setFile(e.target.files[0])}
          style={{ display: 'block', marginTop: '.5rem' }}
        />
      </label>

      <label style={{ display: 'block', marginTop: '.5rem' }}>
        文件类型
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{ display: 'block', marginTop: '.5rem' }}
        >
          <option>Booking Confirmation</option>
          <option>Packing List</option>
        </select>
      </label>

      <button onClick={upload} style={{ display: 'block', marginTop: '1rem' }}>
        Upload & Process
      </button>

      {result && (
        <p style={{ marginTop: '1rem' }}>
          ✔️ Sheet 链接：{' '}
          <a href={result} target="_blank" rel="noopener noreferrer">
            {result}
          </a>
        </p>
      )}
    </div>
  );
}
