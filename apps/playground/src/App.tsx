import { useState } from 'react';

import { InstagramDemo } from './InstagramDemo';
import { LinkedInDemo } from './LinkedInDemo';
import { TikTokDemo } from './TikTokDemo';
import { XDemo } from './XDemo';

type Network = 'tiktok' | 'linkedin' | 'x' | 'instagram';

export function App() {
  const [network, setNetwork] = useState<Network>('tiktok');

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="title">Postrun · Preview Playground</h1>
        <div className="seg">
          {(['tiktok', 'linkedin', 'x', 'instagram'] as const).map((n) => (
            <button
              key={n}
              className={n === network ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setNetwork(n)}
            >
              {n === 'tiktok'
                ? 'TikTok'
                : n === 'linkedin'
                  ? 'LinkedIn'
                  : n === 'x'
                    ? 'X'
                    : 'Instagram'}
            </button>
          ))}
        </div>
      </header>

      <main className="content">
        {network === 'tiktok' ? (
          <TikTokDemo />
        ) : network === 'linkedin' ? (
          <LinkedInDemo />
        ) : network === 'x' ? (
          <XDemo />
        ) : (
          <InstagramDemo />
        )}
      </main>
    </div>
  );
}
