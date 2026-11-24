import { memo } from 'react';
import { Maximize2 } from 'lucide-react';
import { CORRIDORS, getRoomAt, ROOMS, ROOM_BY_ID, TERMINAL_BY_ID, WALL_SEGMENTS } from '../../shared/mapData';
import type { RoomSnapshot } from '../../shared/types';

interface MiniMapProps {
  snapshot: RoomSnapshot;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  onOpenFullMap: () => void;
}

/**
 * Compact real-time radar minimap rendered in the HUD during gameplay.
 * Click/tap anywhere on the minimap to open the full interactive Station Map.
 */
export const MiniMap = memo(function MiniMap({
  snapshot,
  playerX,
  playerZ,
  playerYaw,
  onOpenFullMap,
}: MiniMapProps) {
  const activeTaskTerminals = snapshot.self.tasks.flatMap((task) => {
    const stage = !task.completed ? task.stages[task.currentStageIndex] : undefined;
    const terminal = stage ? TERMINAL_BY_ID[stage.terminalId] : undefined;
    return terminal ? [{ id: task.taskId, terminal }] : [];
  });

  const lightsTerminal = snapshot.lightsOut ? TERMINAL_BY_ID.ele_lights : null;
  const headingDeg = (-playerYaw * 180) / Math.PI;
  const currentRoomId = getRoomAt(playerX, playerZ);
  const currentRoomName = currentRoomId ? ROOM_BY_ID[currentRoomId].shortName : 'КОРИДОР';

  return (
    <button
      type="button"
      onClick={onOpenFullMap}
      data-testid="hud-minimap"
      aria-label={`Миникарта станции: ${currentRoomName}. Нажмите, чтобы открыть полную карту`}
      title="Открыть полную карту [M / Tab]"
      className="station-minimap group pointer-events-auto text-left"
    >
      <div className="station-minimap__head">
        <span className="station-minimap__room">{currentRoomName}</span>
        <span className="station-minimap__expand" aria-hidden="true">
          <Maximize2 className="w-3 h-3" />
        </span>
      </div>
      <svg
        viewBox="-38 -25 76 50"
        className="station-minimap__svg"
        aria-hidden="true"
        focusable="false"
      >
        {CORRIDORS.map(({ id, bounds }) => (
          <rect
            key={id}
            x={bounds.x1}
            y={bounds.z1}
            width={bounds.x2 - bounds.x1}
            height={bounds.z2 - bounds.z1}
            fill="#27313d"
          />
        ))}
        {ROOMS.map(({ id, bounds }) => (
          <rect
            key={id}
            x={bounds.x1}
            y={bounds.z1}
            width={bounds.x2 - bounds.x1}
            height={bounds.z2 - bounds.z1}
            fill={id === currentRoomId ? '#3c5269' : '#2f3a47'}
          />
        ))}
        <g stroke="#7d8f9f" strokeWidth="0.6" strokeLinecap="round">
          {WALL_SEGMENTS.map((wall, idx) => (
            <line key={idx} x1={wall.x1} y1={wall.z1} x2={wall.x2} y2={wall.z2} />
          ))}
        </g>

        {/* Active task targets */}
        {activeTaskTerminals.map(({ id, terminal }) => (
          <circle
            key={id}
            cx={terminal.x}
            cy={terminal.z}
            r="1.9"
            fill="#f59e0b"
            stroke="#0d131d"
            strokeWidth="0.65"
          />
        ))}

        {/* Blackout repair alert */}
        {lightsTerminal && (
          <path
            transform={`translate(${lightsTerminal.x} ${lightsTerminal.z})`}
            d="M0-2.6 2.5 1.9h-5Z"
            fill="#f87171"
            stroke="#1f0a0a"
            strokeWidth="0.65"
            strokeLinejoin="round"
          />
        )}

        {/* Player FOV cone & position arrow */}
        <g transform={`translate(${playerX} ${playerZ}) rotate(${headingDeg})`}>
          <path d="M0 0 L-5.2 -9.5 A11 11 0 0 1 5.2 -9.5 Z" fill="#38bdf8" fillOpacity="0.22" />
          <path
            d="M0-2.8 2.1 2.0 0 1.0 -2.1 2.0 Z"
            fill="#e0f2fe"
            stroke="#0c1926"
            strokeWidth="0.65"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </button>
  );
});
