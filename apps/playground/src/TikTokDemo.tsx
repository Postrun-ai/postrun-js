import { useMemo, useState } from 'react';

import { defaultTikTokOptions, tiktokSettings } from '@postrun/js';
import type { TikTokOptionsValue } from '@postrun/js';
import {
  TikTokPostPreview,
  TikTokPublishPanel,
  type TikTokTheme,
} from '@preview/tiktok';

import { SAMPLES, creatorInfo } from './samples';

export function TikTokDemo() {
  const [sampleId, setSampleId] = useState(SAMPLES[0]!.id);
  const [caption, setCaption] = useState(SAMPLES[0]!.variant.body ?? '');
  const [options, setOptions] = useState<TikTokOptionsValue>(defaultTikTokOptions);
  const [theme, setTheme] = useState<TikTokTheme>('dark');
  const [posted, setPosted] = useState<string | null>(null);

  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0]!;
  const isVideo = sample.postType === 'video';

  function pickSample(id: string) {
    const next = SAMPLES.find((s) => s.id === id) ?? SAMPLES[0]!;
    setSampleId(id);
    setCaption(next.variant.body ?? '');
    setOptions(defaultTikTokOptions());
    setPosted(null);
  }

  const variant = useMemo(
    () => ({
      ...sample.variant,
      body: caption,
      settings: tiktokSettings(options, isVideo),
    }),
    [sample.variant, caption, options, isVideo],
  );

  const panelLight = theme === 'light';

  return (
    <>
      <div className="group">
        <div className="group-label">Sample post</div>
        <div className="seg">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              className={s.id === sampleId ? 'seg-btn active' : 'seg-btn'}
              onClick={() => pickSample(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <div className="group-label">Panel theme</div>
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

      {posted ? <div className="posted">Posted ✓ ({posted})</div> : null}

      <pre className="json">{JSON.stringify(variant, null, 2)}</pre>

      <div className="stage">
        <TikTokPostPreview
          variant={variant}
          creatorInfo={creatorInfo}
          media={sample.media}
        />
        <div className={panelLight ? 'panel panel-light' : 'panel'}>
          <TikTokPublishPanel
            variant={variant}
            postType={sample.postType}
            creatorInfo={creatorInfo}
            caption={caption}
            onCaptionChange={setCaption}
            options={options}
            onOptionsChange={setOptions}
            theme={theme}
            onPost={() => setPosted(new Date().toLocaleTimeString())}
          />
        </div>
      </div>
    </>
  );
}
