import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Crosshair,
  Hand,
  Map as MapIcon,
  Settings,
  Shield,
  Volume2,
  VolumeX,
  X,
  ZapOff,
} from 'lucide-react';
import { ROOM_BY_ID } from '../../shared/mapData';
import type { RoomSnapshot, ShieldEventNotice } from '../../shared/types';
import { useTouchAvailable } from '../game/TouchJoystick';
import type { NearbyInteraction, ViewportHudTelemetry } from '../game/FirstPersonViewport';
import { MiniMap } from './MiniMap';

interface GameHudProps {
  snapshot: RoomSnapshot;
  telemetry: ViewportHudTelemetry;
  panelOpen: boolean;
  muted: boolean;
  touchMode: 'auto' | 'on' | 'off';
  notice: ShieldEventNotice | null;
  actionError: string | null;
  onToggleMap: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onInteract: (interaction: NearbyInteraction) => void;
  onReportBody: (bodyId: string) => void;
  onActivateShield: () => void;
  onAttackTarget: (targetId: string) => void;
  onSabotageLights: () => void;
}

export function GameHud({
  snapshot,
  telemetry,
  panelOpen,
  muted,
  touchMode,
  notice,
  actionError,
  onToggleMap,
  onTogglePause,
  onToggleMute,
  onInteract,
  onReportBody,
  onActivateShield,
  onAttackTarget,
  onSabotageLights,
}: GameHudProps) {
  const touchAvailable = useTouchAvailable(touchMode);
  const [now, setNow] = useState(() => Date.now());
  const [mobileTasksOpen, setMobileTasksOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  const me = snapshot.players.find((p) => p.id === snapshot.self.playerId);
  const isAlive = me?.status === 'alive';
  const isCrew = snapshot.self.role === 'crew';
  const isSaboteur = snapshot.self.role === 'saboteur';
  const shieldRuleEnabled = snapshot.settings.shieldEnabled !== false;

  const fellowSaboteurs = (snapshot.self.fellowSaboteurIds ?? [])
    .map((id) => snapshot.players.find((p) => p.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  const roomName = telemetry.roomId ? ROOM_BY_ID[telemetry.roomId]?.name : 'Коридор';

  const repairRatio =
    snapshot.requiredCrewTasks > 0
      ? Math.min(1, snapshot.completedCrewTasks / snapshot.requiredCrewTasks)
      : 0;

  const shieldActiveRemaining = Math.max(0, (snapshot.self.shieldActiveUntil - now) / 1000);
  const shieldIsActive = shieldActiveRemaining > 0;
  const shieldReady =
    isCrew &&
    isAlive &&
    shieldRuleEnabled &&
    snapshot.shieldUnlocked &&
    snapshot.self.shieldCharge > 0 &&
    !shieldIsActive;

  const killCd = Math.max(0, Math.ceil((snapshot.self.killCooldownUntil - now) / 1000));
  const sabCd = Math.max(0, Math.ceil((snapshot.self.sabotageCooldownUntil - now) / 1000));
  const slowedSec = Math.max(0, (snapshot.self.slowedUntil - now) / 1000);

  let shieldLabel = 'Щит заблокирован';
  if (!shieldRuleEnabled) {
    shieldLabel = 'Щит отключён';
  } else if (shieldIsActive) {
    shieldLabel = `Щит активен (${shieldActiveRemaining.toFixed(1)} с)`;
  } else if (snapshot.shieldUnlocked) {
    shieldLabel = snapshot.self.shieldCharge > 0 ? 'Щит готов — Q' : 'Заряд потрачен';
  }

  const shieldReasonText = !shieldRuleEnabled
    ? 'Отключён правилами комнаты'
    : snapshot.shieldUnlockReason === 'tasks_50'
      ? 'Открыт: выполнено 50% ремонта'
      : snapshot.shieldUnlockReason === 'players_3'
        ? 'Открыт: осталось ≤ 3 активных'
        : `Откроется при 50% ремонта (${snapshot.completedCrewTasks}/${snapshot.initialTotalCrewTasks}) или ≤ 3 живых`;

  const remainingTasksCount = snapshot.self.tasks.filter((t) => !t.completed).length;

  const canUse = Boolean(telemetry.nearbyInteraction);
  const canReport = Boolean(isAlive && telemetry.nearbyBodyId);
  const canAttack = Boolean(isSaboteur && isAlive && telemetry.nearbyAttackTarget && killCd === 0);
  const canSabotage = Boolean(isSaboteur && isAlive && !snapshot.lightsOut && sabCd === 0);

  return (
    <div
      className="station-hud fixed inset-0 z-20 pointer-events-none select-none"
      data-touch={touchAvailable}
      inert={panelOpen}
      aria-hidden={panelOpen || undefined}
    >
      {/* Subtle cyan screen-edge glow while personal shield is active */}
      {shieldIsActive && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 70px rgba(56, 189, 248, 0.45)',
          }}
        />
      )}

      {/* Top-Left: Role, Current Room, Global Repair Progress, Active Players & Tasks */}
      <div className="station-hud-readout fixed top-4 left-4 flex flex-col gap-2.5 max-w-[320px]">
        <div className="bg-[#0c111b]/92 border border-slate-700/80 rounded-lg px-3.5 py-2.5 shadow-lg">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-display font-bold tracking-wide text-slate-100 truncate">
              {roomName}
            </span>
            <span
              className={`font-bold shrink-0 ${
                isSaboteur ? 'text-red-400' : 'text-sky-400'
              }`}
            >
              {isSaboteur ? 'Саботажник' : 'Экипаж'}
            </span>
          </div>

          {isSaboteur && fellowSaboteurs.length > 0 && (
            <div className="mt-1 text-[11px] text-red-300/90">
              Союзник: {fellowSaboteurs.join(', ')}
            </div>
          )}

          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono-tabular mb-1">
              <span>Ремонт станции</span>
              <span>
                {snapshot.completedCrewTasks} / {snapshot.requiredCrewTasks}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-transform duration-300 origin-left"
                style={{ transform: `scaleX(${repairRatio})` }}
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono-tabular">
            <span>Живых: {snapshot.activePlayersCount}</span>
            <span>Раунд {snapshot.roundNumber}</span>
          </div>
        </div>

        {/* Desktop Assigned Tasks Checklist */}
        <div className="station-hud-tasks bg-[#0c111b]/90 border border-slate-800/90 rounded-lg px-3.5 py-2.5 shadow-lg">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
            {isSaboteur ? 'Задания для прикрытия (прогресс не дают)' : 'Ваши задания'}
          </div>
          <ul className="space-y-1.5 text-xs">
            {snapshot.self.tasks.map((t) => {
              const curStage = t.stages[t.currentStageIndex];
              const stageRoom = curStage ? ROOM_BY_ID[curStage.roomId]?.shortName : '';
              const waitSec =
                curStage?.readyAt && curStage.readyAt > now
                  ? Math.ceil((curStage.readyAt - now) / 1000)
                  : 0;
              return (
                <li
                  key={t.taskId}
                  className={`flex items-start justify-between gap-2 ${
                    t.completed ? 'text-emerald-400/80 line-through' : 'text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5 leading-snug">
                    {t.completed && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    <span>
                      {t.title}
                      {!t.completed && t.stages.length > 1
                        ? ` (${t.currentStageIndex + 1}/${t.stages.length})`
                        : ''}
                    </span>
                  </span>
                  {!t.completed && (
                    <span className="text-[10px] font-mono-tabular text-amber-300/90 shrink-0">
                      {waitSec > 0 ? `${waitSec} с` : stageRoom}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mobile compact tasks toggle button (visible when desktop checklist is hidden) */}
        <div className="md:hidden pointer-events-auto">
          <button
            type="button"
            onClick={() => setMobileTasksOpen((v) => !v)}
            className="px-2.5 py-1.5 bg-[#0c111b]/92 border border-slate-700/80 rounded-md text-xs font-semibold text-amber-200 flex items-center gap-1.5"
          >
            {mobileTasksOpen ? <X className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
            <span>Задания ({remainingTasksCount})</span>
          </button>
          {mobileTasksOpen && (
            <div className="mt-1.5 bg-[#0c111b]/96 border border-slate-700 rounded-md p-2.5 max-w-[260px] shadow-xl">
              <ul className="space-y-1.5 text-xs">
                {snapshot.self.tasks.map((t) => {
                  const curStage = t.stages[t.currentStageIndex];
                  const stageRoom = curStage ? ROOM_BY_ID[curStage.roomId]?.shortName : '';
                  return (
                    <li
                      key={t.taskId}
                      className={`flex items-start justify-between gap-2 ${
                        t.completed ? 'text-emerald-400/80 line-through' : 'text-slate-200'
                      }`}
                    >
                      <span>{t.title}</span>
                      {!t.completed && (
                        <span className="text-[10px] font-mono-tabular text-amber-300 shrink-0">
                          {stageRoom}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Top-Center Alerts: Blackout, Observer Mode, Shield Notices */}
      <div className="station-hud-alerts fixed top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-[440px] w-full px-4">
        {!isAlive && (
          <div className="bg-[#151c29]/95 border border-sky-500/60 rounded-md px-4 py-2 text-xs text-sky-200 text-center">
            Режим наблюдения · Завершайте оставшиеся задания через терминалы
          </div>
        )}

        {snapshot.lightsOut && (
          <div className="bg-red-950/94 border border-red-500/75 rounded-md px-4 py-2 text-xs text-red-100 flex items-center gap-2">
            <ZapOff className="w-4 h-4 text-red-400 shrink-0" />
            <span>Освещение отключено! Восстановите щит в Электрощитовой.</span>
          </div>
        )}

        {notice && (
          <div className="bg-[#0e1b2c]/95 border border-sky-400/75 rounded-md px-4 py-2 text-xs text-sky-100 text-center">
            {notice.message}
          </div>
        )}

        {actionError && (
          <div className="bg-amber-950/95 border border-amber-500/75 rounded-md px-4 py-2 text-xs text-amber-100 text-center">
            {actionError}
          </div>
        )}
      </div>

      {/* Top-Right: Utility Controls + Live Radar MiniMap */}
      <div className="station-hud-utilities fixed top-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleMap}
            aria-label="Открыть карту станции (M)"
            title="Карта [M / Tab]"
            className="h-9 px-2.5 sm:px-3 bg-[#0c111b]/92 hover:bg-[#192334] border border-slate-700/80 rounded-md text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
          >
            <MapIcon className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Карта{!touchAvailable ? ' [M]' : ''}</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            title={muted ? 'Включить звук [V]' : 'Выключить звук [V]'}
            className="w-9 h-9 bg-[#0c111b]/92 hover:bg-[#192334] border border-slate-700/80 rounded-md flex items-center justify-center text-slate-200"
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-200" />}
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            aria-label="Настройки и пауза (Esc)"
            title="Настройки [P / Esc]"
            className="w-9 h-9 bg-[#0c111b]/92 hover:bg-[#192334] border border-slate-700/80 rounded-md flex items-center justify-center text-slate-200"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <MiniMap
          snapshot={snapshot}
          playerX={telemetry.playerX}
          playerZ={telemetry.playerZ}
          playerYaw={telemetry.playerYaw}
          onOpenFullMap={onToggleMap}
        />
      </div>

      {/* Center Crosshair */}
      <div
        aria-hidden="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <svg width="22" height="22" viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="2" fill="#eef2f7" fillOpacity="0.88" />
          <path
            d="M11 2 V6 M11 16 V20 M2 11 H6 M16 11 H20"
            stroke="#eef2f7"
            strokeOpacity="0.58"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Bottom-Left Desktop Status Card (hidden on touch to keep joystick clear) */}
      {!touchAvailable && (
        <div className="station-hud-abilities fixed bottom-4 left-4">
          {isCrew && isAlive && (
            <div className="bg-[#0c111b]/92 border border-slate-700/80 rounded-lg px-3.5 py-2.5 max-w-[320px] shadow-lg">
              <div className="flex items-center gap-2">
                <Shield
                  className={`w-4 h-4 shrink-0 ${
                    shieldIsActive
                      ? 'text-sky-300'
                      : shieldReady
                        ? 'text-sky-400'
                        : 'text-slate-500'
                  }`}
                />
                <span
                  data-testid="shield-status-label"
                  className={`text-sm font-display font-bold ${
                    shieldIsActive
                      ? 'text-sky-300'
                      : shieldReady
                        ? 'text-sky-400'
                        : 'text-slate-300'
                  }`}
                >
                  {shieldLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono-tabular">{shieldReasonText}</p>
            </div>
          )}

          {isSaboteur && isAlive && (
            <div className="bg-[#0c111b]/92 border border-red-900/80 rounded-lg px-3.5 py-2.5 shadow-lg">
              <div className="text-xs font-mono-tabular text-red-300 font-semibold">
                Атака [F]: {killCd > 0 ? `${killCd} с` : 'Готова'} · Свет [L]:{' '}
                {snapshot.lightsOut ? 'отключён' : sabCd > 0 ? `${sabCd} с` : 'готов'}
              </div>
              {slowedSec > 0 && (
                <div className="text-xs text-sky-300 mt-0.5 font-mono-tabular">
                  Замедление щитом: {slowedSec.toFixed(1)} с
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Right-Hand Ergonomic Action Cluster (Directly clickable/tappable on Mobile AND Desktop!) */}
      <div className="station-action-pad">
        {/* Contextual target label right above action buttons */}
        {telemetry.nearbyInteraction && (
          <div className="bg-[#0e1624]/95 border border-amber-400/75 rounded-md px-3 py-1.5 text-xs font-semibold text-amber-200 max-w-[260px] text-right shadow-lg">
            {telemetry.nearbyInteraction.label}
          </div>
        )}
        {isSaboteur && isAlive && telemetry.nearbyAttackTarget && (
          <div className="bg-red-950/95 border border-red-500/80 rounded-md px-3 py-1.5 text-xs font-semibold text-red-100 max-w-[260px] text-right shadow-lg">
            Цель рядом: {telemetry.nearbyAttackTarget.name}
          </div>
        )}

        {/* Secondary row: Sabotage (saboteur) or Shield (crew) */}
        <div className="station-action-row">
          {isSaboteur && isAlive && (
            <button
              type="button"
              disabled={!canSabotage}
              onClick={onSabotageLights}
              aria-label="Отключить свет (саботаж)"
              className="station-action-btn station-action-btn--sabotage"
            >
              <ZapOff className="w-5 h-5" />
              <span>{snapshot.lightsOut ? 'Темно' : sabCd > 0 ? `${sabCd} с` : 'Свет'}</span>
              <span className="station-action-btn__kbd">L</span>
            </button>
          )}

          {isSaboteur && isAlive && (
            <button
              type="button"
              disabled={!canAttack}
              onClick={() => telemetry.nearbyAttackTarget && onAttackTarget(telemetry.nearbyAttackTarget.id)}
              aria-label="Вывести из строя игрока рядом"
              className="station-action-btn station-action-btn--attack"
            >
              <Crosshair className="w-5 h-5" />
              <span>{killCd > 0 ? `${killCd} с` : 'Атака'}</span>
              <span className="station-action-btn__kbd">F</span>
            </button>
          )}

          {isCrew && isAlive && shieldRuleEnabled && (
            <button
              type="button"
              disabled={!shieldReady}
              onClick={onActivateShield}
              aria-label="Активировать персональный щит"
              className="station-action-btn station-action-btn--shield"
            >
              <Shield className="w-5 h-5" />
              <span>
                {shieldIsActive
                  ? `${shieldActiveRemaining.toFixed(1)}с`
                  : snapshot.shieldUnlocked && snapshot.self.shieldCharge > 0
                    ? 'Щит'
                    : snapshot.self.shieldCharge === 0
                      ? 'Пуст'
                      : 'Закрыт'}
              </span>
              <span className="station-action-btn__kbd">Q</span>
            </button>
          )}
        </div>

        {/* Primary row: Report (R) + Use (E) */}
        <div className="station-action-row">
          {isAlive && (
            <button
              type="button"
              disabled={!canReport}
              onClick={() => telemetry.nearbyBodyId && onReportBody(telemetry.nearbyBodyId)}
              aria-label="Сообщить о выбывшем"
              className="station-action-btn station-action-btn--report"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Сообщить</span>
              <span className="station-action-btn__kbd">R</span>
            </button>
          )}

          <button
            type="button"
            disabled={!canUse}
            onClick={() => telemetry.nearbyInteraction && onInteract(telemetry.nearbyInteraction)}
            aria-label="Использовать терминал рядом"
            className="station-action-btn station-action-btn--use"
          >
            <Hand className="w-5 h-5" />
            <span>Использ.</span>
            <span className="station-action-btn__kbd">E</span>
          </button>
        </div>
      </div>
    </div>
  );
}
