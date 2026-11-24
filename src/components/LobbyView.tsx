import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import {
  Check,
  Copy,
  Gamepad2,
  LogOut,
  Play,
  Shield,
  SlidersHorizontal,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CrewPortrait } from './CrewPortrait';
import {
  DEFAULT_ROOM_SETTINGS,
  PLAYER_COLORS,
  ROOM_SETTINGS_LIMITS,
  SKIN_IDS,
  type RoomSettings,
  type RoomSnapshot,
  type SkinId,
} from '../../shared/types';
import type { NearbyInteraction } from '../game/FirstPersonViewport';
import { useTouchAvailable } from '../game/TouchJoystick';
import { soundEngine } from '../game/sound';
import './LobbyView.css';

export type LobbyPanel = 'crew' | 'suit' | 'rules';

export interface LobbyViewProps {
  snapshot: RoomSnapshot;
  sensitivity: number;
  muted: boolean;
  touchMode: 'auto' | 'on' | 'off';
  nearbyInteraction: NearbyInteraction | null;
  requestedPanel: LobbyPanel | null;
  onRequestedPanelHandled: () => void;
  error: string | null;
  onSensitivityChange: (val: number) => void;
  onTouchModeChange: (mode: 'auto' | 'on' | 'off') => void;
  onToggleMute: () => void;
  onSelectColor: (colorHex: string) => void;
  onSelectSkin: (skin: SkinId) => void;
  onSettings: (patch: Partial<RoomSettings>) => void;
  onPanelChange: (open: boolean) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
}

export const SUITS: Record<SkinId, { name: string; detail: string }> = {
  standard: { name: 'Штатный', detail: 'Рабочая кепка и шарф' },
  survey: { name: 'Разведчик', detail: 'Лётный шлем и очки' },
  salvage: { name: 'Техник', detail: 'Каска с гребнем' },
  medic: { name: 'Медик', detail: 'Медицинская шапочка' },
  commander: { name: 'Капитан', detail: 'Фуражка и эполеты' },
  mechanic: { name: 'Механик', detail: 'Сварочный щиток' },
  botanist: { name: 'Биолог', detail: 'Панама оранжереи' },
  cosmonaut: { name: 'Космонавт', detail: 'Гермошлем и антенна' },
};

const PANELS: Record<LobbyPanel, { title: string; label: string; keyHint: string; Icon: typeof Users }> = {
  crew: { title: 'Состав экипажа', label: 'Экипаж', keyHint: '1', Icon: Users },
  suit: { title: 'Гардероб скафандров', label: 'Скафандр', keyHint: '2', Icon: Shield },
  rules: { title: 'Правила смены', label: 'Правила', keyHint: '3', Icon: SlidersHorizontal },
};

type NumericSetting = keyof typeof ROOM_SETTINGS_LIMITS;
type BooleanSetting = 'emergencyEnabled' | 'shieldEnabled' | 'confirmEjects' | 'anonymousVotes';

const NUMBER_RULES: { key: NumericSetting; label: string; unit: string; hint?: string }[] = [
  { key: 'maxPlayers', label: 'Максимум игроков', unit: 'мест' },
  { key: 'saboteurCount', label: 'Число саботажников', unit: 'чел.', hint: '2 саботажника работают от 5 игроков' },
  { key: 'tasksPerPlayer', label: 'Заданий на игрока', unit: 'шт.' },
  { key: 'meetingSeconds', label: 'Время голосования', unit: 'с' },
  { key: 'killCooldownSeconds', label: 'Перезарядка атаки', unit: 'с' },
  { key: 'sabotageCooldownSeconds', label: 'Перезарядка саботажа', unit: 'с' },
  { key: 'moveSpeedPercent', label: 'Скорость ходьбы', unit: '%' },
];

const TOGGLE_RULES: { key: BooleanSetting; label: string; detail: string }[] = [
  { key: 'emergencyEnabled', label: 'Экстренный созыв', detail: 'Кнопка на центральном столе; о выбывших можно сообщать всегда.' },
  { key: 'shieldEnabled', label: 'Щит самообороны экипажа', detail: 'Открывается при 50% ремонта или ≤ 3 живых игроках.' },
  { key: 'confirmEjects', label: 'Раскрывать роль при изгнании', detail: 'После голосования показывается, был ли игрок саботажником.' },
  { key: 'anonymousVotes', label: 'Анонимное голосование', detail: 'Скрывает, кто за кого отдал голос в итогах собрания.' },
];

const RULE_PRESETS: Array<{ id: string; label: string; values: Partial<RoomSettings> }> = [
  {
    id: 'classic',
    label: 'Классика',
    values: {
      saboteurCount: DEFAULT_ROOM_SETTINGS.saboteurCount,
      tasksPerPlayer: 5,
      meetingSeconds: 60,
      killCooldownSeconds: 22,
      sabotageCooldownSeconds: 32,
      moveSpeedPercent: 100,
      emergencyEnabled: true,
      shieldEnabled: true,
      confirmEjects: true,
      anonymousVotes: false,
    },
  },
  {
    id: 'fast',
    label: 'Быстрая',
    values: {
      saboteurCount: 1,
      tasksPerPlayer: 3,
      meetingSeconds: 45,
      killCooldownSeconds: 15,
      sabotageCooldownSeconds: 20,
      moveSpeedPercent: 120,
      emergencyEnabled: true,
      shieldEnabled: true,
      confirmEjects: true,
      anonymousVotes: false,
    },
  },
  {
    id: 'hardcore',
    label: 'Хардкор',
    values: {
      saboteurCount: 2,
      tasksPerPlayer: 6,
      meetingSeconds: 75,
      killCooldownSeconds: 18,
      sabotageCooldownSeconds: 24,
      moveSpeedPercent: 105,
      emergencyEnabled: true,
      shieldEnabled: false,
      confirmEjects: false,
      anonymousVotes: true,
    },
  },
];

function RulesPanel({
  settings,
  occupied,
  isHost,
  onSettings,
}: {
  settings: RoomSettings;
  occupied: number;
  isHost: boolean;
  onSettings: LobbyViewProps['onSettings'];
}) {
  const [draft, setDraft] = useState<
    Partial<Record<NumericSetting, string>> & Partial<Record<BooleanSetting, boolean>>
  >({});

  useEffect(() => {
    setDraft((previous) => {
      const next = { ...previous };
      for (const { key } of NUMBER_RULES) {
        if (next[key] === String(settings[key])) delete next[key];
      }
      for (const { key } of TOGGLE_RULES) {
        if (next[key] === settings[key]) delete next[key];
      }
      return next;
    });
  }, [settings]);

  const hasChanges =
    NUMBER_RULES.some(({ key }) => draft[key] !== undefined && Number(draft[key]) !== settings[key]) ||
    TOGGLE_RULES.some(({ key }) => draft[key] !== undefined && draft[key] !== settings[key]);

  const applyPreset = (values: Partial<RoomSettings>) => {
    soundEngine.playClick();
    const nextDraft: Partial<Record<NumericSetting, string>> & Partial<Record<BooleanSetting, boolean>> = {
      ...draft,
    };
    for (const { key } of NUMBER_RULES) {
      if (values[key] !== undefined) nextDraft[key] = String(values[key]);
    }
    for (const { key } of TOGGLE_RULES) {
      if (values[key] !== undefined) nextDraft[key] = values[key];
    }
    setDraft(nextDraft);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const patch: Partial<RoomSettings> = {};
    for (const { key } of NUMBER_RULES) {
      if (draft[key] !== undefined && Number(draft[key]) !== settings[key]) {
        patch[key] = Number(draft[key]);
      }
    }
    for (const { key } of TOGGLE_RULES) {
      if (draft[key] !== undefined && draft[key] !== settings[key]) {
        patch[key] = draft[key];
      }
    }
    if (Object.keys(patch).length) {
      onSettings(patch);
    }
  };

  return (
    <>
      <p className="lobby-description">
        Настройте число участников, баланс ролей и темп смены. Для старта нужны минимум 2 игрока на связи.
      </p>
      {isHost ? (
        <form onSubmit={submit}>
          <div className="lobby-presets" role="group" aria-label="Быстрые пресеты правил">
            {RULE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="lobby-button lobby-preset-btn"
                onClick={() => applyPreset(preset.values)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {NUMBER_RULES.map(({ key, label, unit, hint }) => {
            const { min, max } = ROOM_SETTINGS_LIMITS[key];
            const allowedMin = key === 'maxPlayers' ? Math.max(min, occupied) : min;
            return (
              <div className="lobby-rule" key={key}>
                <div>
                  <label htmlFor={`lobby-rule-${key}`}>{label}</label>
                  <p id={`lobby-limit-${key}`} className="lobby-muted">
                    {min}–{max} {unit}
                    {key === 'maxPlayers' && occupied > min ? ` · занято ${occupied}` : ''}
                    {hint ? ` · ${hint}` : ''}
                  </p>
                </div>
                <input
                  id={`lobby-rule-${key}`}
                  aria-describedby={`lobby-limit-${key}`}
                  type="number"
                  inputMode="numeric"
                  min={allowedMin}
                  max={max}
                  step={key === 'moveSpeedPercent' ? 5 : 1}
                  required
                  value={draft[key] ?? settings[key]}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                />
              </div>
            );
          })}

          {TOGGLE_RULES.map(({ key, label, detail }) => (
            <label className="lobby-rule lobby-rule-toggle" key={key}>
              <span>
                {label}
                <span className="lobby-muted">{detail}</span>
              </span>
              <input
                type="checkbox"
                checked={draft[key] ?? settings[key]}
                onChange={(event) => {
                  soundEngine.playClick();
                  setDraft({ ...draft, [key]: event.target.checked });
                }}
              />
            </label>
          ))}

          <button className="lobby-button lobby-primary lobby-rules-save" type="submit" disabled={!hasChanges}>
            Сохранить правила
          </button>
        </form>
      ) : (
        <>
          <dl className="lobby-rule-list">
            {NUMBER_RULES.map(({ key, label, unit }) => (
              <div className="lobby-rule" key={key}>
                <dt>{label}</dt>
                <dd>
                  {settings[key]} {unit}
                </dd>
              </div>
            ))}
            {TOGGLE_RULES.map(({ key, label }) => (
              <div className="lobby-rule" key={key}>
                <dt>{label}</dt>
                <dd>{settings[key] ? 'Вкл' : 'Выкл'}</dd>
              </div>
            ))}
          </dl>
          <p className="lobby-muted">Правила меняет хозяин комнаты.</p>
        </>
      )}
    </>
  );
}

export function LobbyView({
  snapshot,
  sensitivity,
  muted,
  touchMode,
  nearbyInteraction,
  requestedPanel,
  onRequestedPanelHandled,
  error,
  onSensitivityChange,
  onTouchModeChange,
  onToggleMute,
  onSelectColor,
  onSelectSkin,
  onSettings,
  onPanelChange,
  onStartMatch,
  onLeaveRoom,
}: LobbyViewProps) {
  const [panel, setPanel] = useState<LobbyPanel | null>(null);
  const [inviteState, setInviteState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelChangeRef = useRef(onPanelChange);
  const openerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const touchAvailable = useTouchAvailable(touchMode);

  const me = snapshot.players.find((player) => player.id === snapshot.self.playerId);
  const connectedCount = snapshot.players.filter((player) => player.connected).length;
  const occupied = snapshot.players.length;
  const free = snapshot.settings.maxPlayers - occupied;
  const minPlayers = ROOM_SETTINGS_LIMITS.maxPlayers.min;
  const canStart = connectedCount >= minPlayers && connectedCount <= snapshot.settings.maxPlayers;
  const takenColors = new Set(snapshot.players.filter((player) => player.id !== me?.id).map((player) => player.color));
  const myColor = PLAYER_COLORS.find((color) => color.hex === me?.color);
  const mySkin: SkinId = me?.skin ?? 'standard';
  const inviteUrl = new URL(`?room=${snapshot.roomCode}`, window.location.href).href;

  useLayoutEffect(() => {
    panelChangeRef.current = onPanelChange;
  }, [onPanelChange]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel && !dialog.open) dialog.showModal();
    if (!panel && dialog.open) {
      dialog.close();
      openerRef.current?.focus({ preventScroll: true });
    }
  }, [panel]);

  useLayoutEffect(() => () => {
    if (openRef.current) panelChangeRef.current(false);
  }, []);

  useEffect(() => {
    if (!requestedPanel) return;
    openRef.current = true;
    onPanelChange(true);
    setPanel(requestedPanel);
    soundEngine.playUiOpen();
    onRequestedPanelHandled();
  }, [requestedPanel, onPanelChange, onRequestedPanelHandled]);

  useEffect(() => {
    if (inviteState !== 'copied') return;
    const timer = window.setTimeout(() => setInviteState('idle'), 2400);
    return () => window.clearTimeout(timer);
  }, [inviteState]);

  const openPanel = (next: LobbyPanel, opener?: HTMLElement | null) => {
    if (opener) openerRef.current = opener;
    openRef.current = true;
    onPanelChange(true);
    setPanel(next);
    soundEngine.playUiOpen();
  };

  const closePanel = () => {
    openRef.current = false;
    onPanelChange(false);
    setPanel(null);
    soundEngine.playUiClose();
  };

  const copyInvite = async (opener: HTMLButtonElement) => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteState('copied');
    } catch {
      if (!opener.isConnected) return;
      setInviteState('manual');
      openPanel('crew', opener);
    }
  };

  const handleLobbyInteractClick = () => {
    if (!nearbyInteraction) return;
    if (nearbyInteraction.kind === 'lobby_suit') openPanel('suit');
    else if (nearbyInteraction.kind === 'lobby_rules') openPanel('rules');
    else if (nearbyInteraction.kind === 'lobby_crew') openPanel('crew');
  };

  const isLobbyKioskNear =
    nearbyInteraction &&
    (nearbyInteraction.kind === 'lobby_suit' ||
      nearbyInteraction.kind === 'lobby_rules' ||
      nearbyInteraction.kind === 'lobby_crew');

  return (
    <main className="cascade-lobby" data-touch={touchAvailable} aria-label="Комната ожидания станции Каскад">
      <header className="lobby-header">
        <div className="lobby-identity">
          <div className="lobby-identity-row">
            <h1>Зал ожидания</h1>
            <span className="lobby-code" title="Код комнаты">
              {snapshot.roomCode}
            </span>
          </div>
          <p className="lobby-rules-summary">
            <span>
              Игроки: <strong>{connectedCount}/{snapshot.settings.maxPlayers}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>Саботажников: {snapshot.settings.saboteurCount}</span>
            <span aria-hidden="true">·</span>
            <span>Заданий: {snapshot.settings.tasksPerPlayer}</span>
            <span aria-hidden="true">·</span>
            <span>Голос: {snapshot.settings.meetingSeconds} с</span>
          </p>
        </div>

        <div className="lobby-header-actions">
          <button
            className="lobby-button"
            type="button"
            aria-label="Скопировать приглашение"
            title="Скопировать ссылку-приглашение"
            onClick={(event) => void copyInvite(event.currentTarget)}
          >
            {inviteState === 'copied' ? <Check /> : <Copy />}
            <span>{inviteState === 'copied' ? 'Скопировано' : 'Пригласить'}</span>
          </button>
          <button
            className="lobby-button lobby-icon-btn"
            type="button"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            title={muted ? 'Включить звук [V]' : 'Выключить звук [V]'}
            onClick={onToggleMute}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            className="lobby-button"
            type="button"
            aria-label="Выйти из комнаты"
            title="Выйти в главное меню"
            onClick={() => {
              soundEngine.playUiClose();
              onLeaveRoom();
            }}
          >
            <LogOut />
            <span>Выйти</span>
          </button>
          <span className="lobby-sr-only" role="status">
            {inviteState === 'copied' && 'Ссылка скопирована в буфер обмена'}
          </span>
        </div>
      </header>

      {!panel && error && (
        <p className="lobby-error lobby-hud-error" role="alert">
          {error}
        </p>
      )}

      {/* In-world Lobby Kiosk Proximity Prompt (like approaching wardrobe/laptop in Among Us) */}
      {!panel && isLobbyKioskNear && (
        <div className="lobby-kiosk-prompt">
          <button
            type="button"
            className="lobby-button lobby-primary lobby-kiosk-btn"
            onClick={handleLobbyInteractClick}
          >
            {!touchAvailable && <kbd className="lobby-kbd-dark">E</kbd>}
            <span>{nearbyInteraction.label}</span>
          </button>
        </div>
      )}

      {/* Clean non-overlapping desktop control hint */}
      {!touchAvailable && !panel && (
        <p className="lobby-key-hint">
          <kbd>WASD</kbd> ходьба · зажмите ЛКМ для обзора · <kbd>E</kbd> консоль · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> панели
        </p>
      )}

      <div className="lobby-console">
        <nav className="lobby-dock" aria-label="Панели комнаты ожидания">
          {(Object.keys(PANELS) as LobbyPanel[]).map((key) => {
            const { label, keyHint, Icon } = PANELS[key];
            return (
              <button
                key={key}
                className="lobby-button"
                type="button"
                aria-haspopup="dialog"
                aria-controls="lobby-panel"
                aria-expanded={panel === key}
                onClick={(event) => openPanel(key, event.currentTarget)}
              >
                <Icon />
                <span>
                  {label}
                  {key === 'crew' && (
                    <span className="lobby-count">
                      {' '}
                      {connectedCount}/{snapshot.settings.maxPlayers}
                    </span>
                  )}
                </span>
                {!touchAvailable && <kbd className="lobby-kbd">{keyHint}</kbd>}
              </button>
            );
          })}
        </nav>

        <div className="lobby-launch">
          <p className="lobby-launch-status" id="lobby-launch-status" role="status">
            {canStart
              ? me?.isHost
                ? 'Ворота готовы к открытию'
                : 'Ждём запуска от хозяина'
              : `На связи ${connectedCount} из ${minPlayers} мин.`}
          </p>
          {me?.isHost && (
            <button
              className="lobby-button lobby-primary"
              type="button"
              disabled={!canStart}
              aria-describedby="lobby-launch-status"
              onClick={() => {
                soundEngine.playClick();
                onStartMatch();
              }}
            >
              <Play />
              <span>Начать смену</span>
            </button>
          )}
        </div>
      </div>

      <dialog
        id="lobby-panel"
        ref={dialogRef}
        className="lobby-panel"
        aria-labelledby="lobby-panel-title"
        onCancel={(event) => {
          event.preventDefault();
          closePanel();
        }}
      >
        {panel && (
          <>
            <header className="lobby-panel-header">
              <h2 id="lobby-panel-title">{PANELS[panel].title}</h2>
              <button
                className="lobby-button lobby-close"
                type="button"
                aria-label="Закрыть панель"
                title="Закрыть панель (Esc)"
                onClick={closePanel}
              >
                <X />
              </button>
            </header>

            <div className="lobby-panel-content">
              {error && (
                <p className="lobby-error" role="alert">
                  {error}
                </p>
              )}

              {panel === 'crew' && (
                <>
                  <p className="lobby-description">
                    В зале ожидания: {connectedCount} из {snapshot.settings.maxPlayers}. Свободно мест: {free}.
                  </p>
                  {inviteState === 'manual' && (
                    <label className="lobby-invite-input">
                      Скопируйте ссылку приглашения:
                      <input
                        type="url"
                        readOnly
                        value={inviteUrl}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                    </label>
                  )}
                  <ul className="lobby-roster">
                    {snapshot.players.map((player) => (
                      <li key={player.id}>
                        <CrewPortrait color={player.color} skin={player.skin} />
                        <div className="lobby-player-info">
                          <span>
                            {player.name}
                            {player.id === me?.id && <small>Вы</small>}
                          </span>
                          <span className="lobby-muted">{SUITS[player.skin]?.name ?? 'Штатный'}</span>
                        </div>
                        <div className="lobby-player-state">
                          {player.isHost && <span>Хозяин</span>}
                          {!player.connected && <span className="lobby-muted">Переподключается</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="lobby-muted">
                    {free > 0
                      ? 'Пригласите друзей по коду комнаты или кнопкой «Пригласить».'
                      : 'Все места заняты, включая места временно отключившихся игроков.'}
                  </p>
                </>
              )}

              {panel === 'suit' && (
                <>
                  <div className="lobby-suit-preview">
                    <CrewPortrait color={myColor?.hex ?? PLAYER_COLORS[0].hex} skin={mySkin} />
                    <div>
                      <strong>{SUITS[mySkin].name}</strong>
                      <p className="lobby-muted">
                        {SUITS[mySkin].detail} · {myColor?.name ?? 'Янтарный'}
                      </p>
                    </div>
                  </div>

                  <div className="lobby-suits" role="group" aria-label="Модель скафандра">
                    {SKIN_IDS.map((skin) => {
                      const { name, detail } = SUITS[skin];
                      return (
                        <button
                          key={skin}
                          className="lobby-button lobby-suit"
                          type="button"
                          aria-pressed={mySkin === skin}
                          onClick={() => onSelectSkin(skin)}
                        >
                          <CrewPortrait color={myColor?.hex ?? PLAYER_COLORS[0].hex} skin={skin} />
                          <span>
                            {name}
                            <small>{detail}</small>
                          </span>
                          {mySkin === skin && <Check className="lobby-suit-check" />}
                        </button>
                      );
                    })}
                  </div>

                  <section className="lobby-color-section" aria-labelledby="lobby-color-label">
                    <h3 id="lobby-color-label">
                      Цвет скафандра <span className="lobby-muted">{myColor?.name}</span>
                    </h3>
                    <div className="lobby-colors" role="group" aria-labelledby="lobby-color-label">
                      {PLAYER_COLORS.map((color) => {
                        const selected = me?.color === color.hex;
                        const taken = takenColors.has(color.hex);
                        const label = `${color.name}${taken ? ' — занят' : ''}`;
                        return (
                          <button
                            key={color.id}
                            className="lobby-button lobby-color"
                            type="button"
                            title={label}
                            aria-label={label}
                            aria-pressed={selected}
                            disabled={taken}
                            onClick={() => onSelectColor(color.hex)}
                          >
                            <span className="lobby-color-chip" style={{ backgroundColor: color.hex }}>
                              {selected ? <Check /> : taken ? <X /> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <div className="lobby-sensitivity">
                    <label htmlFor="lobby-sensitivity">Чувствительность обзора</label>
                    <output htmlFor="lobby-sensitivity">{sensitivity.toFixed(1)}×</output>
                    <input
                      id="lobby-sensitivity"
                      type="range"
                      min={0.4}
                      max={2.4}
                      step={0.1}
                      value={sensitivity}
                      onChange={(event) => onSensitivityChange(Number(event.target.value))}
                    />
                  </div>

                  <div className="lobby-touch-mode">
                    <span className="lobby-touch-label">
                      <Gamepad2 size={16} aria-hidden="true" />
                      Сенсорное управление
                    </span>
                    <div className="lobby-touch-options" role="group" aria-label="Режим сенсорного управления">
                      {(
                        [
                          { id: 'auto', label: 'Авто' },
                          { id: 'on', label: 'Вкл' },
                          { id: 'off', label: 'Выкл' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className="lobby-button lobby-preset-btn"
                          aria-pressed={touchMode === opt.id}
                          onClick={() => {
                            soundEngine.playClick();
                            onTouchModeChange(opt.id);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {panel === 'rules' && (
                <RulesPanel
                  settings={snapshot.settings}
                  occupied={occupied}
                  isHost={Boolean(me?.isHost)}
                  onSettings={onSettings}
                />
              )}
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
