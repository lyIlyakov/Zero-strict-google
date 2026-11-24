import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Plus, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../game/sound';
import './dock.css';

interface MainMenuProps {
  initialRoomCode: string;
  initialName: string;
  busy: boolean;
  error: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
}

export function MainMenu({
  initialRoomCode,
  initialName,
  busy,
  error,
  muted,
  onToggleMute,
  onCreateRoom,
  onJoinRoom,
}: MainMenuProps) {
  const [name, setName] = useState(initialName);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [issue, setIssue] = useState<'name' | 'code' | null>(null);
  const [pendingAction, setPendingAction] = useState<'join' | 'create' | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const displayedError =
    issue === 'name'
      ? 'Введите позывной: от 2 до 18 символов.'
      : issue === 'code'
        ? 'Введите 6 латинских букв или цифр из кода приглашения.'
        : error;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value === 'create' ? 'create' : submitter?.value === 'join' ? 'join' : mode;
    const cleanName = name.trim();
    const cleanCode = roomCode.trim().toUpperCase();

    if (cleanName.length < 2) {
      soundEngine.playError();
      setIssue('name');
      nameRef.current?.focus();
      return;
    }
    if (action === 'join' && !/^[A-Z0-9]{6}$/.test(cleanCode)) {
      soundEngine.playError();
      setIssue('code');
      codeRef.current?.focus();
      return;
    }
    soundEngine.playClick();
    setIssue(null);
    setPendingAction(action);
    if (action === 'create') onCreateRoom(cleanName);
    else onJoinRoom(cleanCode, cleanName);
  };

  return (
    <main className="dock-ui dock-menu">
      <picture className="dock-menu__picture" aria-hidden="true">
        <source media="(max-width: 730px)" srcSet="/art/dock-compact.webp" />
        <img className="dock-menu__art" src="/art/dock-wide.webp" alt="" fetchPriority="high" />
      </picture>

      <div className="dock-menu__topbar">
        <span className="dock-menu__sector">ОРБИТАЛЬНЫЙ ДОК · СЕКТОР 04</span>
        <button
          type="button"
          className="dock-button dock-menu__mute"
          onClick={() => {
            onToggleMute();
            if (muted) soundEngine.playClick();
          }}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          title={muted ? 'Включить звук' : 'Выключить звук'}
        >
          {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
          <span>{muted ? 'Звук выкл' : 'Звук вкл'}</span>
        </button>
      </div>

      <div className="dock-menu__content">
        <header className="dock-menu__title">
          <h1>
            Нулевая
            <br />
            смена
          </h1>
          <p className="dock-menu__station">Орбитальная станция «Каскад»</p>
          <p className="dock-muted">
            Командная 3D-игра на дедукцию для 2–12 игроков. Чините отсеки, следите за датчиками и
            вычислите саботажника до того, как смена сорвётся.
          </p>
        </header>

        <dl className="dock-menu__brief" aria-label="Особенности станции">
          <div>
            <dt>Экипаж</dt>
            <dd>2–12 игроков</dd>
          </div>
          <div>
            <dt>Отсеки</dt>
            <dd>9 залов и шлюз</dd>
          </div>
          <div>
            <dt>Гардероб</dt>
            <dd>8 скафандров</dd>
          </div>
        </dl>

        <form className="dock-menu__form" onSubmit={handleSubmit} aria-busy={busy}>
          <div className="dock-menu__tabs" role="tablist" aria-label="Способ входа">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'create'}
              className="dock-menu__tab"
              onClick={() => {
                soundEngine.playClick();
                setMode('create');
                setIssue(null);
              }}
            >
              Новая комната
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'join'}
              className="dock-menu__tab"
              onClick={() => {
                soundEngine.playClick();
                setMode('join');
                setIssue(null);
                window.setTimeout(() => codeRef.current?.focus(), 0);
              }}
            >
              Войти по коду
            </button>
          </div>

          <div className="dock-field">
            <label htmlFor="player-nickname">Ваш позывной</label>
            <input
              ref={nameRef}
              id="player-nickname"
              maxLength={18}
              value={name}
              disabled={busy}
              autoComplete="nickname"
              placeholder="Например, Вега"
              aria-invalid={issue === 'name' || undefined}
              aria-describedby={displayedError ? 'dock-menu-error' : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (issue === 'name') setIssue(null);
              }}
            />
          </div>

          {mode === 'join' ? (
            <div className="dock-menu__join">
              <div className="dock-field">
                <label htmlFor="room-code-input">Код комнаты</label>
                <input
                  ref={codeRef}
                  id="room-code-input"
                  className="dock-menu__code"
                  maxLength={6}
                  disabled={busy}
                  value={roomCode}
                  placeholder="ABC123"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={issue === 'code' || undefined}
                  aria-describedby={displayedError ? 'dock-menu-error' : undefined}
                  onChange={(event) => {
                    setRoomCode(event.target.value.toUpperCase());
                    if (issue === 'code') setIssue(null);
                  }}
                />
              </div>
              <button
                type="submit"
                value="join"
                data-start="true"
                className="dock-button dock-button--primary"
                disabled={busy}
              >
                {busy && pendingAction === 'join' ? 'Входим…' : 'Войти в шлюз'}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="dock-menu__primary-action">
              <button
                type="submit"
                value="create"
                data-start="true"
                className="dock-button dock-button--primary dock-menu__fullbtn"
                disabled={busy}
              >
                <Plus size={18} aria-hidden="true" />
                {busy && pendingAction === 'create' ? 'Создаём шлюз…' : 'Создать комнату'}
              </button>
              <p className="dock-muted dock-menu__hint">
                В зале ожидания можно ходить, примерять скафандры и настраивать правила смены.
              </p>
            </div>
          )}

          {displayedError && (
            <p role="alert" id="dock-menu-error" className="dock-error">
              {displayedError}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
