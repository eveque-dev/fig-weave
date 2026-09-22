import { Composition } from "remotion";
import "@fontsource-variable/noto-sans-sc";
import "./index.css";
import { Promo } from "./Composition";
export const RemotionRoot = () => (
  <Composition
    id="FigWeavePromo"
    component={Promo}
    durationInFrames={960}
    fps={30}
    width={1920}
    height={1080}
  />
);
