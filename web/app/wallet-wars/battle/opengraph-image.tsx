import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GleanAI Wallet Wars Challenge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#05060a',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(39,255,125,0.2), transparent 60%)',
          color: '#e7ece5',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 10,
            color: '#7d8694',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          WALLET WARS · GLEANAI
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            marginTop: 28,
            color: '#39ff7a',
            lineHeight: 1.1,
            textAlign: 'center',
            display: 'flex',
          }}
        >
          CHALLENGE ACCEPTED
        </div>
        <div
          style={{
            fontSize: 32,
            marginTop: 28,
            color: '#e7ece5',
            letterSpacing: 2,
            display: 'flex',
          }}
        >
          Scan your wallet. Fight.
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#7d8694',
            letterSpacing: 4,
            display: 'flex',
          }}
        >
          gleanai.xyz
        </div>
      </div>
    ),
    { ...size }
  );
}
