import { imageExtension } from './uploads.controller';

describe('imageExtension', () => {
  it('detects supported formats by file content', () => {
    expect(imageExtension(Buffer.from([0xff, 0xd8, 0xff]))).toBe('jpg');
    expect(
      imageExtension(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe('png');
    expect(imageExtension(Buffer.from('GIF89a'))).toBe('gif');
  });

  it('rejects content that merely claims to be an image', () => {
    expect(imageExtension(Buffer.from('<script>alert(1)</script>'))).toBeNull();
  });
});
