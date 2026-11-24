import { Gamepad2, LogOut, Play, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../game/sound';

interface PauseModalProps {
  sensitivity: number;
  muted: boolean;
  touchMode: 'auto' | 'on' | 'off';
  onSensitivityChange: (v: number) => void;
  onTouchModeChange: (mode: 'auto' | 'on' | 'off') => void;
  onToggleMute: () => void;
  onResume: () => void;
  onLeaveRoom: () => void;
}

export function PauseModal({
  sensitivity,
  muted,
  touchMode,
  onSensitivityChange,
  onTouchModeChange,
  onToggleMute,
  onResume,
  onLeaveRoom,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Настройки управления"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070b12]/85"
    >
      <div className="w-full max-w-[430px] bg-[#101723] border border-slate-700 rounded-lg shadow-2xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-100">Настройки смены</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Матч продолжается в реальном времени — настройте обзор и вернитесь в отсек.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="pause-sensitivity"
                className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                Чувствительность обзора
              </label>
              <span className="text-xs font-mono-tabular text-amber-300">
                {sensitivity.toFixed(1)}×
              </span>
            </div>
            <input
              id="pause-sensitivity"
              type="range"
              min={0.4}
              max={2.4}
              step={0.1}
              value={sensitivity}
              onChange={(e) => onSensitivityChange(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0b1019] border border-slate-700 rounded-md text-xs font-medium text-slate-200 hover:border-slate-500 cursor-pointer"
          >
            <span>Звуковые эффекты станции</span>
            <span className="flex items-center gap-1.5 text-sky-400">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {muted ? 'Выключены' : 'Включены'}
            </span>
          </button>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5 text-slate-400" />
              Экранный джойстик и сенсорные кнопки
            </div>
            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Режим сенсорного управления">
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
                  aria-pressed={touchMode === opt.id}
                  onClick={() => {
                    soundEngine.playClick();
                    onTouchModeChange(opt.id);
                  }}
                  className={`py-2 rounded-md border text-xs font-semibold cursor-pointer ${
                    touchMode === opt.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#0b1019] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono-tabular space-y-1 border-t border-slate-800 pt-3">
            <div>WASD — ходьба · Зажмите ЛКМ (или двойной клик) — обзор</div>
            <div>На телефоне: джойстик слева, свайп по экрану — обзор</div>
            <div>E — использовать · Q — щит · R — сообщить</div>
            <div>F — атака · L — саботаж света (саботажник)</div>
            <div>M / Tab — карта · P / Esc — пауза · V — звук</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClose();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-md cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Продолжить
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClose();
              onLeaveRoom();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent hover:bg-red-950/50 border border-slate-700 text-slate-300 hover:text-red-200 text-xs font-medium rounded-md cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Покинуть комнату
          </button>
        </div>
      </div>
    </div>
  );
}
