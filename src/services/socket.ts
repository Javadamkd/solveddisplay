import { SocketEvent, DisplayProgramPayload, DisplayResultPayload } from '../types';

type Unsubscribe = () => void;

export function initViewerSocket(
  onProgram: (payload: DisplayProgramPayload) => void,
  onResult: (payload: DisplayResultPayload) => void
): Unsubscribe | null {
  const enableWs = (import.meta.env.VITE_ENABLE_WS ?? 'false') === 'true';
  const wsUrl = import.meta.env.VITE_WS_URL as string | undefined;
  if (!enableWs || !wsUrl) return null;

  const ws = new WebSocket(wsUrl);
  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === SocketEvent.DISPLAY_PROGRAM) {
        onProgram(msg.payload as DisplayProgramPayload);
      } else if (msg.type === SocketEvent.DISPLAY_RESULT) {
        onResult(msg.payload as DisplayResultPayload);
      }
    } catch (e) {
      console.error('WS message parse error', e);
    }
  };

  ws.onerror = (e) => console.warn('WS error (non-blocking)', e);
  ws.onclose = () => console.log('WS closed');

  return () => {
    try { ws.close(); } catch {}
  };
}