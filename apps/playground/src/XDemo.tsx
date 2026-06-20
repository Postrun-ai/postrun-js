import { useState } from 'react';

import { XPostPreview } from '@preview/x';

import { X_SAMPLES, author } from './samples-x';

type XTheme = 'light' | 'dark' | 'auto';

export function XDemo() {
  const [sampleId, setSampleId] = useState(X_SAMPLES[0]!.id);
  const [theme, setTheme] = useState<XTheme>('light');

  const sample = X_SAMPLES.find((s) => s.id === sampleId) ?? X_SAMPLES[0]!;
  const stageLight = theme !== 'dark';

  return (
    <>
      <div className="group">
        <div className="group-label">Post kind</div>
        <div className="seg">
          {X_SAMPLES.map((s) => (
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
        <XPostPreview
          variant={sample.variant}
          author={author}
          media={sample.media}
          quotedTweet={sample.quotedTweet}
          replyToHandle={sample.replyToHandle}
          theme={theme}
          style={{ width: 400 }}
        />
      </div>
    </>
  );
}
