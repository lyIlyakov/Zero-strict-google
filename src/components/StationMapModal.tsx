import { useEffect, useRef, useState } from 'react';
import { Compass, LocateFixed, Radio, TriangleAlert, X } from 'lucide-react';
import {
  CORRIDORS,
  getRoomAt,
  ROOMS,
  ROOM_BY_ID,
  SOLID_OBSTACLES,
  TERMINAL_BY_ID,
  WALL_SEGMENTS,
} from '../../shared/mapData';
import type { RoomId, RoomSnapshot, TaskTypeId } from '../../shared/types';
import { ROOM_LANDMARK_NAMES } from '../game/dockLandmarks';
import { soundEngine } from '../game/sound';
import './dock.css';

interface StationMapModalProps {
  snapshot: RoomSnapshot;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  onClose: () => void;
}

// Position labels in negative space so neither routes nor task markers cover them.
const mapLabels: Record<RoomId, { name: string; y: number; color: string }> = {
  command: { name: 'Командный', y: -6.8, color: '#6b5c46' },
  medbay: { name: 'Медотсек', y: -22.7, color: '#3f625f' },
  storage: { name: 'Склад', y: 24.0, color: '#684e33' },
  comms: { name: 'Связь', y: -22.7, color: '#3e556c' },
  navigation: { name: 'Навигация', y: -22.7, color: '#564d6d' },
  reactor: { name: 'Реакторная', y: -8.6, color: '#754b3d' },
  airlock: { name: 'Шлюз', y: -8.6, color: '#4d5863' },
  electrical: { name: 'Электро', y: 24.0, color: '#685836' },
  hydroponics: { name: 'Гидропоника', y: 24.0, color: '#3f5f47' },
};

function LandmarkMark({ room }: { room: RoomId }) {
  switch (room) {
    case 'command': return <path d="M-1.8-.9H1.8L2.3 0 1.8.9h-3.6L-2.3 0Z" />;
    case 'medbay': return <path d="M-1.6-.9h3.2v1.8h-3.2zM0-.55v1.1m-.55-.55h1.1" />;
    case 'storage': return <path d="M-2-.85h4v1.7h-4zM0-.85v1.7" />;
    case 'comms': return <path d="M-1.5-1.15h3v2.3h-3zM-1.5 0h3" />;
    case 'navigation': return <path d="M-1.1-1.05h2.2l.8 2.1h-3.8zM-.63.25H.63" />;
    case 'reactor': return <circle r="1.5" />;
    case 'airlock': return <path d="M-1.5-1.1h1.15v2.2H-1.5zM.35-1.1H1.5v2.2H.35z" />;
    case 'electrical': return <path d="M-1.9-.8h3.8v1.6h-3.8zM-.65-.8V.8M.65-.8V.8" />;
    case 'hydroponics': return <path d="M-2.45-.8h4.9v1.6h-4.9zM-1.2 0h2.4" />;
  }
}

export function StationMapModal({ snapshot, playerX, playerZ, playerYaw, onClose }: StationMapModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const currentRoom = getRoomAt(playerX, playerZ);
  const [selectedRoom, setSelectedRoom] = useState<RoomId | null>(currentRoom);
  const [focusedTaskId, setFocusedTaskId] = useState<TaskTypeId | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    closeRef.current?.focus();
    return () => { dialog?.close(); };
  }, []);

  const activeTasks = snapshot.self.tasks.flatMap((task) => {
    const stage = !task.completed && task.stages[task.currentStageIndex];
    const terminal = stage ? TERMINAL_BY_ID[stage.terminalId] : undefined;
    return terminal
      ? [{ id: task.taskId, title: task.title, step: task.currentStageIndex + 1, steps: task.stages.length, terminal }]
      : [];
  });

  const focusedTask = activeTasks.find((t) => t.id === focusedTaskId) ?? null;
  const lightsTerminal = snapshot.lightsOut ? TERMINAL_BY_ID.ele_lights : null;
  const echoTerminal = TERMINAL_BY_ID.cmd_sensor_echo;
  const heading = (-playerYaw * 180) / Math.PI;
  const location = currentRoom ? ROOM_BY_ID[currentRoom].name : 'Коридор';
  const currentLandmark = currentRoom ? ROOM_LANDMARK_NAMES[currentRoom] : null;
  const inspectedRoom = selectedRoom ? ROOM_BY_ID[selectedRoom] : null;
  const inspectedTasks = selectedRoom ? activeTasks.filter((t) => t.terminal.roomId === selectedRoom) : [];

  return (
    <dialog
      ref={dialogRef}
      className="dock-ui dock-dialog dock-map"
      aria-labelledby="dock-map-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Tab' || event.key === 'm' || event.key === 'M' || event.key === 'ь' || event.key === 'Ь') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="dock-dialog__header">
        <div>
          <h2 id="dock-map-title">Карта станции «Каскад»</h2>
          <p className="dock-muted">
            Нажмите на отсек или задание, чтобы подсветить маршрут · Основной ярус
          </p>
        </div>
        <button
          type="button"
          ref={closeRef}
          onClick={onClose}
          aria-label="Закрыть карту"
          className="dock-button dock-map__close"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="dock-map__body">
        <div className="dock-map__status-row">
          <p className="dock-map__location">
            <LocateFixed size={17} aria-hidden="true" />
            <span>
              <strong>{location}</strong>
              {currentLandmark && <span className="dock-muted"> · {currentLandmark}</span>}
            </span>
          </p>
          <span className="dock-map__progress">
            Ремонт: <strong>{snapshot.completedCrewTasks}/{snapshot.requiredCrewTasks}</strong>
          </span>
        </div>

        <svg
          viewBox="-39 -27 78 54"
          role="img"
          aria-labelledby="dock-map-diagram-title dock-map-diagram-desc"
          className="dock-map__plan"
        >
          <title id="dock-map-diagram-title">Интерактивный план девяти отсеков станции</title>
          <desc id="dock-map-diagram-desc">
            {`Ваше положение: ${location}. ${
              activeTasks.length
                ? `Задания: ${activeTasks.map(({ terminal }) => `${ROOM_BY_ID[terminal.roomId].name} — ${terminal.label}`).join('; ')}.`
                : 'Активных заданий нет.'
            }${lightsTerminal ? ' Восстановление света: электрощитовая.' : ''}`}
          </desc>

          {/* Subtle Blueprint Grid */}
          <defs>
            <pattern id="map-grid" width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#28313b" strokeWidth="0.14" />
            </pattern>
          </defs>
          <rect x="-39" y="-27" width="78" height="54" fill="url(#map-grid)" />

          {CORRIDORS.map(({ id, bounds }) => (
            <rect
              key={id}
              x={bounds.x1}
              y={bounds.z1}
              width={bounds.x2 - bounds.x1}
              height={bounds.z2 - bounds.z1}
              fill="#333b42"
            />
          ))}

          {ROOMS.map(({ id, bounds }) => {
            const isSelected = selectedRoom === id;
            const isCurrent = currentRoom === id;
            return (
              <rect
                key={id}
                x={bounds.x1}
                y={bounds.z1}
                width={bounds.x2 - bounds.x1}
                height={bounds.z2 - bounds.z1}
                fill={mapLabels[id].color}
                fillOpacity={isSelected ? 1 : 0.84}
                stroke={isSelected ? '#f4c77c' : isCurrent ? '#7dd3fc' : 'none'}
                strokeWidth={isSelected ? 0.55 : isCurrent ? 0.42 : 0}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedRoom(id);
                }}
              />
            );
          })}

          <g stroke="#b8b5a2" strokeWidth=".3" strokeLinecap="round" pointerEvents="none">
            {WALL_SEGMENTS.map((wall, index) => (
              <line key={index} x1={wall.x1} y1={wall.z1} x2={wall.x2} y2={wall.z2} />
            ))}
          </g>

          <g className="dock-map__room-labels" pointerEvents="none">
            {ROOMS.map(({ id, bounds }) => (
              <text key={id} x={(bounds.x1 + bounds.x2) / 2} y={mapLabels[id].y} textAnchor="middle">
                {mapLabels[id].name}
              </text>
            ))}
          </g>

          <g fill="#262a2c" stroke="#ddd0b0" strokeWidth=".28" strokeLinejoin="round" pointerEvents="none">
            {SOLID_OBSTACLES.map(({ id, roomId, bounds }) =>
              roomId === 'corridor' ? null : (
                <g key={id} transform={`translate(${(bounds.x1 + bounds.x2) / 2} ${(bounds.z1 + bounds.z2) / 2})`}>
                  <title>{ROOM_LANDMARK_NAMES[roomId]}</title>
                  <LandmarkMark room={roomId} />
                </g>
              ),
            )}
          </g>

          {/* Sensor Echo Terminal Marker */}
          {echoTerminal && (
            <g transform={`translate(${echoTerminal.x} ${echoTerminal.z})`} pointerEvents="none">
              <rect x="-.8" y="-.8" width="1.6" height="1.6" rx=".3" fill="#38bdf8" stroke="#132230" strokeWidth=".26" />
            </g>
          )}

          {/* Direct Guide Vector to Focused Task */}
          {focusedTask && (
            <line
              x1={playerX}
              y1={playerZ}
              x2={focusedTask.terminal.x}
              y2={focusedTask.terminal.z}
              stroke="#fbbf24"
              strokeWidth="0.45"
              strokeDasharray="1.2 0.9"
              pointerEvents="none"
            />
          )}

          {/* Active Task Waypoints */}
          {activeTasks.map(({ id, terminal }) => {
            const isFocused = focusedTaskId === id;
            return (
              <g
                key={id}
                transform={`translate(${terminal.x} ${terminal.z})`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  soundEngine.playClick();
                  setFocusedTaskId(isFocused ? null : id);
                  setSelectedRoom(terminal.roomId);
                }}
              >
                {isFocused && (
                  <circle r="2.2" fill="none" stroke="#fde68a" strokeWidth=".36" />
                )}
                <circle r={isFocused ? 1.25 : 1.02} fill="#f5b953" stroke="#1f1b14" strokeWidth=".32" />
              </g>
            );
          })}

          {/* Blackout Repair Alert */}
          {lightsTerminal && (
            <g transform={`translate(${lightsTerminal.x} ${lightsTerminal.z})`} pointerEvents="none">
              <path d="M0-1.85 1.75 1.25h-3.5Z" fill="#f87171" stroke="#221010" strokeWidth=".35" strokeLinejoin="round" />
            </g>
          )}

          {/* Player Directional FOV Cone & Marker */}
          <g transform={`translate(${playerX} ${playerZ}) rotate(${heading})`} pointerEvents="none">
            <path d="M0 0 L-3.6 -7.2 A8.2 8.2 0 0 1 3.6 -7.2 Z" fill="#7dd3fc" fillOpacity="0.22" />
            <path
              d="M0-1.95 1.35 1.25 0 .7 -1.35 1.25Z"
              fill="#e0f2fe"
              stroke="#12212b"
              strokeWidth=".32"
              strokeLinejoin="round"
            />
          </g>
        </svg>

        {/* Interactive Room Inspector Strip */}
        {inspectedRoom && (
          <div className="dock-map__inspector">
            <div className="dock-map__inspector-head">
              <Compass size={16} aria-hidden="true" />
              <strong>{inspectedRoom.name}</strong>
              <span className="dock-muted">· {ROOM_LANDMARK_NAMES[inspectedRoom.id]}</span>
            </div>
            <p className="dock-muted">{inspectedRoom.description}</p>
            {inspectedTasks.length > 0 && (
              <p className="dock-map__inspector-tasks">
                Активные задания здесь: {inspectedTasks.map((t) => t.title).join(', ')}
              </p>
            )}
          </div>
        )}

        <ul className="dock-map__key" aria-label="Условные обозначения">
          <li><span className="dock-map__player" aria-hidden="true" /> Вы и направление обзора</li>
          <li><span className="dock-map__task" aria-hidden="true" /> Задания: {activeTasks.length}</li>
          <li><span className="dock-map__echo" aria-hidden="true" /><Radio size={13} aria-hidden="true" /> Эхо датчика</li>
          <li><span className="dock-map__landmark" aria-hidden="true" /> Ориентир</li>
          {lightsTerminal && (
            <li className="dock-map__alarm">
              <TriangleAlert size={15} aria-hidden="true" /> Щит света (Электро)
            </li>
          )}
        </ul>

        <section className="dock-map__assignments" aria-labelledby="dock-map-tasks">
          <h3 id="dock-map-tasks">
            {snapshot.self.role === 'saboteur' ? 'Задания для прикрытия' : 'Ваши задания'}
          </h3>
          {activeTasks.length ? (
            <ul>
              {activeTasks.map(({ id, title, step, steps, terminal }) => {
                const isFocused = focusedTaskId === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`dock-map__task-row ${isFocused ? 'dock-map__task-row--active' : ''}`}
                      onClick={() => {
                        soundEngine.playClick();
                        setFocusedTaskId(isFocused ? null : id);
                        setSelectedRoom(terminal.roomId);
                      }}
                    >
                      <span>
                        <strong>{title}</strong>
                        {steps > 1 && <span className="dock-muted"> · этап {step} из {steps}</span>}
                      </span>
                      <span className="dock-muted">
                        {ROOM_BY_ID[terminal.roomId].name} · {terminal.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="dock-muted">Все назначенные задания выполнены.</p>
          )}
        </section>
      </div>
    </dialog>
  );
}
