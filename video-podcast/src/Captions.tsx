import type {Caption} from "@remotion/captions";
import React from "react";
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import captionData from "../public/captions/captions.json";

const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};

const CaptionPage: React.FC<{caption: Caption}> = ({caption}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", paddingBottom: 56, pointerEvents: "none"}}>
      <div
        style={{
          maxWidth: 1420,
          padding: "18px 34px 20px",
          borderRadius: 20,
          background: "rgba(5,7,12,.9)",
          border: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 18px 60px rgba(0,0,0,.45)",
          fontSize: 43,
          lineHeight: 1.28,
          fontWeight: 650,
          textAlign: "center",
          color: "#f7f8ff",
          opacity: interpolate(frame, [0, 6], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)}),
          translate: `0 ${interpolate(frame, [0, 7], [12, 0], clamp)}px`,
        }}
      >
        {caption.text}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC = () => {
  const {fps} = useVideoConfig();
  const captions = captionData as Caption[];
  return (
    <AbsoluteFill>
      {captions.map((caption, index) => {
        const from = Math.round((caption.startMs / 1000) * fps);
        const until = Math.round((caption.endMs / 1000) * fps);
        return (
          <Sequence key={`${caption.startMs}-${index}`} from={from} durationInFrames={Math.max(1, until - from)}>
            <CaptionPage caption={caption} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
