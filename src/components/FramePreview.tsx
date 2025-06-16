
"use client";

import Image from 'next/image';

interface FramePreviewProps {
  frameDataUrl?: string | null;
  altText?: string;
  size?: number; // Simple size control, e.g., width in pixels
}

export default function FramePreview({ frameDataUrl, altText = "Frame Preview", size = 100 }: FramePreviewProps) {
  return (
    <div 
      className="border bg-muted overflow-hidden flex items-center justify-center"
      style={{ width: `${size}px`, height: `${size * (9/16)}px` }} // Assuming 16:9 aspect ratio for preview
    >
      {frameDataUrl ? (
        <Image
          src={frameDataUrl}
          alt={altText}
          width={size}
          height={size * (9/16)}
          objectFit="contain"
          data-ai-hint="animation frame thumbnail"
        />
      ) : (
        <Image
          src={`https://placehold.co/${size}x${Math.round(size * (9/16))}.png?text=No+Preview`}
          alt="Placeholder frame preview"
          width={size}
          height={size * (9/16)}
          objectFit="contain"
          data-ai-hint="placeholder frame thumbnail"
        />
      )}
    </div>
  );
}
