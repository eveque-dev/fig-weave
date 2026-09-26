import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  cancelRender,
  Sequence,
  Html5Audio,
  useCurrentFrame,
} from "remotion";
import { Hook } from "./scenes/Hook";
import { Direct } from "./scenes/Direct";
import { Edit } from "./scenes/Edit";
import { Code } from "./scenes/Code";
import { Engines } from "./scenes/Engines";
import { Closing } from "./scenes/Closing";
export const Promo = ({ silent = false }: { silent?: boolean }) => {
  const [handle] = useState(() => delayRender("Loading bundled Chinese fonts"));
  const f = useCurrentFrame();
  useEffect(() => {
    Promise.all(Array.from(document.fonts).map((font) => font.load()))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(cancelRender);
  }, [handle]);
  return (
    <AbsoluteFill data-video-frame={f}>
      <Sequence durationInFrames={240}>
        <Hook />
      </Sequence>
      <Sequence from={240} durationInFrames={75}>
        <Direct />
      </Sequence>
      <Sequence from={315} durationInFrames={285}>
        <Edit />
      </Sequence>
      <Sequence from={600} durationInFrames={180}>
        <Code />
      </Sequence>
      <Sequence from={780} durationInFrames={90}>
        <Engines />
      </Sequence>
      <Sequence from={870} durationInFrames={90}>
        <Closing />
      </Sequence>
      {!silent && <Html5Audio src={staticFile("sfx.wav")} />}
    </AbsoluteFill>
  );
};
