interface Props {
    height?: number;
    width?: number;
    color?: string;
}

function RefuelIcon({height = 48, width = 48, color = 'black'}: Props) {
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
                    d='M220 395 c0 -8 -7 -15 -15 -15 -8 0 -15 -9 -15 -20 0 -11 -7 -20 -15
-20 -8 0 -15 -7 -15 -15 0 -8 -9 -15 -20 -15 -11 0 -20 -7 -20 -15 0 -8 -7
-15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 -7 -15 -15 -15 -11 0 -15 -12 -15 -45 0
-33 4 -45 15 -45 8 0 15 -7 15 -15 0 -8 7 -15 15 -15 8 0 15 -9 15 -20 0 -16
7 -20 35 -20 24 0 35 -5 35 -15 0 -12 13 -15 60 -15 47 0 60 3 60 15 0 10 10
15 30 15 23 0 30 4 30 20 0 13 7 20 20 20 11 0 20 7 20 15 0 8 7 15 15 15 11
0 15 12 15 45 0 33 -4 45 -15 45 -8 0 -15 7 -15 15 0 8 -9 15 -20 15 -11 0
-20 7 -20 15 0 8 -7 15 -15 15 -8 0 -15 7 -15 15 0 8 -7 15 -15 15 -8 0 -15 9
-15 20 0 11 -7 20 -15 20 -8 0 -15 7 -15 15 0 10 -10 15 -30 15 -20 0 -30 -5
-30 -15z m30 -70 c0 -8 -7 -15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 7 -15 15 -15
8 0 15 -7 15 -15 0 -8 7 -15 15 -15 8 0 15 -7 15 -15 0 -8 -7 -15 -15 -15 -8
0 -15 7 -15 15 0 8 -7 15 -15 15 -8 0 -15 7 -15 15 0 8 -7 15 -15 15 -8 0 -15
7 -15 15 0 8 7 15 15 15 8 0 15 7 15 15 0 8 7 15 15 15 8 0 15 -7 15 -15z m60
-30 c0 -8 -7 -15 -15 -15 -8 0 -15 7 -15 15 0 8 7 15 15 15 8 0 15 -7 15 -15z
m-150 -60 c0 -8 -9 -15 -20 -15 -11 0 -20 7 -20 15 0 8 9 15 20 15 11 0 20 -7
20 -15z m60 -30 c0 -8 -7 -15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 -7 -15 -15
-15 -8 0 -15 7 -15 15 0 8 7 15 15 15 8 0 15 7 15 15 0 8 7 15 15 15 8 0 15
-7 15 -15z'
                />
            </g>
        </svg>
    );
}

export default RefuelIcon;