// The app-wide aurora (three drifting blurred blobs, CSS only). Do not create a second aurora implementation.
export function Aurora() {
  return (
    <>
      <div className="aurora" aria-hidden>
        <div className="aurora__blob aurora__blob--a" />
        <div className="aurora__blob aurora__blob--b" />
        <div className="aurora__blob aurora__blob--c" />
      </div>
      <div className="grain" aria-hidden />
    </>
  )
}
