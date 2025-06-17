// This file is intentionally left minimal to resolve a Next.js routing conflict
// with the [projectId] dynamic segment at the same path level.
// By not exporting a default React component, Next.js should not treat this
// as an active page for the `[canvasId]` segment.
// Ideally, this file and its parent directory ([canvasId]) should be deleted.
export {};
