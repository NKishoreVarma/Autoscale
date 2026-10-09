import React, { useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import "./TargetCursor.css";

const TargetCursor = ({
  targetSelector = ".cursor-target",
  hideDefaultCursor = true,
  snapDuration = 0.18,
}) => {
  const cursorRef = useRef(null);
  const rotWrapperRef = useRef(null);
  const cornersRef = useRef(null);
  const dotRef = useRef(null);

  const centerRef = useRef({ x: 0, y: 0 });
  const activeTargetRef = useRef(null);

  const constants = useMemo(
    () => ({
      borderWidth: 2,
      cornerSize: 12,
      parallaxStrength: 0.00005,
    }),
    []
  );

  useEffect(() => {
    // Only run on non-touch devices with fine pointers
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    if (!cursorRef.current) return;

    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor && window.innerWidth >= 1024) {
      document.body.style.cursor = "none";
    }

    const cursor = cursorRef.current;
    const rotWrapper = rotWrapperRef.current;
    cornersRef.current = cursor.querySelectorAll(".target-cursor-corner");

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    // Start hardware-accelerated CSS rotation
    if (rotWrapper) {
      rotWrapper.classList.add("target-cursor-spin-active");
    }

    // High performance quickTo setters (zero garbage collection overhead)
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.1, ease: "power3.out" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.1, ease: "power3.out" });

    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;
    let tick = false;

    const updateCursorPosition = () => {
      if (activeTargetRef.current) {
        const { x, y } = centerRef.current;
        xTo(x);
        yTo(y);
      } else {
        xTo(clientX);
        yTo(clientY);
      }
      tick = false;
    };

    const onMove = (e) => {
      clientX = e.clientX;
      clientY = e.clientY;
      if (!tick) {
        requestAnimationFrame(updateCursorPosition);
        tick = true;
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let scrollTick = false;
    const onScroll = () => {
      if (scrollTick || !activeTargetRef.current) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        const target = activeTargetRef.current;
        if (target) {
          const r = target.getBoundingClientRect();
          const isVisible =
            r.bottom >= 0 &&
            r.top <= window.innerHeight &&
            r.right >= 0 &&
            r.left <= window.innerWidth;
          if (!isVisible) {
            leaveCurrentTarget();
          } else {
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            centerRef.current = { x: cx, y: cy };
            xTo(cx);
            yTo(cy);
          }
        }
        scrollTick = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const resetCorners = () => {
      if (!cornersRef.current) return;
      const { cornerSize } = constants;
      const positions = [
        { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
        { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
        { x: cornerSize * 0.5, y: cornerSize * 0.5 },
        { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
      ];
      const tl = gsap.timeline();
      Array.from(cornersRef.current).forEach((corner, i) => {
        tl.to(
          corner,
          { x: positions[i].x, y: positions[i].y, duration: 0.2, ease: "power3.out" },
          0
        );
      });
    };

    const updateCorners = (target, mouseX, mouseY) => {
      if (!cursorRef.current || !cornersRef.current) return;

      const rect = target.getBoundingClientRect();
      const cursorRect = cursorRef.current.getBoundingClientRect();
      const cursorCenterX = cursorRect.left + cursorRect.width / 2;
      const cursorCenterY = cursorRect.top + cursorRect.height / 2;

      const [tlc, trc, brc, blc] = Array.from(cornersRef.current);
      const { borderWidth, cornerSize, parallaxStrength } = constants;

      let tlOffset = { x: rect.left - cursorCenterX - borderWidth, y: rect.top - cursorCenterY - borderWidth };
      let trOffset = { x: rect.right - cursorCenterX + borderWidth - cornerSize, y: rect.top - cursorCenterY - borderWidth };
      let brOffset = { x: rect.right - cursorCenterX + borderWidth - cornerSize, y: rect.bottom - cursorCenterY + borderWidth - cornerSize };
      let blOffset = { x: rect.left - cursorCenterX - borderWidth, y: rect.bottom - cursorCenterY + borderWidth - cornerSize };

      if (mouseX !== undefined && mouseY !== undefined) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const ox = (mouseX - cx) * parallaxStrength;
        const oy = (mouseY - cy) * parallaxStrength;
        tlOffset.x += ox; tlOffset.y += oy;
        trOffset.x += ox; trOffset.y += oy;
        brOffset.x += ox; brOffset.y += oy;
        blOffset.x += ox; blOffset.y += oy;
      }

      const tl = gsap.timeline();
      [
        [tlc, tlOffset],
        [trc, trOffset],
        [brc, brOffset],
        [blc, blOffset],
      ].forEach(([corner, off]) => {
        tl.to(corner, { x: off.x, y: off.y, duration: 0.16, ease: "power2.out" }, 0);
      });
    };

    const enterTarget = (target) => {
      activeTargetRef.current = target;

      if (rotWrapper) {
        rotWrapper.classList.remove("target-cursor-spin-active");
        gsap.set(rotWrapper, { rotation: 0 });
      }

      const r = target.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      centerRef.current = { x: cx, y: cy };

      gsap.to(cursor, { x: cx, y: cy, duration: snapDuration, ease: "power3.out" });
      updateCorners(target);

      const onTargetMove = (ev) => {
        updateCorners(target, ev.clientX, ev.clientY);
      };

      const onLeave = () => {
        leaveCurrentTarget();
      };

      target.addEventListener("mousemove", onTargetMove, { passive: true });
      target.addEventListener("mouseleave", onLeave);

      target.__cursorDetach = () => {
        target.removeEventListener("mousemove", onTargetMove);
        target.removeEventListener("mouseleave", onLeave);
      };
    };

    const leaveCurrentTarget = () => {
      const target = activeTargetRef.current;
      if (!target) return;
      target.__cursorDetach?.();
      activeTargetRef.current = null;
      resetCorners();
      if (rotWrapper) {
        rotWrapper.classList.add("target-cursor-spin-active");
      }
    };

    const onOver = (e) => {
      const el = e.target;
      let cur = el;
      let match = null;
      while (cur && cur !== document.body) {
        if (cur.matches && cur.matches(targetSelector)) {
          match = cur;
          break;
        }
        cur = cur.parentElement;
      }
      if (!match) return;
      if (activeTargetRef.current === match) return;

      if (activeTargetRef.current) leaveCurrentTarget();
      enterTarget(match);
    };

    window.addEventListener("mouseover", onOver, { passive: true });

    const onDown = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.15 });
      gsap.to(cursor, { scale: 0.92, duration: 0.15 });
    };
    const onUp = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 1, duration: 0.15 });
      gsap.to(cursor, { scale: 1, duration: 0.15 });
    };
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      if (activeTargetRef.current) {
        activeTargetRef.current.__cursorDetach?.();
      }
      document.body.style.cursor = originalCursor;
    };
  }, [targetSelector, hideDefaultCursor, snapDuration, constants]);

  return (
    <div
      ref={cursorRef}
      className="hidden lg:block fixed top-0 left-0 w-0 h-0 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
      style={{ willChange: "transform" }}
      aria-hidden="true"
    >
      {/* Central White Dot */}
      <div
        ref={dotRef}
        className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: "transform" }}
      />
      {/* Rotating Corners Wrapper */}
      <div ref={rotWrapperRef} className="absolute left-0 top-0 w-0 h-0">
        {/* 4 Purple snap-corners */}
        <div className="target-cursor-corner absolute left-1/2 top-1/2 w-3 h-3 border-[2px] border-[#5E0ED7] -translate-x-[150%] -translate-y-[150%] border-r-0 border-b-0" />
        <div className="target-cursor-corner absolute left-1/2 top-1/2 w-3 h-3 border-[2px] border-[#5E0ED7] translate-x-1/2 -translate-y-[150%] border-l-0 border-b-0" />
        <div className="target-cursor-corner absolute left-1/2 top-1/2 w-3 h-3 border-[2px] border-[#5E0ED7] translate-x-1/2 translate-y-1/2 border-l-0 border-t-0" />
        <div className="target-cursor-corner absolute left-1/2 top-1/2 w-3 h-3 border-[2px] border-[#5E0ED7] -translate-x-[150%] translate-y-1/2 border-r-0 border-t-0" />
      </div>
    </div>
  );
};

export default TargetCursor;
