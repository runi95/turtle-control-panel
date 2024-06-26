interface Props {
    height?: number;
    width?: number;
    color?: string;
}

function BookIcon({height = 48, width = 48, color = 'black'}: Props) {
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
                    d='M250 455 c0 -10 -10 -15 -30 -15 -20 0 -30 -5 -30 -15 0 -10 -11 -15
-35 -15 -24 0 -35 -5 -35 -15 0 -10 -10 -15 -30 -15 -23 0 -30 -4 -30 -20 0
-16 -7 -20 -30 -20 l-30 0 0 -75 c0 -60 3 -75 15 -75 8 0 15 -7 15 -15 0 -8 7
-15 15 -15 8 0 15 -7 15 -15 0 -8 7 -15 15 -15 8 0 15 -9 15 -20 0 -11 7 -20
15 -20 8 0 15 -7 15 -15 0 -8 9 -15 20 -15 11 0 20 -7 20 -15 0 -11 12 -15 45
-15 33 0 45 4 45 15 0 10 10 15 30 15 20 0 30 5 30 15 0 10 10 15 30 15 23 0
30 4 30 20 0 16 7 20 35 20 24 0 35 5 35 15 0 10 10 15 30 15 27 0 30 3 30 30
0 27 -3 30 -30 30 -20 0 -30 -5 -30 -15 0 -10 -11 -15 -35 -15 -24 0 -35 -5
-35 -15 0 -10 -10 -15 -30 -15 -20 0 -30 -5 -30 -15 0 -10 -10 -15 -30 -15
-23 0 -30 -4 -30 -20 0 -17 -7 -20 -45 -20 -38 0 -45 3 -45 20 0 13 -7 20 -20
20 -11 0 -20 7 -20 15 0 8 -7 15 -15 15 -8 0 -15 7 -15 15 0 8 -7 15 -15 15
-10 0 -15 10 -15 30 0 20 5 30 15 30 8 0 15 -7 15 -15 0 -8 7 -15 15 -15 8 0
15 -7 15 -15 0 -8 9 -15 20 -15 11 0 20 -7 20 -15 0 -11 12 -15 45 -15 33 0
45 4 45 15 0 10 10 15 30 15 20 0 30 5 30 15 0 10 10 15 30 15 20 0 30 5 30
15 0 11 12 15 50 15 38 0 50 4 50 15 0 8 7 15 15 15 8 0 15 7 15 15 0 8 -7 15
-15 15 -8 0 -15 7 -15 15 0 8 -7 15 -15 15 -8 0 -15 9 -15 20 0 11 -7 20 -15
20 -8 0 -15 7 -15 15 0 8 -9 15 -20 15 -11 0 -20 7 -20 15 0 8 -7 15 -15 15
-8 0 -15 7 -15 15 0 11 -12 15 -45 15 -33 0 -45 -4 -45 -15z'
                />
            </g>
        </svg>
    );
}

export default BookIcon;
