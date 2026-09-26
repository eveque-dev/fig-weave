import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import "@fontsource-variable/noto-sans-sc";
import "./index.css";
import { Promo } from "./Composition";
import timing from "../timing.json";
declare global {
  interface Window {
    figweavePlayer: PlayerRef | null;
  }
}
createRoot(document.getElementById("root")!).render(
  <Player
    ref={(ref) => {
      window.figweavePlayer = ref;
    }}
    component={Promo}
    inputProps={{ silent: true }}
    durationInFrames={timing.coverFrames + timing.contentFrames}
    compositionWidth={1920}
    compositionHeight={1080}
    fps={timing.fps}
    controls={false}
    autoPlay={false}
    acknowledgeRemotionLicense
    style={{ width: 1920, height: 1080 }}
  />,
);
