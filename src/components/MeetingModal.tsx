import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Megaphone, Send, ShieldAlert, SkipForward } from 'lucide-react';
import { ROOM_BY_ID } from '../../shared/mapData';
import type { MeetingState, RoomSnapshot } from '../../shared/types';
import { soundEngine } from '../game/sound';
import { CrewPortrait } from './CrewPortrait';
import { SUITS } from './LobbyView';
import './dock.css';

interface MeetingModalProps {
  snapshot: RoomSnapshot;
  onVote: (targetId: string | 'skip') => void;
  onSendChat: (text: string) => void;
}

const QUICK_PHRASES = [
  'Где нашли?',
  'Я делал задание',
  'Пропуск — мало улик',
  'Проверьте Эхо датчика',
];

export function MeetingModal(props: MeetingModalProps) {
  const meeting = props.snapshot.meeting;
  return meeting ? <MeetingSession key={meeting.id} {...props} meeting={meeting} /> : null;
}

function MeetingSession({
  snapshot,
  meeting,
  onVote,
  onSendChat,
}: MeetingModalProps & { meeting: MeetingState }) {
  const [draft, setDraft] = useState('');
  const [selection, setSelection] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const [clockOffset] = useState(() => snapshot.serverTime - Date.now());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const followChat = useRef(true);
  const ballotStatusRef = useRef<HTMLParagraphElement>(null);
  const lastTickSecRef = useRef<number | null>(null);
  const playedVerdictRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    headingRef.current?.focus();
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      window.clearInterval(id);
      dialog?.close();
    };
  }, []);

  const lastMessageId = meeting.chat.at(-1)?.id;
  useEffect(() => {
    if (followChat.current && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [lastMessageId]);

  const me = snapshot.players.find((player) => player.id === snapshot.self.playerId);
  const result = meeting.result;
  const seconds = Math.max(
    0,
    Math.ceil(((result ? meeting.resolveAt ?? now + clockOffset : meeting.endsAt) - (now + clockOffset)) / 1000),
  );

  // Subtle countdown ticks in the final 10 seconds of voting
  useEffect(() => {
    if (result || seconds <= 0 || seconds > 10) return;
    if (lastTickSecRef.current !== seconds) {
      lastTickSecRef.current = seconds;
      soundEngine.playCountdownTick(seconds <= 3);
    }
  }, [result, seconds]);

  // Play verdict sting once when voting resolves
  useEffect(() => {
    if (!result || playedVerdictRef.current) return;
    playedVerdictRef.current = true;
    if (result.outcome === 'ejected') soundEngine.playVerdictEject();
    else soundEngine.playVerdictSkip();
  }, [result]);

  const canChat = Boolean(me?.status === 'alive' && me.connected && !result && seconds > 0);
  const voters = snapshot.players.filter((player) => player.connected && player.status === 'alive');
  const votedCount = voters.filter((player) => meeting.votedPlayerIds.includes(player.id)).length;
  const hasVoted = meeting.myVote !== null;
  const submitting = sentAt !== null && now - sentAt < 3500;
  const canPick = canChat && !hasVoted && !submitting;
  const picked = meeting.myVote ?? selection;
  const selectedPlayer = snapshot.players.find(({ id }) => id === picked && id !== 'skip');
  const validSelection = selection === 'skip' || selectedPlayer?.status === 'alive';
  const choiceLabel = picked === 'skip' ? 'Пропустить голосование' : selectedPlayer?.name;
  const victimRoom = meeting.victimRoomId ? ROOM_BY_ID[meeting.victimRoomId].name : 'Коридор';

  const totalCastVotes = result
    ? Object.values(result.tallies).reduce((acc, n) => acc + n, 0) + result.skipVotes
    : 0;

  let resultHeadline = 'Голосование пропущено. Никто не выбывает.';
  let resultSubtext = '';
  if (result?.outcome === 'ejected') {
    resultHeadline = `За борт отправлен: ${result.ejectedPlayerName ?? 'участник'}`;
    if (result.ejectedRole === 'saboteur') {
      resultSubtext = 'Подтверждено: это был саботажник!';
    } else if (result.ejectedRole === 'crew') {
      resultSubtext = 'Подтверждено: это был мирный член экипажа.';
    } else if (!snapshot.settings.confirmEjects) {
      resultSubtext = 'Роль исключённого скрыта правилами комнаты.';
    }
  } else if (result?.outcome === 'tie') {
    resultHeadline = 'Голоса разделились поровну. Никто не выбывает.';
  }

  const handleConfirm = (event: FormEvent) => {
    event.preventDefault();
    if (!canPick || !validSelection || !selection || Date.now() + clockOffset >= meeting.endsAt) return;
    setSentAt(Date.now());
    ballotStatusRef.current?.focus({ preventScroll: true });
    onVote(selection);
  };

  const handleChat = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !canChat) return;
    soundEngine.playClick();
    onSendChat(text);
    setDraft('');
  };

  const sendQuickPhrase = (phrase: string) => {
    if (!canChat) return;
    soundEngine.playClick();
    onSendChat(phrase);
  };

  const ballotStatus = result
    ? null
    : hasVoted
      ? `Голос учтён${choiceLabel ? `: ${choiceLabel}` : ''}.`
      : !seconds
        ? 'Время вышло. Подводим итоги…'
        : me?.status !== 'alive'
          ? 'Вы наблюдаете за собранием.'
          : !me.connected
            ? 'Нет связи со станцией.'
            : submitting
              ? 'Отправляем голос…'
              : sentAt !== null
                ? 'Нет подтверждения. Попробуйте ещё раз.'
                : choiceLabel && validSelection
                  ? `Выбрано: ${choiceLabel}`
                  : 'Выберите подозреваемого или пропуск.';

  const urgentClock = !result && seconds <= 10 && seconds > 0;

  return (
    <dialog
      ref={dialogRef}
      className="dock-ui dock-dialog dock-meeting"
      aria-labelledby="dock-meeting-title"
      onCancel={(event) => event.preventDefault()}
    >
      <header className="dock-dialog__header">
        <div className="dock-meeting__headline">
          <div className="dock-meeting__kind">
            {meeting.reason === 'body' ? (
              <>
                <AlertTriangle size={15} aria-hidden="true" />
                <span>ОБНАРУЖЕН ВЫБЫВШИЙ</span>
              </>
            ) : (
              <>
                <Megaphone size={15} aria-hidden="true" />
                <span>ЭКСТРЕННОЕ СОБРАНИЕ</span>
              </>
            )}
          </div>
          <h2 id="dock-meeting-title" ref={headingRef} tabIndex={-1}>
            Голосование экипажа
          </h2>
          <p className="dock-muted">
            {meeting.reason === 'body'
              ? `Пострадавший: ${meeting.victimName ?? 'член экипажа'} (${victimRoom}) · Сообщил: ${meeting.callerName}`
              : `Созвал: ${meeting.callerName} · Командный зал`}
          </p>
        </div>

        <div className={`dock-meeting__clock ${urgentClock ? 'dock-meeting__clock--urgent' : ''}`}>
          <span>{result ? 'Возврат через' : 'Осталось'}</span>
          <strong role="timer" aria-label={result ? 'До возврата на станцию' : 'До конца голосования'}>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </strong>
        </div>
      </header>

      {result && (
        <div
          className={`dock-verdict ${
            result.outcome === 'ejected'
              ? result.ejectedRole === 'saboteur'
                ? 'dock-verdict--saboteur'
                : 'dock-verdict--ejected'
              : 'dock-verdict--neutral'
          }`}
          role="status"
        >
          <ShieldAlert size={22} aria-hidden="true" />
          <div>
            <strong>{resultHeadline}</strong>
            {resultSubtext && <p>{resultSubtext}</p>}
          </div>
        </div>
      )}

      <div className="dock-meeting__body">
        <form onSubmit={handleConfirm} className="dock-ballot">
          <fieldset disabled={!canPick} className="dock-ballot__choices">
            <div className="dock-ballot__head">
              <legend>{result ? 'Итоги голосования' : 'Кого отправить за борт?'}</legend>
              <span className="dock-muted dock-ballot__count">
                {result
                  ? snapshot.settings.anonymousVotes
                    ? 'Анонимное голосование'
                    : `Голосов: ${totalCastVotes}`
                  : `Проголосовали: ${votedCount} / ${voters.length}`}
              </span>
            </div>

            <ul className="dock-ballot__list">
              {snapshot.players.map((player) => {
                const isPicked = (result || validSelection || hasVoted) && picked === player.id;
                const isEjected = result?.ejectedPlayerId === player.id;
                const votesFor = result?.tallies[player.id] ?? 0;
                const voterColors = result?.voterMap?.[player.id] ?? [];
                const barWidth = totalCastVotes > 0 ? Math.round((votesFor / totalCastVotes) * 100) : 0;
                const details = !player.connected
                  ? 'Нет связи'
                  : player.status !== 'alive'
                    ? 'Выбыл'
                    : meeting.votedPlayerIds.includes(player.id)
                      ? 'Голос отдан'
                      : 'Думает…';
                return (
                  <li key={player.id}>
                    <label
                      className="dock-ballot__row"
                      data-selected={Boolean(isPicked)}
                      data-ejected={Boolean(isEjected)}
                      data-disabled={player.status !== 'alive'}
                    >
                      {!result && (
                        <input
                          type="radio"
                          name="dock-vote"
                          value={player.id}
                          disabled={player.status !== 'alive'}
                          checked={Boolean(isPicked)}
                          onChange={() => {
                            soundEngine.playClick();
                            setSelection(player.id);
                            setSentAt(null);
                          }}
                        />
                      )}
                      <CrewPortrait color={player.color} skin={player.skin} />
                      <div className="dock-ballot__identity">
                        <span className="dock-ballot__name">
                          {player.name}
                          {player.id === snapshot.self.playerId && <small> (вы)</small>}
                        </span>
                        <span className="dock-ballot__suit dock-muted">
                          {SUITS[player.skin]?.name ?? 'Штатный'}
                        </span>
                        {result && votesFor > 0 && (
                          <div className="dock-ballot__bar" aria-hidden="true">
                            <span style={{ width: `${barWidth}%` }} />
                          </div>
                        )}
                      </div>

                      {result ? (
                        <div className="dock-ballot__result-meta">
                          {voterColors.length > 0 && (
                            <span className="dock-ballot__voters" aria-label="Цвета проголосовавших">
                              {voterColors.map((hex, i) => (
                                <span
                                  key={`${player.id}-v-${i}`}
                                  className="dock-ballot__voter-dot"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </span>
                          )}
                          <strong className="dock-ballot__tally" aria-label={`Голосов: ${votesFor}`}>
                            {votesFor}
                          </strong>
                        </div>
                      ) : (
                        <span
                          className={`dock-ballot__state ${
                            meeting.votedPlayerIds.includes(player.id) ? 'dock-ballot__state--done' : 'dock-muted'
                          }`}
                        >
                          {details}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}

              <li>
                <label className="dock-ballot__row dock-ballot__skip" data-selected={picked === 'skip'}>
                  {!result && (
                    <input
                      type="radio"
                      name="dock-vote"
                      value="skip"
                      checked={picked === 'skip'}
                      onChange={() => {
                        soundEngine.playClick();
                        setSelection('skip');
                        setSentAt(null);
                      }}
                    />
                  )}
                  <span className="dock-ballot__skip-label">
                    <SkipForward size={17} aria-hidden="true" />
                    <span className="dock-ballot__name">Пропустить голосование</span>
                  </span>
                  {result && (
                    <div className="dock-ballot__result-meta">
                      {(result.voterMap?.skip ?? []).length > 0 && (
                        <span className="dock-ballot__voters" aria-label="Пропустили голосование">
                          {(result.voterMap?.skip ?? []).map((hex, i) => (
                            <span
                              key={`skip-v-${i}`}
                              className="dock-ballot__voter-dot"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </span>
                      )}
                      <strong className="dock-ballot__tally" aria-label={`Пропусков: ${result.skipVotes}`}>
                        {result.skipVotes}
                      </strong>
                    </div>
                  )}
                </label>
              </li>
            </ul>
          </fieldset>

          {!result && (
            <div className="dock-ballot__confirm">
              <p className="dock-muted" ref={ballotStatusRef} tabIndex={-1} role="status">
                {ballotStatus}
              </p>
              <button
                type="submit"
                className="dock-button dock-button--primary"
                disabled={!canPick || !validSelection}
              >
                <Check size={18} aria-hidden="true" /> Подтвердить голос
              </button>
            </div>
          )}
        </form>

        <section className="dock-chat" aria-labelledby="dock-chat-title">
          <div className="dock-chat__head">
            <h3 id="dock-chat-title">Обсуждение</h3>
            <span className="dock-muted">{meeting.chat.length} сообщ.</span>
          </div>

          <div
            className="dock-chat__log"
            ref={chatRef}
            role="log"
            aria-label="Чат экипажа"
            tabIndex={0}
            onScroll={(event) => {
              const log = event.currentTarget;
              followChat.current = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
            }}
          >
            {!meeting.chat.length && (
              <p className="dock-muted">Сообщений пока нет. Поделитесь наблюдениями с экипажем.</p>
            )}
            {meeting.chat.map((message) => (
              <div key={message.id} className="dock-chat__message">
                <span
                  className="dock-ballot__swatch"
                  style={{ backgroundColor: message.senderColor }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <strong>{message.senderName}</strong>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
          </div>

          {canChat && (
            <div className="dock-chat__quick" aria-label="Быстрые фразы">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  className="dock-chat__quick-btn"
                  onClick={() => sendQuickPhrase(phrase)}
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}

          <form className="dock-chat__compose" onSubmit={handleChat}>
            <input
              aria-label="Сообщение экипажу"
              placeholder={canChat ? 'Написать экипажу…' : 'Чат только для чтения'}
              maxLength={240}
              disabled={!canChat}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="submit"
              className="dock-button dock-button--primary"
              aria-label="Отправить сообщение"
              disabled={!canChat || !draft.trim()}
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </dialog>
  );
}
