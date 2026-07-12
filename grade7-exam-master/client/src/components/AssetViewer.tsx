import { useState } from 'react';
import { useDB } from '../App';
import { getAsset, withBase } from '../lib/database';

// Displays the actual image for an asset. A written description is shown
// ONLY as a fallback when the image file is genuinely unavailable — never
// in place of a real image.
export default function AssetViewer({ assetId }: { assetId: string | null | undefined }) {
  const { db } = useDB();
  const [loadFailed, setLoadFailed] = useState(false);

  if (!assetId || !db) return null;
  const asset = getAsset(db, assetId);
  if (!asset) {
    return (
      <div className="border border-flagred/40 bg-red-50 text-flagred rounded-lg p-3 text-sm">
        Image not available. Please check assets folder. (Unknown asset id: {assetId})
      </div>
    );
  }

  const showImage = !asset.missingImage && !loadFailed;

  return (
    <figure className="my-3 border border-line rounded-lg overflow-hidden bg-white">
      <div className="font-mono text-[11px] tracking-widest uppercase text-eagle-dark bg-eagle-pale px-3 py-1.5 border-b border-line flex items-center justify-between gap-2">
        <span>{asset.type}</span>
        <span className="text-ink/50">{asset.id}</span>
      </div>
      {showImage ? (
        <img
          src={withBase(asset.path)}
          alt={asset.title}
          className="w-full h-auto max-h-[480px] object-contain bg-white"
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <div className="p-4">
          <p className="text-sm font-semibold text-flagred">
            Image not available. Please check assets folder.
          </p>
          <p className="text-xs text-ink/50 font-mono mt-1">Expected file: {asset.fileName}</p>
          {asset.description && (
            <p className="text-sm text-ink/80 mt-3 border-l-4 border-copper pl-3">
              <span className="font-semibold">What this shows: </span>
              {asset.description}
            </p>
          )}
        </div>
      )}
      {showImage && asset.title && (
        <figcaption className="text-xs text-ink/60 px-3 py-2 border-t border-line">{asset.title}</figcaption>
      )}
    </figure>
  );
}
