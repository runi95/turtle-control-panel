"use client";

interface Props {
  height?: number;
  width?: number;
  color?: string;
}

function CogIcon({ height = 48, width = 48, color = "black" }: Props) {
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 50.000000 50.000000"
      preserveAspectRatio="xMidYMid meet"
      color={color}
      filter="drop-shadow(0.2px 0 black) drop-shadow(-0.2px 0 black) drop-shadow(0 0.2px black) drop-shadow(0 -0.2px black) drop-shadow(0.2px 0.2px black) drop-shadow(-0.2px -0.2px black) drop-shadow(0.2px -0.2px black) drop-shadow(-0.2px 0.2px black)"
    >
      <g
        transform="translate(0.000000,50.000000) scale(0.100000,-0.100000)"
        fill="currentcolor"
        stroke="none"
      >
        <path
          d="M230 448 c0 -17 -11 -28 -45 -44 -43 -20 -45 -20 -61 -2 -13 14 -20
15 -31 6 -12 -10 -11 -14 5 -30 18 -18 18 -20 -2 -63 -16 -34 -27 -45 -43 -45
-14 0 -23 -6 -23 -15 0 -9 9 -15 23 -15 18 0 27 -11 44 -49 20 -49 20 -50 2
-67 -15 -13 -16 -20 -7 -31 10 -12 14 -11 30 5 18 18 22 18 64 3 38 -14 44
-20 44 -43 0 -21 5 -28 20 -28 15 0 20 7 20 28 0 23 6 29 44 43 42 15 46 15
64 -3 16 -16 20 -17 30 -5 9 11 8 18 -7 31 -18 17 -18 18 2 67 17 38 26 49 44
49 14 0 23 6 23 15 0 9 -9 15 -22 15 -17 0 -28 11 -44 45 -20 43 -20 45 -2 61
14 13 15 20 6 31 -10 12 -14 11 -30 -5 -18 -18 -20 -18 -63 2 -34 16 -45 27
-45 44 0 15 -6 22 -20 22 -14 0 -20 -7 -20 -22z m105 -101 c19 -19 37 -46 41
-60 23 -93 -63 -182 -156 -162 -41 9 -88 58 -96 100 -8 46 11 99 47 130 24 19
42 25 81 25 43 0 54 -4 83 -33z"
        />
      </g>
    </svg>
  );
}

export default CogIcon;
