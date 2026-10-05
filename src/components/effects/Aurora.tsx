// The app-wide aurora (three drifting blurred blobs, CSS only) lives in components/Page.tsx and is re-exported here
// so effects have one import path. Do not create a second aurora implementation.
export { Aurora } from '../Page'
