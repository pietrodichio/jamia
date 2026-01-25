/**
 * Supabase Storage image transformation utilities
 * Uses Supabase's image transformation API for on-the-fly optimization
 */

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Extracts the file path from a Supabase Storage public URL
 *
 * @param url - Full Supabase Storage public URL
 * @param bucket - The bucket name to extract the path for
 * @returns The file path/name, or null if URL doesn't match expected format
 *
 * @example
 * extractPathFromUrl('http://127.0.0.1:54421/storage/v1/object/public/event-images/abc123.jpg', 'event-images')
 * // Returns: 'abc123.jpg'
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url);
    // Match pattern: /storage/v1/object/public/{bucket}/{path}
    // Escape bucket name for regex (though it shouldn't have special chars)
    const escapedBucket = bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = urlObj.pathname.match(
      new RegExp(`^/storage/v1/object/public/${escapedBucket}/(.+)$`)
    );
    if (match && match[1]) {
      // Decode any URL-encoded characters in the path
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch (error) {
    console.warn('Failed to extract path from URL:', url, error);
    return null;
  }
}

/**
 * Generates an optimized image URL using Supabase Storage transformations
 *
 * @param bucket - The Supabase storage bucket name (e.g., 'event-images')
 * @param path - The image file path/name in the bucket
 * @param options - Transformation options (width, height, quality, resize mode)
 * @returns Optimized image URL with transformation parameters
 *
 * @example
 * // Thumbnail for card (400px width, 80% quality)
 * getOptimizedImageUrl('event-images', 'abc123.jpg', { width: 400, quality: 80 })
 *
 * @example
 * // Full size hero image (1200px width, 90% quality)
 * getOptimizedImageUrl('event-images', 'abc123.jpg', { width: 1200, quality: 90 })
 */
export function getOptimizedImageUrl(
  bucket: string,
  path: string,
  options: ImageTransformOptions = {}
): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('VITE_SUPABASE_URL not configured, returning path as-is');
    return path;
  }

  // Construct Supabase render endpoint
  const baseUrl = `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${path}`;

  // Build query parameters
  const params = new URLSearchParams();

  if (options.width) {
    params.set('width', options.width.toString());
  }

  if (options.height) {
    params.set('height', options.height.toString());
  }

  if (options.quality !== undefined) {
    params.set('quality', options.quality.toString());
  } else {
    // Default quality: 80
    params.set('quality', '80');
  }

  if (options.resize) {
    params.set('resize', options.resize);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Generates srcSet for responsive images with multiple widths
 *
 * @param bucket - The Supabase storage bucket name
 * @param path - The image file path/name in the bucket
 * @param widths - Array of widths for different screen sizes
 * @param quality - Image quality (default: 80)
 * @returns srcSet string for use in img elements
 *
 * @example
 * <img
 *   src={getOptimizedImageUrl('event-images', 'image.jpg', { width: 400 })}
 *   srcSet={getResponsiveSrcSet('event-images', 'image.jpg', [400, 800, 1200])}
 *   sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
 * />
 */
export function getResponsiveSrcSet(
  bucket: string,
  path: string,
  widths: number[] = [400, 800, 1200],
  quality: number = 80
): string {
  return widths
    .map(width => {
      const url = getOptimizedImageUrl(bucket, path, { width, quality });
      return `${url} ${width}w`;
    })
    .join(', ');
}
