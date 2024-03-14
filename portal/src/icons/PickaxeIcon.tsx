interface Props {
    height?: number;
    width?: number;
    color?: string;
}

function PickaxeIcon({height = 48, width = 48, color = 'black'}: Props) {
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
                    d='M190 425 c0 -8 -7 -15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 7 -15 15
-15 8 0 15 -9 15 -20 0 -18 7 -20 60 -20 47 0 60 -3 60 -15 0 -8 -7 -15 -15
-15 -8 0 -15 -7 -15 -15 0 -8 -7 -15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 -7 -15
-15 -15 -8 0 -15 -7 -15 -15 0 -8 -7 -15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 -7
-15 -15 -15 -8 0 -15 -7 -15 -15 0 -8 -9 -15 -20 -15 -11 0 -20 -7 -20 -15 0
-8 -7 -15 -15 -15 -8 0 -15 -9 -15 -20 0 -11 -7 -20 -15 -20 -10 0 -15 -10
-15 -30 0 -27 3 -30 30 -30 20 0 30 5 30 15 0 8 9 15 20 15 11 0 20 7 20 15 0
8 7 15 15 15 8 0 15 9 15 20 0 11 7 20 15 20 8 0 15 7 15 15 0 8 7 15 15 15 8
0 15 7 15 15 0 8 7 15 15 15 8 0 15 7 15 15 0 8 7 15 15 15 8 0 15 7 15 15 0
8 7 15 15 15 8 0 15 7 15 15 0 8 7 15 15 15 12 0 15 -13 15 -60 0 -53 2 -60
20 -60 11 0 20 -7 20 -15 0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 7 15 15 15 12
0 15 15 15 75 0 60 -3 75 -15 75 -11 0 -15 12 -15 50 l0 50 -50 0 c-38 0 -50
4 -50 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z m150 -30 c0 -8 7 -15 15
-15 8 0 15 -9 15 -20 0 -13 7 -20 20 -20 11 0 20 -7 20 -15 0 -8 7 -15 15 -15
12 0 15 -15 15 -75 0 -60 -3 -75 -15 -75 -12 0 -15 13 -15 60 0 53 -2 60 -20
60 -11 0 -20 7 -20 15 0 8 -7 15 -15 15 -8 0 -15 7 -15 15 0 8 -7 15 -15 15
-8 0 -15 9 -15 20 0 18 -7 20 -60 20 -47 0 -60 3 -60 15 0 12 15 15 75 15 60
0 75 -3 75 -15z'
                />
            </g>
        </svg>
    );
}

export default PickaxeIcon;