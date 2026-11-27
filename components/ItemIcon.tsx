'use client';

import { itemTexture } from '@/lib/images';
import { cn } from '@/lib/utils';

// no texture for it (the server already tried the block's): the slot stays empty rather than showing a broken image
const hide = (img: HTMLImageElement) => { img.style.visibility = 'hidden'; };

/** A material's 1.21 texture (the item's, else the block's: app/img/[...path]/route.ts), else nothing. */
export default function ItemIcon({ id, className }: { id: string; className?: string }) {
  return (
    <img
      // a new element per material, so one item's hidden image doesn't carry over to the next in the same slot
      key={id}
      className={cn('pixelated size-5', className)}
      src={itemTexture(id)}
      alt=""
      // an image that failed before the page woke up never fires onError, so check it once on mount
      ref={img => { if (img?.complete && !img.naturalWidth) hide(img); }}
      onError={e => hide(e.currentTarget)}
    />
  );
}
