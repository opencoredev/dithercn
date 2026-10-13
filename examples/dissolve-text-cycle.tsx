"use client";

import { useEffect, useState } from "react";

import { DissolveText } from "@/components/dithercn/dissolve-text";

const WORDS = ["dashboards", "landing pages", "launch posts", "status pages"];
const HOLD = 2600;
const EXIT = 520;

export default function DissolveTextCycle() {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (show) {
          setShow(false);
        } else {
          setIndex((value) => (value + 1) % WORDS.length);
          setShow(true);
        }
      },
      show ? HOLD : EXIT
    );
    return () => clearTimeout(timer);
  }, [show]);

  return (
    <p className="px-6 text-center text-3xl leading-tight font-semibold tracking-[-0.04em] sm:text-5xl">
      <span className="text-muted-foreground">Dithers for</span>
      <br />
      <DissolveText
        key={index}
        show={show}
        trigger="mount"
        duration={440}
        stagger={22}
        className="text-dither-ink"
      >
        {WORDS[index] ?? ""}
      </DissolveText>
    </p>
  );
}
