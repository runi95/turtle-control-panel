"use client";

interface Props {
  height?: number;
  width?: number;
  color?: string;
}

function CameraIcon({ height = 48, width = 48, color = "black" }: Props) {
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      width={height}
      height={width}
      viewBox="0 0 50.000000 50.000000"
      preserveAspectRatio="xMidYMid meet"
      color={color}
    >
      <g
        transform="translate(0.000000,50.000000) scale(0.100000,-0.100000)"
        fill="currentcolor"
        stroke="none"
      >
        <path
          d="M195 410 c-5 -9 -28 -10 -86 -5 l-79 7 0 -156 c0 -143 1 -156 19
-166 12 -6 98 -10 210 -10 159 0 192 3 205 16 13 13 16 42 16 165 l0 149 -57
0 c-32 0 -94 3 -139 6 -59 5 -83 3 -89 -6z m118 -37 c15 -13 21 -15 24 -5 3 6
11 12 18 12 7 0 15 -6 18 -12 3 -10 8 -9 22 2 14 11 19 12 22 3 3 -7 11 -13
19 -13 9 0 14 -11 14 -30 l0 -30 -62 0 c-48 0 -59 -3 -50 -12 7 -7 12 -29 12
-51 0 -53 -43 -97 -95 -97 -52 0 -95 44 -95 97 0 22 5 44 12 51 9 9 -2 12 -50
12 -60 0 -62 1 -62 26 0 15 8 33 18 40 20 16 62 18 62 4 0 -15 33 -12 56 5 27
20 93 19 117 -2z"
        />
        <path
          d="M90 335 c0 -8 5 -15 10 -15 6 0 10 7 10 15 0 8 -4 15 -10 15 -5 0
-10 -7 -10 -15z"
        />
        <path
          d="M209 307 c-21 -16 -39 -51 -39 -77 0 -30 53 -80 85 -80 32 0 85 50
85 80 0 49 -38 89 -85 89 -16 0 -37 -5 -46 -12z"
        />
      </g>
    </svg>
  );
}

export default CameraIcon;
