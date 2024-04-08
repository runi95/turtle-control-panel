interface Props {
    height?: number;
    width?: number;
    color?: string;
}

function ArrowLeft({height = 48, width = 48, color = 'black'}: Props) {
    return (
        <svg
            version='1.0'
            xmlns='http://www.w3.org/2000/svg'
            width={width}
            height={height}
            viewBox='0 0 50.000000 50.000000'
            preserveAspectRatio='xMidYMid meet'
            color={color}
            filter='drop-shadow(0.2px 0 black) drop-shadow(-0.2px 0 black) drop-shadow(0 0.2px black) drop-shadow(0 -0.2px black) drop-shadow(0.2px 0.2px black) drop-shadow(-0.2px -0.2px black) drop-shadow(0.2px -0.2px black) drop-shadow(-0.2px 0.2px black)'
        >
            <g transform='translate(0.000000,50.000000) scale(0.100000,-0.100000)' fill='currentcolor' stroke='none'>
                <path
                    d='M130 365 l-115 -115 118 -118 117 -117 0 93 0 92 115 0 115 0 0 50 0
50 -115 0 -114 0 -3 90 -3 90 -115 -115z'
                />
            </g>
        </svg>
    );
}

export default ArrowLeft;
