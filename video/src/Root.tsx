import { Composition } from 'remotion'
import { DURATION, Film } from './Film'
import { FPS, H, W } from './kit'

export function Root() {
  return <Composition id="PlacementIQFilm" component={Film} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
}
