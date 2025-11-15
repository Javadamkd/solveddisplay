type Unsubscribe = () => void;

export function initViewerBroadcast(
  onProgram: (payload: { program_name: string; section: string }) => void,
  onResult: (payload: { program_name: string; section: string; result: any }) => void
): Unsubscribe | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const channel = new BroadcastChannel('result-display');
  const handler = (evt: MessageEvent) => {
    const msg = evt.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'DISPLAY_PROGRAM') {
      onProgram(msg.payload);
    } else if (msg.type === 'DISPLAY_RESULT') {
      onResult(msg.payload);
    }
  };
  channel.addEventListener('message', handler);
  return () => channel.close();
}

export function broadcastShowProgram(payload: { program_name: string; section: string }) {
  if (typeof BroadcastChannel === 'undefined') return;
  new BroadcastChannel('result-display').postMessage({ type: 'DISPLAY_PROGRAM', payload });
}

export function broadcastShowResult(payload: { program_name: string; section: string; result: any }) {
  if (typeof BroadcastChannel === 'undefined') return;
  new BroadcastChannel('result-display').postMessage({ type: 'DISPLAY_RESULT', payload });
}