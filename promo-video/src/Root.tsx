import { Composition } from "remotion";
import "@fontsource-variable/noto-sans-sc";
import "./index.css";
import { Promo } from "./Composition";
import timing from "../timing.json";
export const RemotionRoot = () => (
  <Composition
    id="FigWeavePromo"
    component={Promo}
    durationInFrames={timing.coverFrames + timing.contentFrames}
    fps={timing.fps}
    width={1920}
    height={1080}
  />
);
