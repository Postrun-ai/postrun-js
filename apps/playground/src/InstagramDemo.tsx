import { useState } from 'react';

import { InstagramPostPreview, type InstagramTheme } from '@preview/instagram';

import { IG_SAMPLES, connection } from './samples-instagram';

export function InstagramDemo() {
  const [sampleId, setSampleId] = useState(IG_SAMPLES[0]!.id);
  const [theme, setTheme] = useState<InstagramTheme>('light');

  const sample = IG_SAMPLES.find((s) => s.id === sampleId) ?? IG_SAMPLES[0]!;
  const stageLight = theme !== 'dark';

  return (
    <>
      <div className="group">
        <div className="group-label">Post kind</div>
        <div className="seg">
          {IG_SAMPLES.map((s) => (
            <button
              key={s.id}
              className={s.id === sampleId ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setSampleId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <div className="group-label">Theme</div>
        <div className="seg">
          {(['light', 'dark', 'auto'] as const).map((t) => (
            <button
              key={t}
              className={t === theme ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <pre className="json">{JSON.stringify(sample.variant, null, 2)}</pre>

      <div className={stageLight ? 'stage stage-light' : 'stage'}>
        <InstagramPostPreview
          variant={sample.variant}
          connection={connection}
          media={sample.media}
          verified
          theme={theme}
        />
      </div>
    </>
  );
}
