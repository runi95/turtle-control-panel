interface Props {
    height?: number;
    width?: number;
    color?: string;
}

function ExploreIcon({height = 48, width = 48, color = 'black'}: Props) {
    return (
        <svg
            version='1.0'
            xmlns='http://www.w3.org/2000/svg'
            width={width}
            height={height}
            viewBox='0 0 50.000000 50.000000'
            preserveAspectRatio='xMidYMid meet'
            color={color}
        >
            <g transform='translate(0.000000,50.000000) scale(0.100000,-0.100000)' fill='currentcolor' stroke='none'>
                <path
                    d='M190 455 c0 -10 -11 -15 -35 -15 -24 0 -35 -5 -35 -15 0 -8 -7 -15
-15 -15 -8 0 -15 -7 -15 -15 0 -8 -7 -15 -15 -15 -8 0 -15 -9 -15 -20 0 -11
-7 -20 -15 -20 -12 0 -15 -17 -15 -90 0 -73 3 -90 15 -90 8 0 15 -7 15 -15 0
-8 7 -15 15 -15 8 0 15 -9 15 -20 0 -11 7 -20 15 -20 8 0 15 -7 15 -15 0 -10
11 -15 35 -15 24 0 35 -5 35 -15 0 -12 13 -15 60 -15 47 0 60 3 60 15 0 10 11
15 35 15 24 0 35 5 35 15 0 8 7 15 15 15 8 0 15 9 15 20 0 11 7 20 15 20 8 0
15 7 15 15 0 8 7 15 15 15 12 0 15 17 15 90 0 73 -3 90 -15 90 -8 0 -15 9 -15
20 0 11 -7 20 -15 20 -8 0 -15 7 -15 15 0 8 -7 15 -15 15 -8 0 -15 7 -15 15 0
10 -11 15 -35 15 -24 0 -35 5 -35 15 0 12 -13 15 -60 15 -47 0 -60 -3 -60 -15z
m110 -40 c0 -10 11 -15 35 -15 24 0 35 -5 35 -15 0 -8 7 -15 15 -15 8 0 15 -9
15 -20 0 -11 6 -20 13 -20 10 0 14 -21 14 -80 1 -63 -2 -80 -13 -80 -8 0 -14
-7 -14 -15 0 -8 -7 -15 -15 -15 -8 0 -15 -9 -15 -20 0 -16 -7 -20 -35 -20 -22
0 -35 -5 -35 -13 0 -9 -15 -13 -50 -13 -35 0 -50 4 -50 13 0 8 -13 13 -35 13
-28 0 -35 4 -35 20 0 11 -7 20 -15 20 -8 0 -15 7 -15 15 0 8 -6 15 -14 15 -11
0 -14 17 -13 80 0 59 4 80 14 80 7 0 13 9 13 20 0 11 7 20 15 20 8 0 15 7 15
15 0 10 11 15 35 15 24 0 35 5 35 15 0 11 12 15 50 15 38 0 50 -4 50 -15z'
                />
                <path
                    d='M221 378 l2 -43 6 35 6 35 14 -32 c19 -45 31 -41 30 10 l-2 42 -6
-35 -6 -35 -14 33 c-19 44 -31 40 -30 -10z'
                />
                <path
                    d='M289 315 c-58 -46 -146 -151 -136 -162 11 -10 116 78 162 136 69 86
60 95 -26 26z'
                />
            </g>
        </svg>
    );
}

export default ExploreIcon;
