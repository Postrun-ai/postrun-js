import { describe, expect, test } from 'vitest';
import type { AwsS3Part } from '@uppy/aws-s3';

import { listedPartsToS3, s3PartsToComplete } from './casing';

describe('listedPartsToS3 (API snake_case → Uppy S3 PascalCase)', () => {
  test('maps every field, preserving order', () => {
    const listed = [
      { part_number: 1, etag: '"abc"', size: 8_388_608 },
      { part_number: 2, etag: '"def"', size: 4_096 },
    ];

    expect(listedPartsToS3(listed)).toEqual([
      { PartNumber: 1, ETag: '"abc"', Size: 8_388_608 },
      { PartNumber: 2, ETag: '"def"', Size: 4_096 },
    ]);
  });

  test('an empty list maps to an empty array (a fresh upload, nothing to resume)', () => {
    expect(listedPartsToS3([])).toEqual([]);
  });
});

describe('s3PartsToComplete (Uppy S3 PascalCase → API snake_case)', () => {
  test('maps PartNumber/ETag, dropping Size (the complete body omits it)', () => {
    const parts: AwsS3Part[] = [
      { PartNumber: 1, ETag: '"abc"', Size: 8_388_608 },
      { PartNumber: 2, ETag: '"def"', Size: 4_096 },
    ];

    expect(s3PartsToComplete(parts)).toEqual([
      { part_number: 1, etag: '"abc"' },
      { part_number: 2, etag: '"def"' },
    ]);
  });

  test('throws on a part missing PartNumber/ETag — never silently drops it', () => {
    expect(() => s3PartsToComplete([{ ETag: '"abc"' }])).toThrow(
      /PartNumber\/ETag/,
    );
    expect(() => s3PartsToComplete([{ PartNumber: 1 }])).toThrow(
      /PartNumber\/ETag/,
    );
  });
});

describe('round-trip', () => {
  test('listed → S3 → complete drops Size but keeps part_number/etag', () => {
    const listed = [{ part_number: 3, etag: '"xyz"', size: 100 }];
    expect(s3PartsToComplete(listedPartsToS3(listed))).toEqual([
      { part_number: 3, etag: '"xyz"' },
    ]);
  });
});
