import { useEffect, useMemo, useState } from 'react';
import { askWorldAssistant } from '../../core/api/assistantApi';
import { useLiveDataStore } from '../../store/liveDataStore';
import { useTimelineStore } from '../../store/timelineStore';
import { useUiStore } from '../../store/uiStore';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
}

export default function WorldAssistantPanel() {
  const assistantOpen = useUiStore((state) => state.assistantOpen);
  const toggleAssistant = useUiStore((state) => state.toggleAssistant);
  const timeline = useTimelineStore();
  const selectedLocationName = useLiveDataStore((state) => state.selectedLocationName);
  const selectedLocationLat = useLiveDataStore((state) => state.selectedLocationLat);
  const selectedLocationLon = useLiveDataStore((state) => state.selectedLocationLon);
  const [input, setInput] = useState('What is happening on the globe right now?');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Ask about live flights, satellites, maritime traffic, cables, hazards, weather, or the current timeline window.',
      meta: 'read-only analyst',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const contextPayload = useMemo(() => ({
    mode: timeline.mode,
    currentTime: new Date(timeline.currentTimeMs).toISOString(),
  }), [timeline.currentTimeMs, timeline.mode]);

  useEffect(() => {
    if (!assistantOpen || messages.length > 1) return;
    void submitPrompt('Summarize the current live world view.', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantOpen]);

  if (!assistantOpen) return null;

  async function submitPrompt(prompt = input, silent = false) {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    const controller = new AbortController();
    setLoading(true);
    if (!silent) {
      setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    }

    try {
      const response = await askWorldAssistant({
        message: trimmed,
        timeline: contextPayload,
        location: {
          name: selectedLocationName,
          latitude: selectedLocationLat,
          longitude: selectedLocationLon,
        },
      }, controller.signal);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: response.answer,
          meta: response.model ? `${response.provider} / ${response.model}` : response.provider,
        },
      ]);
      setInput('');
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Assistant request failed.',
          meta: 'offline',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="world-assistant god-glass">
      <header>
        <div>
          <span className="god-kicker">World Intelligence</span>
          <strong>Globe Analyst</strong>
        </div>
        <button type="button" onClick={toggleAssistant}>Close</button>
      </header>
      <div className="assistant-feed">
        {messages.map((message, index) => (
          <article className={`assistant-message is-${message.role}`} key={`${message.role}-${index}`}>
            <p>{message.text}</p>
            {message.meta ? <span>{message.meta}</span> : null}
          </article>
        ))}
        {loading ? <article className="assistant-message is-assistant"><p>Reading live/database context...</p></article> : null}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitPrompt();
        }}
      >
        <textarea
          value={input}
          placeholder="Ask what changed, what is risky, or what to inspect next..."
          onChange={(event) => setInput(event.target.value)}
        />
        <div>
          <span>{timeline.mode} / {selectedLocationName}</span>
          <button disabled={loading || !input.trim()} type="submit">Ask</button>
        </div>
      </form>
    </aside>
  );
}
