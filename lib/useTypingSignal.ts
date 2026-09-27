import { useEffect } from "react";

interface TypingSignalOptions {
  /** No signal at all when there is no channel to send it on. */
  broadcast: (() => void) | null;
  /** True while there is un-sent text. This is the "someone is typing" flag. */
  active: boolean;
  /**
   * How often to re-send while `active` stays true.
   *
   * Not a debounce: a debounce would only send once typing stopped, which is
   * exactly the moment the indicator is no longer wanted. A heartbeat keeps
   * the remote bubble alive through the natural pauses in a long message, and
   * bounds the cost to one small broadcast every few seconds however fast
   * somebody types. The remote side expires the indicator on its own timeout,
   * so the last beat not being delivered is harmless.
   */
  heartbeatMs?: number;
}

/**
 * Broadcasts a "typing" signal while `active` is true.
 *
 * Wrapped in a hook because both chat surfaces need it and the failure mode of
 * getting it wrong is subtle and identical on each: a per-keystroke broadcast
 * floods the channel, a debounced one never arrives in time, and either way the
 * indicator flickers instead of holding steady.
 *
 * The timer is torn down whenever `active` flips false, so stopping to think
 * stops the signal, and the remote side's idle timeout clears the bubble.
 */
export function useTypingSignal({ broadcast, active, heartbeatMs = 3000 }: TypingSignalOptions): void {
  useEffect(() => {
    if (!broadcast || !active) return;

    // Tracked so a single teardown clears the whole chain, including the beat
    // that is in flight when the effect re-runs.
    const timers = new Set<number>();

    const send = () => {
      broadcast();
      timers.add(window.setTimeout(send, heartbeatMs));
    };

    send();

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, [active, broadcast, heartbeatMs]);
}
