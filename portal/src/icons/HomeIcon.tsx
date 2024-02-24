interface Props {
    height?: number;
    width?: number;
    color?: string;
}

function HomeIcon({height = 48, width = 48, color = 'black'}: Props) {
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
                    d='M250 455 c0 -8 -7 -15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 -7 -15 -15
-15 -8 0 -15 -7 -15 -15 0 -11 -12 -15 -50 -15 -43 0 -50 -3 -50 -20 0 -11 -7
-20 -15 -20 -13 0 -15 -24 -15 -155 l0 -155 205 0 205 0 0 175 0 175 -65 0
c-51 0 -65 3 -65 15 0 8 -7 15 -15 15 -8 0 -15 7 -15 15 0 8 -7 15 -15 15 -8
0 -15 7 -15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z m30 -60 c0 -8 -7 -15
-15 -15 -8 0 -15 7 -15 15 0 8 7 15 15 15 8 0 15 -7 15 -15z m160 -195 c0
-118 -2 -140 -15 -140 -8 0 -15 7 -15 15 0 13 -24 15 -160 15 l-160 0 0 125 0
125 175 0 175 0 0 -140z'
                />
                <path
                    d='M220 295 c0 -8 -7 -15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 -7 -15 -15
-15 -12 0 -15 -13 -15 -60 l0 -60 45 0 c33 0 45 4 45 15 0 8 7 15 15 15 8 0
15 -7 15 -15 0 -11 12 -15 45 -15 l45 0 0 60 c0 47 -3 60 -15 60 -8 0 -15 7
-15 15 0 8 -7 15 -15 15 -8 0 -15 7 -15 15 0 11 -12 15 -45 15 -33 0 -45 -4
-45 -15z m30 -90 c0 -8 -7 -15 -15 -15 -8 0 -15 7 -15 15 0 8 7 15 15 15 8 0
15 -7 15 -15z m60 0 c0 -8 -7 -15 -15 -15 -8 0 -15 7 -15 15 0 8 7 15 15 15 8
0 15 -7 15 -15z'
                />
            </g>
        </svg>
    );
}

export default HomeIcon;
