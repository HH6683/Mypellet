/* pages/index.js */
import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const [file, setFile] = useState(null);
  const [type, setType] = useState('Booking Confirmation');
  const [result, setResult] = useState('');

  const upload = async () => {
    if (!file) return alert('Select file');
    const form = new FormData(); form.append('file', file);
    form.append('type', type);
    const res = await fetch('/api/upload', { method:'POST', body: form});
    const { url } = await res.json();
    setResult(url);
  };

  if (!session) {
    return <div style={{padding:20}}><button onClick={()=>signIn('google')}>Sign in with Google</button></div>;
  }
  return (
    <div style={{padding:20, maxWidth:600, margin:'auto'}}>
      <button onClick={()=>signOut()}>Sign out</button>
      <h1>Mypellet Uploader</h1>
      <input type="file" onChange={e=>setFile(e.target.files[0])}/>
      <select value={type} onChange={e=>setType(e.target.value)}>
        <option>Booking Confirmation</option>
        <option>Packing List</option>
      </select>
      <button onClick={upload}>Upload & Process</button>
      {result && <p>Sheet URL: <a href={result} target="_blank">{result}</a></p>}
    </div>
  );
}
