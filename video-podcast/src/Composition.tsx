import {Composition} from "remotion";
import timeline from "../public/timeline.json";
import {JustBashPodcast} from "./Podcast";

export const FPS = 30;
export const TOTAL_FRAMES = Math.ceil((timeline.durationMs / 1000) * FPS);

export const MyComposition = () => (
  <Composition
    id="JustBashPodcast"
    component={JustBashPodcast}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
