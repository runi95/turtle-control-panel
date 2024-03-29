interface Props {
    height?: number;
    width?: number;
    color?: string;
}

function CarIcon({height = 48, width = 48, color = 'black'}: Props) {
    return (
        <svg
            version='1.0'
            xmlns='http://www.w3.org/2000/svg'
            width={height}
            height={width}
            viewBox='0 0 50.000000 50.000000'
            preserveAspectRatio='xMidYMid meet'
            color={color}
        >
            <g transform='translate(0.000000,50.000000) scale(0.100000,-0.100000)' fill='currentcolor' stroke='none'>
                <path
                    d='M145 340 c-16 -35 -22 -40 -51 -40 -48 0 -64 -22 -64 -86 0 -50 2
-54 23 -54 12 0 30 -9 40 -20 10 -13 29 -20 50 -20 21 0 41 8 52 20 25 28 107
28 135 0 26 -26 81 -26 105 0 10 11 24 20 32 20 9 0 13 15 13 54 0 58 -16 86
-51 86 -12 0 -26 14 -39 40 l-20 40 -104 0 -103 0 -18 -40z m95 -35 c0 -30 -3
-35 -24 -35 -13 0 -26 -6 -28 -12 -3 -9 -9 -8 -22 4 -15 16 -16 20 -1 48 12
23 22 30 45 30 28 0 30 -3 30 -35z m90 0 c0 -34 -1 -35 -40 -35 -39 0 -40 1
-40 35 0 34 1 35 40 35 39 0 40 -1 40 -35z m45 5 c20 -38 19 -40 -10 -40 -22
0 -25 4 -25 35 0 43 14 45 35 5z m-295 -64 c0 -8 -5 -18 -10 -21 -5 -3 -10 3
-10 14 0 12 5 21 10 21 6 0 10 -6 10 -14z m370 -1 c0 -8 -4 -15 -10 -15 -5 0
-10 7 -10 15 0 8 5 15 10 15 6 0 10 -7 10 -15z m-298 -60 c0 -5 -5 -11 -11
-13 -6 -2 -11 4 -11 13 0 9 5 15 11 13 6 -2 11 -8 11 -13z m238 0 c0 -8 -4
-15 -10 -15 -5 0 -10 7 -10 15 0 8 5 15 10 15 6 0 10 -7 10 -15z'
                />
            </g>
        </svg>
    );
}

export default CarIcon;
