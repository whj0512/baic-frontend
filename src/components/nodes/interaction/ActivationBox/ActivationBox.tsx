import { type FC } from 'react';
import './ActivationBox.css'

interface ActivationBoxProps {
    width?: number;
    height?: number;
    stroke?: string;
    fill?: string;
    node?: any;
}

const ActivationBox: FC<ActivationBoxProps> = (props) => {
    const { width: propWidth, height: propHeight, stroke: propStroke, fill: propFill, node } = props;
    const nodeData = node?.getData?.() || {};

    const width = propWidth || nodeData.width || 16;
    const height = propHeight || nodeData.height || 80;
    const stroke = propStroke || nodeData.stroke || '#4a90d9';
    const fill = propFill || nodeData.fill || 'rgba(74, 144, 217, 0.15)';

    return (
        <div
            className="seq-activation"
            style={{
                width,
                height,
                borderColor: stroke,
                backgroundColor: fill,
            }}
        />
    )
}

export default ActivationBox;
