import { useState } from 'react';

import { LinkedInPostPreview } from '@preview/linkedin';
import type { LinkedInTheme } from '@preview/linkedin/theme';

import { LI_SAMPLES, author } from './samples-linkedin';

export function LinkedInDemo() {
  const [sampleId, setSampleId] = useState(LI_SAMPLES[0]!.id);
  const [theme, setTheme] = useState<LinkedInTheme>('light');

  const sample = LI_SAMPLES.find((s) => s.id === sampleId) ?? LI_SAMPLES[0]!;
  const stageLight = theme === 'light';

  return (
    <>
      <div className="group">
        <div className="group-label">Content kind</div>
        <div className="seg">
          {LI_SAMPLES.map((s) => (
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
        <LinkedInPostPreview
          variant={sample.variant}
          author={author}
          media={sample.media}
          theme={theme}
        />
      </div>
    </>
  );
}
