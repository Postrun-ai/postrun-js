import { useState } from 'react';

import { LinkedInDemo } from './LinkedInDemo';
import { TikTokDemo } from './TikTokDemo';
import { XDemo } from './XDemo';

type Network = 'tiktok' | 'linkedin' | 'x';

export function App() {
  const [network, setNetwork] = useState<Network>('tiktok');

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="title">Postrun · Preview Playground</h1>
        <div className="seg">
          {(['tiktok', 'linkedin', 'x'] as const).map((n) => (
            <button
              key={n}
              className={n === network ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setNetwork(n)}
            >
              {n === 'tiktok' ? 'TikTok' : n === 'linkedin' ? 'LinkedIn' : 'X'}
            </button>
          ))}
        </div>
      </header>

      <main className="content">
        {network === 'tiktok' ? (
          <TikTokDemo />
        ) : network === 'linkedin' ? (
          <LinkedInDemo />
        ) : (
          <XDemo />
        )}
      </main>
    </div>
  );
}
