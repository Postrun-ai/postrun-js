import { useState } from 'react';

import { LinkedInDemo } from './LinkedInDemo';
import { TikTokDemo } from './TikTokDemo';

type Network = 'tiktok' | 'linkedin';

export function App() {
  const [network, setNetwork] = useState<Network>('tiktok');

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="title">Postrun · Preview Playground</h1>
        <div className="seg">
          {(['tiktok', 'linkedin'] as const).map((n) => (
            <button
              key={n}
              className={n === network ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setNetwork(n)}
            >
              {n === 'tiktok' ? 'TikTok' : 'LinkedIn'}
            </button>
          ))}
        </div>
      </header>

      <main className="content">
        {network === 'tiktok' ? <TikTokDemo /> : <LinkedInDemo />}
      </main>
    </div>
  );
}
