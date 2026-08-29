"use client";
/**
 * Reveals `.reveal` sections as they scroll into view.
 *
 * The whole design follows from one rule: this component may only ever make
 * content *visible*, never permanently hide it. It has already blanked real
 * page content three times — a CSS `animation-timeline: view()` version
 * stranded a section taller than the viewport at half opacity; an observer
 * with a negative rootMargin never met its threshold on another; and a version
 * that scanned once on mount missed the announcements band entirely, because
 * that section only renders after its fetch resolves and so did not exist yet.
 *
 * The fix for the whole class of bug is to invert what the CSS keys off. An
 * element is hidden only once JavaScript has *armed* it — added `reveal-armed`
 * in the same breath as starting to watch it. So an element that this
 * component never sees, for any reason at all, simply renders visible. The
 * worst failure available is a missing fade.
 *
 * On top of that:
 *   • anything at or above the fold is revealed immediately, so a reload
 *     part-way down a page never shows a blank viewport;
 *   • a MutationObserver arms sections that mount later, so they still fade;
 *   • a backstop timer reveals everything after REVEAL_ALL_MS regardless.
 */
import { useEffect } from "react";

/** After this, every armed section is shown regardless of scroll state. */
const REVEAL_ALL_MS = 2500;
/** How long to keep watching for late-mounting sections. */
const WATCH_FOR_LATE_MS = 10_000;

export default function ScrollReveal() {
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const armed = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          // One-way: re-hiding on the way back up reads as a glitch.
          observer.unobserve(entry.target);
        }
      },
      // threshold 0 and no rootMargin. Trimming the root shrinks the
      // intersection rectangle, and a section taller than the viewport can
      // then never reach a ratio threshold — which is how one stayed hidden.
      { threshold: 0 }
    );

    /** Take an element under management: hide it, then arrange to show it. */
    const arm = (el: Element) => {
      if (armed.has(el)) return;
      armed.add(el);

      // Arming and deciding happen in the same tick, so a section that is
      // already on screen never flashes hidden before being revealed.
      el.classList.add("reveal-armed");

      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.classList.add("is-revealed");
        return;
      }

      observer.observe(el);
    };

    const armAll = () => document.querySelectorAll(".reveal").forEach(arm);
    armAll();

    // Sections gated behind a fetch (the announcements band, for one) appear
    // after this effect has already run. Without this they would be armed by
    // nothing and observed by nothing.
    const mutations = new MutationObserver(armAll);
    mutations.observe(document.body, { childList: true, subtree: true });
    const stopWatching = window.setTimeout(() => mutations.disconnect(), WATCH_FOR_LATE_MS);

    /**
     * Drop an element out of the effect entirely.
     *
     * Removing `reveal-armed` — rather than adding `is-revealed` — is what
     * makes this reliable: it deletes the hidden state outright instead of
     * transitioning away from it. Browsers freeze CSS transitions in a
     * background tab, so a page loaded in one and revealed via a transition
     * stays at opacity 0 until it is looked at. Un-arming needs no transition
     * to run, so the content is simply there.
     */
    const unarm = (el: Element) => {
      el.classList.remove("reveal-armed");
      el.classList.remove("is-revealed");
    };

    // Backstop: whatever went wrong above, the content ends up on screen.
    const failsafe = window.setTimeout(() => {
      armed.forEach(unarm);
      observer.disconnect();
    }, REVEAL_ALL_MS);

    return () => {
      window.clearTimeout(failsafe);
      window.clearTimeout(stopWatching);
      mutations.disconnect();
      observer.disconnect();
      // Never leave anything hidden behind us. React's dev double-invoke runs
      // this cleanup between two mounts, and content must survive that.
      armed.forEach(unarm);
    };
  }, []);

  return null;
}
