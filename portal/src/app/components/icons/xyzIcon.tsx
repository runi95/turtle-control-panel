"use client";

interface Props {
  height?: number;
  width?: number;
  color?: string;
}

function XYZIcon({ height = 48, width = 48, color = "black" }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 100 100"
      color={color}
    >
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        color="currentcolor"
        font-family="Arial, sans-serif"
        font-size="40"
      >
        (x,y,z)
      </text>
    </svg>
  );
}

export default XYZIcon;
