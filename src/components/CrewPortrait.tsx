import { memo } from 'react';
import type { SkinId } from '../../shared/types';

const INK = '#272a2c';
const PAPER = '#fff4db';

function Headgear({ skin }: { skin: SkinId }) {
  switch (skin) {
    case 'standard':
      return <g>
        <path fill="#40565a" d="M17 26C16 19 18 12 24 10Q32 6 45 12Q49 15 49 21L41 25Z" />
        <path fill="#26383c" d="M16 23Q31 17 47 18L56 19Q60 20 54 23L42 26Q30 24 18 29Z" />
        <path fill="#eac187" d="m25 14 5-2 2 4-5 2z" />
      </g>;
    case 'survey':
      return <g>
        <path fill="#684d69" d="M11 31Q10 9 28 8Q47 6 51 19L46 21Q23 17 19 32L18 41 12 43Z" />
        <path fill="none" stroke="#302f39" strokeWidth="4" d="M15 21 47 13" />
        <g fill="#74c2bb" stroke="#323d46" strokeWidth="2.5" transform="rotate(-9 32 16)">
          <rect x="22" y="12" width="11" height="8" rx="3" /><rect x="35" y="12" width="11" height="8" rx="3" />
        </g>
        <ellipse cx="14" cy="33" rx="5.6" ry="8.5" fill="#392f40" /><ellipse cx="13" cy="32" rx="3.5" ry="5.5" fill="#917089" />
      </g>;
    case 'salvage':
      return <g>
        <path fill="#c98737" d="M13 27Q12 10 29 8Q46 5 50 20L52 24Z" />
        <path fill="#ebae56" d="M27 20Q24 12 27 7L33 6Q31 12 33 19Z" />
        <path fill="#a66632" d="M12 24Q30 18 48 18L55 19Q58 20 54 23L14 29Q10 29 12 24Z" />
        <path fill="#e9b973" d="M15 22Q29 17 47 17Q34 19 17 24Z" />
      </g>;
    case 'medic':
      return <g>
        <path fill="#e9dfca" d="M16 26 14 14Q15 8 23 9Q28 3 36 7Q46 4 49 11L50 20Q32 18 16 26Z" />
        <path fill="#429d99" d="M15 21Q32 16 50 17L50 22Q32 21 16 27Z" />
      </g>;
    case 'commander':
      return <g>
        <path fill="#223047" stroke={INK} strokeWidth="1.4" d="M14 24 10 12Q29 3 52 9L49 20Q31 17 14 24Z" />
        <path fill="#141d2c" d="M15 22Q33 16 50 18L58 20Q60 22 53 24L40 25Q27 23 16 27Z" />
        <path fill="#eab354" d="M15 19Q32 14 49 16L49 19Q32 17 15 22Z" />
        <circle cx="34" cy="12" r="3.4" fill="#f2c46c" stroke={INK} strokeWidth="1.2" />
      </g>;
    case 'mechanic':
      return <g>
        <path fill="#454e59" stroke={INK} strokeWidth="1.5" d="M13 28Q13 11 31 9Q48 9 51 22L47 24Q30 20 16 29Z" />
        <rect x="20" y="9" width="27" height="12" rx="4" fill="#262c34" stroke={INK} strokeWidth="1.6" transform="rotate(-5 33 15)" />
        <rect x="24" y="12" width="19" height="5.5" rx="2" fill="#f08c3a" transform="rotate(-5 33 15)" />
      </g>;
    case 'botanist':
      return <g>
        <path fill="#3f6e4f" stroke={INK} strokeWidth="1.5" d="M17 22 20 11Q32 6 45 11L47 21Z" />
        <path fill="#4f8660" stroke={INK} strokeWidth="1.5" d="M7 25Q29 16 57 22Q54 27 42 26Q26 24 11 30Q6 29 7 25Z" />
        <path fill="#a8d578" d="M36 12q6-5 9 1-4 4-9-1Z" />
      </g>;
    case 'cosmonaut':
      return <g>
        <line x1="17" y1="15" x2="13" y2="4" stroke="#d95b43" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="13" cy="4" r="2.6" fill="#facc15" stroke={INK} strokeWidth="1.1" />
        <path fill="#dfe6f0" stroke={INK} strokeWidth="1.5" d="M12 29Q12 8 33 8Q52 8 53 24L49 25Q32 19 15 29Z" />
        <path fill="#38bdf8" stroke="#1e3a52" strokeWidth="1.6" d="M21 17Q35 12 49 17Q48 23 36 22Q25 22 21 17Z" />
      </g>;
  }
}

const COAT_BY_SKIN: Record<SkinId, string> = {
  standard: '#40565a',
  survey: '#405847',
  salvage: '#805538',
  medic: '#d9dfcf',
  commander: '#223047',
  mechanic: '#525b66',
  botanist: '#3c6b52',
  cosmonaut: '#d8dee8',
};

// Один и тот же рисунок служит опознавательным знаком в гардеробе и в бюллетене.
export const CrewPortrait = memo(function CrewPortrait({ color, skin }: { color: string; skin: SkinId }) {
  const coat = COAT_BY_SKIN[skin] ?? '#40565a';
  const pupilShift = skin === 'survey' || skin === 'botanist' ? -2 : skin === 'medic' || skin === 'cosmonaut' ? 0 : 1;
  return <svg className="crew-portrait" viewBox="0 0 64 64" width="40" height="40" aria-hidden="true" focusable="false">
    <path fill={coat} stroke={INK} strokeWidth="2" d="M6 64Q7 54 20 49L38 46Q52 47 59 64Z" />
    {skin === 'commander' && (
      <g fill="#eab354" stroke={INK} strokeWidth="1">
        <rect x="11" y="51" width="9" height="4" rx="1.5" />
        <rect x="44" y="48" width="9" height="4" rx="1.5" />
      </g>
    )}
    {skin === 'cosmonaut' && (
      <path fill="none" stroke="#d95b43" strokeWidth="3.5" d="M18 52Q33 57 49 50" />
    )}
    <path fill={INK} d="m19 49 11 10 9-11-3-2-13 1z" />
    <path fill={color} stroke={INK} strokeWidth="1.8" d="M14 30C14 17 23 12 35 12C46 11 53 19 53 30L54 40Q54 53 37 54Q21 55 16 45Q11 45 10 39Q9 34 14 34Z" />
    <path fill="#211d25" opacity=".13" d="M14 31Q16 48 30 50Q40 54 51 47Q47 54 34 53Q19 53 16 44Q11 44 11 38Q11 35 14 36Z" />
    <ellipse cx="29" cy="34" rx="8.5" ry="10" fill={PAPER} transform="rotate(-9 29 34)" />
    <ellipse cx="46" cy="32" rx="7.3" ry="9.5" fill={PAPER} transform="rotate(-7 46 32)" />
    <g fill={INK} transform={`translate(${pupilShift} 0)`}>
      <ellipse cx="32" cy="35" rx="3.5" ry="5.4" /><ellipse cx="48" cy="33" rx="3.1" ry="5.1" />
    </g>
    <g fill="none" stroke={INK} strokeWidth="3.8" strokeLinecap="round">
      <path d={skin === 'salvage' || skin === 'commander' ? 'M22 24q5-1 10 2' : 'M22 25q4-5 10-4'} />
      <path d={skin === 'survey' || skin === 'mechanic' ? 'M42 20q4-3 8-1' : 'M42 23q5-3 8-1'} />
    </g>
    <ellipse cx="39" cy="41" rx="6.1" ry="4.8" fill="#ce7256" />
    <ellipse cx="40" cy="39.8" rx="4.5" ry="3.4" fill="#f4a57e" />
    <path d="M32 47q4 3 8 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
    <Headgear skin={skin} />
  </svg>;
});
