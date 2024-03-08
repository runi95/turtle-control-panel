import {OverlayTrigger, Tooltip} from 'react-bootstrap';
import styled from 'styled-components';

export interface FuelInfoProps {
    fuelLevel: number;
    fuelLimit: number;
}

function FuelInfo(props: FuelInfoProps) {
    const {fuelLevel, fuelLimit} = props;
    const fuelPercentage = fuelLevel / fuelLimit;
    const coloredFuelBoxCount = Math.round(10 * fuelPercentage);
    const ColoredFuelBox =
        coloredFuelBoxCount <= 2 ? RedFuelBox : coloredFuelBoxCount <= 4 ? YellowFuelBox : GreenFuelBox;

    return (
        <OverlayTrigger
            placement='bottom'
            overlay={
                <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                    {Math.round(100 * fuelPercentage)}% Fuel
                </Tooltip>
            }
        >
            <FuelInfoContainer>
                {Array.from(Array(10), (_, i) => i).map((i) =>
                    i < coloredFuelBoxCount ? <ColoredFuelBox key={i} /> : <EmptyFuelBox key={i} />
                )}
            </FuelInfoContainer>
        </OverlayTrigger>
    );
}

const FuelInfoContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-top: auto;
    width: 200px;
    height: 16px;
    pointer-events: all;
`;

const FuelBox = styled.div`
    height: 16px;
    width: 16px;
    border: 1px solid white;
`;

const EmptyFuelBox = styled(FuelBox)`
    background-color: #000;
`;

const RedFuelBox = styled(FuelBox)`
    background-color: #f94834;
`;

const YellowFuelBox = styled(FuelBox)`
    background-color: #e6c850;
`;

const GreenFuelBox = styled(FuelBox)`
    background-color: #61d447;
`;

export default FuelInfo;
