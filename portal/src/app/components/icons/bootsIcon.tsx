"use client";

interface Props {
  height?: number;
  width?: number;
  color?: string;
}

function BootsIcon({ height = 48, width = 48, color = "black" }: Props) {
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
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
          d="M120 395 c0 -8 -7 -15 -15 -15 -12 0 -15 -16 -15 -80 0 -64 -3 -80
-15 -80 -8 0 -15 -7 -15 -15 0 -8 -7 -15 -15 -15 -11 0 -15 -12 -15 -50 l0
-50 65 0 c58 0 65 2 65 20 0 16 7 20 30 20 l30 0 0 140 0 140 -50 0 c-38 0
-50 -4 -50 -15z m70 -95 c0 -64 -3 -80 -15 -80 -8 0 -15 -7 -15 -15 0 -10 -11
-15 -35 -15 -24 0 -35 5 -35 15 0 8 7 15 15 15 12 0 15 16 15 80 l0 80 35 0
35 0 0 -80z"
        />
        <path
          d="M280 270 l0 -140 30 0 c23 0 30 -4 30 -20 0 -18 7 -20 65 -20 l65 0
0 50 c0 38 -4 50 -15 50 -8 0 -15 7 -15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15
-15 0 -10 -11 -15 -35 -15 -24 0 -35 5 -35 15 0 8 -7 15 -15 15 -12 0 -15 16
-15 80 l0 80 30 0 30 0 0 -80 c0 -73 2 -80 20 -80 18 0 20 7 20 80 0 73 -2 80
-20 80 -11 0 -20 7 -20 15 0 11 -12 15 -45 15 l-45 0 0 -140z"
        />
      </g>
    </svg>
  );
}

export default BootsIcon;
